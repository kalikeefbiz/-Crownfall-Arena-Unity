import { test, expect } from 'vitest';

import { BotController } from '../src/combat/bot-controller.js';
import { CrownfallMatch } from '../src/combat/match.js';

// Ordinary selected-Summoner runs have no fixture: all five production bots,
// default settings, full health and the normal 3s opening. A command pilot drives
// the local slot, with no automated assignment ever given to that local actor.
function run(selected, majorOpening = false) {
    const m = new CrownfallMatch(selected, { bots: true }),
        pilot = new BotController(9);
    m.start();
    if (majorOpening) {
        // Bounded fixture at first major eligibility. No damage, reward, assignment or
        // policy is injected: the ordinary coordinator must choose and execute it.
        m.step({}, 3);
        m.rules.elapsed = 48;
        for (const [i, a] of m.actors.entries()) {
            a.sim.now = 48;
            Object.assign(a.sim.player, {
                x: i === 0 ? 0 : i < 3 ? 8 : (i - 4) * 8,
                z: i === 0 ? 25 : i < 3 ? 0 : -32
            });
            a.sim.player.previous = { x: a.sim.player.x, z: a.sim.player.z };
        }
    }
    let majorAttempt = false,
        majorReward = false,
        minorFight = false,
        minorReward = false,
        respawn = false,
        final = false,
        movedFront = false;
    const dead = new Set();
    for (let i = 0; i < 304 * 60 && !m.rules.result; i++) {
        m.step(pilot.command(m.human));
        for (const p of m.entities) {
            expect([p.x, p.z, p.health, p.ultimateMeter].every(Number.isFinite)).toBe(true);
            if (p.dead) dead.add(p.id);
            else if (dead.has(p.id)) respawn = true;
            final ||= !p.finalRespawnAvailable;
        }
        for (const c of m.wilderness.camps) expect([c.x, c.z, c.health, c.maxHealth].every(Number.isFinite)).toBe(true);
        majorAttempt ||= [...m.wilderness.assignments.values()].some((a) => a.camp === 'major');
        majorReward ||= m.wilderness.camps.some((c) => c.major && c.rewarded);
        minorFight ||= m.wilderness.camps.some((c) => !c.major && c.health < c.maxHealth);
        minorReward ||= m.wilderness.camps.some((c) => !c.major && c.rewarded);
        movedFront ||= Math.abs(m.rules.front) > 0.1;
    }
    expect(m.rules.result).toBeTruthy();
    expect(['tickets', 'points', 'total-control', 'regulation']).toContain(m.rules.result.reason);
    expect(m.results.participants).toHaveLength(6);
    expect(new Set(m.results.participants.map((p) => p.id)).size).toBe(6);
    expect(m.actors.every((a) => a.record.damage > 0)).toBe(true);
    expect(dead.size).toBeGreaterThan(0);
    expect(respawn).toBe(true);
    expect(final).toBe(true);
    expect(m.rules.tickets[1] + m.rules.tickets[2]).toBeLessThan(30);
    expect(movedFront).toBe(true);
    expect(m.rules.cp[1] + m.rules.cp[2]).toBeGreaterThan(0);
    expect(m.wilderness.rotationCount).toBeGreaterThan(0);
    expect(majorAttempt).toBe(true);
    expect(minorFight).toBe(true);
    if (majorOpening) expect(majorReward).toBe(true);

    const frozen = structuredClone(m.snapshot());
    m.step({ moveX: 1, actions: [{ id: 'ring' }] }, 5);
    expect(m.snapshot()).toEqual(frozen);
    const reset = new CrownfallMatch(selected, { bots: true });
    expect(reset.phase).toBe('prematch');
    expect(reset.rules.control).toBe(0.5);
    expect(reset.wilderness.assignments.size).toBe(0);
    expect(reset.wilderness.rewardCount).toBe(0);
    expect(reset.wilderness.camps.every((c) => c.health === c.maxHealth && !c.dead && !c.rewarded)).toBe(true);
    expect(
        reset.entities.every(
            (p) =>
                !p.dead &&
                !p.eliminated &&
                p.finalRespawnAvailable &&
                Object.keys(p.modifiers).every((k) => k.startsWith('aura:'))
        )
    ).toBe(true);
    return { minorReward, majorAttempt, majorReward };
}
test('ordinary complete integrated matches across all three selected Summoners', () => {
    const evidence = [0, 1, 2].map((selected) => run(selected));
    expect(evidence.some((e) => e.minorReward)).toBe(true);
    expect(evidence.some((e) => e.majorAttempt)).toBe(true);
}, 90000);
for (const selected of [1, 2])
    test(`complete coordinated full-health major opening ${selected}`, () => run(selected, true), 30000);

test('complete stable pressure match reaches CP through normal fractional accounting', () => {
    const m = new CrownfallMatch();
    m.start();
    m.step({}, 3);
    for (const p of m.entities) Object.assign(p, { x: (Number(p.id.at(-1)) - 1) * 8, z: p.team === 1 ? -4 : -8 });
    for (let i = 0; i < 100 * 60 && !m.rules.result; i++) m.step();
    expect(m.rules.result.reason).toBe('points');
    expect(m.rules.cp[1]).toBe(1000);
    expect(m.results.participants).toHaveLength(6);
});
test('complete neutral regulation match is a draw with clean camps and all six participants', () => {
    const m = new CrownfallMatch();
    m.start();
    for (let i = 0; i < 304 * 60 && !m.rules.result; i++) m.step();
    expect(m.rules.result).toMatchObject({ reason: 'regulation', winner: 0, duration: 300 });
    expect(m.rules.cp).toEqual({ 1: 0, 2: 0 });
    expect(m.results.participants).toHaveLength(6);
    expect(m.wilderness.camps.every((c) => !c.dead && c.health === c.maxHealth)).toBe(true);
});
