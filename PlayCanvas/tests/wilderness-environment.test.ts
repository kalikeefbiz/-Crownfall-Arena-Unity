import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { TREE_SPECIES, WILDERNESS_TREES } from '../src/presentation/wilderness-layout';

function glb(path: string) {
    const bytes = readFileSync(path),
        length = bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
    const data = (index: number) => {
        const view = json.bufferViews[index];
        return bytes.subarray(
            28 + length + (view.byteOffset || 0),
            28 + length + (view.byteOffset || 0) + view.byteLength
        );
    };
    return { json, data };
}
describe('approved Wilderness production assets', () => {
    it('retains all four source meshes, UVs, orientation and material definitions in mobile variants', () => {
        for (const file of Object.values(TREE_SPECIES)) {
            const source = glb(`public/assets/environment/trees/${file}`);
            const mobile = glb(`public/assets/environment/trees/mobile/${file}`);
            for (const key of ['accessors', 'meshes', 'nodes', 'materials', 'textures', 'samplers'])
                expect(mobile.json[key]).toEqual(source.json[key]);
            const imageViews = source.json.images.map((i: { bufferView: number }) => i.bufferView);
            for (let i = 0; i < source.json.bufferViews.length; i++)
                if (!imageViews.includes(i)) expect(mobile.data(i).equals(source.data(i))).toBe(true);
            expect(mobile.json.images).toHaveLength(3);
            for (const i of imageViews) expect(mobile.data(i).length).toBeLessThan(source.data(i).length / 4);
        }
    });
    it('keeps even the rotated canopy bounds beyond the playable west edge', () => {
        for (const t of WILDERNESS_TREES) {
            const { json } = glb(`public/assets/environment/trees/${TREE_SPECIES[t.species]}`);
            const position = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
            const scale = t.height / (position.max[1] - position.min[1]);
            const yaw = (t.yaw * Math.PI) / 180;
            const halfX =
                (scale *
                    (Math.abs(Math.cos(yaw)) * (position.max[0] - position.min[0]) +
                        Math.abs(Math.sin(yaw)) * (position.max[2] - position.min[2]))) /
                2;
            expect(t.x + halfX).toBeLessThan(-32);
        }
    });
});
