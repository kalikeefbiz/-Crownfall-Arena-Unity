// Bots submit ordinary combat commands. Life state and all damage remain in CrownfallMatch.
export class BotController {
    constructor(slot) {
        this.seed = 1009 + slot * 7919;
        this.nextThink = slot * 0.07;
        this.nextAction = 0.4 + slot * 0.11;
        this.nextStance = 8 + slot;
        this.targetId = null;
        this.goal = null;
        this.angle = 0;
        this.decisions = 0;
    }
    random() {
        this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }
    // Sample the same inflated wall geometry used by authoritative movement.
    clear(sim, a, b) {
        const distance = Math.hypot(b.x - a.x, b.z - a.z);
        const steps = Math.max(1, Math.ceil(distance / 0.2));
        for (let i = 1; i <= steps; i++)
            if (sim.blocked(a.x + ((b.x - a.x) * i) / steps, a.z + ((b.z - a.z) * i) / steps)) return false;
        return true;
    }
    steer(sim, goal) {
        const p = sim.player;
        if (this.clear(sim, p, goal)) return goal;
        // Visibility graph around expanded obstacle corners, with Dijkstra routing.
        const margin = p.radius + 0.2;
        const nodes = [p, goal];
        for (const wall of sim.map.walls)
            for (const sx of [-1, 1])
                for (const sz of [-1, 1]) {
                    const point = { x: wall.x + sx * (wall.w / 2 + margin), z: wall.z + sz * (wall.d / 2 + margin) };
                    if (!sim.blocked(point.x, point.z)) nodes.push(point);
                }
        const cost = nodes.map(() => Infinity),
            previous = [],
            visited = new Set();
        cost[0] = 0;
        for (let count = 0; count < nodes.length; count++) {
            let at = -1;
            for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (at < 0 || cost[i] < cost[at])) at = i;
            if (at < 0 || !Number.isFinite(cost[at])) break;
            if (at === 1) {
                let next = 1;
                while (previous[next] !== 0) next = previous[next];
                return nodes[next];
            }
            visited.add(at);
            for (let i = 1; i < nodes.length; i++) {
                const distance = Math.hypot(nodes[at].x - nodes[i].x, nodes[at].z - nodes[i].z);
                if (cost[at] + distance < cost[i] && this.clear(sim, nodes[at], nodes[i])) {
                    cost[i] = cost[at] + distance;
                    previous[i] = at;
                }
            }
        }
        return p;
    }
    command(sim) {
        const p = sim.player,
            now = sim.now;
        if (p.dead || !sim.match.active) return { moveX: 0, moveZ: 0 };
        const actions = [];
        if (now >= this.nextThink) {
            this.decisions++;
            this.nextThink = now + 0.22 + this.random() * 0.16;
            const enemies = sim.targets.filter((t) => sim.valid(t));
            const score = (t) => Math.hypot(t.x - p.x, t.z - p.z) + (t.id === this.targetId ? -1.8 : 0);
            enemies.sort((a, b) => score(a) - score(b));
            const target = enemies[0];
            this.targetId = target?.id ?? null;
            if (!target) {
                this.goal = null;
                return { moveX: 0, moveZ: 0 };
            }
            // A sampled position with modest error, rather than tracking every simulation tick.
            const dx = target.x - p.x,
                dz = target.z - p.z,
                distance = Math.hypot(dx, dz) || 1;
            this.angle = Math.atan2(dx, dz) + (this.random() - 0.5) * 0.24;
            const basic = sim.activeAbilities().find((a) => a.basic);
            const preferred = basic.range > 5 ? 4.8 : basic.range * 0.65;
            const retreat = p.health / p.maxHealth < 0.25 && distance < preferred + 1.5;
            let goal = { x: target.x, z: target.z };
            if (retreat || distance < preferred - 0.6) {
                goal = { x: p.x - (dx / distance) * 2 + dz / distance, z: p.z - (dz / distance) * 2 - dx / distance };
            } else if (distance < preferred) {
                const side = Math.sin(now * 0.8 + (this.seed % 7)) > 0 ? 1 : -1;
                goal = { x: p.x + (dz / distance) * side * 0.7, z: p.z - (dx / distance) * side * 0.7 };
            }
            this.goal = this.steer(sim, goal);
            if (now >= this.nextAction && this.clear(sim, p, target)) {
                const abilities = sim
                    .activeAbilities()
                    .filter(
                        (a) =>
                            a.effect !== 'stance' &&
                            (!a.ultimate || p.ultimateMeter >= 100) &&
                            sim.cooldowns.ready(a.cooldownKey || a.id, now) &&
                            (a.effect === 'buff' ? distance < 7 : distance <= (a.range || 0) + target.radius - 0.15)
                    );
                // Prefer available skills, but never bypass their normal cooldown or cast gates.
                const ability = abilities.find((a) => a.ultimate) || abilities.find((a) => !a.basic) || abilities[0];
                if (ability) {
                    actions.push({
                        id: ability.id,
                        angle: this.angle,
                        ...(ability.aim === 'ground'
                            ? { targetOffset: { x: dx + (this.random() - 0.5), z: dz + (this.random() - 0.5) } }
                            : {})
                    });
                    this.nextAction = now + (ability.basic ? 0.65 : 0.45) + this.random() * 0.3;
                }
            }
            if (sim.definition.stances && now >= this.nextStance) {
                actions.push({ id: 'stance' });
                this.nextStance = now + 9 + this.random() * 5;
            }
        }
        const dx = (this.goal?.x ?? p.x) - p.x,
            dz = (this.goal?.z ?? p.z) - p.z;
        const distance = Math.hypot(dx, dz);
        return {
            moveX: distance > 0.18 ? dx / distance : 0,
            moveZ: distance > 0.18 ? dz / distance : 0,
            aimX: Math.sin(this.angle),
            aimZ: Math.cos(this.angle),
            aiming: true,
            actions
        };
    }
}
