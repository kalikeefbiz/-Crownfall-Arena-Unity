import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
    MOONREAPER_BYTES,
    MOONREAPER_PATH,
    MOONREAPER_SHA256,
    moonreaperKind,
    normalizeMoonreaper
} from '../src/presentation/riven-weapons';

describe('approved Azure Moonreaper', () => {
    it('preserves the actual source, mesh cost, embedded maps and authored orientation', () => {
        const bytes = readFileSync(`public/${MOONREAPER_PATH}`);
        expect(bytes.length).toBe(MOONREAPER_BYTES);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(MOONREAPER_SHA256);
        expect(bytes.subarray(0, 4).toString()).toBe('glTF');
        const length = bytes.readUInt32LE(12);
        const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
        expect(gltf.meshes).toHaveLength(1);
        expect(gltf.meshes[0].primitives).toHaveLength(1);
        expect(gltf.materials).toHaveLength(1);
        expect(gltf.materials[0].doubleSided).toBe(true);
        const primitive = gltf.meshes[0].primitives[0];
        expect(gltf.accessors[primitive.indices].count / 3).toBe(3043);
        const position = gltf.accessors[primitive.attributes.POSITION];
        expect(position.count).toBe(6243);
        const n = normalizeMoonreaper(position.min, position.max);
        expect(n.height * n.scale).toBeCloseTo(1.3);
        expect((position.max[2] - position.min[2]) * n.scale).toBeCloseTo(0.1901, 3);
        for (let i = 0; i < 3; i++)
            expect(((position.min[i] + position.max[i]) * n.scale) / 2 + n.offset[i]).toBeCloseTo(0);
        expect(gltf.extensionsRequired ?? []).toEqual([]);
        expect(gltf.buffers.every((b: { uri?: string }) => !b.uri)).toBe(true);
        expect(gltf.images).toHaveLength(3);
        expect(
            gltf.images.map((img: { bufferView: number; uri?: string; mimeType: string }) => {
                expect(img.uri).toBeUndefined();
                expect(img.mimeType).toBe('image/png');
                const at = 28 + length + gltf.bufferViews[img.bufferView].byteOffset;
                return [bytes.readUInt32BE(at + 16), bytes.readUInt32BE(at + 20)];
            })
        ).toEqual([
            [2048, 2048],
            [2048, 2048],
            [4096, 4096]
        ]);
        expect(() => normalizeMoonreaper([0, 0, 0], [1, 0, 1])).toThrow();
    });
    it('classifies only the existing Reso and Elf Dance identities, including pool reuse', () => {
        const shot = { active: true, x: 0, z: 0, persistent: true, type: 'reso-scythe' };
        expect(moonreaperKind(shot)).toBe('reso');
        Object.assign(shot, { persistent: false, type: 'pulse', ability: { id: 'pulse' } });
        expect(moonreaperKind(shot)).toBeNull();
        Object.assign(shot, { type: 'elf-dance', ability: { id: 'elf-dance' } });
        expect(moonreaperKind(shot)).toBe('elf-dance');
    });
});
