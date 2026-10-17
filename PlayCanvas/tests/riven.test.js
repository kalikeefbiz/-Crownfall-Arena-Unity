import assert from 'node:assert/strict';

import { test } from 'vitest';

import { makeCombatant, hasStatus, applyStatus } from '../src/combat/combat-core.js';
import { KIT } from '../src/combat/combat-data.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { modifierTotals, addModifier } from '../src/combat/modifiers.js';
import { RIVEN, RIVEN_TRAINING } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';
const idle = { moveX: 0, moveZ: 0 };
const advance = (s, n) => {
    for (let i = 0; i < Math.ceil(n * 60); i++) s.step(idle);
};
const target = (id, x, z, team = 2, kind = 'summoner', health = 10000) => ({
    ...makeCombatant(id, team, kind, health, 0.5),
    x,
    z,
    phase: 0,
    spawn: { x, z }
});
function setup() {
    const s = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    s.player.x = s.player.z = 0;
    s.targets = [];
    s.player.ultimateMeter = 100;
    return s;
}
test('Riven uses normal movement, independent facing and existing wall collision', () => {
    const s = setup();
    for (let i = 0; i < 60; i++) s.step({ moveX: 1, moveZ: 0, aiming: true, aimX: 0, aimZ: -1 });
    assert.ok(Math.abs(s.player.x - 6) < 1e-8);
    assert.equal(s.player.angle, Math.PI);
    s.player.x = -9;
    s.player.z = -4;
    for (let i = 0; i < 60; i++) s.step({ moveX: 0, moveZ: -1 });
    assert.ok(s.player.z > -4.56);
});
test('stance changes only basic/skill1 and enforces exact 3 second switch cooldown', () => {
    const s = setup();
    assert.equal(s.stance, 'reso');
    assert.equal(s.cast('stance'), true);
    assert.equal(s.stance, 'pulse');
    assert.equal(s.ability('reso'), null);
    assert.ok(s.ability('pulse'));
    assert.equal(s.cooldowns.remaining('stance', 0), 3);
    advance(s, 2.98);
    assert.equal(s.cast('stance'), false);
    advance(s, 0.04);
    assert.equal(s.cast('stance'), true);
    assert.equal(s.stance, 'reso');
});
test('two actual scythes launch separately; third input recalls both and resets after arrival', () => {
    const s = setup();
    assert.equal(s.weapons.blades.length, 2);
    s.cast('reso', Math.PI / 2);
    assert.deepEqual(
        s.weapons.blades.map((b) => b.phase),
        ['outgoing', 'orbit']
    );
    advance(s, 0.5);
    s.cast('reso', 0);
    assert.deepEqual(
        s.weapons.blades.map((b) => b.phase),
        ['outgoing', 'outgoing']
    );
    advance(s, 0.7);
    const positions = s.weapons.blades.map((b) => [b.x, b.z]);
    s.cast('reso');
    assert.deepEqual(
        s.weapons.blades.map((b) => [b.x, b.z]),
        positions
    );
    assert.ok(s.weapons.blades.every((b) => b.phase === 'returning'));
    assert.equal(s.cast('reso'), false);
    s.player.x = -2;
    advance(s, 1);
    assert.equal(s.weapons.next, 0);
    assert.ok(s.weapons.blades.every((b) => b.phase === 'orbit'));
});
test('outgoing hits count once per scythe/target; recall pierces and scales correctly', () => {
    const s = setup(),
        a = target('a', 3, 0),
        b = target('b', 6, 0);
    s.targets = [a, b];
    s.cast('reso', Math.PI / 2);
    advance(s, 0.65);
    s.cast('reso', Math.PI / 2);
    advance(s, 0.65);
    assert.equal(s.weapons.outgoingHits, 4);
    assert.equal(a.health, 9850);
    assert.equal(b.health, 9850);
    s.cast('reso');
    advance(s, 0.7);
    assert.equal(a.health, 9470);
    assert.equal(b.health, 9470);
    assert.equal(s.weapons.outgoingHits, 0);
});
test('recall follows moved Riven and hits enemies absent from outgoing paths', () => {
    const s = setup();
    s.cast('reso', Math.PI / 2);
    advance(s, 0.65);
    s.cast('reso', Math.PI / 2);
    advance(s, 0.65);
    s.player.z = 4;
    const t = target('new', 4, 2);
    s.targets = [t];
    s.cast('reso');
    advance(s, 0.8);
    assert.equal(t.health, 9810);
    assert.equal(s.weapons.next, 0);
});
test('stance switches retain scythe positions and sequence rather than granting free resets', () => {
    const s = setup();
    s.cast('reso', Math.PI / 2);
    advance(s, 0.7);
    s.cast('stance');
    assert.equal(s.weapons.next, 1);
    assert.equal(s.weapons.blades[0].phase, 'parked');
    advance(s, 3.01);
    s.cast('stance');
    s.cast('reso', Math.PI / 2);
    assert.equal(s.weapons.next, 2);
});
test('Elf Dance creates exactly five independent damaging scythes, with four second cooldown', () => {
    const s = setup(),
        t = target('t', 4, 0);
    s.targets = [t];
    let emitted = 0;
    const spawn = s.spawnProjectile.bind(s);
    s.spawnProjectile = (...args) => {
        emitted++;
        return spawn(...args);
    };
    s.cast('elf-dance', Math.PI / 2);
    assert.equal(s.cooldowns.remaining('riven-skill1', 0), 4);
    advance(s, 1);
    assert.equal(emitted, 5);
    assert.equal(t.health, 10000 - 5 * 48);
});
test('AMP increases damage for 3s and retains its 6s cooldown across stance switching', () => {
    const s = setup(),
        t = target('t', 2, 0);
    s.targets = [t];
    s.cast('amp');
    assert.equal(modifierTotals(s.player, 0).outgoing, 1.3);
    s.cast('stance');
    s.cast('pulse', Math.PI / 2);
    advance(s, 0.3);
    assert.equal(t.health, 9870);
    assert.equal(s.cast('amp'), false);
    advance(s, 2.72);
    assert.equal(modifierTotals(s.player, s.now).outgoing, 1);
    assert.ok(s.cooldowns.remaining('amp', s.now) > 2.9);
    s.cast('stance');
    assert.equal(s.cast('amp'), false);
    advance(s, 3.01);
    assert.equal(s.cast('amp'), true);
});
test('pulse travels along facing and damages first impact only', () => {
    const s = setup(),
        a = target('a', 3, 0),
        b = target('b', 6, 0),
        c = target('behind', -3, 0);
    s.targets = [a, b, c];
    s.cast('stance');
    s.cast('pulse', Math.PI / 2);
    advance(s, 1);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [9900, 10000, 10000]
    );
});
test('Percussive Solo damages radial enemies and slows movement, excluding allies/outside', () => {
    const s = setup(),
        a = target('a', 2, 0),
        b = target('b', 0, -2),
        ally = target('ally', 1, 0, 1),
        out = target('out', 7, 0);
    a.patrol = { axis: 'x', distance: 1, speed: 1 };
    s.targets = [a, b, ally, out];
    s.cast('stance');
    s.cast('percussive-solo');
    advance(s, 0.1);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [9870, 9870, 10000, 10000]
    );
    assert.equal(modifierTotals(a, s.now).movement, 0.65);
    assert.ok(hasStatus(a, 'slow', s.now));
    const phase = a.phase;
    advance(s, 0.1);
    assert.ok(Math.abs(a.phase - phase - 0.065) < 1e-8);
    advance(s, 2.2);
    assert.equal(modifierTotals(a, s.now).movement, 1);
});
test('shared slow modifier affects player movement and expires without modifying base speed', () => {
    const s = setup();
    addModifier(s.player, 'slow', { slow: 0.35, expires: 0.5 });
    s.step({ moveX: 1, moveZ: 0 });
    assert.ok(Math.abs(s.player.x - 0.065) < 1e-8);
    advance(s, 0.6);
    const x = s.player.x;
    s.step({ moveX: 1, moveZ: 0 });
    assert.ok(Math.abs(s.player.x - x - 0.1) < 1e-8);
});
test('Death Scream deals light damage/stun in either stance, targets enemy Summoners only', () => {
    for (const stance of ['reso', 'pulse']) {
        const s = setup();
        if (stance === 'pulse') s.cast('stance');
        const t = target('t', 3, 0),
            minion = target('minion', 2, 0, 2, 'minion'),
            ally = target('ally', 1, 0, 1),
            out = target('out', 9, 0);
        t.patrol = { axis: 'z', distance: 1, speed: 1 };
        s.targets = [t, minion, ally, out];
        s.cast('death-scream');
        assert.deepEqual(
            s.targets.map((t) => t.health),
            [9945, 10000, 10000, 10000]
        );
        advance(s, 1);
        assert.equal(t.phase, 0);
        assert.ok(hasStatus(t, 'stun', s.now));
        advance(s, 0.4);
        assert.ok(t.phase > 0);
    }
});
test('stun prevents movement, basic attacks, skills and stance changes', () => {
    const s = setup();
    applyStatus(s.player, 'stun', 1.3, s.now);
    s.step({
        moveX: 1,
        moveZ: 0,
        attackHeld: true,
        actions: [{ id: 'stance' }, { id: 'amp' }, { id: 'death-scream' }]
    });
    assert.equal(s.player.x, 0);
    assert.equal(s.stance, 'reso');
    assert.equal(s.weapons.next, 0);
    assert.equal(s.player.modifiers.amp, undefined);
    assert.equal(s.cooldowns.remaining('death-scream', s.now), 0);
    advance(s, 1.4);
    assert.equal(s.cast('stance'), true);
});
test('switch cannot reset Ultimate, AMP, basic or skill1 cooldowns', () => {
    const s = setup();
    s.cast('amp');
    s.cast('death-scream');
    s.cast('elf-dance');
    s.cast('reso');
    const before = { ...s.cooldowns.ends };
    s.cast('stance');
    for (const [id, end] of Object.entries(before)) assert.equal(s.cooldowns.ends[id], end);
    assert.equal(s.cast('percussive-solo'), false);
    assert.equal(s.cast('pulse'), false);
    assert.equal(s.cast('death-scream'), false);
});
test('Riven attacks damage Kit and Set combatants; their existing attacks damage Riven', () => {
    const s = setup();
    s.targets = [target('kit', 3, 0, 2, 'summoner', KIT.health), target('set', 5, 0, 2, 'summoner', SET.health)];
    s.cast('reso', Math.PI / 2);
    advance(s, 0.6);
    assert.equal(s.targets[0].health, KIT.health - 75);
    assert.equal(s.targets[1].health, SET.health - 75);
    for (const definition of [KIT, SET]) {
        const other = new CombatSimulation(definition);
        other.player.x = other.player.z = 0;
        const r = target('riven', 1, 0, 2, 'summoner', RIVEN.health);
        other.targets = [r];
        other.cast(definition.abilities.find((a) => a.basic).id, Math.PI / 2);
        assert.ok(r.health < RIVEN.health);
    }
});
test('death cleans pending scythes/barrages/buffs, prevents actions and stays defeated in the bounded sandbox', () => {
    const s = setup();
    s.cast('amp');
    s.cast('elf-dance');
    s.cast('reso');
    s.damage(s.player, 9999);
    assert.equal(s.player.dead, true);
    assert.equal(s.cast('stance'), false);
    assert.equal(s.weapons.blades.length, 0);
    assert.equal(s.advanced.barrages.length, 0);
    advance(s, 3.1);
    assert.equal(s.player.dead, true);
    assert.equal(s.weapons.blades.length, 0);
    assert.equal(s.player.modifiers.amp, undefined);
    assert.equal(s.cast('reso'), false);
});
