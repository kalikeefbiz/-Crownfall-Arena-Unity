import { Entity } from 'playcanvas';
import type { AppBase } from 'playcanvas';
import { afterEach, expect, test, vi } from 'vitest';

import { ARENA } from '../src/config/arena';
import { Simulation } from '../src/gameplay/simulation';
import { RivenAnimationState } from '../src/presentation/riven-animation';
import { createRivenModel } from '../src/presentation/riven-model';
import { SetAnimationState } from '../src/presentation/set-animation';
import { createSetModel } from '../src/presentation/set-model';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

for (const [name, index, createModel, State] of [
    ['Set', 1, createSetModel, SetAnimationState],
    ['Riven', 2, createRivenModel, RivenAnimationState]
] as const) {
    test(`${name} locomotion survives renders without ticks and respects authoritative stops`, () => {
        // No GPU or asset loading is needed to exercise the real presenter/state boundary.
        vi.stubGlobal('location', { search: '?models=primitive' });
        const update = vi.spyOn(State.prototype, 'update');
        const sim = new Simulation();
        sim.select(index);
        const app = {} as AppBase;
        const root = new Entity('presenter-test', app);
        const presenter = createModel(app, root, new Entity('primitive-test', app));
        const render = (moving: boolean, alive = true) => {
            presenter.update(sim);
            expect(update).toHaveBeenLastCalledWith(moving, alive);
        };
        try {
            render(false);
            sim.combat.step({ moveX: 1 });
            expect(sim.combat.player.animation).toBe('run');
            render(true);
            const position = { x: sim.combat.player.x, z: sim.combat.player.z };
            // Several render updates share the last completed simulation tick.
            for (let i = 0; i < 3; i++) {
                render(true);
                expect(update.mock.results.at(-1)?.value).toBe(false);
                expect({ x: sim.combat.player.x, z: sim.combat.player.z }).toEqual(position);
            }
            sim.combat.step({});
            render(false);
            sim.combat.step({ moveX: 1 });
            render(true);
            sim.combat.player.statuses.stun = sim.combat.now + 1;
            sim.combat.step({ moveX: 1 });
            render(false);
            sim.combat.player.statuses = {};
            // Held input into a solid map boundary must idle, not run in place.
            Object.assign(sim.combat.player, { x: ARENA.halfWidth - sim.combat.player.radius, z: 0 });
            sim.combat.step({ moveX: 1 });
            expect(sim.combat.player.animation).toBe('idle');
            render(false);
            Object.assign(sim.combat.player, { x: 0, z: 5 });
            sim.combat.step({ moveX: 1 });
            render(true);
            sim.combat.player.dead = true;
            render(true, false);
            sim.select(index);
            render(false);
        } finally {
            presenter.destroy();
            root.destroy();
        }
    });
}
