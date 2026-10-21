import { AnimCurve, AnimData, AnimTrack } from 'playcanvas';
import { describe, expect, it } from 'vitest';

import { inPlaceKitTrack, KitAnimationState } from '../src/presentation/kit-animation';

const attempt = (id: number, time: number, abilityId = 'whip', accepted = true) => ({ id, time, abilityId, accepted });
describe('Kit presentation animation authority', () => {
    it('loops locomotion without restarting stable states', () => {
        const state = new KitAnimationState();
        expect(state.update(0, false, true, [])).toBe(false);
        expect(state.update(0.1, true, true, [])).toBe(true);
        expect(state.active).toBe('RunFast');
        expect(state.update(0.2, true, true, [])).toBe(false);
        expect(state.update(0.3, false, true, [])).toBe(true);
        expect(state.active).toBe('Idle_5');
    });
    it('only fresh accepted basics punch, including when a later rejection or spell exists', () => {
        const state = new KitAnimationState();
        expect(state.update(0, false, true, [attempt(1, 0, 'whip', false)])).toBe(false);
        expect(state.update(0.1, false, true, [attempt(2, 0.1, 'ring')])).toBe(false);
        const events = [attempt(3, 0.2), attempt(4, 0.2, 'step'), attempt(5, 0.2, 'whip', false)];
        expect(state.update(0.2, false, true, events)).toBe(true);
        expect(state.active).toBe('Punch_Combo_1');
        expect(state.update(0.3, true, true, events)).toBe(false);
        expect(state.attackCount).toBe(1);
        expect(state.update(0.75, true, true, [...events, attempt(6, 0.75)])).toBe(true);
        expect(state.attackCount).toBe(2);
        state.update(1.26, true, true, [attempt(6, 0.75)]);
        expect(state.active).toBe('RunFast');
    });
    it('clears attacks on defeat and resets journal serials on rematch', () => {
        const state = new KitAnimationState();
        state.update(1, false, true, [attempt(20, 1)]);
        state.update(1.1, true, false, [attempt(20, 1)]);
        expect(state.active).toBe('Idle_5');
        state.update(4, false, true, [attempt(20, 1)]);
        expect(state.active).toBe('Idle_5');
        state.reset();
        expect(state.update(0, false, true, [attempt(1, 0)])).toBe(true);
    });
    it('pins only horizontal hips in a copy, preserving source bytes, vertical gait and other joints', () => {
        const hips = new AnimData(3, [1, 2, 3, 4, 5, 6]);
        const hand = new AnimData(3, [7, 8, 9]);
        const track = new AnimTrack(
            'RunFast',
            1,
            [new AnimData(1, [0, 1])],
            [hips, hand],
            [
                new AnimCurve(
                    [{ entityPath: ['Root', 'mixamorig:Hips'], component: 'graph', propertyPath: ['localPosition'] }],
                    0,
                    0,
                    1
                )
            ]
        );
        const copy = inPlaceKitTrack(track, 0.01, 0.02);
        expect(copy.outputs[0].data).toEqual([0.01, 2, 0.02, 0.01, 5, 0.02]);
        expect(track.outputs[0].data).toEqual([1, 2, 3, 4, 5, 6]);
        expect(copy.outputs[1]).toBe(hand);
    });
});
