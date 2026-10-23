import {
    Color,
    Entity,
    Mesh,
    MeshInstance,
    StandardMaterial,
    Texture,
    calculateNormals,
    ADDRESS_REPEAT,
    FILTER_LINEAR_MIPMAP_LINEAR
} from 'playcanvas';
import type { AppBase } from 'playcanvas';

import { createLaneGeometry } from './lane-geometry';

// Five static batches, one small repeating texture, no imports or per-frame work.
export function createLaneEnvironment(app: AppBase, parent: Entity) {
    const data = createLaneGeometry();
    const root = new Entity('carved-lane-environment');
    parent.addChild(root);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(128, 128);
    let seed = 127;
    for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const grain = 182 + (seed >>> 26);
        pixels.data.set([grain, grain, grain, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new Texture(app.graphicsDevice, {
        name: 'stone-earth-grain-128',
        width: 128,
        height: 128,
        addressU: ADDRESS_REPEAT,
        addressV: ADDRESS_REPEAT,
        minFilter: FILTER_LINEAR_MIPMAP_LINEAR
    });
    texture.setSource(canvas);
    const mat = new StandardMaterial();
    mat.name = 'matte-stone-earth-vertex-pigment';
    mat.diffuse = new Color(1, 1, 1);
    mat.diffuseVertexColor = true;
    mat.diffuseMap = texture;
    mat.gloss = 8;
    mat.useMetalness = true;
    mat.metalness = 0;
    mat.update();
    const meshes: Mesh[] = [];
    for (const b of data.batches) {
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(b.positions);
        mesh.setNormals(calculateNormals(b.positions, b.indices));
        mesh.setColors(b.colors);
        mesh.setUvs(0, b.uvs);
        mesh.setIndices(b.indices);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity(b.name);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat)],
            castShadows: false,
            receiveShadows: false
        });
        root.addChild(e);
    }
    const diagnostics = {
        mode: 'carved',
        batches: meshes.length,
        vertices: data.batches.reduce((n, b) => n + b.positions.length / 3, 0),
        triangles: data.batches.reduce((n, b) => n + b.indices.length / 3, 0),
        pavingSlabs: data.slabs,
        textureBytes: 87380,
        raisedRelief: 'existing-obstacle-footprints-and-outside-map-only',
        footingRange: [-0.018, 0.027]
    };
    return {
        diagnostics,
        destroy() {
            root.destroy();
            for (const mesh of meshes) mesh.destroy();
            mat.destroy();
            texture.destroy();
        }
    };
}
