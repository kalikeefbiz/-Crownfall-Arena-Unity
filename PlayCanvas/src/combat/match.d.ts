import type { SolrahnSurface } from '../maps/solrahn';

import type { BotController } from './bot-controller.js';
import type { CombatSimulation, Combatant, CombatPlayer, CombatModifier, CombatCommand, Point } from './combat';
import type { MatchSettings, Lane } from './match-data.js';
import type { WILDERNESS_CONFIG } from './wilderness-data.js';

export type { MatchSettings } from './match-data.js';
export type MatchPhase = 'prematch' | 'countdown' | 'active' | 'results';
// Live players carry lifecycle state. Human/protected flags and score records
// are derived by snapshot(), not installed on these mutable combat objects.
export type MatchActor = CombatPlayer & {
    name: string;
    summonerId: string;
    spawn: Point;
    finalRespawnAvailable: boolean;
    eliminated: boolean;
    respawnReserved?: boolean;
    protectedUntil: number;
};
export type MatchRecord = {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    pressureSeconds: number;
};
export type ParticipantResult = Readonly<Pick<MatchActor, 'id' | 'name' | 'team' | 'summonerId'> & MatchRecord> & {
    readonly controller: 'bot' | 'local';
};
type RuleResult = { winner: number; reason: string; duration: number };
export type MatchResult = Readonly<RuleResult> & {
    readonly control: number;
    readonly front: number;
    readonly cp: Readonly<Record<number, number>>;
    readonly tickets: Readonly<Record<number, number>>;
    readonly participants: readonly ParticipantResult[];
};
export type Camp = Combatant & {
    name: string;
    type: string;
    major: boolean;
    home: Point;
    rewarded: boolean;
    nextAttack: number;
    lastHit: number;
};
type SnapshotState = {
    readonly statuses: Readonly<Record<string, number>>;
    readonly modifiers: Readonly<Record<string, Readonly<CombatModifier>>>;
};
export type MatchActorSnapshot = Readonly<
    Omit<MatchActor, 'statuses' | 'modifiers' | 'previous' | 'spawn'> &
        MatchRecord & { human: boolean; protected: boolean }
> &
    SnapshotState & { readonly previous: Readonly<Point>; readonly spawn: Readonly<Point> };
export type CampSnapshot = Readonly<Omit<Camp, 'statuses' | 'modifiers' | 'home'>> &
    SnapshotState & { readonly home: Readonly<Point> };
export type MatchSnapshot = {
    readonly phase: MatchPhase;
    readonly countdownRemaining: number;
    readonly settings: Readonly<MatchSettings>;
    readonly lane: Readonly<Lane>;
    readonly elapsed: number;
    readonly control: number;
    readonly front: number;
    readonly cp: Readonly<Record<number, number>>;
    readonly tickets: Readonly<Record<number, number>>;
    readonly pressureTeam: number;
    readonly pressureAge: number;
    readonly scoringTeam: number;
    readonly result: Readonly<RuleResult> | null;
    readonly results: MatchResult | null;
    readonly remaining: number;
    readonly feed: readonly string[];
    readonly camps: readonly CampSnapshot[];
    readonly rotations: number;
    readonly rewards: number;
    readonly assignments: readonly Readonly<{ id: string; camp: string; until: number }>[];
    readonly actors: readonly MatchActorSnapshot[];
};
type MatchSimulation = CombatSimulation & { player: MatchActor };
export class CrownfallMatch {
    constructor(
        selected?: number,
        options?: {
            bots?: boolean;
            diagnostic?: boolean;
            settings?: Partial<MatchSettings>;
            arena?: SolrahnSurface | null;
        }
    );
    phase: MatchPhase;
    countdownRemaining: number;
    readonly active: boolean;
    actors: { sim: MatchSimulation; bot: BotController | null; record: MatchRecord }[];
    entities: MatchActor[];
    human: MatchSimulation;
    results: MatchResult | null;
    rules: {
        settings: MatchSettings;
        control: number;
        front: number;
        cp: Record<number, number>;
        pressureTeam: number;
        pressureAge: number;
        scoringTeam: number;
        lane: Readonly<Lane>;
        elapsed: number;
        tickets: Record<number, number>;
        result: RuleResult | null;
    };
    wilderness: {
        config: { -readonly [K in keyof typeof WILDERNESS_CONFIG]: number };
        camps: Camp[];
        assignments: Map<string, { camp: string; until: number }>;
        assigned(id: string): Camp | null | undefined;
        coordinate(): void;
        rewardCount: number;
        rotationCount: number;
    };
    start(): void;
    step(command?: CombatCommand, dt?: number): void;
    protected(p: Combatant): boolean;
    debugAdvance(seconds?: number): void;
    debugDamage(id: string, lethal?: boolean): void;
    snapshot(): MatchSnapshot;
}
