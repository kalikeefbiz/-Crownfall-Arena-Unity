import { makeCombatant, respawn, hasStatus } from './combat-core.js';
import { addModifier, modifierTotals } from './modifiers.js';
import { WILDERNESS_CONFIG, CAMP_SITES } from './wilderness-data.js';
export class Wilderness {
    constructor(match) {
        this.match = match;
        this.config = { ...WILDERNESS_CONFIG };
        this.assignments = new Map();
        this.nextRotation = { 1: this.config.rotationStart, 2: this.config.rotationStart + 6 };
        this.nextMajor = { 1: this.config.majorAttempt, 2: this.config.majorAttempt + 7 };
        this.teamDamage = { 1: 0, 2: 0 };
        this.rotationCount = 0;
        this.rewardCount = 0;
        this.camps = (match.arena?.camps || CAMP_SITES).map((site) => {
            const major = site.type === 'damage';
            return {
                ...site,
                ...makeCombatant(
                    site.id,
                    0,
                    'monster',
                    major ? this.config.majorHealth : this.config.minorHealth,
                    major ? 1.3 : 0.7
                ),
                name: major ? 'DAMAGE OBJECTIVE' : site.type.toUpperCase() + ' CAMP',
                home: { x: site.x, z: site.z },
                major,
                nextAttack: 0,
                lastHit: -Infinity,
                rewarded: false
            };
        });
    }
    assigned(id) {
        const a = this.assignments.get(id);
        return a && a.until > this.match.rules.elapsed ? this.camps.find((c) => c.id === a.camp && !c.dead) : null;
    }
    onDamage(camp, source) {
        if (source?.kind !== 'summoner') return;
        camp.lastHit = this.match.rules.elapsed;
        if (!camp.dead || camp.rewarded) return;
        camp.rewarded = true;
        camp.respawnAt = this.match.rules.elapsed + (camp.major ? this.config.majorRespawn : this.config.minorRespawn);
        this.rewardCount++;
        if (camp.major) {
            this.teamDamage[source.team] = this.match.rules.elapsed + this.config.majorDuration;
            this.refreshTeamDamage();
        } else if (!source.dead && !source.eliminated) {
            const values =
                camp.type === 'mobility'
                    ? { speedBonus: this.config.mobilityBonus }
                    : camp.type === 'cooldown'
                      ? { cooldownReduction: this.config.cooldownReduction }
                      : { mitigation: this.config.defenseMitigation };
            addModifier(source, 'camp:' + camp.type, {
                ...values,
                label: camp.type.toUpperCase(),
                expires: this.match.rules.elapsed + this.config.minorDuration
            });
        }
        this.match.feed.unshift(`${source.name} secured ${camp.name}`);
        this.match.feed.length = Math.min(3, this.match.feed.length);
    }
    refreshTeamDamage() {
        const now = this.match.rules.elapsed;
        for (const p of this.match.entities)
            if (!p.dead && !p.eliminated && this.teamDamage[p.team] > now)
                addModifier(p, 'camp:damage', {
                    label: 'TEAM DAMAGE',
                    damageBonus: this.config.majorDamageBonus,
                    expires: this.teamDamage[p.team]
                });
    }
    coordinate() {
        const m = this.match,
            now = m.rules.elapsed;
        for (const [id, a] of this.assignments) {
            const p = m.entities.find((p) => p.id === id);
            if (!p || p.dead || a.until <= now || !this.camps.some((c) => c.id === a.camp && !c.dead))
                this.assignments.delete(id);
        }
        for (const team of [1, 2]) {
            const alive = m.actors.filter((a) => a.sim.player.team === team && !a.sim.player.dead),
                control = team === 1 ? m.rules.control : 1 - m.rules.control;
            if (alive.length < 3 || control < 0.35) {
                for (const a of alive) this.assignments.delete(a.sim.player.id);
                continue;
            }
            const lane = alive.filter(
                (a) => Math.abs(a.sim.player.x) <= m.rules.lane.halfWidth && !this.assignments.has(a.sim.player.id)
            );
            const bots = alive.filter(
                (a) =>
                    a.bot &&
                    !this.assignments.has(a.sim.player.id) &&
                    a.sim.player.health / a.sim.player.maxHealth > 0.55
            );
            if ([...this.assignments.keys()].some((id) => m.entities.find((p) => p.id === id)?.team === team)) continue;
            const major = this.camps.find((c) => c.major && !c.dead);
            if (major && now >= this.nextMajor[team] && control >= 0.45 && lane.length >= 3 && bots.length >= 2) {
                for (const a of bots.slice(0, 2))
                    this.assignments.set(a.sim.player.id, {
                        camp: major.id,
                        until: now + this.config.rotationTimeout + 12
                    });
                this.nextMajor[team] = now + 50;
                this.rotationCount += 2;
                continue;
            }
            if (now >= this.nextRotation[team] && lane.length >= 2 && bots.length) {
                const candidates = [];
                for (const a of bots)
                    for (const c of this.camps)
                        if (!c.major && !c.dead && !a.sim.player.modifiers['camp:' + c.type])
                            candidates.push({ a, c, d: Math.hypot(a.sim.player.x - c.x, a.sim.player.z - c.z) });
                candidates.sort((a, b) => a.d - b.d);
                const chosen = candidates[0];
                if (chosen) {
                    this.assignments.set(chosen.a.sim.player.id, {
                        camp: chosen.c.id,
                        until: now + this.config.rotationTimeout
                    });
                    this.rotationCount++;
                }
                this.nextRotation[team] = now + this.config.rotationInterval;
            }
        }
    }
    step(dt) {
        if (!this.match.active) return;
        const now = this.match.rules.elapsed;
        this.refreshTeamDamage();
        for (const c of this.camps) {
            if (c.dead) {
                if (now >= c.respawnAt) {
                    respawn(c);
                    Object.assign(c, c.home);
                    c.rewarded = false;
                    c.lastHit = -Infinity;
                    c.nextAttack = now + 1;
                }
                continue;
            }
            if (hasStatus(c, 'stun', now)) continue;
            const candidates = this.match.entities
                .filter(
                    (p) =>
                        !p.dead &&
                        !p.eliminated &&
                        !this.match.protected(p) &&
                        Math.hypot(p.x - c.home.x, p.z - c.home.z) <= this.config.leash &&
                        Math.hypot(p.x - c.x, p.z - c.z) <= this.config.aggroRange
                )
                .sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
            const target = candidates[0];
            if (!target) {
                if (now - c.lastHit > 2) {
                    c.health = c.maxHealth;
                    c.x = c.home.x;
                    c.z = c.home.z;
                }
                continue;
            }
            const dx = target.x - c.x,
                dz = target.z - c.z,
                d = Math.hypot(dx, dz),
                reach = c.major ? this.config.majorReach : this.config.minorReach;
            if (d > reach) {
                const distance = Math.min(d - reach, this.config.monsterSpeed * modifierTotals(c, now).movement * dt),
                    x = c.x + (dx / d) * distance,
                    z = c.z + (dz / d) * distance;
                const sim = this.match.human;
                if (!sim.blocked(x, z)) {
                    c.x = x;
                    c.z = z;
                }
            } else if (now >= c.nextAttack) {
                const owner = this.match.actors.find((a) => a.sim.player === target);
                owner.sim.damage(target, c.major ? this.config.majorDamage : this.config.minorDamage, c);
                c.nextAttack = now + (c.major ? this.config.majorAttackInterval : this.config.minorAttackInterval);
            }
        }
    }
}
