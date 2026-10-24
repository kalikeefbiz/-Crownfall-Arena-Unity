// Authored match defaults, validated by matchSettings and owned at runtime by
// CrownfallMatch.rules.settings. Countdown/durability are sampled on creation;
// protection and meter rates are consumed at respawn/damage. No player tuning UI.
export const MATCH_DEFAULTS = Object.freeze({
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
export const LANE = Object.freeze({ goalA: -21, goalB: 21, halfWidth: 3.85 });
export const MATCH_LANE = Object.freeze({ goalA: -28, goalB: 28, halfWidth: 12 });
// M7 arena geometry only. Coordinates: X = territorial axis, Z = lateral travel.
// Reflection across X=0 preserves equivalent access for both teams.
export const ARENA_LAYOUT = Object.freeze({
    spawnX: 30,
    spawnOffsets: [0, -8, 8],
    neutralWidth: 4,
    routes: [
        { x: -22, z: -18, w: 5, d: 12 },
        { x: 22, z: -18, w: 5, d: 12 },
        { x: -18, z: 19, w: 5, d: 14 },
        { x: 18, z: 19, w: 5, d: 14 },
        { x: -7, z: -21, w: 4, d: 18 },
        { x: 7, z: -21, w: 4, d: 18 },
        { x: 0, z: 20, w: 7, d: 16 }
    ]
});
export const MATCH_MAP = Object.freeze({
    width: 68,
    depth: 64,
    lane: MATCH_LANE,
    arena: ARENA_LAYOUT,
    walls: [
        // Low islands shape lateral choices, never divide the main lane.
        { x: -12, z: -18, w: 4, d: 3, h: 0.75 },
        { x: 12, z: -18, w: 4, d: 3, h: 0.75 },
        { x: -12, z: 18, w: 4, d: 3, h: 0.75 },
        { x: 12, z: 18, w: 4, d: 3, h: 0.75 },
        // Outer shelves frame camp pockets; inside and outside approaches remain open.
        { x: -28, z: -25, w: 3, d: 6, h: 0.65 },
        { x: 28, z: -25, w: 3, d: 6, h: 0.65 },
        { x: -28, z: 25, w: 3, d: 6, h: 0.65 },
        { x: 28, z: 25, w: 3, d: 6, h: 0.65 },
        { x: 0, z: 30, w: 8, d: 1, h: 0.65 },
        { x: 0, z: -30, w: 18, d: 1, h: 0.65 }
    ],
    markers: [
        { x: -30, z: 0, label: 'BLUE' },
        { x: 0, z: 0, label: 'NEUTRAL' },
        { x: 30, z: 0, label: 'RED' }
    ]
});
export const MATCH_TRAINING = {
    targetRespawn: Infinity,
    targetHealth: 1000,
    targetRadius: 0.45,
    stations: [],
    targets: [],
    zones: [
        { x: 0, z: -22, w: 68, d: 20, tag: 'wilderness', name: 'WILDERNESS' },
        { x: 0, z: 22, w: 68, d: 20, tag: 'wilderness', name: 'WILDERNESS' }
    ]
};
export const BOT_CONFIG = Object.freeze({
    thinkInterval: 0.15,
    retreatHealth: 0.25,
    returnHealth: 0.55,
    senseRange: 15,
    retreatDistance: 8,
    aimError: 0.055,
    rivenSwitchSeconds: 7,
    laneOffsets: [0, -8, 8]
});
export function matchSettings(values = {}) {
    const limits = {
        startingTickets: [0, 100],
        respawnSeconds: [1, 60],
        cpTarget: [10, 100000],
        graceSeconds: [0, 10],
        cpPerSecond: [0.1, 1000],
        depthBonus: [0, 5],
        timeLimitSeconds: [1, 3600],
        countdownSeconds: [0, 10],
        protectionSeconds: [0, 10],
        ultimateDealt: [0, 1],
        ultimateReceived: [0, 1],
        durabilityMultiplier: [1, 2]
    };
    const result = {};
    for (const [k, v] of Object.entries(MATCH_DEFAULTS)) {
        const n = Number(values[k] ?? v);
        result[k] = Math.min(limits[k][1], Math.max(limits[k][0], Number.isFinite(n) ? n : v));
    }
    result.startingTickets = Math.floor(result.startingTickets);
    return result;
}
