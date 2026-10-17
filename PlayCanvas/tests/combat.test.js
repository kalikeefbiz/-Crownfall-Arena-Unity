import assert from 'node:assert/strict';

import { test } from 'vitest';

import { makeCombatant, hasStatus, TemporaryAbilities, applyDamage, heal, respawn } from '../src/combat/combat-core.js';
import { KIT } from '../src/combat/combat-data.js';
import { CombatSimulation } from '../src/combat/combat.js';
const idle = { moveX: 0, moveZ: 0, aiming: false };
function advance(s, seconds) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) s.step(idle);
}
function target(id, x, z, kind = 'summoner') {
    return { ...makeCombatant(id, 2, kind, 1800, 0.5), x, z, spawn: { x, z } };
}
function setup() {
    const s = new CombatSimulation();
    s.player.x = 0;
    s.player.z = 0;
    s.targets = [];
    s.player.ultimateMeter = 100;
    return s;
}
test('Solar Whip hits all targets within facing cone, not behind or beyond range', () => {
    const s = setup();
    s.targets = [target('a', 2, 0), target('b', 3, 1), target('c', -2, 0), target('d', 8, 0)];
    s.cast('whip', Math.PI / 2);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [1690, 1690, 1800, 1800]
    );
    assert.equal(s.projectiles.items.filter((p) => p.active).length, 0);
});
test('Whip chains 1→2 and resets after combo timeout; cooldown prevents spam', () => {
    const s = setup();
    s.targets = [target('a', 2, 0)];
    assert.ok(s.cast('whip', Math.PI / 2));
    assert.equal(s.cast('whip', Math.PI / 2), false);
    advance(s, 0.56);
    s.cast('whip', Math.PI / 2);
    assert.equal(s.combo, 1);
    assert.equal(s.targets[0].health, 1540);
    advance(s, 1.3);
    s.cast('whip', Math.PI / 2);
    assert.equal(s.combo, 0);
});
test('three consecutive Ember Steps stun on third hit and reset streak', () => {
    const s = setup();
    s.targets = [target('a', 3, 0)];
    for (let i = 0; i < 3; i++) {
        s.player.x = 0;
        s.player.z = 0;
        s.cast('step', Math.PI / 2);
        advance(s, 0.4);
        assert.equal(s.streak, i === 2 ? 0 : i + 1);
        if (i < 2) {
            assert.equal(hasStatus(s.targets[0], 'stun', s.now), false);
            advance(s, 6);
        } else assert.equal(hasStatus(s.targets[0], 'stun', s.now), true);
    }
    assert.equal(s.targets[0].health, 1500);
});
test('a missed escape dash resets successful streak and third-hit charge', () => {
    const s = setup();
    s.streak = 2;
    s.targets = [target('a', 3, 0)];
    s.cast('step', -Math.PI / 2);
    advance(s, 0.4);
    assert.equal(s.streak, 0);
    assert.equal(s.targets[0].health, 1800);
});
test('dash stops at wall, cannot damage target through wall, and hits once per target', () => {
    const s = setup();
    s.player.x = -9;
    s.targets = [target('a', -9, -2), target('b', -9, -7)];
    s.cast('step', Math.PI);
    advance(s, 0.5);
    assert.ok(s.player.z >= -4.56);
    assert.equal(s.targets[0].health, 1700);
    assert.equal(s.targets[1].health, 1800);
    assert.equal(s.streak, 1);
});
test('Solar Ring is centered on Kit, damages all directions and respects radius', () => {
    const s = setup();
    s.targets = [target('a', 2, 0), target('b', -2, 0), target('c', 0, -2), target('d', 0, 5)];
    s.cast('ring', 0);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [1610, 1610, 1610, 1800]
    );
    assert.equal(s.cooldowns.remaining('ring', s.now), 4);
});
test('dragon pierces multiple unique Summoners, ignores minions, awards one Blast', () => {
    const s = setup();
    s.targets = [target('a', 2, 0), target('b', 7, 0), target('c', 12, 0), target('minion', 5, 0, 'minion')];
    s.cast('dragon', Math.PI / 2);
    advance(s, 1.5);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [1250, 1250, 1250, 1800]
    );
    assert.ok(s.temporary.available('blast', s.now));
    assert.equal(s.temporary.grants.get('blast').charges, 1);
    assert.equal(s.temporary.grants.size, 1);
});
test('single Summoner overlapped over many ticks cannot award Blast', () => {
    const s = setup();
    s.targets = [target('a', 2, 0)];
    s.cast('dragon', Math.PI / 2);
    advance(s, 1.5);
    assert.equal(s.targets[0].health, 1250);
    assert.equal(s.temporary.available('blast', s.now), false);
});
test('Blast is conditional, one shot lethal, consumed on cast including a miss', () => {
    const s = setup();
    s.targets = [target('a', 4, 0), target('b', 8, 0)];
    assert.equal(s.cast('blast', Math.PI / 2), false);
    s.temporary.grant('blast', 15, s.now);
    s.cast('blast', Math.PI / 2);
    assert.equal(s.temporary.available('blast', s.now), false);
    advance(s, 0.3);
    assert.equal(s.targets[0].dead, true);
    assert.equal(s.targets[1].health, 1800);
    s.temporary.grant('blast', 15, s.now);
    s.cast('blast', Math.PI);
    assert.equal(s.temporary.available('blast', s.now), false);
});
test('temporary grants expire and cannot be consumed twice', () => {
    const t = new TemporaryAbilities();
    t.grant('x', 2, 0);
    assert.equal(t.available('x', 2), false);
    t.update(2);
    assert.equal(t.grants.size, 0);
    t.grant('x', 2, 3);
    assert.ok(t.consume('x', 3));
    assert.equal(t.consume('x', 3), false);
});
test('Wilderness movement is exactly 5% faster and deactivates on leaving', () => {
    const s = setup();
    s.player.x = -17;
    s.player.z = -11;
    const x = s.player.x;
    s.step({ moveX: 1, moveZ: 0 });
    assert.ok(Math.abs(s.player.x - x - 0.105) < 1e-9);
    assert.ok(s.inWilderness);
    s.player.x = 0;
    s.player.z = 0;
    s.step({ moveX: 1, moveZ: 0 });
    assert.ok(Math.abs(s.player.x - 0.1) < 1e-9);
    assert.equal(s.inWilderness, false);
});
test('stun freezes a moving training target and naturally expires', () => {
    const s = new CombatSimulation(),
        t = s.targets.find((t) => t.id === 'moving');
    t.statuses.stun = s.now + 1;
    const x = t.x;
    advance(s, 0.5);
    assert.equal(t.x, x);
    advance(s, 0.6);
    assert.notEqual(t.x, x);
});
test('defeat remains final in combat sandbox', () => {
    const s = setup();
    s.damage(s.player, 9999);
    advance(s, 10);
    assert.equal(s.player.dead, true);
    assert.equal(s.cast('ring'), false);
});
test('generic health system clamps healing and damage', () => {
    const t = makeCombatant('t', 2, 'summoner', 100, 0.5);
    assert.equal(applyDamage(t, 30, 0, 4), 30);
    heal(t, 500);
    assert.equal(t.health, 100);
    assert.equal(applyDamage(t, 200, 0, 4), 100);
    heal(t, 10);
    assert.equal(t.health, 0);
    respawn(t);
    assert.equal(t.health, 100);
});
test('fixed established cooldowns and exact normal ability count', () => {
    assert.equal(KIT.abilities.length, 4);
    assert.equal(KIT.abilities.find((a) => a.id === 'step').cooldown, 6);
    assert.equal(KIT.abilities.find((a) => a.id === 'ring').cooldown, 4);
});
