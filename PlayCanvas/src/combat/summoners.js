import { KIT, TRAINING } from './combat-data.js';
import { RIVEN, RIVEN_TRAINING } from './riven-data.js';
// Authoritative Set mechanics. All unspecified numeric values are prototype balance.
export const SET = {
    id: 'set',
    name: 'Set',
    health: 1250,
    respawn: 3,
    passive: { name: 'Protective Presence', effect: 'alliedAura', radius: 5, mitigation: 0.02 },
    abilities: [
        {
            id: 'claw',
            name: 'Panther Claw',
            short: 'CLAW',
            key: 'Space',
            basic: true,
            aim: 'cone',
            effect: 'cone',
            cooldown: 0.5,
            damage: [90, 90, 135],
            strikeNames: ['Punch', 'Punch', 'Kick'],
            range: 1.65,
            angle: Math.PI * 0.55,
            comboWindow: 1.15,
            vfx: 0.2,
            visual: 'panther'
        },
        {
            id: 'warcry',
            name: 'War Cry',
            short: 'WAR CRY',
            key: 'KeyQ',
            aim: 'self',
            effect: 'buff',
            cooldown: 10,
            duration: 5,
            damageBonus: 0.25,
            mitigation: 0.2
        },
        {
            id: 'predatory',
            name: 'Predatory Combo',
            short: 'LEAP',
            key: 'KeyE',
            aim: 'line',
            effect: 'contactCombo',
            cooldown: 8,
            range: 4,
            speed: 16,
            width: 0.5,
            damage: [70, 90, 160],
            strikeTimes: [0, 0.18, 0.4],
            meleeRange: 1.75,
            angle: Math.PI * 0.6,
            vfx: 0.2,
            visual: 'panther'
        },
        {
            id: 'fist',
            ultimate: true,
            name: 'Panther Fist',
            short: 'FIST',
            key: 'KeyR',
            aim: 'ground',
            effect: 'groundImpact',
            cooldown: 18,
            range: 14,
            radius: 3,
            damage: 460,
            castTime: 0.7,
            vfx: 0.5
        }
    ]
};
export const SET_TRAINING = {
    ...TRAINING,
    damagePulse: 100,
    stations: [
        { id: 'dash', name: 'Claw / leap target', x: -13, z: 0 },
        { id: 'moving', name: 'Moving target', x: -7, z: 2 },
        { id: 'aura', name: 'Allied aura test', x: -17, z: -11 },
        { id: 'ring', name: 'Fist group', x: -15, z: 4 },
        { id: 'dragon', name: 'Ranged target line', x: -3, z: 0 }
    ],
    targets: [
        ...TRAINING.targets,
        { id: 'ally-a', name: 'ALLY 1', team: 1, kind: 'summoner', x: -17, z: -12 },
        { id: 'ally-b', name: 'ALLY 2', team: 1, kind: 'summoner', x: -14, z: -11 },
        { id: 'ally-minion', name: 'ALLY MINION', team: 1, kind: 'minion', x: -16, z: -9 }
    ]
};
export const SUMMONERS = [
    { definition: KIT, training: TRAINING, name: 'Kit Asher' },
    { definition: SET, training: SET_TRAINING, name: 'Set' },
    { definition: RIVEN, training: RIVEN_TRAINING, name: 'Riven' }
];
