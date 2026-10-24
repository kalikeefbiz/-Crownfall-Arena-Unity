export type MatchSettings = {
    startingTickets: number;
    respawnSeconds: number;
    cpTarget: number;
    graceSeconds: number;
    cpPerSecond: number;
    depthBonus: number;
    timeLimitSeconds: number;
    countdownSeconds: number;
    protectionSeconds: number;
    ultimateDealt: number;
    ultimateReceived: number;
    durabilityMultiplier: number;
};
export type Lane = { goalA: number; goalB: number; halfWidth: number };
export const MATCH_DEFAULTS: Readonly<MatchSettings>;
export function matchSettings(values?: Record<string, unknown>): MatchSettings;
export const LANE: Readonly<Lane>;
export const MATCH_LANE: Readonly<Lane>;
export const ARENA_LAYOUT: Readonly<{
    spawnX: number;
    spawnOffsets: number[];
    neutralWidth: number;
    routes: { x: number; z: number; w: number; d: number }[];
}>;
export const MATCH_MAP: Readonly<{
    width: number;
    depth: number;
    lane: Readonly<Lane>;
    arena: typeof ARENA_LAYOUT;
    walls: { x: number; z: number; w: number; d: number; h: number }[];
    markers: { x: number; z: number; label: string }[];
}>;
export const MATCH_TRAINING: {
    targetRespawn: number;
    targetHealth: number;
    targetRadius: number;
    stations: never[];
    targets: never[];
    zones: { x: number; z: number; w: number; d: number; tag: string; name: string }[];
};
export const BOT_CONFIG: Readonly<{
    thinkInterval: number;
    retreatHealth: number;
    returnHealth: number;
    senseRange: number;
    retreatDistance: number;
    aimError: number;
    rivenSwitchSeconds: number;
    laneOffsets: number[];
}>;
