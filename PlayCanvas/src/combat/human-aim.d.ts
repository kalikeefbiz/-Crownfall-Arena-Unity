import type { Ability, Combatant, CombatSimulation } from './combat';
export type AimFeedback = {
    state: 'idle' | 'acquired' | 'manual' | 'none';
    targetId: string | null;
    until: number;
    abilityId: string | null;
};
export const HUMAN_AIM_TUNING: Readonly<
    Record<string, Readonly<Record<string, { padding?: number; rangeScale?: number }>>>
>;
export function acquisitionDistance(sim: CombatSimulation, ability: Ability): number;
export function hasAimLineOfSight(sim: CombatSimulation, target: Combatant): boolean;
export function eligibleAimTarget(sim: CombatSimulation, target: Combatant, radius: number): boolean;
export function nearestAimTarget(sim: CombatSimulation, ability: Ability): Combatant | null;
export class HumanAimAssist {
    constructor(enabled?: boolean);
    enabled: boolean;
    feedback: AimFeedback;
    clear(): void;
    manual(sim: CombatSimulation): void;
    resolve(sim: CombatSimulation, ability: Ability, fallback: number): number;
    status(sim: CombatSimulation): AimFeedback;
}
