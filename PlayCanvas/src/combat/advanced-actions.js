import { segmentDistance, inCone, inRadial, hasStatus } from './combat-core.js';
import { addModifier, clampGroundTarget } from './modifiers.js';
// Generic timed buffs, straight contact leaps, melee sequences and ground impacts.
export class AdvancedActions {
    constructor(sim) {
        this.sim = sim;
        this.leap = null;
        this.sequence = null;
        this.impacts = [];
        this.pose = null;
        this.barrages = [];
    }
    get locksMovement() {
        return !!(this.leap || this.sequence);
    }
    get locksCasting() {
        return this.locksMovement;
    }
    cast(a, angle, target) {
        const s = this.sim,
            p = s.player;
        if (a.effect === 'buff') {
            addModifier(p, a.id, { damageBonus: a.damageBonus, mitigation: a.mitigation, expires: s.now + a.duration });
            s.lastEvent = `${a.name} active · ${a.duration}s`;
            s.effects.spawn({ type: 'buffPulse', x: p.x, z: p.z, range: 1.5, expires: s.now + 0.4 });
        }
        if (a.effect === 'barrage') {
            this.barrages.push({ ability: a, angle, index: 0, at: s.now });
            s.lastEvent = a.name;
        }
        if (a.effect === 'contactCombo') {
            this.leap = { ability: a, angle, remaining: a.range };
            s.lastEvent = a.name + ' · leap';
        }
        if (a.effect === 'groundImpact') {
            const point = clampGroundTarget(
                p,
                target || { x: p.x + Math.sin(angle) * a.range * 0.65, z: p.z + Math.cos(angle) * a.range * 0.65 },
                a.range
            );
            this.impacts.push({ ability: a, ...point, source: p, created: s.now, at: s.now + a.castTime });
            s.lastEvent = a.name + ' · committed';
        }
    }
    finishLeap(target = null) {
        const s = this.sim,
            l = this.leap;
        if (!l) return;
        this.leap = null;
        s.cooldowns.start(l.ability.id, s.cooldownDuration(l.ability), s.now);
        if (target) {
            this.sequence = { ability: l.ability, angle: l.angle, targetId: target.id, index: 0, started: s.now };
            s.lastEvent = l.ability.name + ' · contact';
        } else {
            s.lastEvent = l.ability.name + ' · no contact · cooldown';
            if (!s.player.dead) s.feedback?.emit({ type: 'miss', time: s.now, source: s.player, ability: l.ability });
        }
    }
    cancel() {
        if (this.leap) this.finishLeap();
        this.sequence = null;
        this.pose = null;
        this.impacts = [];
        this.barrages = [];
    }
    update(dt) {
        const s = this.sim,
            p = s.player;
        if (p.dead || hasStatus(p, 'stun', s.now)) {
            this.cancel();
            return;
        }
        for (const b of this.barrages) {
            while (b.index < b.ability.count && s.now + 1e-9 >= b.at + b.index * b.ability.interval) {
                s.spawnProjectile(b.ability, b.angle, p);
                b.index++;
                this.pose = { kind: 'strum', until: s.now + 0.15 };
            }
        }
        this.barrages = this.barrages.filter((b) => b.index < b.ability.count);
        if (this.leap) {
            const l = this.leap,
                a = l.ability,
                amount = Math.min(l.remaining, a.speed * dt),
                n = Math.max(1, Math.ceil(amount / (p.radius * 0.35)));
            for (let i = 0; i < n && this.leap; i++) {
                const ax = p.x,
                    az = p.z,
                    bx = ax + (Math.sin(l.angle) * amount) / n,
                    bz = az + (Math.cos(l.angle) * amount) / n;
                if (s.blocked(bx, bz)) {
                    this.finishLeap();
                    break;
                }
                p.x = bx;
                p.z = bz;
                p.distance += amount / n;
                l.remaining -= amount / n;
                const candidates = s.targets.filter(
                    (t) => s.valid(t) && segmentDistance(t.x, t.z, ax, az, bx, bz) <= a.width + t.radius
                );
                candidates.sort((u, v) => Math.hypot(u.x - ax, u.z - az) - Math.hypot(v.x - ax, v.z - az));
                if (candidates.length) this.finishLeap(candidates[0]);
            }
            p.angle = l.angle;
            p.animation = 'run';
            s.effects.spawn({ type: 'pantherTrail', x: p.x, z: p.z, range: 0.55, expires: s.now + 0.25 });
            if (this.leap && l.remaining < 0.001) this.finishLeap();
        }
        if (this.sequence) {
            const q = this.sequence,
                a = q.ability;
            p.angle = q.angle;
            while (q.index < a.damage.length && s.now + 1e-9 >= q.started + a.strikeTimes[q.index]) {
                const t = s.targets.find((t) => t.id === q.targetId),
                    index = q.index++;
                if (t && s.valid(t) && inCone(p, t, q.angle, a.meleeRange, a.angle))
                    s.damage(t, a.damage[index], p, { ability: a });
                this.pose = {
                    kind: index === a.damage.length - 1 ? 'kick' : 'punch',
                    side: index % 2,
                    until: s.now + 0.16
                };
                s.effects.spawn({
                    type: 'melee',
                    x: p.x,
                    z: p.z,
                    angle: q.angle,
                    range: a.meleeRange,
                    arc: a.angle,
                    combo: index,
                    expires: s.now + a.vfx
                });
                s.lastEvent = `${a.name} · strike ${index + 1}/${a.damage.length}`;
            }
            if (q.index >= a.damage.length) this.sequence = null;
        }
        for (const i of this.impacts) {
            if (s.now + 1e-9 < i.at) continue;
            for (const t of s.uniqueTargets())
                if (s.valid(t, i.source.team) && inRadial(i, t, i.ability.radius))
                    s.damage(t, i.ability.damage, i.source, { ability: i.ability });
            s.effects.spawn({ type: 'slam', x: i.x, z: i.z, range: i.ability.radius, expires: s.now + i.ability.vfx });
            s.lastEvent = i.ability.name + ' · IMPACT';
            i.done = true;
        }
        this.impacts = this.impacts.filter((i) => !i.done);
        if (this.pose?.until <= s.now) this.pose = null;
    }
}
