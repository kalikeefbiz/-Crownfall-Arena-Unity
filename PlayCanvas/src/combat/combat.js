import { AdvancedActions } from './advanced-actions.js';
import {
    segmentDistance,
    inRadial,
    inCone,
    makeCombatant,
    applyDamage,
    applyStatus,
    hasStatus,
    Cooldowns,
    TemporaryAbilities,
    EffectPool,
    zoneTagged
} from './combat-core.js';
import { KIT, TRAINING } from './combat-data.js';
import { CombatJournal } from './combat-journal.js';
import { CONFIG, MAP } from './config.js';
import { MATCH_DEFAULTS } from './match-data.js';
import { modifierTotals, expireModifiers, updateAlliedAura, addModifier } from './modifiers.js';
import { MovementSimulation } from './movement.js';
import { ReturningWeapons } from './returning-weapons.js';
// Definition injection allows future Summoners to reuse this engine and effect handlers.
export class CombatSimulation extends MovementSimulation {
    constructor(definition = KIT, training = TRAINING, config = CONFIG, map = MAP) {
        super(config, map);
        this.definition = definition;
        this.training = training;
        this.reset();
    }
    reset() {
        this.definition ??= KIT;
        this.training ??= TRAINING;
        super.reset();
        this.now = 0;
        Object.assign(
            this.player,
            makeCombatant('player', 1, 'summoner', this.definition.health, this.config.summoner.radius)
        );
        this.cooldowns = new Cooldowns();
        this.temporary = new TemporaryAbilities();
        this.effects = new EffectPool();
        this.projectiles = new EffectPool(32);
        this.transactions = [];
        this.journal = new CombatJournal(this);
        this.actionSerial = 0;
        this.committedAngle = this.player.angle;
        this.combo = 0;
        this.comboAt = -Infinity;
        this.streak = 0;
        this.dash = null;
        this.advanced = new AdvancedActions(this);
        this.auraAllies = [];
        this.lastEvent = 'Hold an ability to aim; release to cast.';
        this.stance = this.definition.initialStance || null;
        this.weapons = new ReturningWeapons(this);
        this.zones = [];
        this.stats = { damage: 0, kills: 0 };
        this.player.ultimateMeter = 0;
        this.targetFire = false;
        this.nextFire = 0;
        this.resetTargets();
    }
    resetTargets() {
        this.targets = this.training.targets.map((t) => ({
            ...t,
            ...makeCombatant(
                t.id,
                t.team ?? 2,
                t.kind,
                t.health ?? this.training.targetHealth,
                this.training.targetRadius
            ),
            spawn: { x: t.x, z: t.z },
            phase: 0
        }));
    }
    station(id) {
        const s = this.training.stations.find((s) => s.id === id);
        if (!s) return;
        this.player.x = s.x;
        this.player.z = s.z;
        this.player.previous = { x: s.x, z: s.z };
        this.player.angle = Math.PI / 2;
        this.dash = null;
        this.advanced.cancel();
        this.refreshAura();
    }
    activeAbilities() {
        return this.definition.stances
            ? [...this.definition.stances[this.stance].abilities, ...this.definition.sharedAbilities]
            : this.definition.abilities;
    }
    ability(id) {
        return (
            this.activeAbilities().find((a) => a.id === id) ||
            (id === this.definition.bonus?.id ? this.definition.bonus : null)
        );
    }
    uniqueTargets() {
        return [...new Map(this.targets.map((target) => [target.id, target])).values()];
    }
    valid(target, sourceTeam = this.player.team, summonersOnly = false) {
        return (
            !target.dead &&
            target.targetable !== false &&
            !this.match?.protected(target) &&
            target.team !== sourceTeam &&
            (!summonersOnly || target.kind === 'summoner')
        );
    }
    refreshAura() {
        this.auraAllies = updateAlliedAura(this.player, [this.player, ...this.targets], this.definition.passive);
    }
    damagePulse() {
        this.refreshAura();
        const report = [];
        for (const t of [this.player, ...this.targets.filter((t) => t.team === this.player.team)]) {
            if (t.dead) continue;
            const before = t.health;
            this.damage(t, this.training.damagePulse || 100);
            report.push(
                `${t === this.player ? this.definition.name || 'Kit' : t.name} ${(before - t.health).toFixed(1)}`
            );
        }
        this.lastEvent = 'Damage taken · ' + report.join(' / ');
    }
    damage(target, amount, source = null, options = {}) {
        if (
            this.match &&
            (!this.match.active || this.match.protected(target) || (source && source.team === target.team))
        )
            return 0;
        if (this.match) this.match.refreshAuras();
        else this.refreshAura();
        const adjusted = options.lethal
            ? target.health
            : amount * modifierTotals(source, this.now).outgoing * modifierTotals(target, this.now).incoming;
        const n = applyDamage(
            target,
            adjusted,
            this.now,
            this.match
                ? this.match.rules.settings.respawnSeconds
                : target === this.player
                  ? this.definition.respawn
                  : this.training.targetRespawn
        );
        if (!n) return 0;
        this.transactions.push({
            time: this.now,
            sourceId: source?.id ?? null,
            targetId: target.id,
            amount: n,
            abilityId: options.ability?.id ?? null,
            defeated: target.dead
        });
        this.journal.hit(options.trace || this.executingTrace, target, n, options.ability);
        if (this.transactions.length > 128) this.transactions.shift();
        if (source && source.team !== target.team && source.kind === 'summoner' && target.kind === 'summoner') {
            const settings = this.match?.rules.settings || MATCH_DEFAULTS;
            source.ultimateMeter = Math.min(100, (source.ultimateMeter || 0) + n * settings.ultimateDealt);
            target.ultimateMeter = Math.min(100, (target.ultimateMeter || 0) + n * settings.ultimateReceived);
        }
        if (!this.feedback)
            this.effects.spawn({
                type: 'number',
                x: target.x,
                z: target.z,
                value: Math.round(n),
                expires: this.now + 0.85
            });
        if (target.team !== this.player.team && (!this.match || target.kind === 'summoner')) {
            this.stats.damage += n;
            if (target.dead) this.stats.kills++;
        }
        if (this.match) this.match.recordDamage(this, target, n, source);
        else if (target === this.player && target.dead) this.onDefeated();
        this.feedback?.emit({ type: 'hit', time: this.now, target, source, amount: n, ability: options.ability });
        return n;
    }
    onDefeated() {
        this.journal.end(this.dash?.trace, true);
        this.dash = null;
        this.streak = 0;
        this.temporary = new TemporaryAbilities();
        this.advanced.cancel();
        this.weapons.clear();
        this.zones = [];
        this.lastEvent = (this.definition.name || 'Kit') + ' defeated';
    }
    cooldownDuration(a) {
        return (
            a.cooldown *
            (a.ultimate || a.basic || a.effect === 'stance' ? 1 : modifierTotals(this.player, this.now).cooldown)
        );
    }
    cast(id, angle = this.player.angle, target = null) {
        if (this.match?.rules.result) return false;
        try {
            return this.executeCast(id, angle, target);
        } finally {
            this.journal.seal(this.executingTrace);
            this.executingTrace = null;
        }
    }
    executeCast(id, angle, target) {
        const a = this.ability(id),
            p = this.player;
        const reject = (reason) => {
            this.journal.reject(id, a, reason);
            return false;
        };
        if (a?.ultimate && p.ultimateMeter < 100) return reject('ultimate meter');
        if (!a) return reject('unavailable ability');
        if (this.match && !this.match.allowCast(this, a)) return reject('match gate');
        if (p.dead) return reject('defeated');
        if (this.dash || this.advanced.locksCasting) return reject('action locked');
        if (hasStatus(p, 'stun', this.now)) return reject('stunned');
        if (!this.cooldowns.ready(a.cooldownKey || id, this.now)) return reject('cooldown');
        if (a.effect === 'weaponSequence' && !this.weapons.canAttack()) return reject('weapons returning');
        if (a.temporary && !this.temporary.consume(id, this.now)) return reject('grant unavailable');
        if (a.ultimate) p.ultimateMeter = 0;
        if (this.match) this.match.onCast(this, a);
        if (a.effect !== 'contactCombo') this.cooldowns.start(a.cooldownKey || id, this.cooldownDuration(a), this.now);
        if (!['radial', 'self', 'ground'].includes(a.aim)) p.angle = angle;
        this.actionSerial++;
        this.committedAngle = p.angle;
        const origin = { x: p.x, z: p.z };
        const trace = (this.executingTrace = this.journal.accept(a, origin, angle, target));
        this.feedback?.emit({ type: 'cast', time: this.now, source: p, ability: a });
        if (a.effect === 'stance') {
            const keys = Object.keys(this.definition.stances);
            this.stance = keys[(keys.indexOf(this.stance) + 1) % keys.length];
            this.lastEvent = this.definition.stances[this.stance].name;
            return true;
        }
        if (a.effect === 'weaponSequence') {
            this.weapons.attack(angle);
            return true;
        }
        if (a.effect === 'cone') {
            this.combo = this.now - this.comboAt <= a.comboWindow ? (this.combo + 1) % a.damage.length : 0;
            this.comboAt = this.now;
            for (const t of this.uniqueTargets())
                if (this.valid(t) && inCone(p, t, angle, a.range, a.angle))
                    this.damage(t, a.damage[this.combo], p, { ability: a });
            this.effects.spawn({
                type: a.visual === 'panther' ? 'melee' : 'cone',
                ...origin,
                angle,
                range: a.range,
                arc: a.angle,
                combo: this.combo,
                expires: this.now + a.vfx
            });
            this.lastEvent = `${a.name} · ${a.strikeNames?.[this.combo] || 'strike ' + (this.combo + 1)}`;
            if (a.visual === 'panther')
                this.advanced.pose = {
                    kind: this.combo === 2 ? 'kick' : 'punch',
                    side: this.combo % 2,
                    until: this.now + 0.18
                };
        } else if (a.effect === 'radial') {
            for (const t of this.uniqueTargets())
                if (this.valid(t, p.team, a.summonersOnly) && inRadial(p, t, a.range)) {
                    this.damage(t, a.damage, p, { ability: a });
                    if (a.status) applyStatus(t, a.status.id, a.status.duration, this.now);
                }
            if (a.zone) this.zones.push({ ability: a, source: p, expires: this.now + a.zone.duration });
            this.effects.spawn({
                type: a.visual === 'pulse' ? 'pulseAOE' : a.visual === 'scream' ? 'scream' : 'radial',
                ...origin,
                range: a.range,
                expires: this.now + a.vfx
            });
            this.lastEvent = a.name;
        } else if (a.effect === 'dash') {
            this.dash = {
                ability: a,
                angle,
                remaining: a.range,
                hits: new Set(),
                trace,
                empowered: this.streak >= a.streakThreshold - 1
            };
            this.journal.reserve(trace);
        } else if (a.effect === 'projectile') {
            this.spawnProjectile(a, angle, p, id);
            this.lastEvent = a.name;
            if (a.visual === 'wave') this.advanced.pose = { kind: 'drum', until: this.now + 0.2 };
        }
        if (['buff', 'contactCombo', 'groundImpact', 'barrage'].includes(a.effect))
            this.advanced.cast(a, angle, target);
        return true;
    }
    finishDash() {
        const d = this.dash;
        if (!d) return;
        if (d.hits.size) {
            this.streak = d.empowered ? 0 : this.streak + 1;
            this.lastEvent = d.empowered ? 'Ember Step · STUN · streak reset' : `Ember Step · streak ${this.streak}`;
        } else {
            this.feedback?.emit({ type: 'miss', time: this.now, source: this.player, ability: d.ability });
            this.streak = 0;
            this.lastEvent = 'Ember Step missed · streak reset';
        }
        this.journal.end(d.trace);
        this.dash = null;
    }
    updateDash(dt) {
        const d = this.dash,
            p = this.player;
        if (!d) return;
        const amount = Math.min(d.remaining, d.ability.speed * dt),
            n = Math.max(1, Math.ceil(amount / (p.radius * 0.4)));
        for (let i = 0; i < n; i++) {
            const ax = p.x,
                az = p.z,
                bx = ax + (Math.sin(d.angle) * amount) / n,
                bz = az + (Math.cos(d.angle) * amount) / n;
            if (this.blocked(bx, bz)) {
                this.finishDash();
                break;
            }
            p.x = bx;
            p.z = bz;
            p.distance += amount / n;
            d.remaining -= amount / n;
            for (const t of this.uniqueTargets())
                if (
                    this.valid(t) &&
                    !d.hits.has(t.id) &&
                    segmentDistance(t.x, t.z, ax, az, bx, bz) <= d.ability.width + t.radius
                ) {
                    d.hits.add(t.id);
                    this.damage(t, d.ability.damage, p, { ability: d.ability, trace: d.trace });
                    if (d.empowered) applyStatus(t, 'stun', d.ability.stun, this.now);
                }
        }
        p.angle = d.angle;
        p.animation = 'run';
        this.effects.spawn({ type: 'trail', x: p.x, z: p.z, range: 0.5, expires: this.now + d.ability.vfx });
        if (this.dash && d.remaining < 0.001) this.finishDash();
    }
    spawnProjectile(a, angle, source = this.player, type = a.id, trace = this.executingTrace) {
        const shot = this.projectiles.spawn({
            trace,
            type,
            ability: a,
            x: source.x,
            z: source.z,
            angle,
            remaining: a.range,
            team: source.team,
            source,
            hits: new Set(),
            summoners: new Set(),
            earned: false
        });
        if (shot) this.journal.reserve(trace);
        return shot;
    }
    updateProjectiles(dt) {
        for (const shot of this.projectiles.items) {
            if (!shot.active) continue;
            const a = shot.ability;
            if (shot.persistent) {
                if (shot.source.dead) {
                    shot.active = false;
                    this.finishProjectile(shot, true);
                    continue;
                }
                if (shot.phase === 'orbit') {
                    const angle = this.now * a.orbitSpeed + shot.orbitIndex * Math.PI;
                    shot.x = shot.source.x + Math.cos(angle) * a.orbitRadius;
                    shot.z = shot.source.z + Math.sin(angle) * a.orbitRadius;
                    continue;
                }
                if (shot.phase === 'parked') continue;
                if (shot.phase === 'returning') {
                    shot.angle = Math.atan2(shot.source.x - shot.x, shot.source.z - shot.z);
                    shot.remaining = Math.hypot(shot.source.x - shot.x, shot.source.z - shot.z);
                }
            }
            const ax = shot.x,
                az = shot.z,
                step = Math.min(a.speed * dt, shot.remaining);
            shot.x += Math.sin(shot.angle) * step;
            shot.z += Math.cos(shot.angle) * step;
            shot.remaining -= step;
            for (const t of [...this.targets, this.player])
                if (
                    this.valid(t, shot.team, a.summonersOnly) &&
                    !shot.hits.has(t.id) &&
                    segmentDistance(t.x, t.z, ax, az, shot.x, shot.z) <= a.width + t.radius
                ) {
                    shot.hits.add(t.id);
                    this.damage(t, a.lethal ? t.health : a.damage, shot.source, {
                        lethal: !!a.lethal,
                        ability: a,
                        trace: shot.trace
                    });
                    shot.weaponController?.onHit(shot);
                    if (t.kind === 'summoner') shot.summoners.add(t.id);
                    if (a.grant && !shot.earned && shot.summoners.size >= a.grant.uniqueHits && !this.player.dead) {
                        this.temporary.grant(a.grant.id, a.grant.duration, this.now);
                        shot.earned = true;
                        const granted = this.ability(a.grant.id);
                        this.lastEvent = `${granted?.name ?? a.grant.id} earned · ${a.grant.duration} seconds to fire`;
                    }
                    if (!a.piercing) {
                        shot.active = false;
                        break;
                    }
                }
            if (shot.remaining < 0.001) {
                if (shot.persistent) {
                    if (shot.phase === 'returning') {
                        shot.phase = 'orbit';
                        shot.weaponController.onReturn();
                    } else shot.phase = 'parked';
                } else shot.active = false;
            }
            if (!shot.active || shot.phase === 'parked' || shot.phase === 'orbit') this.finishProjectile(shot);
        }
    }
    finishProjectile(shot, interrupted = false) {
        this.journal.end(shot.trace, interrupted);
        shot.trace = null;
    }
    updateZones() {
        this.zones = this.zones.filter((z) => z.expires > this.now && !z.source.dead);
        for (const z of this.zones)
            for (const t of [...this.targets, this.player])
                if (this.valid(t, z.source.team) && inRadial(z.source, t, z.ability.range)) {
                    applyStatus(t, 'slow', z.ability.zone.slowDuration, this.now);
                    addModifier(t, 'slow', {
                        slow: z.ability.zone.slow,
                        expires: this.now + z.ability.zone.slowDuration
                    });
                }
    }
    step(command, dt = 1 / CONFIG.tickRate) {
        if (this.match && !this.match.active) return;
        this.now += dt;
        this.temporary.update(this.now);
        this.effects.update(this.now);
        const p = this.player;
        for (const e of [p, ...this.targets]) expireModifiers(e, this.now);
        // Optional deterministic diagnostic patrol used by reference parity tests.
        // Sandbox targets do not carry patrol data and remain stationary.
        for (const t of this.targets) {
            if (!t.dead && t.patrol && !hasStatus(t, 'stun', this.now)) {
                t.phase += ((dt * t.patrol.speed) / t.patrol.distance) * modifierTotals(t, this.now).movement;
                t[t.patrol.axis] = t.spawn[t.patrol.axis] + Math.sin(t.phase) * t.patrol.distance;
            }
        }
        this.inWilderness =
            !!this.definition.passive.zoneTag && zoneTagged(p, this.training.zones, this.definition.passive.zoneTag);
        const scaled = {
            ...command,
            speedMultiplier:
                (this.inWilderness ? 1 + this.definition.passive.speedBonus : 1) * modifierTotals(p, this.now).movement
        };
        if (p.dead || hasStatus(p, 'stun', this.now) || this.dash || this.advanced.locksMovement) {
            scaled.moveX = scaled.moveZ = 0;
            scaled.aiming = false;
        }
        super.step(scaled, dt);
        if (hasStatus(p, 'stun', this.now)) this.advanced.cancel();
        if (!p.dead) {
            for (const action of command.actions || [])
                this.cast(
                    action.id,
                    action.angle ?? p.angle,
                    action.targetOffset ? { x: p.x + action.targetOffset.x, z: p.z + action.targetOffset.z } : null
                );
            if (command.attackHeld)
                this.cast(
                    this.activeAbilities().find((a) => a.basic)?.id,
                    command.aiming ? Math.atan2(command.aimX, command.aimZ) : p.angle
                );
            this.updateDash(dt);
            this.advanced.update(dt);
        }
        this.refreshAura();
        this.updateZones();
        this.updateProjectiles(dt);
        if (this.targetFire && this.now >= this.nextFire && !p.dead) {
            const t = this.targets.find((t) => t.id === 'moving');
            if (t && !t.dead && !hasStatus(t, 'stun', this.now) && inRadial(t, p, this.training.targetFire.range)) {
                this.projectiles.spawn({
                    type: 'incoming',
                    ability: { ...this.training.targetFire, range: 14 },
                    x: t.x,
                    z: t.z,
                    angle: Math.atan2(p.x - t.x, p.z - t.z),
                    remaining: 14,
                    team: 2,
                    source: t,
                    hits: new Set(),
                    summoners: new Set()
                });
                this.nextFire = this.now + this.training.targetFire.cooldown;
            }
        }
    }
}
