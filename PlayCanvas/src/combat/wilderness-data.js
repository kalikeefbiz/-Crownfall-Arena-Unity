import { referenceToWorld } from './match-space.js';
// Temporary neutral creatures and balance; no new AxA lore.
export const WILDERNESS_CONFIG = Object.freeze({
    minorHealth: 850,
    minorDamage: 42,
    minorAttackInterval: 1,
    minorRespawn: 45,
    majorHealth: 5200,
    majorDamage: 110,
    majorAttackInterval: 1,
    majorRespawn: 100,
    majorDuration: 25,
    majorDamageBonus: 0.25,
    minorDuration: 20,
    mobilityBonus: 0.2,
    cooldownReduction: 0.2,
    defenseMitigation: 0.2,
    leash: 12,
    aggroRange: 9,
    monsterSpeed: 3.8,
    minorReach: 2.3,
    majorReach: 3.2,
    rotationStart: 14,
    rotationInterval: 24,
    majorAttempt: 48,
    rotationTimeout: 24
});
const REFERENCE_CAMP_SITES = [
    { id: 'mobility-a', type: 'mobility', x: -22, z: -22 },
    { id: 'mobility-b', type: 'mobility', x: 22, z: -22 },
    { id: 'cooldown-a', type: 'cooldown', x: -18, z: 24 },
    { id: 'cooldown-b', type: 'cooldown', x: 18, z: 24 },
    { id: 'defense-a', type: 'defense', x: -7, z: -27 },
    { id: 'defense-b', type: 'defense', x: 7, z: -27 },
    { id: 'major', type: 'damage', x: 0, z: 26 }
];
export const CAMP_SITES = REFERENCE_CAMP_SITES.map((site) => ({ ...site, ...referenceToWorld(site) }));
export const WILDERNESS_REGIONS = [-22, 22].map((z) => ({
    ...referenceToWorld({ x: 0, z }),
    w: 20,
    d: 68,
    tag: 'wilderness',
    name: 'WILDERNESS'
}));
