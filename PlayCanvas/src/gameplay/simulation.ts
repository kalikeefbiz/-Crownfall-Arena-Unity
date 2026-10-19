import { CrownfallMatch } from '../combat/match.js';
import { createCombat } from '../combat/sandbox.js';
import { ARENA, OBSTACLES } from '../config/arena';
import { resolveFacing } from '../presentation/facing';
import type { FacingState } from '../presentation/facing';

import { clampVector, direction, length } from './vector';
import type { Vec } from './vector';
export type InputFrame = { movement: Vec; aim: Vec; targeting: boolean; commit: boolean };
export class Simulation {
    combat = createCombat();
    match: CrownfallMatch | null = null;
    lifecycle = false;
    select(index: number): void {
        this.match = this.lifecycle ? new CrownfallMatch(index) : null;
        this.combat = this.match ? this.match.human : createCombat(index);
        this.position = { x: 0, z: 5 };
        this.aim = { x: Math.sin(this.combat.player.angle), z: Math.cos(this.combat.player.angle) };
        this.movement = { x: 0, z: 0 };
        this.targeting = false;
        this.committedFacing = null;
        this.commitRemaining = 0;
        this.facing = { facing: resolveFacing(this.movement, this.aim, true, 'Back').facing, owner: 'idle' };
        this.collisions = 0;
    }
    position: Vec = { x: 0, z: 5 };
    movement: Vec = { x: 0, z: 0 };
    aim: Vec = { x: 0, z: -1 };
    facing: FacingState = { facing: 'Back', owner: 'idle' };
    targeting = false;
    committedFacing: FacingState['facing'] | null = null;
    commitRemaining = 0;
    collisions = 0;
    update(input: InputFrame, dt: number, move = true): void {
        this.movement = clampVector(input.movement);
        if (length(input.aim) > 0.08) this.aim = direction(input.aim);
        this.targeting = input.targeting;
        this.commitRemaining = Math.max(0, this.commitRemaining - dt);
        if (input.commit) {
            this.committedFacing = resolveFacing(this.movement, this.aim, true, this.facing.facing).facing;
            this.commitRemaining = 0.65;
        }
        this.facing =
            !this.targeting && this.commitRemaining > 0 && this.committedFacing
                ? { facing: this.committedFacing, owner: 'commit' }
                : resolveFacing(this.movement, this.aim, this.targeting, this.facing.facing);
        // Small deterministic steps prevent tunnelling. Axis separation permits wall sliding.
        let remaining = Math.min(Math.max(dt, 0), 0.25);
        while (move && remaining > 0) {
            const step = Math.min(remaining, 1 / 120);
            this.moveAxis('x', this.movement.x * ARENA.speed * step);
            this.moveAxis('z', this.movement.z * ARENA.speed * step);
            remaining -= step;
        }
    }
    private moveAxis(axis: 'x' | 'z', amount: number): void {
        if (!amount) return;
        const candidate = { ...this.position, [axis]: this.position[axis] + amount };
        const r = ARENA.radius;
        const blocked =
            Math.abs(candidate.x) > ARENA.halfWidth - r ||
            Math.abs(candidate.z) > ARENA.halfLength - r ||
            OBSTACLES.some((o) => {
                const dx = candidate.x - Math.max(o.x - o.halfX, Math.min(candidate.x, o.x + o.halfX));
                const dz = candidate.z - Math.max(o.z - o.halfZ, Math.min(candidate.z, o.z + o.halfZ));
                return dx * dx + dz * dz < r * r;
            });
        if (blocked) this.collisions++;
        else this.position = candidate;
    }
}
