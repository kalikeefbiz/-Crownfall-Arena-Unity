import {
    ADDRESS_CLAMP_TO_EDGE,
    Color,
    Entity,
    Mesh,
    MeshInstance,
    Quat,
    StandardMaterial,
    Vec3,
    calculateNormals
} from 'playcanvas';
import type { AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';

import { SummonerAssets } from './summoner-assets';
import { terrainTextures } from './terrain-textures';

// GOAL 021 art-kit comparison: three directions dressing the SAME 46 x 30 m stretch (x -26..20, z 12..42).
// Presentation only: the approved collision, heights and markings are untouched. ?style=a|b|c selects one.
export type SliceStyle = 'a' | 'b' | 'c';
const X0 = -26,
    X1 = 20,
    Z0 = 12,
    Z1 = 42;
const RAMPS: [number, number, number][] = [
    [-1, 24, 5],
    [-1, 10, 2.4],
    [1, 20, 3.6],
    [1, 34, 2.4]
];
export const hash = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
};
export const lerp = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
// Lane floor edge at this z: the 10 m strip, widened by the z = 30 plaza.
const laneEdge = (z: number) => Math.max(5, Math.sqrt(Math.max(0, 64 - (z - 30) ** 2)));
const inRamp = (side: number, z: number, margin = 0) =>
    RAMPS.some(([s, rz, w]) => s === side && Math.abs(z - rz) <= w / 2 + 0.8 + margin);

export type Geo = { p: number[]; c: number[]; i: number[] };
export const geo = (): Geo => ({ p: [], c: [], i: [] });
// Flat-shaded box (optionally tapered) with per-face colour.
export function box(
    g: Geo,
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    col: number[],
    yaw = 0,
    top = 1
) {
    const cr = Math.cos(yaw),
        sr = Math.sin(yaw);
    const v = (x: number, y: number, z: number) => {
        const k = y > 0 ? top : 1;
        const lx = x * sx * k,
            lz = z * sz * k;
        return [cx + lx * cr - lz * sr, cy + y * sy, cz + lx * sr + lz * cr];
    };
    const faces = [
        [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1], 1.12],
        [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], 0.95],
        [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], 0.8],
        [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1], 0.9],
        [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], 0.86]
    ] as const;
    for (const f of faces) {
        const o = g.p.length / 3;
        for (let k = 0; k < 4; k++) {
            const [x, y, z] = f[k] as readonly number[];
            g.p.push(...v(x * 0.5, y * 0.5, z * 0.5));
            g.c.push(col[0] * (f[4] as number), col[1] * (f[4] as number), col[2] * (f[4] as number), 1);
        }
        g.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
}
// Low-poly rock/crown blob (icosahedron, one subdivision), smooth or faceted.
export const ico = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
        [-1, t, 0],
        [1, t, 0],
        [-1, -t, 0],
        [1, -t, 0],
        [0, -1, t],
        [0, 1, t],
        [0, -1, -t],
        [0, 1, -t],
        [t, 0, -1],
        [t, 0, 1],
        [-t, 0, -1],
        [-t, 0, 1]
    ].map((p) => p.map((c) => c / Math.hypot(...p)));
    let f = [
        [0, 11, 5],
        [0, 5, 1],
        [0, 1, 7],
        [0, 7, 10],
        [0, 10, 11],
        [1, 5, 9],
        [5, 11, 4],
        [11, 10, 2],
        [10, 7, 6],
        [7, 1, 8],
        [3, 9, 4],
        [3, 4, 2],
        [3, 2, 6],
        [3, 6, 8],
        [3, 8, 9],
        [4, 9, 5],
        [2, 4, 11],
        [6, 2, 10],
        [8, 6, 7],
        [9, 8, 1]
    ];
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
        const k = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (!cache.has(k)) {
            const m = v[a].map((c, i) => (c + v[b][i]) / 2);
            v.push(m.map((c) => c / Math.hypot(...m)));
            cache.set(k, v.length - 1);
        }
        return cache.get(k)!;
    };
    f = f.flatMap(([a, b, c]) => {
        const ab = mid(a, b),
            bc = mid(b, c),
            ca = mid(c, a);
        return [
            [a, ab, ca],
            [b, bc, ab],
            [c, ca, bc],
            [ab, bc, ca]
        ];
    });
    return { v, f };
})();
export function blob(
    g: Geo,
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    low: number[],
    high: number[],
    seed: number,
    jitter = 0.18
) {
    for (const face of ico.f) {
        const o = g.p.length / 3;
        for (const vi of face) {
            const u = ico.v[vi],
                d = 1 - jitter / 2 + jitter * hash(seed * 31 + vi);
            g.p.push(cx + u[0] * rx * d, cy + u[1] * ry * d, cz + u[2] * rz * d);
            const t = Math.min(1, Math.max(0, (u[1] + 0.6) / 1.4));
            const c = lerp(low, high, t);
            g.c.push(c[0], c[1], c[2], 1);
        }
        g.i.push(o, o + 1, o + 2);
    }
}
export function cone(
    g: Geo,
    cx: number,
    cy: number,
    cz: number,
    r: number,
    hgt: number,
    col: number[],
    sides: number,
    seed: number
) {
    for (let k = 0; k < sides; k++) {
        const a0 = (k / sides) * Math.PI * 2 + seed,
            a1 = ((k + 1) / sides) * Math.PI * 2 + seed;
        const o = g.p.length / 3,
            sh = 0.8 + 0.35 * hash(seed * 7 + k);
        g.p.push(
            cx + Math.cos(a0) * r,
            cy,
            cz + Math.sin(a0) * r,
            cx,
            cy + hgt,
            cz,
            cx + Math.cos(a1) * r,
            cy,
            cz + Math.sin(a1) * r
        );
        for (let v = 0; v < 3; v++)
            g.c.push(
                col[0] * sh * (v === 1 ? 1.4 : 1),
                col[1] * sh * (v === 1 ? 1.35 : 1),
                col[2] * sh * (v === 1 ? 1.2 : 1),
                1
            );
        g.i.push(o, o + 1, o + 2);
    }
}

export function createColiseumStyleSlice(app: AppBase, parent: Entity, surface: SolrahnV2, style: SliceStyle) {
    const root = new Entity(`coliseum-style-${style}`);
    parent.addChild(root);
    const maps = terrainTextures(app, 'assets/coliseum/styles');
    const cache = new SummonerAssets(app);
    const meshes: Mesh[] = [];
    const materials: StandardMaterial[] = [];
    let destroyed = false;
    const add = (g: Geo, mat: StandardMaterial, name: string, flat = true) => {
        if (!g.i.length) return;
        let p = g.p,
            c = g.c,
            i = g.i;
        if (flat) {
            const fp: number[] = [],
                fc: number[] = [],
                fi: number[] = [];
            i.forEach((v, k) => {
                fp.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);
                fc.push(c[v * 4], c[v * 4 + 1], c[v * 4 + 2], 1);
                fi.push(k);
            });
            p = fp;
            c = fc;
            i = fi;
        }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, i));
        mesh.setColors(c);
        mesh.setIndices(i);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity(name);
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat, e)],
            castShadows: false,
            receiveShadows: false
        });
    };
    const vertexMat = (gloss = 0.1, emissive?: Color) => {
        const m = new StandardMaterial();
        m.diffuse = new Color(1, 1, 1);
        m.diffuseVertexColor = true;
        m.gloss = gloss;
        m.useMetalness = false;
        if (emissive) {
            m.emissive = emissive;
            m.emissiveVertexColor = true;
        }
        m.update();
        materials.push(m);
        return m;
    };
    const stats = { style, triangles: 0 };

    // ---- draped ground (one texture for the whole slice) ----
    const tex = maps.load(`${style}-ground.webp`, true, {
        width: 1104,
        height: 720,
        flipY: false,
        clamp: ADDRESS_CLAMP_TO_EDGE,
        anisotropy: 2
    });
    const groundMat = new StandardMaterial();
    groundMat.diffuseMap = tex.texture;
    groundMat.gloss = style === 'c' ? 0.18 : 0.12;
    groundMat.useMetalness = false;
    groundMat.update();
    materials.push(groundMat);
    {
        const step = 0.5,
            nx = Math.round((X1 - X0) / step) + 1,
            nz = Math.round((Z1 - Z0) / step) + 1;
        const p: number[] = [],
            uv: number[] = [],
            idx: number[] = [];
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) {
                const x = X0 + i * step,
                    z = Z0 + j * step;
                p.push(x, surface.height(x, z) + 0.035, z);
                uv.push((x - X0) / (X1 - X0), (z - Z0) / (Z1 - Z0));
            }
        for (let j = 0; j < nz - 1; j++)
            for (let i = 0; i < nx - 1; i++) {
                const a = j * nx + i,
                    b = a + 1,
                    c = a + nx,
                    d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, idx));
        mesh.setUvs(0, uv);
        mesh.setIndices(idx);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity('slice-ground');
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, groundMat, e)],
            castShadows: false,
            receiveShadows: false
        });
        stats.triangles += idx.length / 3;
    }

    // ---- lane walls (the 2 m face between lane floor and rim) + rim-top trees ----
    const wall = geo(),
        trim = geo(),
        trees = geo(),
        rocks: { x: number; z: number; yaw: number; s: number }[] = [];
    for (const side of [-1, 1])
        for (let z = Z0 + 0.4; z < Z1 - 0.4;) {
            const edge = laneEdge(z);
            if (inRamp(side, z)) {
                z += 0.5;
                continue;
            }
            const len =
                style === 'a' ? 0.9 + 0.7 * hash(z * 3.1 + side) : style === 'b' ? 1.6 + 0.8 * hash(z + side) : 1.4;
            const yaw = 0;
            const xf = side * (edge + 0.32);
            if (style === 'a') {
                // Carved masonry: three courses, alternating joints, pale limestone, a gold-trim cap.
                for (let r = 0; r < 3; r++) {
                    const off = r % 2 ? len / 2 : 0;
                    const tone = 0.82 + 0.2 * hash(z * 7 + r * 13 + side);
                    const col = [0.72 * tone, 0.66 * tone, 0.55 * tone];
                    box(wall, xf, 2.0 + 0.36 + r * 0.66, z + off * 0.2, 0.62, 0.64, len - 0.06, col, yaw);
                }
                box(trim, side * (edge + 0.28), 4.07, z, 0.72, 0.14, len, [0.95, 0.68, 0.22], yaw);
            } else if (style === 'b') {
                const low = [0.36, 0.3, 0.5],
                    high = [0.86, 0.66, 0.52];
                blob(wall, xf + side * 0.35, 3.0, z + len / 2, 0.95, 1.25, len * 0.62, low, high, z * 5 + side, 0.08);
            } else
                rocks.push({
                    x: xf + side * 0.6,
                    z: z + len / 2,
                    yaw: hash(z * 9) * 360,
                    s: 0.85 + 0.35 * hash(z * 3 + side)
                });
            z += len;
        }
    for (const side of [-1, 1])
        for (let z = Z0 + 1.5; z < Z1 - 1; z += 3.4 + 1.2 * hash(z + side * 9)) {
            if (laneEdge(z) > 6.2 || inRamp(side, z, 1.4)) continue;
            const x = side * (7.4 + 0.8 * hash(z * 2 + side)),
                y = surface.height(x, z) - 0.05,
                hgt = 4.2 + 2.2 * hash(z * 5 + side),
                k = Math.floor(hash(z * 11 + side) * 3);
            if (style === 'a') {
                if (k === 2) {
                    cone(trees, x, y, z, 0.12, 1.5, [0.2, 0.13, 0.08], 5, z);
                    blob(
                        trees,
                        x,
                        y + hgt * 0.62,
                        z,
                        hgt * 0.32,
                        hgt * 0.3,
                        hgt * 0.32,
                        [0.42, 0.12, 0.06],
                        [0.86, 0.34, 0.12],
                        z,
                        0.3
                    );
                } else
                    for (let t = 0; t < 3; t++)
                        cone(
                            trees,
                            x,
                            y + 0.5 + t * hgt * 0.24,
                            z,
                            hgt * (0.3 - t * 0.07),
                            hgt * 0.46,
                            [0.1, 0.2, 0.1],
                            7,
                            z + t
                        );
            } else if (style === 'b') {
                cone(trees, x, y, z, 0.14, 1.6, [0.42, 0.25, 0.14], 6, z);
                blob(
                    trees,
                    x,
                    y + hgt * 0.62,
                    z,
                    hgt * 0.34,
                    hgt * 0.32,
                    hgt * 0.34,
                    k === 1 ? [0.75, 0.32, 0.12] : [0.16, 0.42, 0.16],
                    k === 1 ? [1, 0.68, 0.26] : [0.56, 0.86, 0.3],
                    z,
                    0.06
                );
            } else
                for (let t = 0; t < 3; t++)
                    cone(
                        trees,
                        x,
                        y + 0.5 + t * hgt * 0.24,
                        z,
                        hgt * (0.28 - t * 0.065),
                        hgt * 0.46,
                        [0.07, 0.12, 0.08],
                        7,
                        z + t
                    );
        }
    add(wall, vertexMat(style === 'a' ? 0.16 : 0.08), 'slice-lane-walls', style !== 'b');
    add(trim, vertexMat(0.35, new Color(0.5, 0.36, 0.1)), 'slice-gold-trim');
    add(trees, vertexMat(0.06), 'slice-rim-trees', style !== 'b');
    stats.triangles += (wall.i.length + trim.i.length + trees.i.length) / 3;

    // Weathered: decimated Poly Haven CC0 scan rocks along the walls (same asset as GOAL 020).
    const ready = (async () => {
        await tex.ready;
        if (style !== 'c' || destroyed) return;
        const asset = await cache.load('assets/environment/polyhaven/goal020/coast_rocks_05.glb');
        if (destroyed) return;
        const library = (asset.resource as ContainerResource).instantiateRenderEntity();
        const parts = (library.findComponents('render') as RenderComponent[]).flatMap((r) => r.meshInstances);
        for (const part of parts) {
            const m = part.material as StandardMaterial;
            m.diffuse.set(0.72, 0.74, 0.7);
            m.gloss = 0.1;
            m.update();
        }
        const q = new Quat(),
            t = new Vec3(),
            s = new Vec3();
        for (const r of rocks)
            for (const part of parts) {
                const e = new Entity('slice-scan-rock');
                root.addChild(e);
                q.setFromEulerAngles(0, r.yaw, 0);
                t.set(r.x, surface.height(r.x - Math.sign(r.x) * 1.2, r.z) - 0.2, r.z);
                s.set(r.s, r.s * 1.9, r.s);
                e.setLocalPosition(t);
                e.setLocalRotation(q);
                e.setLocalScale(s);
                e.addComponent('render', {
                    meshInstances: [new MeshInstance(part.mesh!, part.material!, e)],
                    castShadows: false,
                    receiveShadows: false
                });
                stats.triangles += (part.mesh!.primitive[0].count ?? 0) / 3;
            }
        library.destroy();
    })();
    void ready.catch(() => {
        /* Comparison-only dressing: a failed optional load leaves the graybox visible. */
    });
    return {
        ready,
        stats,
        destroy() {
            destroyed = true;
            root.destroy();
            meshes.forEach((m) => m.destroy());
            materials.forEach((m) => m.destroy());
            maps.destroy?.();
            cache.destroy();
        }
    };
}
