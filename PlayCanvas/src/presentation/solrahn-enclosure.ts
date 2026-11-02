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
    const diagnostics = { state: 'loading', error: '', wallBoulders: 0, wallTriangles: 0, scanInstances: 0, scanTriangles: 0 };
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
        const lowCol = [0.27, 0.31, 0.25], midCol = [0.5, 0.5, 0.44], hiCol = [0.64, 0.62, 0.54], moss = [0.3, 0.44, 0.2];
        const tint = 0.9 + hash(id * 11.3) * 0.2 + tone * 0.08;
        ico.verts.forEach((u, vi) => {
            const d = 0.8 + 0.4 * hash(id * 97 + vi * 13.7) + 0.16 * Math.sin(u[0] * 5 + id) * Math.cos(u[2] * 4 - id);
            const lx = u[0] * rx * d, lz = u[2] * rz * d;
            const y = Math.max(u[1] * hy * d, -hy * 0.2) + hy * 0.28; // buried base, rounded crown
            const wx = x + lx * cr - lz * sr, wz = z + lx * sr + lz * cr;
            const wy = surface.height(wx, wz) + y - 0.35;
            bin.p.push(wx, Math.max(wy, ground - 0.4), wz);
            const t = Math.min(1, Math.max(0, (y + hy * 0.1) / (hy * 1.25)));
            let col = t < 0.5 ? mix(lowCol, midCol, t * 2) : mix(midCol, hiCol, (t - 0.5) * 2);
            col = mix(col, moss, smooth(0.35, 0.9, u[1]) * (0.55 + 0.35 * hash(id * 17 + vi)));
            bin.c.push(col[0] * tint, col[1] * tint, col[2] * tint, 1);
        });
        for (const f of ico.faces) bin.i.push(base + f[0], base + f[2], base + f[1]);
        diagnostics.wallBoulders++;
    };
    // One boulder per ~1.8 m of wall; a second, taller crown boulder about a third of the time.
    let carry = 0;
    for (const [x0, z0, x1, z1, thickness, kind] of seg) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        carry += len;
        if (carry < 1.7) continue;
        carry = 0;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, id = blobId + 1;
        const jitter = (hash(id * 2.3) - 0.5) * 0.7;
        const hy = (kind === 'lane' ? 2.1 : 1.7) * (0.8 + hash(id * 4.1) * 0.75);
        blob(mx + jitter, mz, thickness * 0.6, hy, hash(id));
        if (hash(id * 9.1) < 0.34) blob(mx - jitter * 0.8, mz + 0.8, thickness * 0.5, hy * 1.45, hash(id + 5));
    }
    let wallTriangles = 0;
    bins.forEach((b, i) => {
        if (!b.p.length) return;
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(b.p);
        mesh.setNormals(calculateNormals(b.p, b.i));
        mesh.setColors(b.c);
        mesh.setIndices(b.i);
        mesh.update();
        meshes.push(mesh);
        wallTriangles += b.i.length / 3;
        const e = new Entity(`boulder-wall-${i}`);
        root.addChild(e);
        e.addComponent('render', { meshInstances: [new MeshInstance(mesh, wallMat, e)], castShadows: false, receiveShadows: false });
    });
    diagnostics.wallTriangles = wallTriangles;

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

    const ridge: Placement[] = [];
    const ridge04: Placement[] = [];
    for (const side of [-1, 1]) {
        let zc = -72 + (side > 0 ? 6 : 0);
        let n = 0;
        while (zc < 84) {
            const big = n % 2 === 0;
            const len = big ? 31 : 26; // visible length at the scale below
            (big ? ridge04 : ridge).push({
                x: side * (layout.outer + (big ? 7.5 : 3.6)),
                z: zc + len / 2,
                yaw: side > 0 ? 90 : -90,
                scale: big ? 0.36 : 0.64,
                sink: big ? 0.7 : 0.5
            });
            zc += len - 2;
            n++;
        }
    }
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
        get loading() {
            return diagnostics.state === 'loading';
        },
        destroy() {
            destroyed = true;
            root.destroy();
            meshes.forEach((m) => m.destroy());
            buffers.forEach((b) => b.destroy());
            wallMat.destroy();
            cache.destroy();
        }
    };
}
