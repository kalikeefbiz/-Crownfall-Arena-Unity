import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
    inPlaceRivenTrack,
    inspectRivenLoop,
    RIVEN_CLIPS,
    RivenAnimationState,
    selectRivenRunTrack
} from '../src/presentation/riven-animation';
import {
    RIVEN_ASSET_BYTES,
    RIVEN_ASSET_SHA256,
    RIVEN_IDLE_FLOOR_OFFSET,
    normalizeRivenBounds
} from '../src/presentation/riven-model';

import { accessor, binary, bytes, gltf, hipReference, rivenTracks, skinnedRiven } from './helpers/riven-asset';

describe('Riven supplied animated asset and presentation', () => {
    it('preserves the verified extracted GLB and removes staging ZIPs', () => {
        expect(bytes.subarray(0, 4).toString()).toBe('glTF');
        expect(bytes.readUInt32LE(4)).toBe(2);
        expect(bytes.readUInt32LE(8)).toBe(bytes.length);
        expect(bytes.length).toBe(RIVEN_ASSET_BYTES);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(RIVEN_ASSET_SHA256);
        expect(gltf.buffers).toEqual([{ byteLength: binary.length }]);
        expect(existsSync('../Riven_Animated_GLB.zip')).toBe(false);
        expect(existsSync('Riven_Animated_GLB.zip')).toBe(false);
    });
    it('has one mesh, valid skin weights and 68 shared animation joints', () => {
        expect(gltf.meshes).toHaveLength(1);
        expect(gltf.materials).toHaveLength(1);
        expect(gltf.skins).toHaveLength(1);
        const skin = gltf.skins[0];
        expect(skin.joints).toHaveLength(68);
        expect(new Set(skin.joints).size).toBe(68);
        expect(accessor(skin.inverseBindMatrices)).toHaveLength(68);
        const p = gltf.meshes[0].primitives[0];
        expect(accessor(p.attributes.POSITION)).toHaveLength(18349);
        expect(accessor(p.indices).length / 3).toBe(14200);
        expect(
            accessor(p.attributes.JOINTS_0)
                .flat()
                .every((j) => j >= 0 && j < 68)
        ).toBe(true);
        expect(
            accessor(p.attributes.WEIGHTS_0).every((w) => Math.abs(w.reduce((sum, x) => sum + x, 0) - 1) < 1e-5)
        ).toBe(true);
        expect(gltf.animations.map((a) => a.name).sort()).toEqual([...RIVEN_CLIPS].sort());
        for (const a of gltf.animations) {
            expect([...new Set(a.channels.map((c) => c.target.node))].sort()).toEqual([...skin.joints].sort());
            expect(a.channels).toHaveLength(136);
            expect(a.samplers.every((s) => s.interpolation === 'LINEAR')).toBe(true);
        }
    });
    it('embeds all three 2048-square JPEG textures and binds the PBR maps', () => {
        expect(gltf.images).toHaveLength(3);
        expect(gltf.textures).toHaveLength(3);
        const material = gltf.materials[0];
        expect(
            [
                material.normalTexture.index,
                material.pbrMetallicRoughness.baseColorTexture.index,
                material.pbrMetallicRoughness.metallicRoughnessTexture.index
            ].sort()
        ).toEqual([0, 1, 2]);
        for (const texture of gltf.textures) {
            const image = gltf.images[texture.source];
            expect(image.uri).toBeUndefined();
            expect(image.mimeType).toBe('image/jpeg');
            const view = gltf.bufferViews[image.bufferView];
            const data = binary.subarray(view.byteOffset, (view.byteOffset ?? 0) + view.byteLength);
            expect(data.readUInt16BE(0)).toBe(0xffd8);
            expect(data.readUInt16BE(data.length - 2)).toBe(0xffd9);
            let offset = 2;
            while (data[offset + 1] !== 0xc0) offset += 2 + data.readUInt16BE(offset + 2);
            expect(data.readUInt16BE(offset + 5)).toBe(2048);
            expect(data.readUInt16BE(offset + 7)).toBe(2048);
        }
    });
    it('preserves durations and every source sample while pinning horizontal hips in copies', () => {
        const durations: Record<string, number> = {
            Idle_6: 7.366667,
            Walking: 1.033333,
            Running: 0.633333,
            run_fast_7: 0.866667
        };
        for (const track of rivenTracks()) {
            expect(track.duration).toBeCloseTo(durations[track.name], 5);
            const originals = track.outputs.map((o) => Array.from(o.data));
            const copy = inPlaceRivenTrack(track, hipReference[0], hipReference[2]);
            expect(copy).not.toBe(track);
            track.curves.forEach((c) => {
                if (c.paths[0].entityPath[0] === 'mixamorig:Hips' && c.paths[0].propertyPath[0] === 'localPosition') {
                    const data = copy.outputs[c.output].data;
                    for (let i = 0; i < data.length; i += 3) {
                        expect(data[i]).toBe(hipReference[0]);
                        expect(data[i + 1]).toBe(originals[c.output][i + 1]);
                        expect(data[i + 2]).toBe(hipReference[2]);
                    }
                } else expect(copy.outputs[c.output]).toBe(track.outputs[c.output]);
            });
            expect(track.outputs.map((o) => Array.from(o.data))).toEqual(originals);
        }
    });
    it('rejects the measured fast-run seam and selects exactly one seamless running track', () => {
        const tracks = rivenTracks().map((t) => inPlaceRivenTrack(t, hipReference[0], hipReference[2]));
        const selected = selectRivenRunTrack(tracks);
        expect(selected.track.name).toBe('Running');
        expect(selected.preferredLoop?.valid).toBe(false);
        expect(selected.preferredLoop?.rotationErrorDegrees).toBeCloseTo(12.87324, 3);
        expect(selected.preferredLoop?.positionError).toBeCloseTo(0.01896846, 6);
        expect(inspectRivenLoop(selected.track).valid).toBe(true);
        const goodPreferred = tracks.find((t) => t.name === 'Running')!;
        Object.defineProperty(goodPreferred, '_name', { value: 'run_fast_7' });
        expect(selectRivenRunTrack([goodPreferred]).track.name).toBe('run_fast_7');
        expect(() => selectRivenRunTrack([])).toThrow('No seamless');
    });
    it('normalizes stable bind bounds and rejects invalid imports', () => {
        const { scale, offset } = normalizeRivenBounds([-2, -3, -1], [4, 7, 5]);
        expect(scale * 10).toBeCloseTo(1.75);
        expect(-3 * scale + offset[1]).toBeCloseTo(0);
        for (const i of [0, 2]) expect((([-2, -3, -1][i] + [4, 7, 5][i]) * scale) / 2 + offset[i]).toBeCloseTo(0);
        for (const max of [[0, 0, 0], [1, NaN, 1], [1, Infinity, 1], [-1, 1, 1], []])
            expect(() => normalizeRivenBounds([0, 0, 0], max)).toThrow('Invalid Riven bounds');
    });
    it('grounds exact idle soles and preserves the running airborne phase with a fixed offset', () => {
        const position = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
        const { scale, offset } = normalizeRivenBounds(position.min!, position.max!);
        for (const name of ['Idle_6', 'Running']) {
            const sample = skinnedRiven(name);
            const duration = rivenTracks().find((t) => t.name === name)!.duration;
            const lows = Array.from({ length: 61 }, (_, i) =>
                Math.min(...sample((duration * i) / 60).map((p) => p[1] * scale + offset[1] + RIVEN_IDLE_FLOOR_OFFSET))
            );
            expect(Math.min(...lows)).toBeGreaterThanOrEqual(-0.0001);
            expect(Math.max(...lows)).toBeLessThan(name === 'Idle_6' ? 0.003 : 0.19);
            if (name === 'Idle_6') expect(Math.min(...lows)).toBeLessThan(0.0001);
            else expect(Math.max(...lows)).toBeGreaterThan(0.15);
        }
    }, 15000);
    it('transitions only idle/run without restarting stable states or inventing attack clips', () => {
        const state = new RivenAnimationState();
        expect(state.update(false, true)).toBe(false);
        expect(state.update(true, true)).toBe(true);
        expect(state.active).toBe('Running');
        expect(state.update(true, true)).toBe(false);
        expect(state.update(false, true)).toBe(true);
        expect(state.active).toBe('Idle_6');
        state.update(true, true);
        expect(state.update(true, false)).toBe(true);
        expect(state.active).toBe('Idle_6');
        state.reset();
        expect(state.active).toBe('Idle_6');
    });
});
