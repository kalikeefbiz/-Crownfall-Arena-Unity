import { AnimCurve, AnimData, AnimSnapshot, AnimTrack } from 'playcanvas';
import type { Entity } from 'playcanvas';

import { inPlaceKitTrack } from './kit-animation';

export const SET_CLIPS = ['Running', 'Walking', 'Punch_Combo', 'RunFast'] as const;
// The opening supplied punch frame is a grounded combat-ready stance. Sample it
// into a separate constant track; the source clip and all container data survive.
export const SET_READY_SOURCE = 'Punch_Combo';
export const SET_READY_TIME = 0;
export const inPlaceSetTrack = inPlaceKitTrack;

export function sampledSetReady(track: AnimTrack) {
    const snapshot = new AnimSnapshot(track);
    track.eval(SET_READY_TIME, snapshot);
    const outputs = snapshot._results.map((values) => new AnimData(values.length, [...values, ...values]));
    const curves = track.curves.map((curve, index) => new AnimCurve(curve.paths, 0, index, 1));
    return new AnimTrack('Ready', 1, [new AnimData(1, [0, 1])], outputs, curves);
}

export class SetAnimationState {
    active = 'Ready';
    reset() {
        this.active = 'Ready';
    }
    update(moving: boolean, alive: boolean) {
        const next = moving && alive ? 'Running' : 'Ready';
        const changed = next !== this.active;
        this.active = next;
        return changed;
    }
}

export function attachSetAnimations(model: Entity, tracks: AnimTrack[]) {
    const hip = model.findByName('mixamorig:Hips');
    if (!hip || SET_CLIPS.some((name) => tracks.filter((t) => t.name === name).length !== 1))
        throw new Error('Missing Set skeleton/animation');
    const reference = hip.getLocalPosition();
    const running = inPlaceSetTrack(
        tracks.find((t) => t.name === 'Running')!,
        reference.x,
        reference.z
    );
    const ready = sampledSetReady(
        inPlaceSetTrack(
            tracks.find((t) => t.name === SET_READY_SOURCE)!,
            reference.x,
            reference.z
        )
    );
    model.addComponent('anim', { activate: true });
    for (const track of [ready, running]) model.anim!.addAnimationState(track.name, track, 1, true);
    model.anim!.baseLayer!.play('Ready');
    model.anim!.update(0);
    return {
        clips: tracks.map((track) => ({ name: track.name, duration: track.duration })),
        registeredStates: ['Ready', 'Running'],
        runningClip: 'Running' as const,
        locomotionReason: 'Running selected; RunFast intentionally excluded',
        readySource: SET_READY_SOURCE,
        readyTime: SET_READY_TIME
    };
}
