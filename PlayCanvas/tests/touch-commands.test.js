import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AbilityCommands } from '../src/combat/ability-commands.js';
import { makeCombatant } from '../src/combat/combat-core.js';
import { KIT } from '../src/combat/combat-data.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { CommandStepper } from '../src/combat/command-stepper.js';
import { RIVEN } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';

for (const definition of [KIT, SET])
    test(`${definition.id}: press/release before sampling retains one Basic attempt`, () => {
        const sim = new CombatSimulation(definition),
            input = new AbilityCommands({ enabled: true }, () => Math.PI, definition);
        const basic = definition.abilities.find((a) => a.basic);
        input.begin(basic, 1, 100, 100, 0);
        input.finish(1, 2);
        assert.deepEqual(input.read(), { actions: [{ id: basic.id, angle: Math.PI }], attackHeld: false });
        assert.deepEqual(input.read(), { actions: [], attackHeld: false });
        assert.equal(sim.player.ultimateMeter, 0);
    });

const frame = { movement: { x: 0, z: 0 }, aim: { x: 0, z: -1 }, targeting: false, commit: false };
function rig(definition = KIT) {
    const sim = new CombatSimulation(definition);
    sim.player.x = 0;
    sim.player.z = 0;
    sim.player.angle = Math.PI;
    sim.targets = [{ ...makeCombatant('test', 2, 'summoner', 5000, 0.45), x: 0, z: -1 }];
    const input = new AbilityCommands({ enabled: true }, () => sim.player.angle, definition),
        stepper = new CommandStepper();
    input.synchronize(sim);
    return { sim, input, stepper, basic: definition.abilities.find((a) => a.basic) };
}
for (const definition of [KIT, SET]) {
    test(`${definition.id}: rendered sub-tick frame does not consume the initial press`, () => {
        const { sim, input, stepper, basic } = rig(definition);
        input.begin(basic, 1, 0, 0, 0);
        stepper.advance(sim, input, frame, 0.008);
        assert.equal(sim.actionSerial, 0);
        input.finish(1, 2);
        stepper.advance(sim, input, frame, 0.008);
        assert.equal(sim.actionSerial, 0);
        stepper.advance(sim, input, frame, 0.002);
        assert.equal(sim.actionSerial, 1);
        assert.equal(sim.targets[0].health, 5000 - basic.damage[0]);
        assert.equal(sim.transactions.length, 1);
        stepper.advance(sim, input, frame, 0.1);
        assert.equal(sim.actionSerial, 1);
    });
    test(`${definition.id}: held tick attempts immediately, repeats, and release adds no duplicate`, () => {
        const { sim, input, stepper, basic } = rig(definition);
        input.begin(basic, 1, 0, 0, 0);
        stepper.advance(sim, input, frame, 1 / 60);
        assert.equal(sim.actionSerial, 1);
        for (let i = 0; i < 40; i++) stepper.advance(sim, input, frame, 1 / 60);
        assert.equal(sim.actionSerial, 2);
        input.finish(1, 700);
        for (let i = 0; i < 40; i++) stepper.advance(sim, input, frame, 1 / 60);
        assert.equal(sim.actionSerial, 2);
    });
}
for (const definition of [KIT, SET, RIVEN])
    test(`${definition.id}: cancellation before the consuming tick never attacks`, () => {
        const { sim, input, stepper, basic } = rig(definition);
        input.begin(basic, 1, 0, 0, 0);
        stepper.advance(sim, input, frame, 0.008);
        input.finish(1, 3, false);
        input.finish(1, 4, true);
        stepper.advance(sim, input, frame, 0.1);
        assert.equal(sim.actionSerial, 0);
        assert.equal(sim.transactions.length, 0);
    });
test('Riven release remains buffered across sub-tick frames and schedules the second confirmed angle', () => {
    const { sim, input, stepper, basic } = rig(RIVEN);
    input.begin(basic, 1, 0, 0, 0);
    for (let i = 0; i < 20; i++) stepper.advance(sim, input, frame, 1 / 60);
    assert.equal(sim.actionSerial, 0);
    input.finish(1, 400);
    for (let i = 0; i < 50; i++) stepper.advance(sim, input, frame, 1 / 60);
    assert.equal(sim.weapons.next, 2);
    assert.ok(sim.weapons.blades.every((b) => b.angle === Math.PI));
    assert.equal(sim.targets[0].health, 4850);
});
