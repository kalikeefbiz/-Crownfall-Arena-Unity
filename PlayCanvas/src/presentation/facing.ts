import type { Vec } from '../gameplay/vector';
import { length } from '../gameplay/vector';
export type Facing = 'Front' | 'Back' | 'Right' | 'Left';
export function classifyFacing(v: Vec): Facing {
    if (Math.abs(v.x) > Math.abs(v.z)) return v.x < 0 ? 'Left' : 'Right';
    return v.z < 0 ? 'Back' : 'Front';
}
export type FacingState = { facing: Facing; owner: 'aim' | 'movement' | 'idle' | 'commit' };
export function resolveFacing(move: Vec, aim: Vec, targeting: boolean, previous: Facing): FacingState {
    const vector = targeting ? aim : move;
    return length(vector) > 0.08
        ? { facing: classifyFacing(vector), owner: targeting ? 'aim' : 'movement' }
        : { facing: previous, owner: 'idle' };
}
