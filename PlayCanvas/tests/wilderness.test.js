import { test, expect } from 'vitest';

import { BotController } from '../src/combat/bot-controller.js';
import { applyStatus, zoneTagged } from '../src/combat/combat-core.js';
import { CrownfallMatch } from '../src/combat/match.js';
import { modifierTotals } from '../src/combat/modifiers.js';
import { CAMP_SITES, WILDERNESS_REGIONS } from '../src/combat/wilderness-data.js';
const idle = { moveX: 0, moveZ: 0 };
function setup(selected = 0, bots = false) {
    const m = new CrownfallMatch(selected, { bots });
    m.start();
    m.step(idle, 3);
    return m;
}
function advance(m, t) {
    for (let i = 0; i < Math.ceil(t * 60) && m.active; i++) m.step(idle);
}
function kill(m, type) {
    const c = m.wilderness.camps.find((c) => c.type === type);
    m.human.damage(c, 99999, m.human.player);
    return c;
}
function place(p, x, z) {
    Object.assign(p, { x, z, previous: { x, z } });
}

test('canonical transformed camps, two tagged strips, neutral combat targets and collision-free homes', () => {
    const m = setup();
    expect(CAMP_SITES.map(({ x, z }) => [x, z])).toEqual([
        [-22, 22],
        [-22, -22],
        [24, 18],
        [24, -18],
        [-27, 7],
        [-27, -7],
        [26, -0]
    ]);
    expect(m.wilderness.camps.filter((c) => !c.major)).toHaveLength(6);
    expect(m.wilderness.camps.filter((c) => c.major)).toHaveLength(1);
    for (const c of m.wilderness.camps) {
        expect(c.team).toBe(0);
        expect(c.kind).toBe('monster');
        expect(c.health).toBe(c.major ? 5200 : 850);
        expect(m.human.blocked(c.x, c.z)).toBe(false);
        expect(zoneTagged(c, WILDERNESS_REGIONS, 'wilderness')).toBe(true);
    }
    expect(m.human.targets.filter((t) => t.kind === 'summoner')).toHaveLength(5);
});
for (const direction of [-1, 1])
    test(`physical Kit entry/exit, exact Inner Flame speed, lane exclusion ${direction}`, () => {
        const m = setup(),
            s = m.human,
            p = s.player;
        place(p, direction * 10, 0);
        for (let i = 0; i < 80; i++) m.step({ moveX: direction, moveZ: 0 });
        expect(Math.abs(p.x)).toBeGreaterThan(17);
        expect(s.inWilderness).toBe(true);
        const x = p.x;
        m.step({ moveX: direction, moveZ: 0 });
        expect(Math.abs(p.x - x)).toBeCloseTo((6 * 1.05) / 60, 8);
        for (let i = 0; i < 90; i++) m.step({ moveX: -direction, moveZ: 0 });
        expect(Math.abs(p.x)).toBeLessThan(12);
        expect(s.inWilderness).toBe(false);
        place(p, 0, -20);
        m.evaluate();
        expect(m.rules.control).toBeGreaterThan(0.5);
        place(p, direction * 20, -20);
        m.evaluate();
        expect(m.rules.control).toBe(0.5);
    });
test('Mobility immediate +20%, fixed 20s expiry and duplicate refresh without stacking', () => {
    const m = setup(),
        p = m.human.player;
    kill(m, 'mobility');
    expect(modifierTotals(p, 0).movement).toBe(1.2);
    const x = p.x;
    m.step({ moveX: 1, moveZ: 0 });
    expect(p.x - x).toBeCloseTo(0.12);
    const second = m.wilderness.camps.find((c) => c.type === 'mobility' && !c.dead);
    m.human.damage(second, 99999, p);
    expect(modifierTotals(p, m.rules.elapsed).movement).toBe(1.2);
    advance(m, 20.1);
    expect(modifierTotals(p, m.rules.elapsed).movement).toBe(1);
});
test('Cooldown reduces skills but excludes Basic, stance and ultimate, shared channel cannot duplicate', () => {
    const m = setup(2),
        s = m.human;
    kill(m, 'cooldown');
    expect(s.cast('elf-dance', 0)).toBe(true);
    expect(s.cooldowns.remaining('riven-skill1', s.now)).toBeCloseTo(3.2);
    expect(s.cast('elf-dance', 0)).toBe(false);
    s.cast('reso', 0);
    expect(s.cooldowns.remaining('riven-basic', s.now)).toBe(s.ability('reso').cooldown);
    s.cast('stance');
    expect(s.cooldowns.remaining('stance', s.now)).toBe(3);
    expect(s.cast('percussive-solo')).toBe(false);
    s.player.ultimateMeter = 100;
    s.cast('death-scream');
    expect(s.cooldowns.remaining('death-scream', s.now)).toBe(18);
    advance(m, 20.1);
    expect(modifierTotals(s.player, s.now).cooldown).toBe(1);
});
test('Kit Basic cooldown and Set full Predatory cooldown retain source timing with CDR', () => {
    const k = setup();
    kill(k, 'cooldown');
    k.human.cast('whip', 0);
    expect(k.human.cooldowns.remaining('whip', 0)).toBe(k.human.ability('whip').cooldown);
    const m = setup(1),
        s = m.human;
    kill(m, 'cooldown');
    expect(s.cast('predatory', Math.PI / 2)).toBe(true);
    expect(s.cast('predatory')).toBe(false);
    while (s.advanced.leap) m.step(idle);
    expect(s.cooldowns.remaining('predatory', s.now)).toBeCloseTo(6.4);
});
test('Defense mitigates real neutral attacks and neutral dealt/received damage never generates Ultimate or KDA', () => {
    const m = setup(),
        s = m.human,
        p = s.player;
    kill(m, 'defense');
    const c = m.wilderness.camps[0];
    place(p, c.x, c.z + 1);
    const hp = p.health;
    m.step(idle);
    expect(hp - p.health).toBeCloseTo(42 * 0.8);
    expect(p.ultimateMeter).toBe(0);
    s.damage(c, 50, p);
    expect(p.ultimateMeter).toBe(0);
    expect(m.actors[0].record).toMatchObject({ kills: 0, assists: 0, damage: 0 });
    advance(m, 20.1);
    expect(modifierTotals(p, m.rules.elapsed).incoming).toBe(1);
});
test('major team +25% fixed expiry, enemy exclusion, death and remaining-duration respawn, eliminated exclusion', () => {
    const m = setup(),
        boss = kill(m, 'damage');
    expect(boss.maxHealth).toBe(5200);
    for (const p of m.entities) expect(modifierTotals(p, 0).outgoing).toBe(p.team === 1 ? 1.25 : 1);
    const p = m.entities[1];
    m.human.damage(p, 99999, m.entities[3]);
    expect(p.modifiers['camp:damage']).toBeUndefined();
    advance(m, 3.2);
    expect(p.dead).toBe(false);
    expect(p.modifiers['camp:damage'].expires).toBe(25);
    const e = m.entities[2];
    m.rules.tickets[1] = 0;
    e.finalRespawnAvailable = false;
    m.human.damage(e, 99999, m.entities[3]);
    m.wilderness.refreshTeamDamage();
    expect(e.eliminated).toBe(true);
    expect(e.modifiers['camp:damage']).toBeUndefined();
    advance(m, 22);
    expect(modifierTotals(p, m.rules.elapsed).outgoing).toBe(1);
});
test('camp last-hit once per death, independent respawns, home/full reset and clean rematch', () => {
    const m = setup(),
        c = kill(m, 'mobility'),
        major = kill(m, 'damage');
    m.human.damage(c, 99999, m.human.player);
    expect(m.wilderness.rewardCount).toBe(2);
    m.human.damage(m.human.player, 99999, m.entities[3]);
    expect(m.human.player.modifiers['camp:mobility']).toBeUndefined();
    advance(m, 46);
    expect(c.dead).toBe(false);
    expect(c.health).toBe(850);
    expect(c.rewarded).toBe(false);
    expect(major.dead).toBe(true);
    advance(m, 55);
    expect(major.dead).toBe(false);
    expect(major.health).toBe(5200);
    expect(major.x).toBe(major.home.x);
    kill(m, 'mobility');
    expect(m.wilderness.rewardCount).toBe(3);
    const fresh = setup();
    expect(fresh.wilderness.rewardCount).toBe(0);
    expect(fresh.wilderness.rotationCount).toBe(0);
    expect(fresh.wilderness.teamDamage).toEqual({ 1: 0, 2: 0 });
    expect(fresh.wilderness.camps.every((c) => !c.dead && !c.rewarded)).toBe(true);
});
test('summoner-only dragon/Blast/SCREAM exclude monsters while eligible ordinary attacks hit', () => {
    const m = setup(),
        s = m.human,
        c = m.wilderness.camps[0];
    place(s.player, c.x, c.z + 2);
    s.player.ultimateMeter = 100;
    s.cast('dragon', Math.PI);
    advance(m, 1);
    expect(c.health).toBe(c.maxHealth);
    expect(s.temporary.available('blast', s.now)).toBe(false);
    s.cast('whip', Math.PI);
    expect(c.health).toBeLessThan(c.maxHealth);
    const r = m.actors[2].sim;
    place(r.player, c.x, c.z + 2);
    r.player.ultimateMeter = 100;
    const hp = c.health;
    r.cast('death-scream');
    expect(c.health).toBe(hp);
    expect(c.statuses.stun).toBeUndefined();
});
test('neutral aggro radius, pursuit, interval, status, protected/dead exclusions and >2s reset', () => {
    const m = setup(),
        s = m.human,
        p = s.player,
        c = m.wilderness.camps[0];
    place(p, c.x + 9.1, c.z);
    m.wilderness.step(1);
    expect(c.x).toBe(c.home.x);
    place(p, c.x + 7, c.z);
    m.wilderness.step(0.5);
    expect(c.x - c.home.x).toBeCloseTo(1.9);
    applyStatus(c, 'stun', 1, m.rules.elapsed);
    const x = c.x;
    m.wilderness.step(0.5);
    expect(c.x).toBe(x);
    c.statuses = {};
    place(p, c.x + 1, c.z);
    const hp = p.health;
    m.wilderness.step(1 / 60);
    expect(hp - p.health).toBe(42);
    m.wilderness.step(1 / 60);
    expect(hp - p.health).toBe(42);
    advance(m, 1.1);
    expect(hp - p.health).toBe(84);
    p.protectedUntil = m.rules.elapsed + 5;
    const protectedHp = p.health;
    advance(m, 1.1);
    expect(p.health).toBe(protectedHp);
    s.damage(c, 100, p);
    place(p, c.home.x + 12.1, c.home.z);
    advance(m, 1);
    expect(c.health).toBeLessThan(c.maxHealth);
    advance(m, 1.1);
    expect(c.health).toBe(c.maxHealth);
    expect(c.x).toBe(c.home.x);
    c.dead = true;
    c.respawnAt = Infinity;
    place(p, c.x, c.z);
    p.protectedUntil = 0;
    const before = p.health;
    advance(m, 2);
    expect(p.health).toBe(before);
});
test('minor and major assignments follow V21 clocks, real lane presence and health/control safety', () => {
    const m = setup(0, true),
        w = m.wilderness;
    m.rules.elapsed = 13.9;
    w.coordinate();
    expect(w.assignments.size).toBe(0);
    m.rules.elapsed = 14;
    w.coordinate();
    expect(w.assignments.size).toBe(1);
    expect(w.assigned(m.human.player.id)).toBeFalsy();
    m.rules.elapsed = 20;
    w.coordinate();
    expect(w.assignments.size).toBe(2);
    w.assignments.clear();
    m.rules.elapsed = 48;
    w.coordinate();
    expect([...w.assignments.values()].filter((a) => a.camp === 'major')).toHaveLength(2);
    expect(m.entities.filter((p) => p.team === 1 && !w.assignments.has(p.id) && Math.abs(p.x) <= 12)).toHaveLength(1);
    m.rules.control = 0.34;
    w.coordinate();
    expect([...w.assignments.keys()].some((id) => id.startsWith('1-'))).toBe(false);
    w.assignments.clear();
    m.rules.control = 0.5;
    m.entities[1].health = m.entities[1].maxHealth * 0.55;
    m.entities[2].health = m.entities[2].maxHealth * 0.55;
    m.rules.elapsed = 200;
    w.coordinate();
    expect([...w.assignments.keys()].some((id) => id.startsWith('1-'))).toBe(false);
    m.entities[1].health = m.entities[1].maxHealth;
    m.entities[2].health = m.entities[2].maxHealth;
    m.entities[1].dead = true;
    w.coordinate();
    expect([...w.assignments.keys()].some((id) => id.startsWith('1-'))).toBe(false);
});
test('major requires 45% and three actual lane actors; assignments expire or cancel on death/dead camp', () => {
    for (const condition of ['control', 'lane']) {
        const m = setup(0, true),
            w = m.wilderness;
        m.rules.elapsed = 50;
        m.rules.control = condition === 'control' ? 0.44 : 0.5;
        if (condition === 'lane') m.human.player.x = 20;
        w.coordinate();
        expect([...w.assignments.values()].some((a) => a.camp === 'major')).toBe(false);
    }
    for (const condition of ['timeout', 'death', 'camp']) {
        const m = setup(0, true),
            w = m.wilderness;
        m.rules.elapsed = 14;
        w.coordinate();
        const [id, a] = [...w.assignments][0];
        if (condition === 'timeout') m.rules.elapsed = a.until;
        else if (condition === 'death') m.entities.find((p) => p.id === id).dead = true;
        else w.camps.find((c) => c.id === a.camp).dead = true;
        w.nextRotation = { 1: Infinity, 2: Infinity };
        w.coordinate();
        expect(w.assignments.has(id)).toBe(false);
    }
});
test('assigned bots travel through ordinary commands; nearby lane enemy interrupts focus', () => {
    const m = setup(0, true),
        a = m.actors[1],
        w = m.wilderness,
        c = w.camps[0];
    w.assignments.set(a.sim.player.id, { camp: c.id, until: 24 });
    const start = { ...a.sim.player };
    for (let i = 0; i < 60 * 15; i++) {
        m.step(idle);
        if (c.health < c.maxHealth) break;
    }
    expect(Math.hypot(a.sim.player.x - start.x, a.sim.player.z - start.z)).toBeGreaterThan(5);
    expect(c.health).toBeLessThan(c.maxHealth);
    expect(a.sim.transactions.some((t) => t.targetId === c.id)).toBe(true);
    place(a.sim.player, -10, 0);
    place(m.entities[3], -9, 0);
    a.bot.nextThink = 0;
    a.bot.command(a.sim);
    expect(a.bot.targetId).toBe(m.entities[3].id);
});
test('coordinator only assigns: health, buffs, position, territory, tickets and lives are untouched', () => {
    const m = setup(0, true);
    m.rules.elapsed = 50;
    const before = structuredClone({ e: m.entities, c: m.wilderness.camps, r: m.rules });
    m.wilderness.coordinate();
    expect(m.entities).toEqual(before.e);
    expect(m.wilderness.camps).toEqual(before.c);
    expect({ ...m.rules }).toEqual({ ...before.r });
});

test('major is materially riskier solo than two existing Summoners using ordinary casts', () => {
    function fight(count) {
        const m = setup(1),
            boss = m.wilderness.camps.find((c) => c.major),
            fighters = m.actors.slice(0, count);
        for (const [i, a] of fighters.entries()) place(a.sim.player, boss.x + (i ? 1 : -1), boss.z + 1);
        for (let i = 0; i < 30 * 60 && !boss.dead; i++) {
            for (const a of fighters) {
                if (a.sim.player.dead) continue;
                const angle = Math.atan2(boss.x - a.sim.player.x, boss.z - a.sim.player.z);
                a.sim.cast(a.sim.activeAbilities().find((x) => x.basic).id, angle);
                a.sim.cast(a.sim.definition.id === 'set' ? 'warcry' : 'ring', angle);
            }
            m.step(idle);
        }
        return { dead: boss.dead, time: m.rules.elapsed, deaths: fighters.reduce((n, a) => n + a.record.deaths, 0) };
    }
    const solo = fight(1),
        duo = fight(2);
    expect(duo.dead).toBe(true);
    expect(!solo.dead || solo.time > duo.time).toBe(true);
    expect(solo.deaths > 0 || solo.time > duo.time * 1.3).toBe(true);
});

test('major modifies actual outgoing neutral damage by 25% with a fixed team clock', () => {
    const m = setup();
    kill(m, 'damage');
    const c = m.wilderness.camps[0];
    expect(m.human.damage(c, 100, m.human.player)).toBe(125);
    expect(m.human.player.ultimateMeter).toBe(0);
    expect(m.wilderness.teamDamage[1]).toBe(25);
});
test('major neutral attack is 110 at 1s cadence, chooses nearest valid Summoner and respects leash/walls', () => {
    const m = setup(),
        w = m.wilderness,
        c = w.camps.find((c) => c.major),
        p = m.human.player;
    place(p, c.x + 1, c.z);
    const hp = p.health;
    w.step(1 / 60);
    expect(hp - p.health).toBe(110);
    w.step(1 / 60);
    expect(hp - p.health).toBe(110);
    p.protectedUntil = 10;
    const q = m.entities[1];
    place(q, c.x + 2, c.z);
    c.nextAttack = 0;
    const qhp = q.health;
    w.step(1 / 60);
    expect(qhp - q.health).toBeCloseTo(110 * 0.98);
    expect(p.health).toBe(hp - 110);
    q.dead = true;
    p.dead = true;
    c.health = 100;
    w.step(1 / 60);
    expect(c.health).toBe(c.maxHealth);
    // A blocking wall prevents pursuit without moving actors or health directly.
    p.dead = false;
    p.protectedUntil = 0;
    place(p, 26, -8);
    place(c, 26, -4);
    c.home = { x: 26, z: -4 };
    m.human.map = { ...m.human.map, walls: [...m.human.map.walls, { x: 26, z: -5, w: 4, d: 1 }] };
    w.step(0.5);
    expect(c.z).toBe(-4);
});
test('source major schedules both teams, assignment durations and next eligibility remain fixed', () => {
    const m = setup(0, true),
        w = m.wilderness;
    w.nextRotation = { 1: Infinity, 2: Infinity };
    m.rules.elapsed = 47.99;
    w.coordinate();
    expect(w.assignments.size).toBe(0);
    m.rules.elapsed = 48;
    w.coordinate();
    expect([...w.assignments.values()].every((a) => a.until === 84)).toBe(true);
    expect(w.nextMajor[1]).toBe(98);
    expect(w.assignments.size).toBe(2);
    m.rules.elapsed = 54.99;
    w.coordinate();
    expect(w.assignments.size).toBe(2);
    m.rules.elapsed = 55;
    w.coordinate();
    expect(w.assignments.size).toBe(4);
    expect(w.nextMajor[2]).toBe(105);
    const minor = setup(0, true);
    minor.rules.elapsed = 14;
    minor.wilderness.coordinate();
    expect([...minor.wilderness.assignments.values()][0].until).toBe(38);
    expect(minor.wilderness.nextRotation[1]).toBe(38);
});

test('all seven authored camp homes are physically reachable from ordinary spawn through map routing', () => {
    for (const id of CAMP_SITES.map((c) => c.id)) {
        const m = setup(),
            s = m.human,
            c = m.wilderness.camps.find((c) => c.id === id),
            navigator = new BotController(9);
        let goal = s.player;
        for (let i = 0; i < 20 * 60 && Math.hypot(s.player.x - c.home.x, s.player.z - c.home.z) > 1; i++) {
            if (i % 12 === 0 || Math.hypot(s.player.x - goal.x, s.player.z - goal.z) < 0.3)
                goal = navigator.steer(s, c.home);
            const dx = goal.x - s.player.x,
                dz = goal.z - s.player.z,
                d = Math.hypot(dx, dz) || 1;
            m.step({ moveX: dx / d, moveZ: dz / d });
        }
        expect(s.player.dead).toBe(false);
        expect(Math.hypot(s.player.x - c.home.x, s.player.z - c.home.z), id).toBeLessThanOrEqual(1);
        expect(s.blocked(s.player.x, s.player.z)).toBe(false);
    }
});
