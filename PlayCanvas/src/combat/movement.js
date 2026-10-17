import { CONFIG, MAP } from './config.js';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function unit(x, z) {
    const l = Math.hypot(x, z);
    return l > 1 ? { x: x / l, z: z / l } : { x, z };
}
export function circleHitsWall(x, z, r, w) {
    const nx = clamp(x, w.x - w.w / 2, w.x + w.w / 2),
        nz = clamp(z, w.z - w.d / 2, w.z + w.d / 2);
    return (x - nx) ** 2 + (z - nz) ** 2 < r * r - 1e-8;
}
// Pure local authoritative state. Rendering and DOM never enter this module.
export class MovementSimulation {
    constructor(config = CONFIG, map = MAP) {
        this.config = config;
        this.map = map;
        this.tick = 0;
        this.collisions = 0;
        this.reset();
    }
    reset() {
        this.player = {
            ...this.config.summoner.spawn,
            previous: { ...this.config.summoner.spawn },
            angle: Math.PI / 2,
            animation: 'idle',
            distance: 0
        };
    }
    blocked(x, z) {
        const r = this.config.summoner.radius;
        const hit =
            Math.abs(x) > this.map.width / 2 - r ||
            Math.abs(z) > this.map.depth / 2 - r ||
            this.map.walls.some((w) => circleHitsWall(x, z, r, w));
        if (hit) this.collisions++;
        return hit;
    }
    step(command, dt = 1 / this.config.tickRate) {
        this.tick++;
        const p = this.player;
        p.previous = { x: p.x, z: p.z };
        const move = unit(command.moveX || 0, command.moveZ || 0);
        const dx = move.x * this.config.summoner.speed * (command.speedMultiplier ?? 1) * dt,
            dz = move.z * this.config.summoner.speed * (command.speedMultiplier ?? 1) * dt;
        // Substeps bound displacement, preventing tunnelling even for future speed modifiers.
        const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (this.config.summoner.radius * 0.45)));
        for (let i = 0; i < n; i++) {
            if (!this.blocked(p.x + dx / n, p.z)) p.x += dx / n;
            if (!this.blocked(p.x, p.z + dz / n)) p.z += dz / n;
        }
        const traveled = Math.hypot(p.x - p.previous.x, p.z - p.previous.z);
        p.distance += traveled;
        p.animation = traveled > 0.0001 ? 'run' : 'idle';
        if (command.aiming) p.angle = Math.atan2(command.aimX, command.aimZ);
        else if (Math.hypot(move.x, move.z) > 0.01) p.angle = Math.atan2(move.x, move.z);
    }
}
// Replace this command boundary with authoritative transport in a future milestone.
// This is an interface seam, not implemented network play or prediction.
export class LocalCommandSource {
    constructor(input) {
        this.input = input;
    }
    read(tick) {
        return { ...this.input.read(), tick };
    }
}
