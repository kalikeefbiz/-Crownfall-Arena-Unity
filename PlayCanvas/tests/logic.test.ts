import { describe, expect, it } from 'vitest';

import { Simulation } from '../src/gameplay/simulation';
import type { InputFrame } from '../src/gameplay/simulation';
import { clampVector, direction } from '../src/gameplay/vector';
import { classifyFacing, resolveFacing } from '../src/presentation/facing';
const zero = { x: 0, z: 0 };
const input = (patch: Partial<InputFrame> = {}): InputFrame => ({
    movement: zero,
    aim: zero,
    targeting: false,
    commit: false,
    ...patch
});

describe('input intentions', () => {
    it('clamps diagonals and preserves analog magnitude', () => {
        expect(Math.hypot(...Object.values(clampVector({ x: 1, z: -1 })))).toBeCloseTo(1);
        expect(clampVector({ x: 0.2, z: 0.3 })).toEqual({ x: 0.2, z: 0.3 });
        expect(direction({ x: 3, z: 4 })).toEqual({ x: 0.6, z: 0.8 });
        expect(direction(zero)).toEqual(zero);
    });
    it('neutralizes invalid device values', () => {
        expect(clampVector({ x: NaN, z: 1 })).toEqual(zero);
        expect(clampVector({ x: 1, z: Infinity })).toEqual(zero);
    });
});
describe('presentation policy', () => {
    it.each([
        [{ x: 0, z: 1 }, 'Front'],
        [{ x: 0, z: -1 }, 'Back'],
        [{ x: 1, z: 0 }, 'Right'],
        [{ x: -1, z: 0 }, 'Left'],
        [{ x: 1, z: 1 }, 'Front'],
        [{ x: -1, z: -1 }, 'Back']
    ] as const)('classifies %o as %s with vertical ties', (v, expected) => {
        expect(classifyFacing(v)).toBe(expected);
    });
    it('gives aim ownership while targeting and preserves idle facing', () => {
        const movement = { x: -1, z: 0 },
            aim = { x: 0, z: -1 };
        expect(resolveFacing(movement, aim, true, 'Front')).toEqual({ facing: 'Back', owner: 'aim' });
        expect(resolveFacing(movement, aim, false, 'Front')).toEqual({ facing: 'Left', owner: 'movement' });
        expect(resolveFacing(zero, aim, false, 'Left')).toEqual({ facing: 'Left', owner: 'idle' });
        expect(resolveFacing(zero, zero, true, 'Right').facing).toBe('Right');
    });
});
describe('Kit simulation', () => {
    it('moves on X/Z, keeps continuous aim independent, and normalizes diagonal speed', () => {
        const straight = new Simulation(),
            diagonal = new Simulation();
        straight.update(input({ movement: { x: 1, z: 0 }, aim: { x: 0.3, z: -0.7 } }), 0.1);
        diagonal.update(input({ movement: { x: 1, z: 1 } }), 0.1);
        expect(straight.position.x).toBeCloseTo(0.5);
        expect(Math.hypot(diagonal.position.x, diagonal.position.z - 5)).toBeCloseTo(0.5);
        expect(straight.aim.x / straight.aim.z).toBeCloseTo(0.3 / -0.7);
        expect(straight.facing.facing).toBe('Right');
    });
    it('locks captured presentation on commit, then returns ownership to movement', () => {
        const sim = new Simulation();
        sim.update(input({ aim: { x: 0.3, z: -0.7 }, targeting: true }), 0.016);
        sim.update(input({ movement: { x: 1, z: 0 }, commit: true }), 0.016);
        expect(sim.facing).toEqual({ facing: 'Back', owner: 'commit' });
        sim.update(input({ movement: { x: -1, z: 0 }, aim: { x: 1, z: 0 } }), 0.1);
        expect(sim.facing.facing).toBe('Back');
        for (let i = 0; i < 8; i++) sim.update(input({ movement: { x: -1, z: 0 } }), 0.1);
        expect(sim.facing).toEqual({ facing: 'Left', owner: 'movement' });
        sim.update(input(), 0.1);
        expect(sim.facing).toEqual({ facing: 'Left', owner: 'idle' });
    });
    it('blocks obstacles without tunnelling and permits wall sliding', () => {
        const sim = new Simulation();
        sim.position = { x: 0, z: 3 };
        for (let i = 0; i < 30; i++) sim.update(input({ movement: { x: 1, z: 0 } }), 0.1);
        expect(sim.position.x).toBeLessThanOrEqual(1.4);
        expect(sim.position.x).toBeGreaterThan(1.3);
        expect(sim.collisions).toBeGreaterThan(0);
        for (let i = 0; i < 4; i++) sim.update(input({ movement: { x: 1, z: 1 } }), 0.1);
        expect(sim.position.z).toBeGreaterThan(4);
    });
    it('contains Kit inside lane boundaries, including long frames', () => {
        const sim = new Simulation();
        sim.position = { x: 8.5, z: 15.5 };
        for (let i = 0; i < 10; i++) sim.update(input({ movement: { x: 1, z: 1 } }), 5);
        expect(sim.position.x).toBeLessThanOrEqual(8.6);
        expect(sim.position.z).toBeLessThanOrEqual(15.6);
    });
});
