import { AnimCurve, AnimData, AnimSnapshot, AnimTrack } from 'playcanvas';
import type { Entity } from 'playcanvas';

import { inPlaceKitTrack } from './kit-animation';
import { bakePantherRun, PANTHER_BURST, PANTHER_SPRINT } from './set-panther-run';

export const SET_CLIPS = ['Running', 'Walking', 'Punch_Combo', 'RunFast'] as const;
// The opening supplied punch frame is a grounded combat-ready stance. Sample it
// into a separate constant track; the source clip and all container data survive.
export const SET_READY_SOURCE = 'Punch_Combo';
export const SET_READY_TIME = 0;
export const inPlaceSetTrack = inPlaceKitTrack;

const readyTracks = new WeakMap<AnimTrack, AnimTrack>();
export function sampledSetReady(track: AnimTrack) {
    const cached = readyTracks.get(track);
    if (cached) return cached;
    const snapshot = new AnimSnapshot(track);
    track.eval(SET_READY_TIME, snapshot);
    const outputs = snapshot._results.map((values) => new AnimData(values.length, [...values, ...values]));
    const curves = track.curves.map((curve, index) => new AnimCurve(curve.paths, 0, index, 1));
    const ready = new AnimTrack('Ready', 1, [new AnimData(1, [0, 1])], outputs, curves);
    readyTracks.set(track, ready);
    return ready;
}

// Set runs with the upright panther sprint. For comparison: ?setRun=human (supplied clip), ?setRun=burst (four-legged
// bound, reserved for a future special movement ability).
const runQuery = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('setRun') : null;
export const SET_RUN_STATE = runQuery === 'human' ? 'Running' : runQuery === 'burst' ? PANTHER_BURST : PANTHER_SPRINT;

export class SetAnimationState {
    active = 'Ready';
    reset() {
        this.active = 'Ready';
    }
    update(moving: boolean, alive: boolean) {
        const next = moving && alive ? SET_RUN_STATE : 'Ready';
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
    const sprint = bakePantherRun(model, ready, PANTHER_SPRINT);
    const burst = bakePantherRun(model, ready, PANTHER_BURST);
    model.addComponent('anim', { activate: true });
    for (const track of [ready, running, sprint, burst]) model.anim!.addAnimationState(track.name, track, 1, true);
    model.anim!.baseLayer!.play('Ready');
    model.anim!.update(0);
    return {
        clips: tracks.map((track) => ({ name: track.name, duration: track.duration })),
        registeredStates: ['Ready', 'Running', PANTHER_SPRINT, PANTHER_BURST],
        runningClip: SET_RUN_STATE,
        locomotionReason:
            'PantherSprint: upright digitigrade sprint baked in code on the Set skeleton; PantherBurst (four-legged) reserved; ?setRun=human|burst to compare',
        readySource: SET_READY_SOURCE,
        readyTime: SET_READY_TIME
    };
}
