import assert from 'node:assert/strict';

import { test, expect } from 'vitest';

import { BotController } from '../src/combat/bot-controller.js';
import { CrownfallRules } from '../src/combat/crownfall-rules.js';
import { LANE, MATCH_MAP } from '../src/combat/match-data.js';
import {
    referenceToWorld,
    worldToReference,
    MATCH_WORLD,
    matchSpawn,
    CAMERA_OFFSET
} from '../src/combat/match-space.js';
import { CrownfallMatch } from '../src/combat/match.js';
// Exact frozen V21 tests/match.test.js examples use its legacy training LANE.
class ReferenceRules extends CrownfallRules {
    constructor(settings = {}) {
        super(settings, LANE);
    }
}
const pair = (b, r) => [
    { id: 'b', team: 1, x: b, z: 0, dead: false },
    { id: 'r', team: 2, x: r, z: 0, dead: false }
];
test('position changes control without damage or kills; approaching defender never sets contest flag', () => {
    const r = new ReferenceRules(),
        e = pair(8, 13);
    r.step(e, 1);
    assert.equal(r.control, 0.75);
    e[1].x = 12;
    r.step(e, 1);
    assert.ok(r.control > 0.7);
    assert.equal(r.scoringTeam, 1);
    e[0].x = 2;
    e[1].x = 2.2;
    r.step(e, 1);
    assert.ok(Math.abs(r.control - 0.55) < 1e-10);
    assert.equal(r.scoringTeam, 1);
});
test('grace requires uninterrupted pressure, including exact fractional tick accounting', () => {
    const r = new ReferenceRules({ graceSeconds: 2, cpPerSecond: 10 }),
        e = pair(2, 6);
    r.step(e, 1.5);
    assert.equal(r.cp[1], 0);
    r.step(e, 0.75);
    assert.equal(r.cp[1], 2.5);
    e[0].x = -6;
    e[1].x = 6;
    r.step(e, 0.2);
    assert.equal(r.scoringTeam, 0);
    e[0].x = 2;
    r.step(e, 1);
    assert.equal(r.cp[1], 2.5);
    assert.equal(r.scoringTeam, 0);
});
test('losing territory 76 to 55 keeps Blue scoring; 50 stops immediately; Red requires fresh grace', () => {
    const r = new ReferenceRules({ graceSeconds: 2, cpPerSecond: 10 }),
        e = pair(9, 12.84);
    r.step(e, 3);
    const cp = r.cp[1];
    e[0].x = 1;
    e[1].x = 3.2;
    r.step(e, 1);
    assert.ok(r.cp[1] > cp);
    const earned = r.cp[1];
    e[0].x = -2;
    e[1].x = 2;
    r.step(e, 1);
    assert.equal(r.cp[1], earned);
    assert.equal(r.scoringTeam, 0);
    e[0].x = -5;
    e[1].x = 1;
    r.step(e, 1);
    assert.equal(r.cp[2], 0);
    r.step(e, 1.1);
    assert.ok(r.cp[2] > 0);
    assert.equal(r.cp[1], earned);
});
test('lane abandonment removes all Wilderness pressure; empty lane neutral; unopposed run reaches goal', () => {
    const r = new ReferenceRules(),
        e = pair(12, 16);
    e[0].z = 8;
    r.step(e, 0.1);
    assert.equal(r.control, 0.5);
    e[1].x = -10;
    r.step(e, 0.1);
    assert.ok(r.control < 0.3);
    e[1].x = LANE.goalA;
    r.step(e, 0.1);
    assert.equal(r.result.winner, 2);
    assert.equal(r.result.reason, 'total-control');
    const empty = new ReferenceRules();
    e[1].z = -8;
    empty.step(e, 0.1);
    assert.equal(empty.control, 0.5);
    assert.equal(empty.scoringTeam, 0);
});
test('100 percent wins immediately without grace or accumulated CP in both directions', () => {
    for (const team of [1, 2]) {
        const r = new ReferenceRules({ graceSeconds: 3 }),
            e = pair(21, -21);
        e[team === 1 ? 1 : 0].z = 9;
        r.step(e, 0.016);
        assert.equal(r.result.winner, team);
        assert.equal(r.result.reason, 'total-control');
        assert.equal(r.cp[team], 0);
    }
});
test('CP retains prior progress, clamps at target and freezes match after victory', () => {
    const r = new ReferenceRules({ cpTarget: 100, cpPerSecond: 10, graceSeconds: 1 }),
        e = pair(1, 4);
    r.cp[1] = 99;
    r.cp[2] = 98;
    r.step(e, 1.2);
    assert.equal(r.cp[1], 100);
    assert.equal(r.cp[2], 98);
    assert.equal(r.result.reason, 'points');
    const elapsed = r.elapsed;
    r.step(e, 100);
    assert.equal(r.elapsed, elapsed);
});
test('depth scaling is configurable and flat scoring is the default; optional timer is a draw', () => {
    const a = new ReferenceRules({ graceSeconds: 0 }),
        b = new ReferenceRules({ graceSeconds: 0, depthBonus: 1 });
    a.step(pair(8, 13), 1);
    b.step(pair(8, 13), 1);
    assert.equal(a.cp[1], 12);
    assert.equal(b.cp[1], 18);
    const timer = new ReferenceRules({ timeLimitSeconds: 1 });
    timer.step(pair(-10, 10), 1);
    assert.equal(timer.result.winner, 0);
});
test('a pending reserved respawn prevents elimination; simultaneous terminal defeat is a draw', () => {
    const r = new ReferenceRules({ startingTickets: 0 }),
        e = pair(-10, 10);
    for (const p of e) {
        p.dead = true;
        p.respawnReserved = false;
    }
    e[1].respawnReserved = true;
    r.step(e, 0.1);
    assert.equal(r.result.winner, 2);
    const d = new ReferenceRules({ startingTickets: 0 });
    e[1].respawnReserved = false;
    d.step(e, 0.1);
    assert.equal(d.result.winner, 0);
});
test('canonical transform, map walls, lane and spawns preserve accepted behind-player camera', () => {
    expect(referenceToWorld({ x: -30, z: -8 })).toEqual({ x: -8, z: 30 });
    expect(referenceToWorld({ x: 28, z: 12 })).toEqual({ x: 12, z: -28 });
    for (const p of [
        { x: -30, z: 8 },
        { x: 28, z: -12 },
        { x: 0, z: 0 }
    ])
        expect(worldToReference(referenceToWorld(p))).toEqual(p);
    expect(MATCH_WORLD.width).toBe(64);
    expect(MATCH_WORLD.depth).toBe(68);
    expect(MATCH_WORLD.walls).toEqual(MATCH_MAP.walls.map((w) => ({ ...referenceToWorld(w), w: w.d, d: w.w, h: w.h })));
    expect(CAMERA_OFFSET).toEqual({ y: 15, z: 12.5865 });
    const m = new CrownfallMatch(0, { bots: true });
    expect(m.rules.control).toBe(0.5);
    expect(m.rules.front).toBe(0);
    expect(m.actors.filter((a) => a.bot)).toHaveLength(5);
    m.entities.forEach((p, i) => {
        expect({ x: p.x, z: p.z }).toEqual(matchSpawn(p.team, i % 3));
        expect(m.actors[i].sim.blocked(p.x, p.z)).toBe(false);
    });
    expect(m.human.player.angle).toBe(Math.PI);
});
test('canonical crossing keeps/clamps prior positional front and both-team endpoint inset', () => {
    const r = new CrownfallRules();
    const e = pair(8, 16);
    r.measure(e);
    expect(r.front).toBe(12);
    e[0].x = 20;
    e[1].x = 10;
    r.measure(e);
    expect(r.front).toBe(12);
    e[1].x = 15;
    r.measure(e);
    expect(r.front).toBe(15);
    e[0].x = 30;
    e[1].x = 29;
    r.measure(e);
    expect(r.front).toBeCloseTo(27.944);
    expect(r.control).toBeCloseTo(0.999);
    e[0].x = -29;
    e[1].x = -30;
    r.measure(e);
    expect(r.front).toBeCloseTo(-27.944);
});
test('living nonreserved lane actors only; boundary inclusive; empty neutral', () => {
    const r = new CrownfallRules();
    const e = pair(20, -20);
    e[1].z = 12.01;
    r.measure(e);
    expect(r.front).toBe(20);
    e[0].respawnReserved = true;
    r.measure(e);
    expect(r.control).toBe(0.5);
    e[0].respawnReserved = false;
    e[0].dead = true;
    r.measure(e);
    expect(r.front).toBe(0);
    e[0].dead = false;
    e[0].z = 12;
    r.measure(e);
    expect(r.front).toBe(20);
});
test('canonical 76 to 55 keeps pressure, neutral resets, opposite side fresh grace, retained CP', () => {
    const r = new CrownfallRules();
    const e = pair(10, 19.12);
    r.step(e, 2.25);
    expect(r.control).toBeCloseTo(0.76);
    expect(r.cp[1]).toBe(3);
    e[0].x = 2;
    e[1].x = 3.6;
    r.step(e, 1);
    expect(r.control).toBeCloseTo(0.55);
    expect(r.cp[1]).toBe(15);
    e[0].x = -2;
    e[1].x = 2;
    r.step(e, 0.5);
    expect(r.scoringTeam).toBe(0);
    e[0].x = -6;
    r.step(e, 1.5);
    expect(r.cp[2]).toBe(0);
    r.step(e, 0.75);
    expect(r.cp[2]).toBe(3);
    expect(r.cp[1]).toBe(15);
});
test('win priority total control before tickets before points before regulation, and complete freeze', () => {
    for (const reason of ['total-control', 'tickets', 'points', 'regulation']) {
        const r = new CrownfallRules();
        const e = pair(2, 6);
        r.elapsed = 299.9;
        r.cp[1] = 999.9;
        r.pressureTeam = 1;
        r.pressureAge = 3;
        if (reason === 'total-control') {
            e[0].x = 28;
            e[1].dead = true;
            e[0].dead = false;
        }
        if (reason === 'tickets') e[1].dead = true;
        if (reason === 'regulation') {
            r.cp[1] = 2;
            r.pressureAge = 0;
        }
        r.step(e, 0.2);
        expect(r.result.reason).toBe(reason);
        const frozen = structuredClone(r);
        r.step(pair(-28, 28), 10);
        r.measure(pair(-28, 28));
        expect({ ...r }).toEqual({ ...frozen });
    }
    for (const team of [1, 2]) {
        const r = new CrownfallRules();
        const e = pair(28, -28);
        e[team === 1 ? 1 : 0].z = 13;
        r.step(e, 1 / 60);
        expect(r.result).toMatchObject({ winner: team, reason: 'total-control' });
        expect(r.cp[team]).toBe(0);
    }
});
test('300 seconds caps regulation, resolves retained CP then territory then draw', () => {
    for (const [cp, b, red, winner] of [
        [{ 1: 4, 2: 5 }, 2, 6, 2],
        [{ 1: 5, 2: 5 }, 2, 6, 1],
        [{ 1: 5, 2: 5 }, -6, -2, 2],
        [{ 1: 5, 2: 5 }, -2, 2, 0]
    ]) {
        const r = new CrownfallRules();
        r.cp = cp;
        r.elapsed = 299.75;
        r.step(pair(b, red), 1);
        expect(r.elapsed).toBe(300);
        expect(r.result).toMatchObject({ winner, reason: 'regulation' });
    }
});
test('canonical CP exactly 1000 and participant pressure records/results independent of local human', () => {
    const m = new CrownfallMatch();
    m.start();
    m.step({}, 3);
    for (const p of m.entities) Object.assign(p, referenceToWorld({ x: p.team === 1 ? 4 : 8, z: 0 }));
    m.entities[1].x = 13;
    m.entities[2].respawnReserved = true;
    m.step({}, 1.5);
    expect(m.actors.every((a) => a.record.pressureSeconds === 0)).toBe(true);
    m.step({}, 0.75);
    expect(m.rules.cp[1]).toBe(3);
    expect(m.actors[0].record.pressureSeconds).toBe(0.75);
    expect(m.actors[1].record.pressureSeconds).toBe(0);
    expect(m.actors[2].record.pressureSeconds).toBe(0);
    m.rules.cp[1] = 999;
    m.step({}, 0.5);
    expect(m.rules.cp[1]).toBe(1000);
    expect(m.rules.result.reason).toBe('points');
    const result = m.results;
    expect(result.participants).toHaveLength(6);
    expect(new Set(result.participants.map((a) => a.id)).size).toBe(6);
    expect(result.participants.every((a) => 'pressureSeconds' in a && 'damage' in a && 'assists' in a)).toBe(true);
    const frozen = structuredClone(m.snapshot());
    m.step({ moveX: 1 }, 10);
    expect(m.snapshot()).toEqual(frozen);
    const reset = new CrownfallMatch();
    expect(reset.rules.cp).toEqual({ 1: 0, 2: 0 });
    expect(reset.rules.control).toBe(0.5);
    expect(reset.results).toBe(null);
    expect(reset.actors.every((a) => Object.values(a.record).every((v) => v === 0))).toBe(true);
});
for (let selected = 0; selected < 3; selected++)
    test(`canonical natural match ${selected} reaches Crownfall result with five ordinary command bots`, () => {
        const m = new CrownfallMatch(selected, { bots: true });
        const pilot = new BotController(9);
        m.start();
        for (let i = 0; i < 60 * 304 && !m.rules.result; i++) m.step(pilot.command(m.human));
        expect(m.rules.result).toBeTruthy();
        expect(m.results.participants).toHaveLength(6);
        expect(m.actors.slice(1).every((a) => a.record.damage > 0)).toBe(true);
        expect(
            m.entities.every(
                (p) => Number.isFinite(p.x) && !m.actors.find((a) => a.sim.player === p).sim.blocked(p.x, p.z)
            )
        ).toBe(true);
    }, 30000);

test('participant pressure time stops at neutral despite historical CP and switches only after fresh grace', () => {
    const m = new CrownfallMatch();
    m.start();
    m.step({}, 3);
    for (const p of m.entities) Object.assign(p, referenceToWorld({ x: p.team === 1 ? 4 : 8, z: 0 }));
    m.debugAdvance(2.25);
    expect(m.rules.cp[1]).toBeCloseTo(3);
    const bluePressure = m.actors.slice(0, 3).map((a) => a.record.pressureSeconds);
    expect(bluePressure.every((n) => n > 0)).toBe(true);
    for (const p of m.entities) Object.assign(p, referenceToWorld({ x: p.team === 1 ? -4 : 4, z: 0 }));
    m.debugAdvance(3);
    expect(m.rules.cp[1]).toBeCloseTo(3);
    expect(m.actors.slice(0, 3).map((a) => a.record.pressureSeconds)).toEqual(bluePressure);
    for (const p of m.entities) Object.assign(p, referenceToWorld({ x: p.team === 1 ? -8 : -4, z: 0 }));
    m.entities[4].x = 13;
    Object.assign(m.entities[5], { dead: true, respawnReserved: true, respawnAt: Infinity });
    m.debugAdvance(1);
    expect(m.actors.slice(3).every((a) => a.record.pressureSeconds === 0)).toBe(true);
    m.debugAdvance(1.25);
    expect(m.rules.cp[2]).toBeCloseTo(3);
    expect(m.rules.cp[1]).toBeCloseTo(3);
    expect(m.actors[3].record.pressureSeconds).toBeGreaterThan(0);
    expect(m.actors[4].record.pressureSeconds).toBe(0);
    expect(m.actors[5].record.pressureSeconds).toBe(0);
    expect(m.actors.slice(0, 3).map((a) => a.record.pressureSeconds)).toEqual(bluePressure);
});
