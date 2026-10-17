import assert from 'node:assert/strict';

import { test } from 'vitest';

import { makeCombatant } from '../src/combat/combat-core.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { SET, SET_TRAINING } from '../src/combat/summoners.js';
const idle = { moveX: 0, moveZ: 0 };
const advance = (s, n) => {
    for (let i = 0; i < Math.ceil(n * 60); i++) s.step(idle);
};
function target(id, x, z, team = 2, kind = 'summoner') {
    return { ...makeCombatant(id, team, kind, 1800, 0.5), x, z, spawn: { x, z } };
}
function setup() {
    const s = new CombatSimulation(SET, SET_TRAINING);
    s.player.x = s.player.z = 0;
    s.targets = [];
    s.player.ultimateMeter = 100;
    return s;
}
test('presence requires a living allied Summoner and protects all nearby allies only', () => {
    const s = setup(),
        a = target('a', 3, 0, 1),
        b = target('b', 4, 0, 1),
        m = target('m', 2, 0, 1, 'minion'),
        out = target('out', 8, 0, 1);
    s.targets = [a, b, m, out];
    s.damage(s.player, 100);
    s.damage(a, 100);
    s.damage(b, 100);
    s.damage(m, 100);
    s.damage(out, 100);
    assert.equal(s.player.health, 1152);
    assert.equal(a.health, 1702);
    assert.equal(b.health, 1702);
    assert.equal(m.health, 1700);
    assert.equal(out.health, 1700);
    a.x = b.x = 20;
    s.damage(s.player, 100);
    assert.equal(s.player.health, 1052);
    assert.equal(s.auraAllies.length, 0);
});
test('dead allies and minions cannot activate presence; Set death removes aura', () => {
    const s = setup(),
        a = target('a', 2, 0, 1);
    a.dead = true;
    s.targets = [a, target('m', 1, 0, 1, 'minion')];
    s.refreshAura();
    assert.equal(s.auraAllies.length, 0);
    a.dead = false;
    s.refreshAura();
    assert.equal(s.auraAllies.length, 1);
    s.damage(s.player, 9999);
    s.refreshAura();
    assert.equal(a.modifiers['aura:player'], undefined);
});
test('Claw punch-punch-kick chain resets and movement remains enabled between strikes', () => {
    const s = setup(),
        t = target('t', 1.3, 0);
    s.targets = [t];
    s.cast('claw', Math.PI / 2);
    assert.equal(t.health, 1710);
    advance(s, 0.51);
    s.cast('claw', Math.PI / 2);
    assert.equal(t.health, 1620);
    advance(s, 0.51);
    s.cast('claw', Math.PI / 2);
    assert.equal(t.health, 1485);
    s.step({ moveX: 0, moveZ: 1 });
    assert.ok(s.player.z > 0);
    advance(s, 1.2);
    s.cast('claw', Math.PI / 2);
    assert.equal(s.combo, 0);
});
test('War Cry boosts damage, mitigates incoming damage, expires and has 10s cooldown', () => {
    const s = setup(),
        t = target('t', 1, 0);
    s.targets = [t];
    s.cast('warcry');
    assert.equal(s.cooldowns.remaining('warcry', s.now), 10);
    s.cast('claw', Math.PI / 2);
    assert.equal(t.health, 1687.5);
    s.damage(s.player, 100);
    assert.equal(s.player.health, 1170);
    advance(s, 5.1);
    s.damage(s.player, 100);
    assert.equal(s.player.health, 1070);
    assert.equal(s.cast('warcry'), false);
});
test('aura and War Cry multiply mitigation without buffing allies offense', () => {
    const s = setup(),
        a = target('a', 2, 0, 1);
    s.targets = [a];
    s.cast('warcry');
    s.damage(s.player, 100);
    s.damage(a, 100);
    assert.ok(Math.abs(s.player.health - (1250 - 78.4)) < 1e-9);
    assert.equal(a.health, 1702);
});
test('missed leap completes its full distance with no strikes and starts full cooldown at resolution', () => {
    const s = setup();
    s.cast('predatory', Math.PI / 2);
    assert.equal(s.cooldowns.remaining('predatory', s.now), 0);
    while (s.advanced.leap) s.step(idle);
    assert.ok(Math.abs(s.player.x - 4) < 1e-8);
    assert.equal(s.advanced.sequence, null);
    assert.equal(s.effects.items.filter((e) => e.active && e.type === 'melee').length, 0);
    assert.equal(s.cooldowns.remaining('predatory', s.now), 8);
});
test('contact starts immediate combo, strongest final strike, boosted by War Cry', () => {
    const s = setup(),
        t = target('t', 3, 0);
    s.targets = [t];
    s.cast('warcry');
    s.cast('predatory', Math.PI / 2);
    while (s.advanced.leap) s.step(idle);
    assert.equal(t.health, 1800 - 70 * 1.25);
    const x = s.player.x;
    assert.ok(x < 3);
    advance(s, 0.5);
    assert.equal(t.health, 1400);
    assert.equal(s.player.x, x);
});
test('leap never steers toward a target and respects walls', () => {
    const s = setup();
    s.targets = [target('t', 2, 2)];
    s.cast('predatory', Math.PI / 2);
    advance(s, 0.3);
    assert.ok(Math.abs(s.player.z) < 1e-9);
    assert.equal(s.targets[0].health, 1800);
    const wall = setup();
    wall.player.x = -9;
    wall.player.z = -4;
    wall.cast('predatory', Math.PI);
    advance(wall, 0.4);
    assert.ok(wall.player.z > -4.56);
    assert.equal(wall.advanced.sequence, null);
});
test('subsequent combo strikes independently miss a target that escapes melee range', () => {
    const s = setup(),
        t = target('t', 3, 0);
    s.targets = [t];
    s.cast('predatory', Math.PI / 2);
    while (s.advanced.leap) s.step(idle);
    t.z = 10;
    advance(s, 0.5);
    assert.equal(t.health, 1730);
});
test('Fist locks a world location, impacts after delay, hits all enemies and excludes allies', () => {
    const s = setup();
    s.targets = [target('a', 8, 0), target('b', 9, 1), target('ally', 8, 0, 1), target('out', 13, 0)];
    s.cast('fist', 0, { x: 8, z: 0 });
    s.player.x = -5;
    advance(s, 0.5);
    assert.equal(s.targets[0].health, 1800);
    advance(s, 0.3);
    assert.deepEqual(
        s.targets.map((t) => t.health),
        [1340, 1340, 1800, 1800]
    );
});
test('Fist clamps range and evaluates War Cry when impact lands', () => {
    const s = setup();
    s.targets = [target('t', 14, 0)];
    s.cast('warcry');
    s.cast('fist', 0, { x: 99, z: 0 });
    assert.equal(s.advanced.impacts[0].x, 14);
    advance(s, 0.8);
    assert.equal(s.targets[0].health, 1225);
});
test('Kit lethal damage still bypasses defensive reductions', () => {
    const s = setup();
    s.cast('warcry');
    s.damage(s.player, 1, null, { lethal: true });
    assert.equal(s.player.dead, true);
    assert.equal(s.player.health, 0);
});
