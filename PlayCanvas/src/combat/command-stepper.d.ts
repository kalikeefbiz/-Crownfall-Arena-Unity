import type { InputFrame } from '../gameplay/simulation';

import type { AbilityInput } from './ability-input';
import type { CombatSimulation } from './combat';
export class CommandStepper {
    accumulator: number;
    advance(sim: CombatSimulation, controls: AbilityInput, frame: InputFrame, dt: number): boolean;
}
