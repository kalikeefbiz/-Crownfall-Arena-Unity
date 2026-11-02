import { NodeIO } from '@gltf-transform/core';
import { weld, simplify, prune, dedup, textureCompress, resample, transformMesh, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const SRC = process.argv[2], DST = process.argv[3];
const jobs = { coastal_cliff_04: 1400, coastal_cliff_02: 1300, coast_rocks_05: 650 };
await MeshoptSimplifier.ready;
const io = new NodeIO();
fs.mkdirSync(DST, { recursive: true });
for (const [name, tris] of Object.entries(jobs)) {
    const doc = await io.read(`${SRC}/${name}/${name}.gltf`);
    const root = doc.getRoot();
    // Keep only base colour: normal/ARM maps cost memory and bandwidth for little gain at gameplay distance.
    for (const mat of root.listMaterials()) {
        mat.setNormalTexture(null);
        mat.setOcclusionTexture(null);
        mat.setMetallicRoughnessTexture(null);
        mat.setMetallicFactor(0);
        mat.setRoughnessFactor(0.92);
    }
    await doc.transform(weld({ tolerance: 0.0001 }));
    let count = 0;
    for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) count += p.getIndices()?.getCount() / 3 ?? 0;
    const ratio = Math.min(1, tris / count);
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02, lockBorder: false }), prune(), dedup(),
        textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [name.startsWith('coastal') ? 1024 : 512, name.startsWith('coastal') ? 1024 : 512], quality: 78 }));
    let after = 0;
    for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) after += p.getIndices().getCount() / 3;
    const b = getBounds(root.listScenes()[0]);
    await io.write(`${DST}/${name}.glb`, doc);
    console.log(name, 'tris', count, '->', after, 'bytes', fs.statSync(`${DST}/${name}.glb`).size, 'bounds', b.min.map((v) => +v.toFixed(2)), b.max.map((v) => +v.toFixed(2)));
}
