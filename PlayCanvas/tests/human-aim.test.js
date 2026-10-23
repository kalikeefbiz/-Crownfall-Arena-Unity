import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AbilityCommands } from '../src/combat/ability-commands.js';
import { makeCombatant } from '../src/combat/combat-core.js';
import { KIT } from '../src/combat/combat-data.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { CommandStepper } from '../src/combat/command-stepper.js';
import { HumanAimAssist, acquisitionDistance, nearestAimTarget } from '../src/combat/human-aim.js';
import { CrownfallMatch } from '../src/combat/match.js';
import { RIVEN } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';

const enemy = (id, x = 0, z = -1) => ({ ...makeCombatant(id, 2, 'summoner', 5000, 0.45), x, z });
const retreat = { movement: { x: 0, z: 1 }, aim: { x: 0, z: 1 }, targeting: false, commit: false };
function rig(definition = KIT, enabled = true) {
    const sim = new CombatSimulation(definition);
    Object.assign(sim.player, { x: 0, z: 0, angle: 0 });
    sim.targets = [enemy('pursuer')];
    const input = new AbilityCommands({ enabled: true }, () => sim.player.angle, definition);
    input.aimAssist = new HumanAimAssist(enabled);
    input.synchronize(sim);
    const stepper = new CommandStepper();
    return { sim, input, stepper, basic: sim.activeAbilities().find((a) => a.basic) };
}
const ticks = (r, count, frame = retreat) => {
    for (let i = 0; i < count; i++) r.stepper.advance(r.sim, r.input, frame, 1 / 60);
};

test('central tuning derives exact acquisition distances from unchanged ability ranges', () => {
    for (const [definition, radius] of [
        [KIT, 3.3],
        [SET, 2.2],
        [RIVEN, 6]
    ]) {
        const r = rig(definition);
        assert.ok(Math.abs(acquisitionDistance(r.sim, r.basic) - radius) < 1e-12);
        for (const a of r.sim.activeAbilities().filter((a) => !a.basic)) assert.equal(acquisitionDistance(r.sim, a), 0);
        r.sim.targets[0].z = -radius;
        assert.equal(nearestAimTarget(r.sim, r.basic)?.id, 'pursuer');
        r.sim.targets[0].z -= 0.0001;
        assert.equal(nearestAimTarget(r.sim, r.basic), null);
    }
});
test('nearest valid enemy in any direction, stable actor ID ties with shuffled target order', () => {
    const r = rig();
    const a = enemy('2-a', 1, 0),
        b = enemy('2-b', -1, 0),
        c = enemy('2-c', 0, 2);
    for (const targets of [
        [c, b, a],
        [b, a, c],
        [a, c, b]
    ]) {
        r.sim.targets = targets;
        assert.equal(nearestAimTarget(r.sim, r.basic), a);
    }
    a.x = 2;
    assert.equal(nearestAimTarget(r.sim, r.basic), b);
});
test('delegates target validity, excludes self/allies/neutrals/dead/eliminated/untargetable/protected', () => {
    const r = rig();
    const valid = enemy('valid', 0, -2);
    const targets = [
        r.sim.player,
        { ...enemy('ally'), team: 1 },
        { ...enemy('camp'), kind: 'monster' },
        { ...enemy('dead'), dead: true },
        { ...enemy('eliminated'), eliminated: true },
        { ...enemy('untargetable'), targetable: false },
        enemy('protected'),
        valid
    ];
    r.sim.targets = targets;
    r.sim.match = { human: r.sim, active: true, protected: (t) => t.id === 'protected' };
    assert.equal(nearestAimTarget(r.sim, r.basic), valid);
    valid.targetable = false;
    assert.equal(nearestAimTarget(r.sim, r.basic), null);
});
test('authoritative wall geometry rejects occluded target without mutating collision state', () => {
    const r = rig();
    r.sim.targets = [enemy('blocked', 0, -1), enemy('visible', 2, 0)];
    r.sim.map = { ...r.sim.map, walls: [{ x: 0, z: -0.5, w: 0.4, d: 0.1 }] };
    assert.equal(nearestAimTarget(r.sim, r.basic)?.id, 'visible');
    assert.equal(r.sim.collisions, 0);
});
for (const definition of [KIT, SET]) {
    test(`${definition.id}: retreat-and-fire deals real damage behind the human; movement equals disabled`, () => {
        const on = rig(definition),
            off = rig(definition, false);
        for (const r of [on, off]) {
            r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
            ticks(r, 1);
        }
        assert.equal(on.sim.transactions[0].targetId, 'pursuer');
        assert.equal(on.sim.transactions[0].amount, on.basic.damage[0]);
        assert.equal(off.sim.transactions.length, 0);
        assert.equal(on.sim.committedAngle, Math.PI);
        assert.equal(off.sim.committedAngle, 0);
        assert.deepEqual(on.sim.player.previous, off.sim.player.previous);
        assert.equal(on.sim.player.x, off.sim.player.x);
        assert.equal(on.sim.player.z, off.sim.player.z);
        assert.deepEqual(retreat.movement, { x: 0, z: 1 });
    });
    test(`${definition.id}: manual drag overrides; drag cancellation never submits`, () => {
        const r = rig(definition);
        r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
        r.input.drag(1, 0, 50);
        ticks(r, 1);
        assert.equal(r.sim.transactions.length, 0);
        assert.equal(r.sim.committedAngle, 0);
        assert.equal(r.input.aimAssist.status(r.sim).state, 'manual');
        r.input.finish(1, 30);
        const cancel = rig(definition);
        cancel.input.begin(cancel.basic, 1, 0, 0, 0, 'touch');
        cancel.input.drag(1, 200, 0);
        cancel.input.finish(1, 50);
        ticks(cancel, 60);
        assert.equal(cancel.sim.actionSerial, 0);
    });
    test(`${definition.id}: completed quick tap survives sub-tick sampling and disabled mode equals original`, () => {
        const r = rig(definition),
            off = rig(definition, false),
            original = rig(definition, false);
        original.input.aimAssist = undefined;
        for (const a of [r, off, original]) {
            a.input.begin(a.basic, 1, 0, 0, 0, 'touch');
            a.input.finish(1, 5);
            a.stepper.advance(a.sim, a.input, retreat, 0.008);
            assert.equal(a.sim.actionSerial, 0);
            a.stepper.advance(a.sim, a.input, retreat, 0.009);
        }
        assert.equal(r.sim.transactions.length, 1);
        assert.deepEqual(off.sim.player, original.sim.player);
        assert.deepEqual(off.sim.journal.attempts, original.sim.journal.attempts);
    });
}
test('held attacks acquire only on attack intervals; dead target is replaced without continuous tracking', () => {
    const r = rig();
    const still = { ...retreat, movement: { x: 0, z: 0 } };
    r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
    ticks(r, 1, still);
    assert.equal(r.sim.journal.latestAccepted.angle, Math.PI);
    const feedback = { ...r.input.aimAssist.feedback };
    r.sim.targets[0].x = 1;
    ticks(r, 10, still);
    assert.deepEqual(r.input.aimAssist.feedback, feedback);
    assert.equal(r.sim.journal.latestAccepted.angle, Math.PI);
    r.sim.targets[0].dead = true;
    r.sim.targets.push(enemy('next', 1, 2));
    ticks(r, 24, still);
    assert.equal(r.sim.actionSerial, 2);
    assert.equal(r.sim.journal.latestAccepted.angle, Math.atan2(1, 2 - r.sim.journal.latestAccepted.origin.z));
    r.input.finish(1, 600);
    ticks(r, 60);
    assert.equal(r.sim.actionSerial, 2);
});
test('Riven release confirms both scythes, never retargets follow-up or recall; orbit preserved', () => {
    const r = rig(RIVEN);
    const still = { ...retreat, movement: { x: 0, z: 0 } };
    r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
    ticks(r, 20, still);
    assert.equal(r.sim.actionSerial, 0);
    r.input.finish(1, 400);
    ticks(r, 1, still);
    const confirmed = r.sim.weapons.blades[0].angle;
    assert.equal(confirmed, Math.PI);
    r.sim.targets.push(enemy('closer', 0.5, 0));
    ticks(r, 50, still);
    assert.equal(r.sim.weapons.next, 2);
    assert.ok(r.sim.weapons.blades.every((b) => b.angle === confirmed));
    assert.equal(
        r.sim.transactions
            .filter((t) => t.abilityId === 'reso' && t.targetId === 'pursuer')
            .reduce((sum, t) => sum + t.amount, 0),
        150
    );
    ticks(r, 30, still); // Recall still respects the authored basic cooldown.
    r.input.begin(r.basic, 2, 0, 0, 900, 'touch');
    r.input.finish(2, 920);
    ticks(r, 100, still);
    assert.ok(r.sim.weapons.blades.every((b) => b.phase === 'orbit'));
});
test('Riven Pulse release acquires but manual drag and desktop keyboard/mouse remain authoritative', () => {
    for (const kind of ['touch', 'mouse', 'keyboard', 'drag']) {
        const r = rig(RIVEN);
        r.sim.stance = 'pulse';
        r.input.definition = { ...RIVEN, abilities: r.sim.activeAbilities() };
        r.sim.targets[0].z = -2;
        const a = r.sim.activeAbilities().find((a) => a.basic);
        if (kind === 'keyboard') {
            r.input.keyDown('Space', 0);
            r.input.keyUp('Space', 1);
        } else {
            r.input.begin(a, 1, 0, 0, 0, kind === 'mouse' ? 'mouse' : 'touch');
            if (kind === 'drag') r.input.drag(1, 0, 50);
            r.input.finish(1, 1);
        }
        ticks(r, 20, { ...retreat, movement: { x: 0, z: 0 } });
        assert.equal(r.sim.transactions.length, kind === 'touch' ? 1 : 0);
    }
});
test('feedback clears on target invalidation, range exit, death and input lifecycle reset', () => {
    for (const change of [
        (r) => (r.sim.targets[0].dead = true),
        (r) => (r.sim.targets[0].targetable = false),
        (r) => (r.sim.targets[0].z = -20),
        (r) => (r.sim.player.dead = true),
        (r) => r.input.clear()
    ]) {
        const r = rig();
        r.input.aimAssist.resolve(r.sim, r.basic, 0);
        assert.equal(r.input.aimAssist.status(r.sim).state, 'acquired');
        change(r);
        r.input.synchronize(r.sim);
        assert.equal(r.input.aimAssist.status(r.sim).targetId, null);
        r.input.clear();
        assert.equal(r.input.pendingBasic, null);
        assert.equal(r.input.attackHeld, false);
    }
});
test('render rate does not change attack counts, target choices, movement or transactions', () => {
    const runs = [];
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
        const r = rig();
        r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
        for (let i = 0; i < 1 / dt; i++) r.stepper.advance(r.sim, r.input, retreat, dt);
        runs.push({ transactions: r.sim.transactions, player: r.sim.player, casts: r.sim.actionSerial });
    }
    assert.deepEqual(runs[0], runs[1]);
    assert.deepEqual(runs[1], runs[2]);
});
test('bot commands, accuracy and decisions identical with assistance enabled/disabled for idle human', () => {
    const runs = [];
    for (const enabled of [true, false]) {
        const match = new CrownfallMatch(0, { bots: true });
        match.start();
        match.step(undefined, 3);
        const input = new AbilityCommands({ enabled: true }, () => match.human.player.angle, KIT);
        input.aimAssist = new HumanAimAssist(enabled);
        const stepper = new CommandStepper();
        for (let i = 0; i < 600; i++)
            stepper.advance(match.human, input, { ...retreat, movement: { x: 0, z: 0 } }, 1 / 60);
        assert.equal(nearestAimTarget(match.actors[3].sim, match.actors[3].sim.activeAbilities()[0]), null);
        runs.push({ match: match.snapshot(), bots: match.actors.filter((a) => a.bot).map((a) => ({ ...a.bot })) });
    }
    assert.deepEqual(runs[0], runs[1]);
});
test('live match retreat from three original bots damages a pursuer while retreat displacement stays positive', () => {
    const match = new CrownfallMatch(0, { bots: true });
    match.start();
    match.step(undefined, 3);
    for (const [i, actor] of match.actors.entries()) {
        Object.assign(actor.sim.player, { x: i < 3 ? 0 : (i - 4) * 0.6, z: i === 0 ? 0 : i < 3 ? 12 : -1.2 });
    }
    const input = new AbilityCommands({ enabled: true }, () => match.human.player.angle, KIT);
    input.aimAssist = new HumanAimAssist(true);
    const stepper = new CommandStepper();
    input.begin(KIT.abilities[0], 1, 0, 0, 0, 'touch');
    for (let i = 0; i < 90; i++) stepper.advance(match.human, input, retreat, 1 / 60);
    assert.ok(match.human.player.z > 0);
    assert.ok(match.human.transactions.some((t) => t.sourceId === '1-0' && t.abilityId === 'whip' && t.amount > 0));
    assert.ok(match.actors.slice(3).every((a) => a.bot.decisions > 0));
});

test('acquisition does not extend melee reach or guarantee a hit at the acquisition boundary', () => {
    for (const definition of [KIT, SET]) {
        const r = rig(definition);
        r.sim.targets[0].z = -acquisitionDistance(r.sim, r.basic);
        r.input.begin(r.basic, 1, 0, 0, 0, 'touch');
        r.input.finish(1, 2);
        ticks(r, 1, { ...retreat, movement: { x: 0, z: 0 } });
        assert.equal(r.sim.journal.latestAccepted.angle, Math.PI);
        assert.equal(r.sim.transactions.length, 0);
    }
});
