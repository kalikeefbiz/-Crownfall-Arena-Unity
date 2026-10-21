import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KIT_ASSET_BYTES, KIT_ASSET_PATH, KIT_ASSET_SHA256, normalizeKitBounds } from '../src/presentation/kit-model';

describe('Kit animated asset', () => {
    it('preserves the exact supplied GLB and animated mesh contract', () => {
        const bytes = readFileSync(`public/${KIT_ASSET_PATH}`);
        expect(bytes.length).toBe(KIT_ASSET_BYTES);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(KIT_ASSET_SHA256);
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        expect(gltf.meshes).toHaveLength(1);
        expect(gltf.materials).toHaveLength(1);
        expect(gltf.skins).toHaveLength(1);
        expect(gltf.skins[0].joints).toHaveLength(66);
        expect(gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual([
            'Idle_5',
            'Punch_Combo_1',
            'RunFast',
            'Running',
            'Walking'
        ]);
        expect(gltf.textures).toHaveLength(3);
        const durations: Record<string, number> = {
            Idle_5: 1.833333,
            Walking: 1.033333,
            Running: 0.633333,
            RunFast: 0.466667,
            Punch_Combo_1: 2.2
        };
        for (const animation of gltf.animations) {
            const targets = new Set(animation.channels.map((c: { target: { node: number } }) => c.target.node));
            expect([...targets].sort()).toEqual([...gltf.skins[0].joints].sort());
            expect(
                Math.max(...animation.samplers.map((s: { input: number }) => gltf.accessors[s.input].max[0]))
            ).toBeCloseTo(durations[animation.name], 5);
        }
        expect(gltf.accessors[0].count).toBe(37309);
        expect(gltf.accessors[gltf.meshes[0].primitives[0].indices].count / 3).toBe(20733);
    });
    it('normalizes asymmetric bounds and grounds the lowest point', () => {
        const min = [-2, -3, -1],
            max = [4, 7, 5];
        const { scale, offset } = normalizeKitBounds(min, max);
        expect(scale * (max[1] - min[1])).toBeCloseTo(1.75);
        expect(min[1] * scale + offset[1]).toBeCloseTo(0);
        for (const i of [0, 2]) expect(((min[i] + max[i]) * scale) / 2 + offset[i]).toBeCloseTo(0);
    });
    it('rejects invalid or degenerate bounds so the primitive can survive', () => {
        for (const max of [
            [0, 0, 0],
            [1, NaN, 1],
            [1, Infinity, 1],
            [-1, 1, 1]
        ])
            expect(() => normalizeKitBounds([0, 0, 0], max)).toThrow('Invalid Kit bounds');
    });
});
