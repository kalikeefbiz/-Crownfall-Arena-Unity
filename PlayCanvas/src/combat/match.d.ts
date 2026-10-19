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
};
export class CrownfallMatch {
    constructor(selected?: number, options?: { bots?: boolean });
    phase: string;
    countdownRemaining: number;
    active: boolean;
    actors: { sim: CombatSimulation; record: { kills: number; deaths: number; assists: number; damage: number } }[];
    entities: MatchActor[];
    human: CombatSimulation;
    rules: {
        elapsed: number;
        tickets: Record<number, number>;
        result: { winner: number; reason: string; duration: number } | null;
    };
    start(): void;
    step(command?: unknown, dt?: number): void;
    protected(p: Combatant): boolean;
    debugAdvance(seconds?: number): void;
    debugDamage(id: string, lethal?: boolean): void;
    snapshot(): {
        phase: string;
        countdownRemaining: number;
        elapsed: number;
        tickets: Record<number, number>;
        result: { winner: number; reason: string; duration: number } | null;
        feed: string[];
        actors: MatchActor[];
    };
}
