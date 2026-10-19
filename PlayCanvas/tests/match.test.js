import { test, expect } from 'vitest';

import { CrownfallMatch } from '../src/combat/match.js';

function active(index = 0) {
    const m = new CrownfallMatch(index);
    m.start();
    m.debugAdvance(3);
    return m;
}
function kill(m, id = '2-0') {
    m.debugDamage(id, true);
}
function cycle(m, id = '2-0') {
    kill(m, id);
    m.debugAdvance();
}
test('six unique independent actors, both complete rosters and selected human, exact durability', () => {
    for (let index = 0; index < 3; index++) {
        const m = new CrownfallMatch(index);
        expect(m.entities).toHaveLength(6);
        expect(new Set(m.entities.map((p) => p.id)).size).toBe(6);
        expect(m.human.definition.id).toBe(['kit-asher', 'set', 'riven'][index]);
        for (const team of [1, 2])
            expect(
                m.entities
                    .filter((p) => p.team === team)
                    .map((p) => p.maxHealth)
                    .sort((a, b) => a - b)
            ).toEqual([845, 910, 1625]);
        expect(new Set(m.actors.map((a) => a.sim.cooldowns)).size).toBe(6);
        for (const { sim } of m.actors) {
            expect(sim.targets).toHaveLength(5);
            expect(sim.player.radius).toBe(0.45);
            expect(sim.config.summoner.speed).toBe(6);
            expect(sim.blocked(sim.player.x, sim.player.z)).toBe(false);
        }
    }
});
test('prematch/countdown gate damage, movement and casts; exactly three seconds', () => {
    const m = new CrownfallMatch();
    const p = { ...m.human.player };
    m.step({ moveX: 1, moveZ: 0 });
    expect(m.human.player.x).toBe(p.x);
    expect(m.human.cast('ring')).toBe(false);
    kill(m);
    expect(m.rules.tickets[2]).toBe(15);
    m.start();
    m.debugAdvance(2.9);
    expect(m.phase).toBe('countdown');
    m.debugAdvance(0.1);
    expect(m.phase).toBe('active');
    expect(m.countdownRemaining).toBe(0);
});
test('one death spends one ticket, repeated damage cannot spend twice; respawn at full authored spawn', () => {
    const m = active();
    const p = m.entities[3];
    kill(m);
    expect(m.rules.tickets[2]).toBe(14);
    expect(p.respawnReserved).toBe(true);
    kill(m);
    expect(m.rules.tickets[2]).toBe(14);
    m.debugAdvance(2.99);
    expect(p.dead).toBe(true);
    m.debugAdvance(0.05);
    expect(p.dead).toBe(false);
    expect(p.health).toBe(p.maxHealth);
    expect({ x: p.x, z: p.z }).toEqual(p.spawn);
});
test('last ticket remains funded; personal final reserved once; next death eliminates', () => {
    const m = active();
    const p = m.entities[3];
    for (let i = 0; i < 14; i++) cycle(m);
    kill(m);
    expect(m.rules.tickets[2]).toBe(0);
    expect(p.finalRespawnAvailable).toBe(true);
    expect(p.respawnReserved).toBe(true);
    m.debugAdvance();
    kill(m);
    expect(p.finalRespawnAvailable).toBe(false);
    expect(p.respawnReserved).toBe(true);
    kill(m);
    expect(m.actors[3].record.deaths).toBe(16);
    m.debugAdvance();
    kill(m);
    expect(p.eliminated).toBe(true);
    expect(p.respawnReserved).toBe(false);
    expect(p.respawnAt).toBe(Infinity);
});
test('reserved respawns remain viable; victory waits for all three permanently eliminated', () => {
    const m = active();
    for (let i = 0; i < 15; i++) cycle(m);
    for (const p of m.entities.filter((p) => p.team === 2)) {
        kill(m, p.id);
        m.step();
        expect(m.rules.result).toBe(null);
    }
    m.debugAdvance();
    kill(m, '2-0');
    m.step();
    expect(m.rules.result).toBe(null);
    kill(m, '2-1');
    m.step();
    expect(m.rules.result).toBe(null);
    kill(m, '2-2');
    m.step();
    expect(m.rules.result).toMatchObject({ winner: 1, reason: 'tickets' });
});
test('simultaneous terminal non-viability is a draw through real deaths', () => {
    const m = active();
    for (const team of [1, 2]) {
        for (let i = 0; i < 15; i++) cycle(m, `${team}-0`);
        for (let slot = 0; slot < 3; slot++) cycle(m, `${team}-${slot}`);
    }
    for (const p of m.entities) kill(m, p.id);
    m.step();
    expect(m.rules.result).toMatchObject({ winner: 0, reason: 'tickets' });
});
test('two seconds protection excludes targeting/damage, expires, offensive cast breaks it', () => {
    const m = active();
    kill(m);
    m.debugAdvance(3.05);
    const p = m.entities[3];
    expect(m.protected(p)).toBe(true);
    expect(m.human.valid(p)).toBe(false);
    const hp = p.health;
    kill(m);
    expect(p.health).toBe(hp);
    m.debugAdvance(1.9);
    expect(m.protected(p)).toBe(true);
    m.debugAdvance(0.12);
    expect(m.protected(p)).toBe(false);
    kill(m);
    m.debugAdvance(3.05);
    expect(m.protected(p)).toBe(true);
    expect(m.actors[3].sim.cast('ring')).toBe(true);
    expect(m.protected(p)).toBe(false);
});
test('buff and stance preserve protection', () => {
    for (const [index, id] of [
        [1, 'elf'],
        [2, 'stance']
    ]) {
        const m = active(index);
        kill(m, '1-0');
        m.debugAdvance(3.05);
        const sim = m.human;
        const ability = sim.activeAbilities().find((a) => a.effect === (id === 'stance' ? 'stance' : 'buff'));
        expect(ability).toBeTruthy();
        expect(sim.cast(ability.id)).toBe(true);
        expect(m.protected(sim.player)).toBe(true);
    }
});
test('dead and eliminated cannot move/cast; Riven death clears blades and respawn resets stance', () => {
    const m = active(2),
        s = m.human;
    s.cast('reso');
    expect(s.stance).toBe('reso');
    kill(m, '1-0');
    expect(s.weapons.blades).toHaveLength(0);
    const x = s.player.x;
    m.step({ moveX: 1, moveZ: 0, actions: [{ id: 'stance' }] });
    expect(s.player.x).toBe(x);
    expect(s.cast('stance')).toBe(false);
    m.debugAdvance(3);
    expect(s.stance).toBe(s.definition.initialStance);
    expect(s.weapons.blades).toHaveLength(2);
    m.debugAdvance(2.1);
    for (let i = 0; i < 15; i++) cycle(m, '1-0');
    kill(m, '1-0');
    expect(s.player.eliminated).toBe(true);
    const before = { x: s.player.x, z: s.player.z };
    m.debugAdvance(6);
    expect({ x: s.player.x, z: s.player.z }).toEqual(before);
    expect(s.cast('stance')).toBe(false);
});
test('actual teammate Set aura uses unique owner IDs and removes on death', () => {
    const m = active();
    for (const p of m.entities) {
        p.x = p.team === 1 ? -4 : 4;
        p.z = 0;
    }
    m.refreshAuras();
    for (const p of m.entities) expect(Object.keys(p.modifiers)).toEqual([`aura:${p.team}-1`]);
    kill(m, '1-1');
    expect(Object.keys(m.human.player.modifiers)).toHaveLength(0);
});
test('real hostile damage records kills/deaths/assists and per actor ultimate; old assists expire', () => {
    const m = active(),
        v = m.entities[3],
        ally = m.actors[1].sim;
    m.human.damage(v, 10, m.human.player);
    ally.damage(v, 99999, ally.player);
    expect(m.actors[0].record.assists).toBe(1);
    expect(m.actors[1].record.kills).toBe(1);
    expect(m.actors[3].record.deaths).toBe(1);
    expect(m.actors[0].record.damage).toBeCloseTo(9.8);
    expect(m.human.player.ultimateMeter).toBeCloseTo(0.392);
    expect(m.feed).toHaveLength(1);
    m.debugAdvance();
    m.human.damage(v, 10, m.human.player);
    m.debugAdvance(8.1);
    ally.damage(v, 99999, ally.player);
    expect(m.actors[0].record.assists).toBe(1);
});
test('team filtering in actual combat and all actors have independent cooldowns', () => {
    const m = active();
    for (const p of m.entities) {
        p.x = 0;
        p.z = 0;
    }
    const hp = m.entities[1].health;
    expect(m.human.cast('ring')).toBe(true);
    expect(m.entities[1].health).toBe(hp);
    expect(m.entities[3].health).toBeLessThan(m.entities[3].maxHealth);
    expect(m.actors[3].sim.cast('ring')).toBe(true);
});
test('result freezes ticks, casts, damage, respawns and records; fresh rematch clears all state', () => {
    const m = active(2);
    for (let i = 0; i < 15; i++) cycle(m);
    for (const p of m.entities.filter((p) => p.team === 2)) {
        cycle(m, p.id);
        kill(m, p.id);
    }
    m.step();
    expect(m.phase).toBe('results');
    const snap = JSON.stringify(m.snapshot()),
        journal = JSON.stringify(m.human.journal.attempts);
    m.debugAdvance(20);
    m.human.cast('stance');
    kill(m, '1-0');
    m.human.step({ moveX: 1, moveZ: 0 });
    expect(JSON.stringify(m.snapshot())).toBe(snap);
    expect(JSON.stringify(m.human.journal.attempts)).toBe(journal);
    const reset = new CrownfallMatch(2);
    expect(reset.phase).toBe('prematch');
    expect(reset.rules.tickets).toEqual({ 1: 15, 2: 15 });
    for (const { sim, record } of reset.actors) {
        expect(record).toEqual({ kills: 0, deaths: 0, assists: 0, damage: 0 });
        expect(sim.player.finalRespawnAvailable).toBe(true);
        expect(sim.player.dead).toBe(false);
        expect(sim.player.health).toBe(sim.player.maxHealth);
        expect(sim.cooldowns.ends).toEqual({});
        expect(sim.player.statuses).toEqual({});
        expect(sim.temporary.grants.size).toBe(0);
    }
    expect(reset.human.weapons.blades).toHaveLength(2);
});
