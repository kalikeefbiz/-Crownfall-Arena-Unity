import type { CombatSimulation, Combatant } from './combat';
export type MatchActor = Combatant & {
    finalRespawnAvailable: boolean;
    eliminated: boolean;
    respawnReserved?: boolean;
    respawnAt: number;
    protectedUntil: number;
    protected: boolean;
    human: boolean;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    pressureSeconds: number;
};
export type ParticipantResult = Pick<
    MatchActor,
    'id' | 'name' | 'team' | 'kills' | 'deaths' | 'assists' | 'damage' | 'pressureSeconds'
> & { summonerId: string; controller: string };
export type MatchResult = {
    winner: number;
    reason: string;
    duration: number;
    control: number;
    front: number;
    cp: Record<number, number>;
    tickets: Record<number, number>;
    participants: ParticipantResult[];
};
export type Camp = Combatant & {
    type: string;
    major: boolean;
    respawnAt: number;
    home: { x: number; z: number };
    rewarded: boolean;
};
export class CrownfallMatch {
    constructor(selected?: number, options?: { bots?: boolean; diagnostic?: boolean });
    phase: string;
    countdownRemaining: number;
    active: boolean;
    actors: {
        sim: CombatSimulation;
        record: { kills: number; deaths: number; assists: number; damage: number; pressureSeconds: number };
    }[];
    entities: MatchActor[];
    human: CombatSimulation;
    rules: {
        control: number;
        front: number;
        cp: Record<number, number>;
        pressureTeam: number;
        pressureAge: number;
        scoringTeam: number;
        lane: { halfWidth: number };
        elapsed: number;
        tickets: Record<number, number>;
        result: { winner: number; reason: string; duration: number } | null;
    };
    wilderness: {
        camps: Camp[];
        assignments: Map<string, { camp: string; until: number }>;
        assigned(id: string): Camp | null | undefined;
        coordinate(): void;
        rewardCount: number;
        rotationCount: number;
    };
    start(): void;
    step(command?: unknown, dt?: number): void;
    protected(p: Combatant): boolean;
    debugAdvance(seconds?: number): void;
    debugDamage(id: string, lethal?: boolean): void;
    snapshot(): {
        phase: string;
        countdownRemaining: number;
        control: number;
        front: number;
        cp: Record<number, number>;
        pressureTeam: number;
        pressureAge: number;
        scoringTeam: number;
        lane: { halfWidth: number };
        elapsed: number;
        tickets: Record<number, number>;
        result: { winner: number; reason: string; duration: number } | null;
        results: MatchResult | null;
        remaining: number;
        feed: string[];
        camps: Camp[];
        rotations: number;
        rewards: number;
        assignments: { id: string; camp: string; until: number }[];
        actors: MatchActor[];
    };
}
