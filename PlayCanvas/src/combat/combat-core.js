// Generic geometry and lifecycle systems; no DOM or Kit-specific branches.
export function segmentDistance(px, pz, ax, az, bx, bz) {
    const dx = bx - ax,
        dz = bz - az,
        l = dx * dx + dz * dz,
        t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)) : 0;
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function inRadial(origin, target, radius) {
    return Math.hypot(target.x - origin.x, target.z - origin.z) <= radius + target.radius;
}
export function inCone(origin, target, angle, range, arc) {
    const dx = target.x - origin.x,
        dz = target.z - origin.z,
        dist = Math.hypot(dx, dz);
    if (dist > range + target.radius) return false;
    if (dist <= target.radius) return true;
    const diff = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - angle), Math.cos(Math.atan2(dx, dz) - angle)));
    return (
        diff <= arc / 2 ||
        segmentDistance(
            target.x,
            target.z,
            origin.x,
            origin.z,
            origin.x + Math.sin(angle - arc / 2) * range,
            origin.z + Math.cos(angle - arc / 2) * range
        ) <= target.radius ||
        segmentDistance(
            target.x,
            target.z,
            origin.x,
            origin.z,
            origin.x + Math.sin(angle + arc / 2) * range,
            origin.z + Math.cos(angle + arc / 2) * range
        ) <= target.radius
    );
}
export function makeCombatant(id, team, kind, health, radius) {
    return {
        id,
        team,
        kind,
        health,
        maxHealth: health,
        radius,
        dead: false,
        targetable: true,
        respawnAt: 0,
        statuses: {},
        modifiers: {}
    };
}
export function applyDamage(target, amount, now, respawnDelay) {
    if (target.dead) return 0;
    const damage = Math.min(target.health, Math.max(0, amount));
    target.health -= damage;
    if (target.health <= 0) {
        target.dead = true;
        target.targetable = false;
        target.respawnAt = now + respawnDelay;
        target.statuses = {};
        target.modifiers = {};
    }
    return damage;
}
export function heal(target, amount) {
    if (!target.dead) target.health = Math.min(target.maxHealth, target.health + Math.max(0, amount));
}
export function applyStatus(target, id, duration, now) {
    if (!target.dead) target.statuses[id] = Math.max(target.statuses[id] || 0, now + duration);
}
export function hasStatus(target, id, now) {
    return (target.statuses[id] || 0) > now;
}
export function respawn(target) {
    target.health = target.maxHealth;
    target.dead = false;
    target.targetable = true;
    target.statuses = {};
    target.modifiers = {};
    target.respawnAt = 0;
}
export class Cooldowns {
    constructor() {
        this.ends = {};
    }
    ready(id, now) {
        return (this.ends[id] || 0) <= now;
    }
    start(id, duration, now) {
        this.ends[id] = now + duration;
    }
    remaining(id, now) {
        return Math.max(0, (this.ends[id] || 0) - now);
    }
}
export class TemporaryAbilities {
    constructor() {
        this.grants = new Map();
    }
    grant(id, duration, now) {
        this.grants.set(id, { id, expires: now + duration, charges: 1 });
    }
    available(id, now) {
        const g = this.grants.get(id);
        return !!g && g.expires > now && g.charges > 0;
    }
    consume(id, now) {
        if (!this.available(id, now)) return false;
        this.grants.delete(id);
        return true;
    }
    update(now) {
        for (const [id, g] of this.grants) if (g.expires <= now) this.grants.delete(id);
    }
}
export class EffectPool {
    constructor(size = 96) {
        this.items = Array.from({ length: size }, () => ({ active: false }));
    }
    spawn(values) {
        const p = this.items.find((e) => !e.active);
        if (!p) return null;
        for (const k of Object.keys(p)) if (k !== 'active') delete p[k];
        Object.assign(p, values, { active: true });
        return p;
    }
    update(now) {
        for (const p of this.items) if (p.active && p.expires <= now) p.active = false;
    }
}
export function zoneTagged(position, zones, tag) {
    return zones.some(
        (z) => z.tag === tag && Math.abs(position.x - z.x) <= z.w / 2 && Math.abs(position.z - z.z) <= z.d / 2
    );
}
