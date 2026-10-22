import { readFileSync } from 'node:fs';

import { AnimCurve, AnimData, AnimTrack, Mat4, Quat, Vec3 } from 'playcanvas';

import { RIVEN_ASSET_PATH } from '../../src/presentation/riven-model';

type Node = { name: string; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] };
type Animation = {
    name: string;
    samplers: { input: number; output: number; interpolation?: string }[];
    channels: { sampler: number; target: { node: number; path: string } }[];
};
type Gltf = {
    asset: { version: string };
    buffers: { byteLength: number; uri?: string }[];
    bufferViews: { buffer: number; byteOffset?: number; byteLength: number }[];
    accessors: {
        bufferView: number;
        byteOffset?: number;
        componentType: number;
        count: number;
        type: string;
        min?: number[];
        max?: number[];
    }[];
    nodes: Node[];
    skins: { joints: number[]; inverseBindMatrices: number }[];
    meshes: { primitives: { attributes: Record<string, number>; indices: number }[] }[];
    materials: {
        normalTexture: { index: number };
        pbrMetallicRoughness: { baseColorTexture: { index: number }; metallicRoughnessTexture: { index: number } };
    }[];
    textures: { source: number }[];
    images: { bufferView: number; mimeType: string; uri?: string }[];
    animations: Animation[];
};

export const bytes = readFileSync(`public/${RIVEN_ASSET_PATH}`);
const jsonLength = bytes.readUInt32LE(12);
export const gltf: Gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
export const binary = bytes.subarray(28 + jsonLength);
const sizes: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
export function accessor(index: number): number[][] {
    const a = gltf.accessors[index];
    const view = gltf.bufferViews[a.bufferView];
    const count = sizes[a.type];
    const width = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1;
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const read = (at: number) => (a.componentType === 5126 ? binary.readFloatLE(at) : binary.readUIntLE(at, width));
    return Array.from({ length: a.count }, (_, i) =>
        Array.from({ length: count }, (_, j) => read(offset + (i * count + j) * width))
    );
}

export function rivenTracks() {
    const properties: Record<string, string> = {
        translation: 'localPosition',
        rotation: 'localRotation',
        scale: 'localScale'
    };
    return gltf.animations.map((a) => {
        const inputs = a.samplers.map((s) => new AnimData(1, accessor(s.input).flat()));
        const outputs = a.samplers.map(
            (s) => new AnimData(sizes[gltf.accessors[s.output].type], accessor(s.output).flat())
        );
        return new AnimTrack(
            a.name,
            Math.max(...inputs.map((i) => i.data.at(-1)!)),
            inputs,
            outputs,
            a.channels.map(
                (c) =>
                    new AnimCurve(
                        [
                            {
                                entityPath: [gltf.nodes[c.target.node].name],
                                component: 'graph',
                                propertyPath: [properties[c.target.path]]
                            }
                        ],
                        c.sampler,
                        c.sampler,
                        1
                    )
            )
        );
    });
}

export const hipIndex = gltf.nodes.findIndex((n) => n.name === 'mixamorig:Hips');
export const hipReference = gltf.nodes[hipIndex].translation!;

// Independent linear-blend skinning, including inverse-bind matrices, measures
// exact deformed vertices. Runtime culling AABBs cannot establish sole contact.
export function skinnedRiven(name: string) {
    const animation = gltf.animations.find((a) => a.name === name)!;
    const curves = animation.channels.map((c) => ({
        ...c,
        times: accessor(animation.samplers[c.sampler].input).flat(),
        values: accessor(animation.samplers[c.sampler].output)
    }));
    const primitive = gltf.meshes[0].primitives[0];
    const positions = accessor(primitive.attributes.POSITION);
    const joints = accessor(primitive.attributes.JOINTS_0);
    const weights = accessor(primitive.attributes.WEIGHTS_0);
    const inverse = accessor(gltf.skins[0].inverseBindMatrices).map((data) => new Mat4().set(data));
    const parents = new Map<number, number>();
    gltf.nodes.forEach((n, i) => n.children?.forEach((c) => parents.set(c, i)));
    return (time: number) => {
        const nodes = gltf.nodes.map((n) => ({
            translation: [...(n.translation ?? [0, 0, 0])],
            rotation: [...(n.rotation ?? [0, 0, 0, 1])],
            scale: [...(n.scale ?? [1, 1, 1])]
        }));
        for (const { target, times, values } of curves) {
            let i = 0;
            while (i < times.length - 2 && times[i + 1] <= time) i++;
            const f = Math.max(0, Math.min(1, (time - times[i]) / (times[i + 1] - times[i])));
            const a = values[i],
                b = values[i + 1];
            const value =
                target.path === 'rotation'
                    ? new Quat()
                          .slerp(
                              new Quat(...(a as [number, number, number, number])),
                              new Quat(...(b as [number, number, number, number])),
                              f
                          )
                          .toArray()
                    : a.map((v, j) => v + (b[j] - v) * f);
            if (target.node === hipIndex && target.path === 'translation') {
                value[0] = hipReference[0];
                value[2] = hipReference[2];
            }
            nodes[target.node][target.path as 'translation' | 'rotation' | 'scale'] = value;
        }
        const worlds = new Map<number, Mat4>();
        const world = (i: number): Mat4 => {
            if (!worlds.has(i)) {
                const n = nodes[i];
                const local = new Mat4().setTRS(
                    new Vec3(...(n.translation as [number, number, number])),
                    new Quat(...(n.rotation as [number, number, number, number])),
                    new Vec3(...(n.scale as [number, number, number]))
                );
                worlds.set(i, parents.has(i) ? new Mat4().mul2(world(parents.get(i)!), local) : local);
            }
            return worlds.get(i)!;
        };
        const palette = gltf.skins[0].joints.map((joint, i) => new Mat4().mul2(world(joint), inverse[i]).data);
        return positions.map(([x, y, z], i) => {
            const result = [0, 0, 0];
            for (let j = 0; j < 4; j++) {
                const m = palette[joints[i][j]],
                    w = weights[i][j];
                for (let axis = 0; axis < 3; axis++)
                    result[axis] += w * (m[axis] * x + m[4 + axis] * y + m[8 + axis] * z + m[12 + axis]);
            }
            return result;
        });
    };
}
