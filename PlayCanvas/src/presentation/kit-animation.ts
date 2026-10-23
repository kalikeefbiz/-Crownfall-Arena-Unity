import { AnimData, AnimTrack } from 'playcanvas';
import type { Entity } from 'playcanvas';

export const KIT_CLIPS = ['Idle_5', 'Walking', 'Running', 'RunFast', 'Punch_Combo_1'] as const;
export const KIT_ATTACK_WINDOW = 0.5;

// Remove horizontal hip displacement in runtime copies only. Keep vertical gait,
// every other joint curve, and the original GLB/container tracks untouched.
const correctedTracks = new WeakMap<AnimTrack, Map<string, AnimTrack>>();
export function inPlaceKitTrack(track: AnimTrack, x: number, z: number): AnimTrack {
    const key = `${x}:${z}`;
    let cache = correctedTracks.get(track);
    if (!cache) correctedTracks.set(track, (cache = new Map()));
    const cached = cache.get(key);
    if (cached) return cached;
    const outputs = track.outputs.slice();
    for (const curve of track.curves) {
        if (!curve.paths.some((p) => p.entityPath.at(-1) === 'mixamorig:Hips' && p.propertyPath[0] === 'localPosition'))
            continue;
        const source = outputs[curve.output];
        const values = Array.from(source.data);
        for (let i = 0; i < values.length; i += 3) {
            values[i] = x;
            values[i + 2] = z;
        }
        outputs[curve.output] = new AnimData(source.components, values);
    }
    const result = new AnimTrack(track.name, track.duration, track.inputs, outputs, track.curves);
    cache.set(key, result);
    return result;
}

type Attempt = { id: number; accepted: boolean; abilityId: string; time: number };
export class KitAnimationState {
    active = 'Idle_5';
    attackCount = 0;
    lastSerial = 0;
    attackUntil = -Infinity;
    reset(serial = 0) {
        this.active = 'Idle_5';
        this.lastSerial = serial;
        this.attackUntil = -Infinity;
    }
    update(now: number, moving: boolean, alive: boolean, attempts: Attempt[]) {
        let attack = false;
        for (let i = attempts.length - 1; i >= 0; i--) {
            const event = attempts[i];
            if (event.id <= this.lastSerial) break;
            if (alive && event.accepted && event.abilityId === 'whip' && now - event.time < KIT_ATTACK_WINDOW) {
                this.attackUntil = event.time + KIT_ATTACK_WINDOW;
                this.attackCount++;
                attack = true;
                break;
            }
        }
        this.lastSerial = attempts.at(-1)?.id ?? this.lastSerial;
        if (!alive) this.attackUntil = -Infinity;
        const next = alive && now < this.attackUntil ? 'Punch_Combo_1' : moving && alive ? 'RunFast' : 'Idle_5';
        const transition = attack || next !== this.active;
        this.active = next;
        return transition;
    }
}

export function attachKitAnimations(model: Entity, tracks: AnimTrack[]) {
    const hip = model.findByName('mixamorig:Hips');
    if (!hip || KIT_CLIPS.some((name) => !tracks.some((track) => track.name === name)))
        throw new Error('Missing Kit skeleton/animation');
    const reference = hip.getLocalPosition();
    model.addComponent('anim', { activate: true });
    for (const name of KIT_CLIPS) {
        const track = tracks.find((t) => t.name === name)!;
        model.anim!.addAnimationState(
            name,
            inPlaceKitTrack(track, reference.x, reference.z),
            name === 'Punch_Combo_1' ? track.duration / KIT_ATTACK_WINDOW : 1,
            name !== 'Punch_Combo_1'
        );
    }
    model.anim!.baseLayer!.play('Idle_5');
    model.anim!.update(0);
    return tracks.map((track) => ({ name: track.name, duration: track.duration }));
}
