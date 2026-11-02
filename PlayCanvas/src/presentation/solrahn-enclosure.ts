import {
    BUFFER_STATIC,
    Color,
    Entity,
    Mat4,
    Mesh,
    MeshInstance,
    Quat,
    StandardMaterial,
    Vec3,
    VertexBuffer,
    VertexFormat,
    calculateNormals
} from 'playcanvas';
import type { AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';
import layout from '../../public/assets/solrahn-v2/enclosure-goal020.json';

import { SummonerAssets } from './summoner-assets';

// GOAL 020 enclosure: the visible half of the lane / wilderness / lane structure.
// The matching walk mask (walk-goal020.bin) already blocks these footprints, so the walls are honest:
// nothing here moves, collides or navigates. Procedural boulder-wall for continuous walls,
// decimated Poly Haven (CC0) scans for the outer ridge and for gate shoulders.
const hash = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (a: number, b: number, t: number) => {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
};

// Icosphere (one subdivision: 42 vertices / 80 triangles) shared by every boulder.
function icosphere() {
    const t = (1 + Math.sqrt(5)) / 2;
    const v: number[][] = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
        [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map((p) => {
        const l = Math.hypot(...p);
        return p.map((c) => c / l);
    });
    let f = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
        const k = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!cache.has(k)) {
            const m = v[a].map((c, i) => (c + v[b][i]) / 2);
            const l = Math.hypot(...m);
            v.push(m.map((c) => c / l));
            cache.set(k, v.length - 1);
        }
        return cache.get(k)!;
    };
    const out: number[][] = [];
    for (const [a, b, c] of f) {
        const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        out.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    f = out;
    return { verts: v, faces: f };
}

type Placement = { x: number; z: number; yaw: number; scale: number; sink: number; flip?: number };

export function createSolrahnEnclosure(app: AppBase, parent: Entity, surface: SolrahnV2) {
    const root = new Entity('goal020-enclosure');
    parent.addChild(root);
    const cache = new SummonerAssets(app);
    const meshes: Mesh[] = [];
    const buffers: VertexBuffer[] = [];
    const materials: StandardMaterial[] = [];
    const diagnostics = { state: 'loading', error: '', wallBoulders: 0, wallTriangles: 0, scanInstances: 0, scanTriangles: 0, trees: 0, treeTriangles: 0 };
    let destroyed = false;

    // ---- procedural boulder wall ----------------------------------------------------------
    const ico = icosphere();
    const wallMat = new StandardMaterial();
    wallMat.diffuse = new Color(1, 1, 1);
    wallMat.diffuseVertexColor = true;
    wallMat.gloss = 0.08;
    wallMat.useMetalness = false;
    wallMat.update();
    materials.push(wallMat);

    const BINS = 4;
    const bins: { p: number[]; c: number[]; i: number[] }[] = Array.from({ length: BINS }, () => ({ p: [], c: [], i: [] }));
    const seg = layout.segments as unknown as [number, number, number, number, number, string][];
    let blobId = 0;
    const blob = (x: number, z: number, r: number, hy: number, tone: number) => {
        const bin = bins[Math.min(BINS - 1, Math.max(0, Math.floor(((z + 80) / 160) * BINS)))];
        const ground = surface.height(x, z);
        const id = ++blobId;
        const base = bin.p.length / 3;
        const rx = r * (0.9 + hash(id * 3.1) * 0.35), rz = r * (0.9 + hash(id * 5.3) * 0.35);
        const rot = hash(id * 7.7) * 6.283, cr = Math.cos(rot), sr = Math.sin(rot);
        const lowCol = [0.07, 0.08, 0.075], midCol = [0.15, 0.155, 0.145], hiCol = [0.23, 0.23, 0.215], moss = [0.085, 0.12, 0.055];
        const tint = 0.9 + hash(id * 11.3) * 0.2 + tone * 0.08;
        ico.verts.forEach((u, vi) => {
            const d = 0.88 + 0.2 * hash(id * 97 + vi * 13.7) + 0.1 * Math.sin(u[0] * 3 + id) * Math.cos(u[2] * 2.5 - id);
            const lx = u[0] * rx * d, lz = u[2] * rz * d;
            const y = Math.max(u[1] * hy * d, -hy * 0.25) + hy * 0.15; // buried base, rounded crown
            const wx = x + lx * cr - lz * sr, wz = z + lx * sr + lz * cr;
            const wy = surface.height(wx, wz) + y - 0.35;
            bin.p.push(wx, Math.max(wy, ground - 0.4), wz);
            const t = Math.min(1, Math.max(0, (y + hy * 0.1) / (hy * 1.25)));
            let col = t < 0.5 ? mix(lowCol, midCol, t * 2) : mix(midCol, hiCol, (t - 0.5) * 2);
            col = mix(col, moss, smooth(0.35, 0.9, u[1]) * (0.3 + 0.35 * hash(id * 17 + vi)));
            bin.c.push(col[0] * tint, col[1] * tint, col[2] * tint, 1);
        });
        for (const f of ico.faces) bin.i.push(base + f[0], base + f[1], base + f[2]);
        diagnostics.wallBoulders++;
    };
    // One boulder per ~1.8 m of wall; a second, taller crown boulder about a third of the time.
    let carry = 0;
    for (const [x0, z0, x1, z1, thickness, kind] of seg) {
        if (kind === 'belt') continue; // belts carry trees, not boulders
        const len = Math.hypot(x1 - x0, z1 - z0);
        carry += len;
        if (carry < 1.45) continue;
        carry = 0;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, id = blobId + 1;
        const jitter = (hash(id * 2.3) - 0.5) * 0.7;
        const hy = (kind === 'lane' ? 1.55 : 1.9) * (0.8 + hash(id * 4.1) * 0.5);
        blob(mx + jitter, mz, thickness * 0.72, hy, hash(id));
        if (hash(id * 9.1) < 0.4) blob(mx - jitter * 0.8, mz + 0.7, thickness * 0.55, hy * 1.35, hash(id + 5));
    }
    let wallTriangles = 0;
    bins.forEach((b, i) => {
        if (!b.p.length) return;
        // Faceted (unwelded) rock reads as cut stone at gameplay distance; smooth normals read as pillows.
        const fp: number[] = [], fc: number[] = [], fi: number[] = [];
        for (let k = 0; k < b.i.length; k++) {
            const v = b.i[k];
            fp.push(b.p[v * 3], b.p[v * 3 + 1], b.p[v * 3 + 2]);
            fc.push(b.c[v * 4], b.c[v * 4 + 1], b.c[v * 4 + 2], 1);
            fi.push(k);
        }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(fp);
        mesh.setNormals(calculateNormals(fp, fi));
        mesh.setColors(fc);
        mesh.setIndices(fi);
        mesh.update();
        meshes.push(mesh);
        wallTriangles += b.i.length / 3;
        const e = new Entity(`boulder-wall-${i}`);
        root.addChild(e);
        e.addComponent('render', { meshInstances: [new MeshInstance(mesh, wallMat, e)], castShadows: false, receiveShadows: false });
    });
    diagnostics.wallTriangles = wallTriangles;


    // ---- faceted tree masses (hardware-instanced, camera-line masked) -----------------------
    // Low-poly faceted crowns match the faceted rock and stay cheap; photoscanned Poly Haven trees are
    // 0.5-0.8 M triangles each and read as a different art style next to them. Trees stand only on
    // non-walkable ground (see design-enclosure.py), so nobody walks through a trunk.
    const treeMat = new StandardMaterial();
    treeMat.diffuse = new Color(1, 1, 1);
    treeMat.diffuseVertexColor = true;
    treeMat.gloss = 0.06;
    treeMat.useMetalness = false;
    treeMat.update();
    materials.push(treeMat);
    const cone = (p: number[], c: number[], i: number[], y0: number, y1: number, r: number, sides: number, col: number[], twist: number) => {
        const base = p.length / 3;
        for (let k = 0; k < sides; k++) {
            const a0 = (k / sides) * 6.283 + twist, a1 = ((k + 1) / sides) * 6.283 + twist;
            const jr = r * (0.88 + 0.24 * hash(k * 7 + y0 * 31));
            // flat-shaded: own vertices per face
            p.push(Math.cos(a0) * jr, y0, Math.sin(a0) * jr, Math.cos(a1) * r, y0, Math.sin(a1) * r, 0, y1, 0);
            const shade = 0.82 + 0.3 * hash(k * 13 + y1 * 17);
            for (let v = 0; v < 3; v++) c.push(col[0] * shade * (v === 2 ? 1.35 : 1), col[1] * shade * (v === 2 ? 1.3 : 1), col[2] * shade * (v === 2 ? 1.2 : 1), 1);
            i.push(base + k * 3, base + k * 3 + 2, base + k * 3 + 1);
        }
    };
    const crownBlob = (p: number[], c: number[], i: number[], cx: number, cy: number, cz: number, r: number, col: number[], seed: number) => {
        for (const f of ico.faces) {
            const base = p.length / 3;
            const shade = 0.8 + 0.35 * hash(seed + f[0] * 3.3);
            for (const vi of f) {
                const u = ico.verts[vi], d = 0.85 + 0.25 * hash(seed * 5 + vi);
                p.push(cx + u[0] * r * d, cy + u[1] * r * d * 0.85, cz + u[2] * r * d);
                const top = 1 + 0.3 * Math.max(0, u[1]);
                c.push(col[0] * shade * top, col[1] * shade * top, col[2] * shade * top, 1);
            }
            i.push(base, base + 1, base + 2);
        }
    };
    const trunkCol = [0.11, 0.08, 0.06];
    const variants = [0, 1, 2, 3].map((v) => {
        const p: number[] = [], c: number[] = [], i: number[] = [];
        if (v === 0 || v === 1) {
            // conifers: trunk + stacked cones, v1 slimmer / taller
            const g = v === 0 ? [0.06, 0.11, 0.06] : [0.05, 0.095, 0.065];
            cone(p, c, i, 0, 0.35, 0.05, 5, trunkCol, 0);
            const tiers = v === 0 ? 3 : 4, w = v === 0 ? 0.36 : 0.27;
            for (let t = 0; t < tiers; t++) {
                const y0 = 0.18 + (t * 0.72) / tiers, y1 = y0 + 0.5 - t * 0.04;
                cone(p, c, i, y0, Math.min(1, y1), w * (1 - t / (tiers + 0.6)), 7, g, t * 0.7);
            }
        } else {
            const g = v === 2 ? [0.075, 0.12, 0.05] : [0.065, 0.1, 0.045];
            if (v === 2) {
                cone(p, c, i, 0, 0.5, 0.05, 5, trunkCol, 0);
                crownBlob(p, c, i, 0, 0.62, 0, 0.3, g, 1);
                crownBlob(p, c, i, 0.16, 0.5, 0.08, 0.22, g, 2);
                crownBlob(p, c, i, -0.14, 0.52, -0.1, 0.2, g, 3);
            } else {
                // undergrowth clump (scaled small)
                crownBlob(p, c, i, 0, 0.3, 0, 0.42, g, 4);
                crownBlob(p, c, i, 0.35, 0.22, 0.1, 0.3, g, 5);
                crownBlob(p, c, i, -0.3, 0.2, -0.15, 0.28, g, 6);
            }
        }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, i));
        mesh.setColors(c);
        mesh.setIndices(i);
        mesh.update();
        meshes.push(mesh);
        return { mesh, tris: i.length / 3 };
    });
    type TreeBatch = { instance: MeshInstance; buffer: VertexBuffer; matrices: Float32Array; pos: number[][]; mask: string };
    const treeBatches: TreeBatch[] = [];
    const treeList = layout.trees as number[][];
    let treeTriangles = 0;
    variants.forEach((variant, v) => {
        const list = treeList.filter((t) => t[3] === v);
        if (!list.length) return;
        const matrices = new Float32Array(list.length * 16);
        const m = new Mat4(), q = new Quat(), t = new Vec3(), sc = new Vec3();
        list.forEach(([x, z, h, , yaw], k) => {
            const hh = v === 3 ? h * 0.32 : h;
            q.setFromEulerAngles(0, yaw, 0);
            t.set(x, surface.height(x, z) - 0.1, z);
            sc.set(hh * (v === 3 ? 1.6 : 1), hh, hh * (v === 3 ? 1.6 : 1));
            m.setTRS(t, q, sc);
            matrices.set(m.data, k * 16);
        });
        const buffer = new VertexBuffer(app.graphicsDevice, VertexFormat.getDefaultInstancingFormat(app.graphicsDevice), list.length, { usage: BUFFER_STATIC, data: matrices.slice() });
        buffers.push(buffer);
        const e = new Entity(`tree-mass-${v}`);
        root.addChild(e);
        const instance = new MeshInstance(variant.mesh, treeMat, e);
        instance.setInstancing(buffer, true);
        e.addComponent('render', { meshInstances: [instance], castShadows: false, receiveShadows: false });
        const aabb = variant.mesh.aabb.clone();
        aabb.center.set(0, 5, 0);
        aabb.halfExtents.set(70, 12, 85);
        e.render!.customAabb = aabb;
        treeBatches.push({ instance, buffer, matrices, pos: list.map((p) => [p[0], p[1], p[2]]), mask: '' });
        treeTriangles += list.length * variant.tris;
    });
    diagnostics.trees = treeList.length;
    diagnostics.treeTriangles = treeTriangles;
    let lastX = Infinity, lastZ = Infinity;

    // ---- decimated Poly Haven scans (hardware-instanced) ----------------------------------
    const place = (name: string, list: Placement[], tint: [number, number, number]) =>
        (async () => {
            const asset = await cache.load(`assets/environment/polyhaven/goal020/${name}.glb`);
            if (destroyed) return;
            const model = (asset.resource as ContainerResource).instantiateRenderEntity();
            const parts = (model.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances);
            const worlds = parts.map((p) => p.node.getWorldTransform().clone());
            for (const part of parts) {
                const m = part.material as StandardMaterial;
                m.diffuse.set(...tint);
                m.gloss = 0.1;
                m.glossMap = null;
                m.useMetalness = false;
                m.specular = new Color(0.02, 0.02, 0.02);
                m.update();
                materials.push(m);
            }
            parts.forEach((part, pi) => {
                const data = new Float32Array(list.length * 16);
                const m = new Mat4(), q = new Quat(), t = new Vec3(), s = new Vec3();
                list.forEach((p, i) => {
                    q.setFromEulerAngles(0, p.yaw, 0);
                    t.set(p.x, surface.height(p.x, p.z) - p.sink, p.z);
                    s.set(p.scale, p.scale * (p.flip ?? 1), p.scale);
                    m.setTRS(t, q, s);
                    m.mul2(m, worlds[pi]);
                    data.set(m.data, i * 16);
                });
                const buffer = new VertexBuffer(app.graphicsDevice, VertexFormat.getDefaultInstancingFormat(app.graphicsDevice), list.length, { usage: BUFFER_STATIC, data });
                buffers.push(buffer);
                const e = new Entity(`scan-${name}-${pi}`);
                root.addChild(e);
                const instance = new MeshInstance(part.mesh!, part.material!, e);
                instance.setInstancing(buffer, true);
                e.addComponent('render', { meshInstances: [instance], castShadows: false, receiveShadows: false });
                // Instances span the whole map: one conservative bound, normal frustum culling of the batch.
                const aabb = part.mesh!.aabb.clone();
                aabb.center.set(0, 4, 0);
                aabb.halfExtents.set(70, 12, 85);
                e.render!.customAabb = aabb;
                diagnostics.scanInstances += list.length;
                diagnostics.scanTriangles += list.length * ((part.mesh!.primitive[0].count ?? 0) / 3);
            });
            model.destroy();
        })();

    // Barrier ridge: cliff sections sit ON the 3v3 boundary (inside camera width) between the forest windows,
    // so the bigger arena (top / combo lanes) is glimpsed through the gaps but never reachable in 3v3.
    const ridge: Placement[] = [];
    const ridge04: Placement[] = [];
    const windows = [-80, ...(layout.windows as number[]), 80];
    for (const side of [-1, 1])
        for (let i = 0; i < windows.length - 1; i++) {
            const a = windows[i] + (i ? 6.5 : 0), b = windows[i + 1] - (i < windows.length - 2 ? 6.5 : 0);
            const len = b - a;
            if (len < 8) continue;
            ridge.push({
                x: side * (layout.outer + 2.6),
                z: (a + b) / 2,
                yaw: side > 0 ? 90 : -90,
                scale: Math.min(0.62, len / 41),
                sink: 0.6
            });
        }
    // Base backdrops: a long cliff closes each end of the arena so no spawn looks onto empty sky.
    // Only the far (-Z) end: the competitive camera sits +18 m on +Z, so a +Z backdrop would sit between it and Blue's base.
    for (const end of [-1])
        for (const x of [-30, 0, 30])
            ridge04.push({ x: x + end * 4, z: end * 82, yaw: (end > 0 ? 180 : 0) + x * 0.15, scale: 0.62, sink: 1.0 });
    // Gate shoulders: one scan cluster hugging each end of every gap, alternating sides of the throat.
    const shoulders: Placement[] = [];
    (layout.gates as { side: string; z: number; width: number }[]).forEach((g, i) => {
        const sg = g.side === 'W' ? -1 : 1;
        for (const e of [-1, 1]) {
            const z = g.z + e * (g.width / 2 + 1.6);
            const edge = 7.6 + 0.9 * Math.sin(z * 0.085 + (sg < 0 ? 0.8 : 2.4)) + 1.5;
            shoulders.push({
                x: sg * (edge + (e > 0 ? 0.2 : -0.1)),
                z,
                yaw: i * 67 + e * 40,
                scale: 1.25 + 0.25 * hash(i * 3 + e),
                sink: 0.18
            });
        }
    });
    // Spur ends: a heavy cluster where a spur stops so the pass reads as a deliberate opening.
    (layout.spurs as { x1: number; z: number }[]).forEach((s, i) =>
        shoulders.push({ x: s.x1, z: s.z, yaw: i * 91, scale: 1.45, sink: 0.2 })
    );

    const ready = Promise.all([
        place('coastal_cliff_02', ridge, [0.78, 0.82, 0.78]),
        place('coastal_cliff_04', ridge04, [0.8, 0.84, 0.8]),
        place('coast_rocks_05', shoulders, [0.78, 0.84, 0.86])
    ]).then(() => {
        if (!destroyed) diagnostics.state = 'loaded';
    });
    void ready.catch((error: unknown) => {
        if (!destroyed) {
            diagnostics.state = 'error';
            diagnostics.error = String(error);
        }
    });

    return {
        ready,
        diagnostics,
        // Hide trees standing between the competitive camera (behind, +Z) and the player, as the GOAL 019 props do.
        update(x: number, z: number) {
            if (Math.hypot(x - lastX, z - lastZ) < 0.75) return;
            lastX = x;
            lastZ = z;
            for (const b of treeBatches) {
                const keep = b.pos.map(([px, pz, h]) => !(Math.abs(px - x) < 3.2 + h * 0.25 && pz > z - 1.5 && pz < z + 15));
                const mask = keep.map(Number).join('');
                if (mask === b.mask) continue;
                b.mask = mask;
                const visible = new Float32Array(b.matrices.length);
                let n = 0;
                keep.forEach((k, i) => {
                    if (k) visible.set(b.matrices.subarray(i * 16, i * 16 + 16), n++ * 16);
                });
                b.buffer.setData(visible);
                b.instance.instancingCount = n;
                b.instance.visible = n > 0;
            }
        },
        get loading() {
            return diagnostics.state === 'loading';
        },
        destroy() {
            destroyed = true;
            root.destroy();
            meshes.forEach((m) => m.destroy());
            buffers.forEach((b) => b.destroy());
            wallMat.destroy();
            treeMat.destroy();
            cache.destroy();
        }
    };
}
