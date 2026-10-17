import type { CombatSimulation, Definition } from './combat';
export type Action = { id: string; angle: number; targetOffset?: { x: number; z: number } };
export class AbilityInput {
    constructor(input: { enabled: boolean }, getFacing: () => number, definition?: Definition);
    actions: Action[];
    preview: { angle: number; ability: { id: string }; cancel: boolean } | null;
    update(sim: CombatSimulation): void;
    setDefinition(definition: Definition): void;
    clear(): void;
    destroy(): void;
    read(): { actions: Action[]; attackHeld: boolean };
}
