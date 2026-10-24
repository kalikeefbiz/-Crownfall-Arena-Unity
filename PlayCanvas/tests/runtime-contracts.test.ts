import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { AbilityCommands } from '../src/combat/ability-commands.js';
import type { Combatant } from '../src/combat/combat';
import { makeCombatant } from '../src/combat/combat-core.js';
import { CombatSimulation } from '../src/combat/combat.js';
import { acquisitionDistance, nearestAimTarget, HumanAimAssist } from '../src/combat/human-aim.js';
import { MATCH_DEFAULTS, matchSettings } from '../src/combat/match-data.js';
import { CrownfallMatch } from '../src/combat/match.js';
import { addModifier, modifierTotals, expireModifiers } from '../src/combat/modifiers.js';
import { RIVEN } from '../src/combat/riven-data.js';

import { defaultContractReplay } from './helpers/default-contract-replay.js';

const idle = {};
const active = (settings = {}) => {
    const m = new CrownfallMatch(0, { settings });
    m.start();
    m.step(idle, m.rules.settings.countdownSeconds);
    return m;
};

test('unknown abilities are null; supported lookups and nullable aim queries are safe', () => {
    const sim = new CombatSimulation();
    const unknown = sim.ability('unknown');
    expect(unknown).toBeNull();
    expect(acquisitionDistance(sim, unknown)).toBe(0);
    expect(nearestAimTarget(sim, unknown)).toBeNull();
    expect(new HumanAimAssist().resolve(sim, unknown, 1.25)).toBe(1.25);
    const whip = sim.ability('whip');
    if (!whip) throw new Error('Missing authored Basic');
    expect(whip.name).toBe('Solar Whip');
    expect(whip.cooldown).toBe(0.55);
    expect(sim.cast('unknown')).toBe(false);
    expect(sim.transactions).toEqual([]);
});

test('an orphaned assisted hold cannot dereference an ability removed from the current definition', () => {
    const sim = new CombatSimulation();
    const basic = sim.ability('whip');
    if (!basic) throw new Error('Missing Basic');
    const controls = new AbilityCommands({ enabled: true }, () => sim.player.angle, sim.definition);
    controls.aimAssist = new HumanAimAssist();
    controls.synchronize(sim);
    controls.begin(basic, 7, 0, 0, 0, 'touch');
    sim.definition = { ...sim.definition, abilities: sim.definition.abilities.filter((a) => a.id !== basic.id) };
    expect(sim.ability(basic.id)).toBeNull();
    expect(controls.read(undefined)).toEqual({ actions: [], attackHeld: false });
    controls.clear();
});

test('an orphaned Riven follow-up is cleared safely when its ability lookup is null', () => {
    const sim = new CombatSimulation(RIVEN);
    const controls = new AbilityCommands({ enabled: true }, () => sim.player.angle, sim.definition);
    controls.synchronize(sim);
    sim.weapons.next = 1;
    controls.pendingBasic = { id: 'unknown', angle: 0, submitted: true };
    controls.synchronize(sim);
    expect(controls.pendingBasic).toBeNull();
    expect(controls.read(undefined)).toEqual({ actions: [], attackHeld: false });
});

test('real accepted and rejected journal records have distinct fields and preserve attribution', () => {
    const sim = new CombatSimulation();
    Object.assign(sim.player, { x: 0, z: 0, angle: 0 });
    sim.targets = [{ ...makeCombatant('enemy', 2, 'summoner', 5000, 0.45), x: 0, z: 1 }];
    expect(sim.cast('whip')).toBe(true);
    const accepted = sim.journal.latestAccepted;
    if (!accepted) throw new Error('Missing accepted record');
    expect(accepted).toMatchObject({
        id: 1,
        accepted: true,
        reason: '',
        result: 'HIT',
        abilityId: 'whip',
        origin: { x: 0, z: 0 },
        angle: 0,
        target: null,
        pending: 0,
        sealed: true,
        targetIds: ['enemy'],
        damage: 110,
        finished: 0
    });
    expect(accepted.ability).toBe(sim.ability('whip'));
    expect(sim.journal.hits[0]).toMatchObject({ castId: 1, targetId: 'enemy', abilityId: 'whip', amount: 110 });
    expect(sim.transactions[0]).toMatchObject({
        sourceId: 'player',
        targetId: 'enemy',
        abilityId: 'whip',
        amount: 110
    });
    expect(sim.cast('whip')).toBe(false);
    const rejected = sim.journal.latestAttempt;
    if (!rejected || rejected.accepted) throw new Error('Missing rejected record');
    expect(rejected).toEqual({
        id: 2,
        abilityId: 'whip',
        name: 'Solar Whip',
        accepted: false,
        reason: 'cooldown',
        time: 0,
        result: 'REJECTED',
        targetIds: [],
        damage: 0
    });
    for (const key of ['ability', 'origin', 'angle', 'target', 'pending', 'sealed', 'finished'])
        expect(Object.hasOwn(rejected, key)).toBe(false);
    expect(sim.journal.latestAccepted).toBe(accepted);
    expect(sim.journal.latestResolution).toBe(accepted);
    expect(sim.transactions).toHaveLength(1);
});

test('journal history remains bounded at 128 attempts and 64 actual hits, with monotonic IDs', () => {
    const sim = new CombatSimulation();
    for (let i = 0; i < 140; i++) sim.cast('unknown');
    expect(sim.journal.attempts).toHaveLength(128);
    expect(sim.journal.attempts[0].id).toBe(13);
    expect(sim.journal.latestAttempt?.id).toBe(140);
    expect(sim.journal.latestAccepted).toBeNull();
    const target = { ...makeCombatant('enemy', 2, 'summoner', 5000, 0.45), x: 0, z: 1 };
    for (let i = 0; i < 70; i++) sim.damage(target, 1, sim.player);
    expect(sim.journal.hits).toHaveLength(64);
    expect(sim.journal.hits[0].id).toBe(7);
    expect(sim.journal.hits.at(-1)?.id).toBe(70);
});

test('earned modifiers retain descriptive labels alongside numeric values and expiry', () => {
    const m = active();
    const camp = m.wilderness.camps.find((c) => c.type === 'mobility');
    if (!camp) throw new Error('Missing mobility camp');
    m.human.damage(camp, camp.health, m.human.player, { lethal: true });
    expect(m.human.player.modifiers['camp:mobility']).toEqual({ speedBonus: 0.2, label: 'MOBILITY', expires: 20 });
    addModifier(m.human.player, 'numeric', { expires: 10, damageBonus: 0.5, mitigation: 0.1 });
    expect(modifierTotals(m.human.player, 0)).toEqual({ outgoing: 1.5, incoming: 0.9, movement: 1.2, cooldown: 1 });
    expireModifiers(m.human.player, 20);
    expect(m.human.player.modifiers['camp:mobility']).toBeUndefined();
});

test('live actor fields and snapshot-derived flags and scores follow death and respawn', () => {
    const m = active();
    const live = m.entities[3];
    for (const key of [
        'human',
        'protected',
        'kills',
        'deaths',
        'assists',
        'damage',
        'pressureSeconds',
        'respawnReserved'
    ])
        expect(Object.hasOwn(live, key)).toBe(false);
    expect(m.snapshot().actors[3]).toMatchObject({ human: false, protected: false, kills: 0, deaths: 0, damage: 0 });
    m.debugDamage(live.id, true);
    expect(live.respawnReserved).toBe(true);
    expect(live.respawnAt).toBe(3);
    expect(m.actors[3].record.deaths).toBe(1);
    expect(m.snapshot().actors[3].deaths).toBe(1);
    m.step(idle, 3);
    m.step(idle, 0.25);
    expect(live.dead).toBe(false);
    expect(Object.hasOwn(live, 'respawnReserved')).toBe(false);
    expect(m.snapshot().actors[3]).toMatchObject({ protected: true, human: false, deaths: 1 });
});

test('all default settings remain exact and validation retains only supported numeric keys', () => {
    expect(MATCH_DEFAULTS).toEqual({
        startingTickets: 15,
        respawnSeconds: 3,
        cpTarget: 1000,
        graceSeconds: 2,
        cpPerSecond: 12,
        depthBonus: 0,
        timeLimitSeconds: 300,
        countdownSeconds: 3,
        protectionSeconds: 2,
        ultimateDealt: 0.04,
        ultimateReceived: 0.025,
        durabilityMultiplier: 1.3
    });
    expect(matchSettings()).toEqual(MATCH_DEFAULTS);
    expect(new CrownfallMatch().rules.settings).toEqual(MATCH_DEFAULTS);
    expect(
        matchSettings({
            countdownSeconds: 99,
            protectionSeconds: -1,
            durabilityMultiplier: Infinity,
            ultimateDealt: NaN,
            ultimateReceived: 2,
            unsupported: 42
        })
    ).toEqual({
        ...MATCH_DEFAULTS,
        countdownSeconds: 10,
        protectionSeconds: 0,
        ultimateReceived: 1
    });
});

test('default countdown gates exactly 180 fixed ticks without consuming match time', () => {
    const m = new CrownfallMatch();
    const before = m.snapshot().actors;
    expect(m.countdownRemaining).toBe(3);
    m.start();
    for (let i = 0; i < 179; i++) m.step({ moveX: 1, actions: [{ id: 'ring' }] });
    expect(m.phase).toBe('countdown');
    m.step({ moveX: 1, actions: [{ id: 'ring' }] });
    expect(m.phase).toBe('active');
    expect(m.countdownRemaining).toBe(0);
    expect(m.rules.elapsed).toBe(0);
    expect(m.snapshot().actors).toEqual(before);
});

test('default respawn protection is exactly two seconds and still blocks hostile damage', () => {
    const m = active();
    const victim = m.entities[3];
    m.debugDamage(victim.id, true);
    m.step(idle, 3);
    m.step(idle, 0.25);
    expect(victim.protectedUntil).toBe(5);
    expect(victim.protectedUntil - m.rules.elapsed).toBe(1.75);
    expect(m.human.damage(victim, 100, m.human.player)).toBe(0);
    m.step(idle, 1.5);
    expect(m.protected(victim)).toBe(true);
    m.step(idle, 0.25);
    expect(m.rules.elapsed).toBe(5);
    expect(m.protected(victim)).toBe(false);
});

test('configured countdown and durability are effective when a match is constructed', () => {
    const m = new CrownfallMatch(0, { settings: { countdownSeconds: 1.25, durabilityMultiplier: 1.6 } });
    expect(m.entities.map((p) => [p.health, p.maxHealth])).toEqual([
        [1040, 1040],
        [2000, 2000],
        [1120, 1120],
        [1040, 1040],
        [2000, 2000],
        [1120, 1120]
    ]);
    m.start();
    m.step(idle, 1);
    expect(m.phase).toBe('countdown');
    expect(m.countdownRemaining).toBe(0.25);
    m.step(idle, 0.25);
    expect(m.phase).toBe('active');
    expect(m.rules.elapsed).toBe(0);
});

test('configured protection uses the match owner and preserves full-health respawn', () => {
    const m = active({ countdownSeconds: 0, respawnSeconds: 1, protectionSeconds: 9 });
    const victim = m.entities[3];
    m.debugDamage(victim.id, true);
    m.step(idle, 1);
    m.step(idle, 0.25);
    expect(victim.protectedUntil).toBe(10);
    expect(victim.protectedUntil - m.rules.elapsed).toBe(8.75);
    expect(victim.health).toBe(845);
    expect(victim.health).toBe(victim.maxHealth);
    expect(m.protected(victim)).toBe(true);
});

for (const competitive of [false, true])
    test(`exact default durability and ultimate rates in ${competitive ? 'competitive' : 'training'} combat`, () => {
        const m = active();
        const sim = competitive ? m.human : new CombatSimulation();
        const target: Combatant = competitive
            ? m.entities[3]
            : { ...makeCombatant('enemy', 2, 'summoner', 1000, 0.45), x: 0, z: 1 };
        expect(m.entities.map((p) => p.maxHealth)).toEqual([845, 1625, 910, 845, 1625, 910]);
        expect(sim.damage(target, 100, sim.player)).toBe(100);
        expect(sim.player.ultimateMeter).toBe(4);
        expect(target.ultimateMeter).toBe(2.5);
        sim.player.ultimateMeter = target.ultimateMeter = 99;
        sim.damage(target, 100, sim.player);
        expect(sim.player.ultimateMeter).toBe(100);
        expect(target.ultimateMeter).toBe(100);
    });

test('configured ultimate rates affect only existing hostile summoner damage, including zero rates', () => {
    const m = active({ ultimateDealt: 0.12, ultimateReceived: 0.06 });
    const victim = m.entities[3];
    expect(m.human.damage(victim, 100, m.human.player)).toBe(100);
    expect(m.human.player.ultimateMeter).toBe(12);
    expect(victim.ultimateMeter).toBe(6);
    expect(m.human.damage(m.entities[1], 100, m.human.player)).toBe(0);
    m.human.damage(m.wilderness.camps[0], 100, m.human.player);
    expect(m.human.player.ultimateMeter).toBe(12);
    m.rules.settings.ultimateDealt = m.rules.settings.ultimateReceived = 0;
    m.human.damage(victim, 100, m.human.player);
    expect(m.human.player.ultimateMeter).toBe(12);
    expect(victim.ultimateMeter).toBe(6);
});

test('default commands, every authoritative tick, transactions and complete results match the pre-change baseline', () => {
    const expected: unknown = JSON.parse(
        readFileSync(new URL('./fixtures/default-contract-replay.json', import.meta.url), 'utf8')
    );
    expect({
        baselineCommit: '2132924a2afcff95628828aff0a8a1f80c7710ee',
        tickSeconds: 1 / 60,
        replays: [0, 1, 2].map(defaultContractReplay)
    }).toEqual(expected);
}, 60000);
