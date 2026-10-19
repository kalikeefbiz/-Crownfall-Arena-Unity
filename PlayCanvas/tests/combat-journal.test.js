import assert from 'node:assert/strict';

import { test } from 'vitest';

import { makeCombatant } from '../src/combat/combat-core.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { RIVEN } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';
const advance = (s, n) => {
    for (let i = 0; i < Math.ceil(n * 60); i++) s.step({});
};
function setup(definition) {
    const s = new CombatSimulation(definition);
    s.player.x = s.player.z = 0;
    s.player.angle = Math.PI / 2;
    s.targets = [{ ...makeCombatant('target', 2, 'summoner', 5000, 0.45), x: 1, z: 0 }];
    return s;
}
test('accepted cone hit and rejection are distinct; unique target count and damage follow transactions', () => {
    const s = setup();
    s.cast('whip');
    assert.equal(s.journal.latestAccepted.result, 'HIT');
    assert.deepEqual(s.journal.latestAccepted.targetIds, ['target']);
    assert.equal(s.journal.latestAccepted.damage, 110);
    s.cast('whip');
    assert.equal(s.journal.latestAttempt.accepted, false);
    assert.equal(s.journal.latestAttempt.reason, 'cooldown');
    assert.equal(s.journal.latestAccepted.result, 'HIT');
    assert.equal(s.journal.hits[0].amount, s.transactions[0].amount);
});
test('cone miss has zero transactions and an explicit resolved MISS', () => {
    const s = setup();
    s.cast('whip', -Math.PI / 2);
    assert.equal(s.journal.latestResolution.result, 'MISS');
    assert.equal(s.journal.latestResolution.targetIds.length, 0);
    assert.equal(s.transactions.length, 0);
});
test('projectile remains pending during travel and reports HIT only from damage; empty path resolves MISS at range', () => {
    const s = setup();
    s.player.ultimateMeter = 100;
    s.targets[0].x = 5;
    s.cast('dragon');
    const record = s.journal.latestAccepted;
    assert.equal(record.result, 'PENDING');
    advance(s, 0.1);
    assert.equal(record.result, 'PENDING');
    assert.equal(s.journal.hits.length, 0);
    advance(s, 1.5);
    assert.equal(record.result, 'HIT');
    assert.equal(record.damage, 550);
    s.temporary.grant('blast', 15, s.now);
    s.cast('blast', -Math.PI / 2);
    const miss = s.journal.latestAccepted;
    advance(s, 1);
    assert.equal(miss.result, 'MISS');
});
test('Set contact strikes and delayed ground impact resolve their own originating cast', () => {
    const s = setup(SET);
    s.targets[0].x = 3;
    s.cast('predatory');
    const leap = s.journal.latestAccepted;
    advance(s, 0.7);
    assert.equal(leap.result, 'HIT');
    assert.equal(leap.damage, 320);
    s.player.ultimateMeter = 100;
    s.cast('fist', 0, { x: 3, z: 0 });
    const ground = s.journal.latestAccepted;
    assert.equal(ground.result, 'PENDING');
    advance(s, 0.5);
    assert.equal(ground.result, 'PENDING');
    advance(s, 0.3);
    assert.equal(ground.result, 'HIT');
    assert.equal(ground.damage, 460);
});
test('Elf Dance waits for its fifth projectile and returning scythes retain separate cast evidence', () => {
    const s = setup(RIVEN);
    s.cast('elf-dance');
    const barrage = s.journal.latestAccepted;
    advance(s, 0.2);
    assert.equal(barrage.result, 'PENDING');
    advance(s, 1);
    assert.equal(barrage.result, 'HIT');
    assert.equal(barrage.damage, 240);
    s.cast('reso');
    advance(s, 0.5);
    s.cast('reso');
    advance(s, 0.7);
    s.cast('reso');
    const recall = s.journal.latestAccepted;
    advance(s, 0.8);
    assert.equal(recall.result, 'HIT');
    assert.equal(recall.pending, 0);
});
