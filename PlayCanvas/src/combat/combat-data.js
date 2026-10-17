// Authoritative names/mechanics; all numbers except 6s/4s and 5% are prototype balance.
export const KIT = {
    id: 'kit-asher',
    health: 650,
    respawn: 3,
    passive: { name: 'Inner Flame', zoneTag: 'wilderness', speedBonus: 0.05 },
    abilities: [
        {
            id: 'whip',
            basic: true,
            name: 'Solar Whip',
            short: 'WHIP',
            key: 'Space',
            aim: 'cone',
            effect: 'cone',
            cooldown: 0.55,
            damage: [110, 150],
            range: 2.8,
            angle: Math.PI * 0.65,
            comboWindow: 1.25,
            vfx: 0.26
        },
        {
            id: 'step',
            name: 'Ember Step',
            short: 'STEP',
            key: 'KeyQ',
            aim: 'line',
            effect: 'dash',
            cooldown: 6,
            damage: 100,
            range: 7,
            speed: 24,
            width: 0.65,
            stun: 1.5,
            streakThreshold: 3,
            vfx: 0.35
        },
        {
            id: 'ring',
            name: 'Solar Ring',
            short: 'RING',
            key: 'KeyE',
            aim: 'radial',
            effect: 'radial',
            cooldown: 4,
            damage: 190,
            range: 3.5,
            vfx: 0.4
        },
        {
            id: 'dragon',
            ultimate: true,
            name: 'The Last Flame',
            short: 'DRAGON',
            key: 'KeyR',
            aim: 'line',
            effect: 'projectile',
            cooldown: 18,
            damage: 550,
            range: 23,
            speed: 16,
            width: 1.15,
            piercing: true,
            summonersOnly: true,
            grant: { id: 'blast', uniqueHits: 2, duration: 15 }
        }
    ],
    bonus: {
        id: 'blast',
        temporary: true,
        name: 'Expellant Blast',
        short: 'BLAST',
        key: 'KeyF',
        aim: 'line',
        effect: 'projectile',
        cooldown: 0,
        damage: 0,
        lethal: true,
        range: 26,
        speed: 32,
        width: 0.85,
        piercing: false,
        summonersOnly: true
    }
};
export const TRAINING = {
    targetRespawn: 4,
    targetHealth: 1800,
    targetRadius: 0.52,
    targetFire: { range: 12, cooldown: 2, damage: 125, speed: 10, width: 0.24 },
    zones: [{ x: -14, z: -11, w: 14, d: 7, tag: 'wilderness', name: 'WILDERNESS · +5% SPEED' }],
    stations: [
        { id: 'dash', name: 'Whip / dash', x: -17, z: 0 },
        { id: 'dragon', name: 'Dragon line', x: -3, z: 0 },
        { id: 'ring', name: 'Ring group', x: -14, z: 10 },
        { id: 'wild', name: 'Wilderness', x: -17, z: -11 }
    ],
    targets: [
        { id: 'single', name: 'DASH TARGET', x: -10, z: 0, kind: 'summoner' },
        { id: 'moving', name: 'MOVING', x: -4, z: 2, kind: 'summoner', patrol: { axis: 'x', distance: 2, speed: 1.4 } },
        { id: 'line-a', name: 'LINE 1', x: 2, z: 0, kind: 'summoner' },
        { id: 'line-b', name: 'LINE 2', x: 7, z: 0, kind: 'summoner' },
        { id: 'line-c', name: 'LINE 3', x: 12, z: 0, kind: 'summoner' },
        { id: 'group-a', name: 'GROUP', x: -15.5, z: 9.5, kind: 'summoner' },
        { id: 'group-b', name: 'GROUP', x: -12.5, z: 9.5, kind: 'minion' },
        { id: 'group-c', name: 'GROUP', x: -14, z: 11.6, kind: 'minion' }
    ]
};
