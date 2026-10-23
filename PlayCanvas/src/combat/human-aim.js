// Human input policy only. Commands still use the ordinary authoritative cast path.
// These acquisition distances never change ability reach, hit geometry or damage.
export const HUMAN_AIM_TUNING = Object.freeze({
    'kit-asher': Object.freeze({ whip: { padding: 0.5 } }),
    set: Object.freeze({ claw: { padding: 0.55 } }),
    riven: Object.freeze({ reso: { rangeScale: 0.75 }, pulse: { rangeScale: 0.75 } })
});
export function acquisitionDistance(sim, ability) {
    const tuning = HUMAN_AIM_TUNING[sim.definition.id]?.[ability?.id];
    return ability?.basic && tuning ? ability.range * (tuning.rangeScale ?? 1) + (tuning.padding ?? 0) : 0;
}
// Exact segment/AABB test against the simulation's current authoritative walls.
// Avoid blocked(): that movement query increments the collision counter.
export function hasAimLineOfSight(sim, target) {
    const p = sim.player;
    return !sim.map.walls.some((wall) => {
        let near = 0,
            far = 1;
        for (const [axis, extent] of [
            ['x', 'w'],
            ['z', 'd']
        ]) {
            const delta = target[axis] - p[axis];
            const low = wall[axis] - wall[extent] / 2;
            const high = wall[axis] + wall[extent] / 2;
            if (Math.abs(delta) < 1e-12) {
                if (p[axis] < low || p[axis] > high) return false;
            } else {
                const a = (low - p[axis]) / delta,
                    b = (high - p[axis]) / delta;
                near = Math.max(near, Math.min(a, b));
                far = Math.min(far, Math.max(a, b));
                if (near > far) return false;
            }
        }
        return true;
    });
}
export function eligibleAimTarget(sim, target, radius) {
    return (
        target !== sim.player &&
        target.id !== sim.player.id &&
        !target.eliminated &&
        sim.valid(target, sim.player.team, true) &&
        Math.hypot(target.x - sim.player.x, target.z - sim.player.z) <= radius &&
        hasAimLineOfSight(sim, target)
    );
}
export function nearestAimTarget(sim, ability) {
    const radius = acquisitionDistance(sim, ability);
    if (!radius || sim.player.dead || (sim.match && (sim.match.human !== sim || !sim.match.active))) return null;
    let nearest = null,
        distance = Infinity;
    for (const target of sim.uniqueTargets()) {
        if (!eligibleAimTarget(sim, target, radius)) continue;
        const next = (target.x - sim.player.x) ** 2 + (target.z - sim.player.z) ** 2;
        if (next < distance || (next === distance && target.id < nearest.id)) {
            nearest = target;
            distance = next;
        }
    }
    return nearest;
}
export class HumanAimAssist {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.clear();
    }
    clear() {
        this.feedback = { state: 'idle', targetId: null, until: 0, abilityId: null };
    }
    manual(sim) {
        this.feedback = { state: 'manual', targetId: null, until: sim.now + 0.4, abilityId: null };
    }
    resolve(sim, ability, fallback) {
        if (!this.enabled || !acquisitionDistance(sim, ability)) return fallback;
        const target = nearestAimTarget(sim, ability);
        this.feedback = {
            state: target ? 'acquired' : 'none',
            targetId: target?.id ?? null,
            until: sim.now + 0.4,
            abilityId: ability.id
        };
        return target ? Math.atan2(target.x - sim.player.x, target.z - sim.player.z) : fallback;
    }
    status(sim) {
        if (!this.enabled || sim.player.dead || (sim.match && !sim.match.active)) this.clear();
        const f = this.feedback;
        if (f.until <= sim.now) this.clear();
        else if (f.targetId) {
            const target = sim.targets.find((t) => t.id === f.targetId);
            if (!target || !eligibleAimTarget(sim, target, acquisitionDistance(sim, sim.ability(f.abilityId))))
                this.clear();
        }
        return this.feedback;
    }
}
