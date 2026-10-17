import { TRAINING } from './combat-data.js';
// User-approved mechanics; unspecified numbers are centralized prototype balance.
const RESO_BASIC = {
    id: 'reso',
    name: 'Reso Blades',
    short: 'SCYTHES',
    basic: true,
    key: 'Space',
    aim: 'line',
    effect: 'weaponSequence',
    cooldown: 0.48,
    cooldownKey: 'riven-basic',
    damage: 75,
    range: 8,
    speed: 13,
    width: 0.4,
    piercing: true,
    returnSpeed: 17,
    recallDamage: 95,
    recallScaling: 0.25,
    recallHitCap: 6,
    orbitRadius: 0.85,
    orbitSpeed: 2.2
};
const ELF_DANCE = {
    id: 'elf-dance',
    name: 'Elf Dance',
    short: 'ELF DANCE',
    key: 'KeyQ',
    aim: 'line',
    effect: 'barrage',
    cooldown: 4,
    cooldownKey: 'riven-skill1',
    count: 5,
    interval: 0.085,
    damage: 48,
    range: 9,
    speed: 16,
    width: 0.35,
    piercing: true,
    visual: 'scythe'
};
const PULSE_BASIC = {
    id: 'pulse',
    name: 'Percussive Pulse',
    short: 'PULSE',
    basic: true,
    key: 'Space',
    aim: 'line',
    effect: 'projectile',
    cooldown: 0.6,
    cooldownKey: 'riven-basic',
    damage: 100,
    range: 8,
    speed: 12,
    width: 0.7,
    piercing: false,
    visual: 'wave'
};
const PERC_SOLO = {
    id: 'percussive-solo',
    name: 'Percussive Solo',
    short: 'PERC SOLO',
    key: 'KeyQ',
    aim: 'radial',
    effect: 'radial',
    cooldown: 6,
    cooldownKey: 'riven-skill1',
    damage: 130,
    range: 3.8,
    vfx: 0.35,
    visual: 'pulse',
    zone: { duration: 1.5, slow: 0.35, slowDuration: 0.6 }
};
const AMP = {
    id: 'amp',
    name: "AMP'D",
    short: "AMP'D",
    key: 'KeyE',
    aim: 'self',
    effect: 'buff',
    cooldown: 6,
    duration: 3,
    damageBonus: 0.3,
    mitigation: 0,
    visual: 'jade'
};
const SCREAM = {
    id: 'death-scream',
    ultimate: true,
    name: 'Death Scream',
    short: 'SCREAM',
    key: 'KeyR',
    aim: 'radial',
    effect: 'radial',
    cooldown: 18,
    damage: 55,
    range: 6,
    vfx: 0.5,
    visual: 'scream',
    summonersOnly: true,
    status: { id: 'stun', duration: 1.3 }
};
const SWITCH = {
    id: 'stance',
    name: 'Switch Stance',
    short: 'SWITCH',
    key: 'KeyF',
    aim: 'self',
    effect: 'stance',
    cooldown: 3
};
export const RIVEN = {
    id: 'riven',
    name: 'Riven',
    role: 'Damage Dealer',
    class: 'Shaper',
    health: 700,
    respawn: 3,
    passive: { name: 'Stance Switch' },
    initialStance: 'reso',
    stances: {
        reso: { name: 'Reso Blades', abilities: [RESO_BASIC, ELF_DANCE] },
        pulse: { name: 'Percussive Pulse', abilities: [PULSE_BASIC, PERC_SOLO] }
    },
    sharedAbilities: [AMP, SCREAM, SWITCH],
    abilities: [RESO_BASIC, ELF_DANCE, AMP, SCREAM, SWITCH]
};
export const RIVEN_TRAINING = {
    ...TRAINING,
    stations: [
        { id: 'dash', name: 'Single / recall target', x: -15, z: 0 },
        { id: 'dragon', name: 'Kit / Set / Riven targets', x: -3, z: 0 },
        { id: 'ring', name: 'Pulse AOE group', x: -14, z: 10 },
        { id: 'moving', name: 'Moving / slow target', x: -4, z: 0 }
    ],
    targets: TRAINING.targets.map((t) =>
        t.id === 'line-a'
            ? { ...t, name: 'KIT TARGET', summonerId: 'kit-asher', health: 650 }
            : t.id === 'line-b'
              ? { ...t, name: 'SET TARGET', summonerId: 'set', health: 1250 }
              : t.id === 'line-c'
                ? { ...t, name: 'RIVEN TARGET', summonerId: 'riven', health: 700 }
                : t
    )
};
