import assert from 'node:assert/strict';

import { test } from 'vitest';

import { makeCombatant, applyStatus } from '../src/combat/combat-core.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { RIVEN } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';
const advance = (s, n) => {
    for (let i = 0; i < Math.ceil(n * 60); i++) s.step({});
};
const target = (id, x = 2, team = 2, kind = 'summoner') => ({
    ...makeCombatant(id, team, kind, 10000, 0.45),
    x,
    z: 0,
    ultimateMeter: 0
});
function setup(definition) {
    const s = new CombatSimulation(definition);
    s.player.x = s.player.z = 0;
    s.targets = [];
    return s;
}
test('ultimate starts empty, damage provenance awards exact dealt/received meter, caps at 100', () => {
    const s = setup(),
        t = target('enemy');
    assert.equal(s.player.ultimateMeter, 0);
    assert.equal(s.cast('dragon'), false);
    s.damage(t, 100, s.player);
    assert.equal(s.player.ultimateMeter, 4);
    assert.equal(t.ultimateMeter, 2.5);
    s.damage(s.player, 100, t);
    assert.equal(s.player.ultimateMeter, 6.5);
    assert.equal(t.ultimateMeter, 6.5);
    s.damage(t, 5000, s.player);
    assert.equal(s.player.ultimateMeter, 100);
    assert.equal(t.ultimateMeter, 100);
});
test('friendly, non-Summoner and environmental damage do not award ultimate', () => {
    const s = setup();
    const ally = target('ally', 2, 1),
        object = target('object', 2, 2, 'object');
    s.damage(ally, 100, s.player);
    s.damage(object, 100, s.player);
    s.damage(s.player, 100);
    assert.equal(s.player.ultimateMeter, 0);
});
test('successful ultimate consumes meter, cooldown is an independent gate; rejected casts preserve meter', () => {
    const s = setup();
    s.player.ultimateMeter = 100;
    assert.equal(s.cast('dragon'), true);
    assert.equal(s.player.ultimateMeter, 0);
    s.player.ultimateMeter = 100;
    assert.equal(s.cast('dragon'), false);
    assert.equal(s.player.ultimateMeter, 100);
    advance(s, 18.1);
    assert.equal(s.cast('dragon'), true);
    assert.equal(s.player.ultimateMeter, 0);
});
test('all attack shapes exclude allied and defeated targets; source tracks transaction', () => {
    const s = setup(),
        enemy = target('e'),
        ally = target('a', 2, 1),
        dead = target('d');
    dead.dead = true;
    s.targets = [enemy, ally, dead];
    s.cast('whip', Math.PI / 2);
    assert.equal(enemy.health, 9890);
    assert.equal(ally.health, 10000);
    assert.equal(dead.health, 10000);
    assert.equal(s.player.ultimateMeter, 4.4);
    assert.equal(enemy.ultimateMeter, 2.75);
});
test('stun cancels Set leap with completion cooldown and prevents later contact strikes', () => {
    const s = setup(SET),
        t = target('e', 3);
    s.targets = [t];
    s.cast('predatory', Math.PI / 2);
    applyStatus(s.player, 'stun', 1, s.now);
    s.step({});
    assert.equal(s.advanced.leap, null);
    assert.equal(s.advanced.sequence, null);
    assert.equal(s.cooldowns.remaining('predatory', s.now), 8);
    advance(s, 1.2);
    assert.equal(t.health, 10000);
});
test('stun cancels Set sequence after its immediate contact strike', () => {
    const s = setup(SET),
        t = target('e', 3);
    s.targets = [t];
    s.cast('predatory', Math.PI / 2);
    while (s.advanced.leap) s.step({});
    assert.equal(t.health, 9930);
    applyStatus(s.player, 'stun', 1, s.now);
    advance(s, 0.6);
    assert.equal(t.health, 9930);
    assert.equal(s.advanced.sequence, null);
});
test('death cancels ground impacts, barrage, buffs and pending weapons without respawn', () => {
    for (const definition of [SET, RIVEN]) {
        const s = setup(definition);
        s.player.ultimateMeter = 100;
        s.cast(definition === SET ? 'fist' : 'elf-dance');
        s.damage(s.player, 99999);
        advance(s, 20);
        assert.equal(s.player.dead, true);
        assert.equal(s.advanced.impacts.length, 0);
        assert.equal(s.advanced.barrages.length, 0);
        assert.equal(s.weapons.blades.length, 0);
    }
});
test('recall scaling caps shared outgoing hit count at six', () => {
    const s = setup(RIVEN);
    s.cast('reso', 0);
    advance(s, 0.5);
    s.cast('reso', 0);
    advance(s, 0.5);
    s.weapons.outgoingHits = 100;
    s.cast('reso');
    assert.equal(s.weapons.blades[0].ability.damage, 237.5);
    assert.equal(s.weapons.blades[1].ability.damage, 237.5);
});

test('untargetable enemies are excluded and damage transactions retain source provenance', () => {
    const s = setup(),
        t = target('e');
    t.targetable = false;
    s.targets = [t];
    s.cast('ring');
    assert.equal(t.health, 10000);
    t.targetable = true;
    s.cast('whip', Math.PI / 2);
    assert.deepEqual(s.transactions[0], {
        time: 0,
        sourceId: 'player',
        targetId: 'e',
        amount: 110,
        abilityId: 'whip',
        defeated: false
    });
    s.damage(t, 99999, s.player);
    assert.equal(t.dead, true);
    assert.equal(t.targetable, false);
    assert.equal(s.valid(t), false);
});

test('Kit held Basic repeats through the established 0.55 second cadence without a release cast', () => {
    const s = setup(),
        t = target('e');
    s.targets = [t];
    for (let i = 0; i < 60; i++) s.step({ attackHeld: true, aiming: true, aimX: 1, aimZ: 0 });
    assert.equal(t.health, 9740);
    assert.equal(s.transactions.length, 2);
    assert.ok(s.transactions[1].time - s.transactions[0].time >= 0.55 - 1e-9);
});
test('Elf Dance uses all five source cadence deadlines within one fixed tick', () => {
    const s = setup(RIVEN),
        times = [];
    const spawn = s.spawnProjectile.bind(s);
    s.spawnProjectile = (...args) => {
        times.push(s.now);
        return spawn(...args);
    };
    s.cast('elf-dance', 0);
    advance(s, 0.5);
    assert.equal(times.length, 5);
    times.forEach((time, i) => assert.ok(time >= i * 0.085 && time <= i * 0.085 + 1 / 60 + 1e-9));
});

test('cone, radial and ground shapes deduplicate combatant identity', () => {
    for (const [definition, id] of [
        [undefined, 'whip'],
        [undefined, 'ring'],
        [SET, 'fist']
    ]) {
        const s = setup(definition),
            t = target('e');
        s.targets = [t, t];
        s.player.ultimateMeter = 100;
        s.cast(id, Math.PI / 2, { x: 2, z: 0 });
        if (id === 'fist') advance(s, 0.8);
        assert.equal(t.health, 10000 - { whip: 110, ring: 190, fist: 460 }[id]);
        assert.equal(s.transactions.length, 1);
    }
});
