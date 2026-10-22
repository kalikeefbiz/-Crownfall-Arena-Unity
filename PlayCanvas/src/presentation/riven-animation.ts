import type { AnimTrack, Entity } from 'playcanvas';

import { inPlaceKitTrack } from './kit-animation';

export const RIVEN_CLIPS = ['Idle_6', 'Walking', 'Running', 'run_fast_7'] as const;
export type RivenRunClip = 'Running' | 'run_fast_7';

// Both supplied rigs use mixamorig:Hips. Share Kit's proven copy-only correction;
// keep vertical gait and every other curve, and never modify container/source data.
export const inPlaceRivenTrack = inPlaceKitTrack;

export function inspectRivenLoop(track: AnimTrack) {
    let positionError = 0,
        rotationErrorDegrees = 0;
    if (!Number.isFinite(track.duration) || track.duration <= 0 || !track.curves.length)
        throw new Error(`Invalid Riven track: ${track.name}`);
    for (const curve of track.curves) {
        const output = track.outputs[curve.output];
        const data = output.data;
        const count = output.components;
        if (!data.length || data.length % count || !Array.from(data).every(Number.isFinite))
            throw new Error(`Invalid Riven samples: ${track.name}`);
        if (curve.paths.some((p) => p.propertyPath[0] === 'localRotation')) {
            const last = data.length - 4;
            const dot =
                data[0] * data[last] + data[1] * data[last + 1] + data[2] * data[last + 2] + data[3] * data[last + 3];
            const norm = Math.hypot(...Array.from(data).slice(0, 4)) * Math.hypot(...Array.from(data).slice(last));
            if (!norm) throw new Error(`Invalid Riven quaternion: ${track.name}`);
            rotationErrorDegrees = Math.max(
                rotationErrorDegrees,
                (2 * Math.acos(Math.min(1, Math.abs(dot / norm))) * 180) / Math.PI
            );
        } else if (curve.paths.some((p) => p.propertyPath[0] === 'localPosition')) {
            const last = data.length - 3;
            positionError = Math.max(
                positionError,
                Math.hypot(data[0] - data[last], data[1] - data[last + 1], data[2] - data[last + 2])
            );
        }
    }
    // A loop may not jump more than 5 mm locally or 2 degrees at any joint.
    return { valid: positionError <= 0.005 && rotationErrorDegrees <= 2, positionError, rotationErrorDegrees };
}

export function selectRivenRunTrack(tracks: AnimTrack[]) {
    const preferred = tracks.find((t) => t.name === 'run_fast_7');
    const preferredLoop = preferred ? inspectRivenLoop(preferred) : null;
    if (preferred && preferredLoop!.valid)
        return { track: preferred, reason: 'run_fast_7 passed loop validation', preferredLoop };
    const fallback = tracks.find((t) => t.name === 'Running');
    if (!fallback || !inspectRivenLoop(fallback).valid) throw new Error('No seamless Riven running clip');
    return { track: fallback, reason: 'run_fast_7 failed loop validation; using Running', preferredLoop };
}

// Presentation only: current input has no separate walk speed. No combat journal,
// damage timing or ability animation is borrowed from Kit.
export class RivenAnimationState {
    active: 'Idle_6' | RivenRunClip = 'Idle_6';
    runningClip: RivenRunClip = 'Running';
    reset() {
        this.active = 'Idle_6';
    }
    update(moving: boolean, alive: boolean) {
        const next = moving && alive ? this.runningClip : 'Idle_6';
        const changed = next !== this.active;
        this.active = next;
        return changed;
    }
}

export function attachRivenAnimations(model: Entity, tracks: AnimTrack[]) {
    const hip = model.findByName('mixamorig:Hips');
    if (!hip || RIVEN_CLIPS.some((name) => tracks.filter((t) => t.name === name).length !== 1))
        throw new Error('Missing Riven skeleton/animation');
    const reference = hip.getLocalPosition();
    const copies = tracks.map((track) => inPlaceRivenTrack(track, reference.x, reference.z));
    const selected = selectRivenRunTrack(copies);
    const registeredStates = ['Idle_6', 'Walking', selected.track.name];
    model.addComponent('anim', { activate: true });
    for (const name of registeredStates) {
        const track = copies.find((t) => t.name === name)!;
        if (!inspectRivenLoop(track).valid) throw new Error(`Riven loop invalid: ${name}`);
        model.anim!.addAnimationState(name, track, 1, true);
    }
    model.anim!.baseLayer!.play('Idle_6');
    model.anim!.update(0);
    return {
        clips: tracks.map((track) => ({ name: track.name, duration: track.duration })),
        registeredStates,
        runningClip: selected.track.name as RivenRunClip,
        locomotionReason: selected.reason,
        preferredLoop: selected.preferredLoop
    };
}
