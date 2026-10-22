import { createHash } from 'node:crypto';

import { AnimSnapshot } from 'playcanvas';
import { expect, test } from 'vitest';

import { inPlaceSetTrack, sampledSetReady } from '../src/presentation/set-animation';
import {
    SET_ASSET_BYTES,
    SET_ASSET_SHA256,
    normalizeSetBounds,
    SET_IDLE_FLOOR_OFFSET
} from '../src/presentation/set-model';

import { bytes, gltf, setTracks, hipReference, skinnedSet } from './helpers/set-asset';

test('verified Set binary, skeleton, textures and supplied clips', () => {
    expect(bytes.length).toBe(SET_ASSET_BYTES);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(SET_ASSET_SHA256);
    expect(gltf.skins[0].joints).toHaveLength(87);
    expect(gltf.images).toHaveLength(3);
    expect(gltf.images.every((i) => !i.uri && i.bufferView >= 0)).toBe(true);
    expect(gltf.animations.map((a) => a.name)).toEqual(['Running', 'Walking', 'Punch_Combo', 'RunFast']);
    expect(
        gltf.meshes.reduce(
            (sum, m) => sum + m.primitives.reduce((s, p) => s + gltf.accessors[p.indices].count / 3, 0),
            0
        )
    ).toBe(20038);
});

test('runtime copies pin horizontal hips and constant ready pose without changing source', () => {
    const tracks = setTracks();
    const original = tracks.map((t) => t.outputs.map((o) => Array.from(o.data)));
    for (const track of tracks) {
        const copy = inPlaceSetTrack(track, hipReference[0], hipReference[2]);
        const ready = sampledSetReady(copy);
        const a = new AnimSnapshot(ready),
            b = new AnimSnapshot(ready);
        ready.eval(0, a);
        ready.eval(0.73, b);
        expect(a._results).toEqual(b._results);
        for (const curve of copy.curves) {
            if (
                !curve.paths.some(
                    (p) => p.entityPath.at(-1) === 'mixamorig:Hips' && p.propertyPath[0] === 'localPosition'
                )
            )
                continue;
            const data = copy.outputs[curve.output].data;
            for (let i = 0; i < data.length; i += 3) {
                expect(data[i]).toBe(hipReference[0]);
                expect(data[i + 2]).toBe(hipReference[2]);
            }
        }
    }
    expect(tracks.map((t) => t.outputs.map((o) => Array.from(o.data)))).toEqual(original);
});

test('Set sampled mesh grounding and normalization', () => {
    const primitive = gltf.meshes[0].primitives[0];
    const bounds = gltf.accessors[primitive.attributes.POSITION];
    const normalized = normalizeSetBounds(bounds.min!, bounds.max!);
    const ready = skinnedSet('Punch_Combo')(0);
    const min = Math.min(...ready.map((v) => v[1]));
    expect(min * normalized.scale + normalized.offset[1] + SET_IDLE_FLOOR_OFFSET).toBeCloseTo(0, 5);
    const run = skinnedSet('Running');
    const duration = setTracks()[0].duration;
    const soles = Array.from(
        { length: 31 },
        (_, i) =>
            Math.min(...run((i / 30) * duration).map((v) => v[1])) * normalized.scale +
            normalized.offset[1] +
            SET_IDLE_FLOOR_OFFSET
    );
    expect(Math.min(...soles)).toBeGreaterThan(-0.03);
    expect(Math.max(...soles)).toBeLessThan(0.4);
    expect(normalized.height * normalized.scale).toBeCloseTo(1.9);
    expect(() => normalizeSetBounds([0, 0, 0], [0, 0, 0])).toThrow();
});
