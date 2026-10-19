import { test, expect } from 'vitest';

import { BotController } from '../src/combat/bot-controller.js';
import { CrownfallMatch } from '../src/combat/match.js';

const idle = { moveX: 0, moveZ: 0 };
function tick(m, seconds, command = idle) {
    for (let i = 0; i < seconds * 60 && !m.rules.result; i++) m.step(command);
}
test('playable countdown gates all six actors, movement, abilities and damage', () => {
    const m = new CrownfallMatch(0, { bots: true, diagnostic: true });
    const before = m.snapshot().actors;
    expect(m.actors.filter((a) => a.bot)).toHaveLength(5);
    m.start();
    tick(m, 3, { moveX: 1, moveZ: 0, actions: [{ id: 'ring' }] });
    expect(m.phase).toBe('active');
    expect(m.rules.elapsed).toBe(0);
    expect(m.snapshot().actors).toEqual(before);
    tick(m, 1, { moveX: 1, moveZ: 0 });
    expect(m.human.player.x).toBeGreaterThan(before[0].x);
});
test('bots route around arena walls, select enemies and never target protected allies', () => {
    const m = new CrownfallMatch(0, { bots: true, diagnostic: true });
    m.start();
    tick(m, 3);
    const sim = m.actors[1].sim,
        bot = m.actors[1].bot;
    Object.assign(sim.player, { x: -3, z: -6 });
    const waypoint = bot.steer(sim, { x: -3, z: 0 });
    expect(waypoint).not.toEqual({ x: -3, z: 0 });
    expect(bot.clear(sim, sim.player, waypoint)).toBe(true);
    for (let i = 0; i < 180; i++) {
        m.step();
        for (const { sim, bot } of m.actors) {
            if (bot?.targetId) expect(m.entities.find((p) => p.id === bot.targetId).team).not.toBe(sim.player.team);
            expect(sim.blocked(sim.player.x, sim.player.z)).toBe(false);
        }
    }
    expect(m.human.damage(m.entities[1], 999, m.human.player)).toBe(0);
    for (const target of m.entities.filter((p) => p.team === 2)) target.protectedUntil = 100;
    bot.nextThink = 0;
    bot.command(sim);
    expect(bot.targetId).toBe(null);
});
for (let selected = 0; selected < 3; selected++) {
    test(`natural 3v3 battle ${selected}: all five bots fight, tickets/finals/elimination/results freeze and restart`, () => {
        const m = new CrownfallMatch(selected, { bots: true, diagnostic: true });
        m.start();
        tick(m, 3);
        const spawns = m.entities.map((p) => ({ x: p.x, z: p.z }));
        // A sixth command controller models an active human at the same public command boundary.
        const humanCommands = new BotController(9);
        let respawns = 0,
            protectedSeen = false,
            finalSeen = false;
        let previous = m.entities.map((p) => p.dead);
        for (let i = 0; i < 60 * 300 && !m.rules.result; i++) {
            m.step(humanCommands.command(m.human));
            for (let j = 0; j < m.entities.length; j++) {
                const p = m.entities[j];
                if (previous[j] && !p.dead) respawns++;
                protectedSeen ||= m.protected(p);
                finalSeen ||= !p.finalRespawnAvailable;
            }
            previous = m.entities.map((p) => p.dead);
        }

        expect(m.rules.result).not.toBe(null);
        expect(m.actors.every((a) => a.record.damage > 0 && a.record.deaths > 0)).toBe(true);
        expect(respawns).toBeGreaterThan(15);
        expect(protectedSeen && finalSeen).toBe(true);
        expect(Object.values(m.rules.tickets)).toContain(0);
        expect(m.entities.some((p) => p.eliminated)).toBe(true);
        expect(m.entities.every((p, j) => p.distance > Math.hypot(spawns[j].x, spawns[j].z))).toBe(true);
        const frozen = m.snapshot();
        tick(m, 3, { moveX: 1, actions: [{ id: 'ring' }] });
        expect(m.snapshot()).toEqual(frozen);
        const reset = new CrownfallMatch(selected, { bots: true, diagnostic: true });
        expect(reset.rules.tickets).toEqual({ 1: 15, 2: 15 });
        expect(
            reset.entities.every((p) => !p.dead && !p.eliminated && p.finalRespawnAvailable && p.health === p.maxHealth)
        ).toBe(true);
        expect(reset.actors.every((a) => a.sim.actionSerial === 0 && a.record.damage === 0)).toBe(true);
    }, 30000);
}

test('five bots complete a match even when the human remains idle', () => {
    const m = new CrownfallMatch(0, { bots: true, diagnostic: true });
    m.start();
    tick(m, 303);
    expect(m.rules.result).not.toBe(null);
    expect(m.actors.slice(1).every((a) => a.record.damage > 0)).toBe(true);
});
