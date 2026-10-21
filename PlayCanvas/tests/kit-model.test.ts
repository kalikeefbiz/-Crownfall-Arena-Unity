import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { KIT_ASSET_BYTES, KIT_ASSET_PATH, KIT_ASSET_SHA256, normalizeKitBounds } from '../src/presentation/kit-model';

describe('Kit static asset', () => {
    it('preserves the exact supplied GLB and static mesh contract', () => {
        const bytes = readFileSync(`public/${KIT_ASSET_PATH}`);
        expect(bytes.length).toBe(KIT_ASSET_BYTES);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(KIT_ASSET_SHA256);
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        expect(gltf.meshes).toHaveLength(1);
        expect(gltf.materials).toHaveLength(1);
        expect(gltf.skins ?? []).toHaveLength(0);
        expect(gltf.animations ?? []).toHaveLength(0);
        expect(gltf.accessors[0].count).toBe(20888);
        expect(gltf.accessors[gltf.meshes[0].primitives[0].indices].count / 3).toBe(10290);
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
