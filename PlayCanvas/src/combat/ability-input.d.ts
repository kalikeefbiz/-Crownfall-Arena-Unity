import type { CombatSimulation, Definition, Ability } from './combat';
export type Action = { id: string; angle: number; targetOffset?: { x: number; z: number } };
export type PreviewIntent = {
    angle: number;
    ability: Ability;
    cancel: boolean;
    targetOffset?: { x: number; z: number };
};
export class AbilityInput {
    constructor(
        input: { enabled: boolean },
        getFacing: () => number,
        definition?: Definition,
        mapDrag?: (x: number, z: number) => { x: number; z: number }
    );
    actions: Action[];
    preview: PreviewIntent | null;
    pointerState?: string;
    synchronize(sim: CombatSimulation): void;
    update(sim: CombatSimulation): void;
    setDefinition(definition: Definition): void;
    clear(): void;
    destroy(): void;
    read(): { actions: Action[]; attackHeld: boolean };
}
