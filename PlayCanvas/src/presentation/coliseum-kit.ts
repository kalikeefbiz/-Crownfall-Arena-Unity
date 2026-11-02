import {
    ADDRESS_CLAMP_TO_EDGE,
    Color,
    DETAILMODE_OVERLAY,
    Entity,
    Mesh,
    MeshInstance,
    StandardMaterial,
    Vec2,
    calculateNormals
} from 'playcanvas';
import type { AppBase } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';

import { blob, box, cone, geo, hash } from './coliseum-style-slice';
import type { Geo } from './coliseum-style-slice';
import { terrainTextures } from './terrain-textures';

// GOAL 021 art kit (founder pick: A "Gilded Sanctum" + B's richer colour), dressed over the WHOLE arena.
// Presentation only: collision, heights and markings come from build-coliseum.py. Groves are solid in the
// collision mask, so every trunk is an honest obstacle. The layout is mirrored top/bottom, so the ground drape
// covers one half and the mesh mirrors v for z < 0 (keeps the texture at 22 px/m on a phone budget).
type KitData = {
    bounds: [number, number, number, number];
    mirrorZ: boolean;
    size: [number, number];
    water: number[][];
    waterY: number;
    groves: number[][];
    backlot?: number[][]; // [x, z, kind] for z > 0 (mirrored): 0 pine, 1 crag; the non-walkable ground round each base
    stadium?: { hx: number; hz: number; r: number }; // the floor's rounded-rect boundary (stands start outside it)
};
type V3 = number[];
const sub = (a: V3, b: V3) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
};
// One flat quad p0-p1-p2-p3 (in order round its edge), wound so its face points along `want`.
function quad(g: Geo, p0: V3, p1: V3, p2: V3, p3: V3, col: number[], want: V3) {
    const flip = dot(cross(sub(p1, p0), sub(p2, p0)), want) < 0;
    const o = g.p.length / 3;
    for (const q of flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3]) {
        g.p.push(q[0], q[1], q[2]);
        g.c.push(col[0], col[1], col[2], 1);
    }
    g.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
}
// Square-section beam between two points (dome ribs, chains).
function beam(g: Geo, a: V3, b: V3, w: number, col: number[]) {
    const t = norm(sub(b, a));
    const u = norm(cross(t, Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    const v = cross(u, t);
    const off = (k: number) => {
        const an = Math.PI / 4 + (k * Math.PI) / 2;
        return [0, 1, 2].map((i) => ((u[i] * Math.cos(an) + v[i] * Math.sin(an)) * w) / 2);
    };
    for (let k = 0; k < 4; k++) {
        const o0 = off(k),
            o1 = off(k + 1);
        const out = norm([o0[0] + o1[0], o0[1] + o1[1], o0[2] + o1[2]]);
        const add = (p: V3, o: V3) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
        quad(g, add(a, o0), add(b, o0), add(b, o1), add(a, o1), col, out);
    }
}
type RampDef = [number, number, number];

const CLIFF = 0.5; // a ground quad rising more than this is a steep face and gets the sandstone strata texture

export function createColiseumKit(app: AppBase, parent: Entity, surface: SolrahnV2, data: KitData) {
    const [X0, X1, Z0, Z1] = data.bounds;
    const layout = (surface.metadata.layout ?? {}) as { ramps?: RampDef[]; bridges?: number[][] };
    const ramps = layout.ramps ?? [];
    const circ = (z: number, cz: number, r: number) => Math.sqrt(Math.max(0, r * r - (z - cz) ** 2));
    const laneEdge = (z: number) => Math.max(5, circ(z, 30, 8), circ(z, -30, 8), circ(z, 0, 8));
    const inRamp = (side: number, z: number, margin = 0) =>
        ramps.some(([s, rz, w]) => s === side && Math.abs(z - rz) <= w / 2 + 0.8 + margin);
    const root = new Entity('coliseum-art-kit');
    parent.addChild(root);
    const maps = terrainTextures(app, 'assets/coliseum/kit');
    const meshes: Mesh[] = [];
    const materials: StandardMaterial[] = [];
    const stats = { triangles: 0, trees: 0, drawables: 0, waterQuads: data.water.length };
    const addMesh = (mesh: Mesh, mat: StandardMaterial, name: string) => {
        meshes.push(mesh);
        const e = new Entity(name);
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat, e)],
            castShadows: false,
            receiveShadows: false
        });
        stats.drawables++;
        return e;
    };
    const build = (g: Geo, mat: StandardMaterial, name: string, flat: boolean, at?: { x: number; z: number }) => {
        if (!g.i.length) return null;
        let { p, c, i } = g;
        if (flat) {
            const fp: number[] = [],
                fc: number[] = [],
                fi: number[] = [];
            i.forEach((v, k) => {
                fp.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);
                fc.push(c[v * 4], c[v * 4 + 1], c[v * 4 + 2], c[v * 4 + 3]);
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
        stats.triangles += i.length / 3;
        const e = addMesh(mesh, mat, name);
        return { e, x: at?.x ?? 0, z: at?.z ?? 0 };
    };
    const vmat = (gloss: number, emissive?: Color) => {
        const m = new StandardMaterial();
        m.diffuse = new Color(1, 1, 1);
        m.diffuseVertexColor = true;
        m.gloss = gloss;
        m.useMetalness = false;
        m.specular = new Color(0.04, 0.04, 0.035);
        if (emissive) {
            m.emissive = emissive;
            m.emissiveVertexColor = true;
        }
        m.update();
        materials.push(m);
        return m;
    };

    // ---- draped ground (mirrored half) + overlay grain; steep faces split out onto sandstone strata ----
    const groundTex = maps.load('ground.webp', true, {
        width: data.size[0],
        height: data.size[1],
        flipY: false,
        clamp: ADDRESS_CLAMP_TO_EDGE,
        anisotropy: 4
    });
    const detailTex = maps.load('detail.webp', true, { width: 256, height: 256, anisotropy: 2 });
    const cliffTex = maps.load('cliff.webp', true, { width: 256, height: 256, anisotropy: 2 });
    const groundMat = new StandardMaterial();
    groundMat.diffuseMap = groundTex.texture;
    groundMat.diffuseDetailMap = detailTex.texture;
    groundMat.diffuseDetailMapUv = 1;
    groundMat.diffuseDetailMode = DETAILMODE_OVERLAY;
    groundMat.gloss = 0.14;
    groundMat.useMetalness = false;
    groundMat.specular = new Color(0.05, 0.045, 0.04);
    groundMat.update();
    materials.push(groundMat);
    const cliffMat = new StandardMaterial();
    cliffMat.diffuseMap = cliffTex.texture;
    cliffMat.diffuse = new Color(0.92, 0.88, 0.82);
    cliffMat.gloss = 0.1;
    cliffMat.useMetalness = false;
    cliffMat.specular = new Color(0.04, 0.04, 0.035);
    cliffMat.update();
    materials.push(cliffMat);
    {
        // Same vertex lattice as the collision heightfield (113 x 219), so no face is sharper than the graybox.
        const nx = 113,
            nz = 219,
            sx = (X1 - X0) / (nx - 1),
            sz = (Z1 - Z0) / (nz - 1);
        const H = new Float32Array(nx * nz);
        for (let j = 0; j < nz; j++)
            for (let i = 0; i < nx; i++) H[j * nx + i] = surface.height(X0 + i * sx, Z0 + j * sz);
        const halfD = Math.max(Math.abs(Z0), Math.abs(Z1));
        const BAND = 16;
        for (let j0 = 0; j0 < nz - 1; j0 += BAND) {
            const p: number[] = [],
                uv: number[] = [],
                uv1: number[] = [],
                idx: number[] = [];
            const cp: number[] = [],
                cuv: number[] = [],
                cidx: number[] = [];
            const vert = (i: number, j: number) => {
                const x = X0 + i * sx,
                    z = Z0 + j * sz;
                p.push(x, H[j * nx + i] + 0.035, z);
                uv.push((x - X0) / (X1 - X0), data.mirrorZ ? Math.abs(z) / halfD : (z - Z0) / (Z1 - Z0));
                uv1.push(x / 2, z / 2);
            };
            const j1 = Math.min(nz - 1, j0 + BAND);
            const rowLen = nx;
            for (let j = j0; j <= j1; j++) for (let i = 0; i < nx; i++) vert(i, j);
            for (let j = j0; j < j1; j++)
                for (let i = 0; i < nx - 1; i++) {
                    const h00 = H[j * nx + i],
                        h10 = H[j * nx + i + 1],
                        h01 = H[(j + 1) * nx + i],
                        h11 = H[(j + 1) * nx + i + 1];
                    const lo = Math.min(h00, h10, h01, h11),
                        hi = Math.max(h00, h10, h01, h11);
                    if (hi - lo > CLIFF) {
                        // Face runs along z when height changes across x, and vice versa: pick u on the long axis.
                        const alongZ = Math.abs(h10 + h11 - h00 - h01) > Math.abs(h01 + h11 - h00 - h10);
                        const o = cp.length / 3;
                        for (const [di, dj, hh] of [
                            [0, 0, h00],
                            [1, 0, h10],
                            [0, 1, h01],
                            [1, 1, h11]
                        ]) {
                            const x = X0 + (i + di) * sx,
                                z = Z0 + (j + dj) * sz;
                            cp.push(x, hh + 0.035, z);
                            cuv.push((alongZ ? z : x) / 3, hh / 3);
                        }
                        cidx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
                        continue;
                    }
                    const a = (j - j0) * rowLen + i;
                    idx.push(a, a + rowLen, a + 1, a + 1, a + rowLen, a + rowLen + 1);
                }
            const mesh = new Mesh(app.graphicsDevice);
            mesh.setPositions(p);
            mesh.setNormals(calculateNormals(p, idx));
            mesh.setUvs(0, uv);
            mesh.setUvs(1, uv1);
            mesh.setIndices(idx);
            mesh.update();
            addMesh(mesh, groundMat, 'kit-ground');
            stats.triangles += idx.length / 3;
            if (cidx.length) {
                const cm = new Mesh(app.graphicsDevice);
                cm.setPositions(cp);
                cm.setNormals(calculateNormals(cp, cidx));
                cm.setUvs(0, cuv);
                cm.setIndices(cidx);
                cm.update();
                addMesh(cm, cliffMat, 'kit-cliff');
                stats.triangles += cidx.length / 3;
            }
        }
    }

    // ---- water: flat quads at the waterline, scrolling seamless tile (no particles, no transparency) ----
    const waterTex = maps.load('water.webp', true, { width: 256, height: 256, anisotropy: 1 });
    const waterMat = new StandardMaterial();
    waterMat.diffuseMap = waterTex.texture;
    waterMat.emissiveMap = waterTex.texture;
    waterMat.emissive = new Color(0.28, 0.3, 0.3);
    waterMat.gloss = 0.75;
    waterMat.specular = new Color(0.35, 0.38, 0.38);
    waterMat.useMetalness = false;
    waterMat.update();
    materials.push(waterMat);
    {
        const p: number[] = [],
            uv: number[] = [],
            idx: number[] = [];
        for (const [ax, az, bx, bz] of data.water) {
            const o = p.length / 3;
            for (const [x, z] of [
                [ax, az],
                [bx, az],
                [ax, bz],
                [bx, bz]
            ]) {
                p.push(x, data.waterY, z);
                uv.push(x / 4, z / 4);
            }
            idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, idx));
        mesh.setUvs(0, uv);
        mesh.setIndices(idx);
        mesh.update();
        addMesh(mesh, waterMat, 'kit-water');
        stats.triangles += idx.length / 3;
    }

    // ---- lane walls: three courses of warm limestone masonry, lighter toward the top; brass cap ----
    const wall = geo(),
        trim = geo();
    const course = (x: number, z: number, len: number, seed: number, yaw = 0) => {
        for (let r = 0; r < 3; r++) {
            const tone = 0.86 + 0.16 * hash(seed * 7 + r * 13);
            const lift = 1 + r * 0.07;
            const cz = z + (r % 2) * 0.12;
            const w = yaw ? len - 0.07 : 0.64,
                d = yaw ? 0.64 : len - 0.07;
            box(wall, x, 2.36 + r * 0.66, cz, w, 0.64, d, [0.74 * tone * lift, 0.66 * tone * lift, 0.53 * tone * lift]);
        }
    };
    const BASE_ENTRY = 57.4; // the 10 m lane strip meets the base disc (r 10 at |z| 66) here
    for (const side of [-1, 1])
        for (let z = -BASE_ENTRY + 0.3; z < BASE_ENTRY - 0.3;) {
            if (inRamp(side, z)) {
                z += 0.5;
                continue;
            }
            const edge = laneEdge(z);
            const len = 0.95 + 0.6 * hash(z * 3.1 + side);
            course(side * (edge + 0.33), z + len / 2, len, z + side);
            box(trim, side * (edge + 0.3), 4.06, z + len / 2, 0.74, 0.12, len, [0.7, 0.53, 0.27]);
            z += len;
        }
    // base discs: a ring of masonry around everything that is not the lane mouth
    for (const bz of [66, -66]) {
        const R = 10.33;
        for (let a = 0; a < Math.PI * 2; ) {
            const x = Math.cos(a) * R,
                z = bz + Math.sin(a) * R;
            const len = 0.95 + 0.6 * hash(a * 9 + bz);
            if (Math.abs(z) > BASE_ENTRY) {
                // build each course as a short box rotated to the ring tangent (approximated by axis-aligned facets)
                const tz = Math.abs(Math.cos(a)) > 0.7;
                for (let r = 0; r < 3; r++) {
                    const tone = 0.86 + 0.16 * hash(a * 7 + r * 13 + bz);
                    const lift = 1 + r * 0.07;
                    box(wall, x, 2.36 + r * 0.66, z, tz ? 0.64 : len * 0.9, 0.64, tz ? len * 0.9 : 0.64, [
                        0.74 * tone * lift,
                        0.66 * tone * lift,
                        0.53 * tone * lift
                    ]);
                }
                box(trim, x, 4.06, z, tz ? 0.74 : len * 0.95, 0.12, tz ? len * 0.95 : 0.74, [0.7, 0.53, 0.27]);
            }
            a += (len * 0.82) / R;
        }
    }
    // bridge parapets (the low stepping-stone crossing stays open)
    for (const [bx0, bx1, bz0, bz1, bh] of layout.bridges ?? []) {
        const stepping = bh < 3.9;
        if (stepping) continue;
        // rails go on the sides that drop into the river, not by footprint shape (near-square decks guessed wrong)
        const cx = (bx0 + bx1) / 2,
            cz = (bz0 + bz1) / 2;
        const xSide = Math.min(surface.height(bx0 - 0.8, cz), surface.height(bx1 + 0.8, cz));
        const zSide = Math.min(surface.height(cx, bz0 - 0.8), surface.height(cx, bz1 + 0.8));
        const alongZ = xSide < zSide;
        for (const e of [0, 1]) {
            if (alongZ) {
                const x = e ? bx1 - 0.2 : bx0 + 0.2;
                for (let z = bz0; z < bz1 - 0.2; z += 0.9)
                    box(wall, x, bh + 0.25, z + 0.45, 0.32, 0.5, 0.86, [0.78, 0.7, 0.56]);
            } else {
                const z = e ? bz1 - 0.2 : bz0 + 0.2;
                for (let x = bx0; x < bx1 - 0.2; x += 0.9)
                    box(wall, x + 0.45, bh + 0.25, z, 0.86, 0.5, 0.32, [0.78, 0.7, 0.56]);
            }
        }
    }
    // stepping stones: individual worn blocks standing out of the stream
    for (const [bx0, bx1, bz0, bz1, bh] of layout.bridges ?? []) {
        if (bh >= 3.9) continue;
        for (let z = bz0 + 0.5; z < bz1 - 0.3; z += 1.15)
            for (let x = bx0 + 0.6; x < bx1 - 0.3; x += 1.3) {
                const t = hash(x * 3 + z * 5);
                box(wall, x + 0.2 * (t - 0.5), bh - 0.9, z, 1.05, 1.9, 0.95, [0.62 + 0.1 * t, 0.57 + 0.08 * t, 0.48]);
            }
    }
    build(wall, vmat(0.16), 'kit-masonry', true);
    build(trim, vmat(0.3, new Color(0.14, 0.1, 0.03)), 'kit-brass-cap', true);

    // ---- trees: faceted pines + broadleaf crowns in red / gold / green, varied in height, girth and lean ----
    const treeChunks: { e: Entity; x: number; z: number }[] = [];
    const pineMat = vmat(0.05),
        leafMat = vmat(0.08);
    const pine = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) => {
        const girth = 0.78 + 0.4 * hash(seed * 5.3),
            tiers = hash(seed * 2.1) > 0.5 ? 3 : 4;
        const tone = hash(seed * 1.3);
        const green = [0.08 + 0.04 * tone, 0.19 + 0.06 * hash(seed + 1), 0.09 + 0.03 * tone];
        cone(g, x, y, z, 0.14, hgt * 0.3, [0.22, 0.14, 0.08], 5, seed);
        for (let t = 0; t < tiers; t++) {
            const k = t / tiers;
            cone(
                g,
                x,
                y + hgt * (0.16 + k * 0.62),
                z,
                hgt * girth * (0.27 - k * 0.17),
                hgt * (0.46 - k * 0.12),
                green,
                6 + (t % 2),
                seed + t
            );
        }
    };
    const broad = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) => {
        const pick = hash(seed * 3);
        const [low, high] =
            pick > 0.62
                ? [
                      [0.42, 0.11, 0.05],
                      [0.92, 0.36, 0.14]
                  ]
                : pick > 0.3
                  ? [
                        [0.48, 0.3, 0.07],
                        [0.98, 0.74, 0.28]
                    ]
                  : [
                        [0.14, 0.25, 0.08],
                        [0.46, 0.66, 0.24]
                    ];
        const n = 3 + Math.floor(hash(seed * 4.7) * 2);
        for (let k = 0; k < n; k++) {
            const a = k * 2.3 + seed,
                d = k === 0 ? 0 : hgt * (0.12 + 0.08 * hash(seed + k));
            const s = k === 0 ? 0.27 : 0.15 + 0.06 * hash(seed * 2 + k);
            blob(
                g,
                x + Math.cos(a) * d,
                y + hgt * (k === 0 ? 0.66 : 0.5 + 0.12 * hash(seed + k * 3)),
                z + Math.sin(a) * d,
                hgt * s,
                hgt * s * 0.85,
                hgt * s,
                low,
                high,
                seed + k,
                0.22
            );
        }
    };
    const trunks = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) =>
        cone(g, x, y, z, 0.12, hgt * 0.55, [0.24, 0.15, 0.09], 5, seed);
    const plant = (gp: Geo, gb: Geo, x: number, z: number, hgt: number, seed: number) => {
        const y = surface.height(x, z) - 0.05;
        if (hash(seed * 1.7) < 0.45) {
            trunks(gp, x, y, z, hgt, seed);
            broad(gb, x, y, z, hgt * 0.9, seed);
        } else pine(gp, x, y, z, hgt, seed);
        stats.trees++;
    };
    for (const [gx, gz, gr] of data.groves) {
        const gp = geo(),
            gb = geo();
        const n = Math.round(gr * 2.4);
        for (let k = 0; k < n; k++) {
            const a = k * 2.4 + gx + gz * 0.3,
                d = k === 0 ? 0 : gr * (0.3 + 0.5 * hash(k + gz));
            plant(
                gp,
                gb,
                gx + Math.cos(a) * d,
                gz + Math.sin(a) * d,
                3.6 + 2.6 * hash(k * 3 + gx + gz),
                Math.round(gx * 13 + gz * 7 + k)
            );
        }
        const a = build(gp, pineMat, 'kit-grove-pines', true, { x: gx, z: gz });
        const b = build(gb, leafMat, 'kit-grove-crowns', false, { x: gx, z: gz });
        if (a) treeChunks.push(a);
        if (b) treeChunks.push(b);
    }
    for (const side of [-1, 1])
        for (let z0 = -BASE_ENTRY; z0 < BASE_ENTRY; z0 += 8) {
            const gp = geo(),
                gb = geo();
            for (let z = z0 + 1; z < Math.min(z0 + 8, BASE_ENTRY - 1); z += 2.8 + 1.6 * hash(z + side)) {
                if (laneEdge(z) > 6.4 || inRamp(side, z, 1.6)) continue;
                plant(
                    gp,
                    gb,
                    side * (7.4 + 0.9 * hash(z * 2 + side)),
                    z,
                    2.9 + 1.8 * hash(z * 5 + side),
                    Math.round(z * 17 + side * 5)
                );
            }
            const a = build(gp, pineMat, 'kit-rim-pines', true, { x: side * 7.5, z: z0 + 4 });
            const b = build(gb, leafMat, 'kit-rim-crowns', false, { x: side * 7.5, z: z0 + 4 });
            if (a) treeChunks.push(a);
            if (b) treeChunks.push(b);
        }

    // ---- backlot: dark pines and rock crags on the non-walkable ground round each base (mirrored) ----
    {
        const cells = new Map<string, { gp: Geo; gr: Geo; x: number; z: number }>();
        for (const [bx, bz, kind] of data.backlot ?? [])
            for (const s of [1, -1]) {
                const x = bx,
                    z = bz * s;
                const key = `${x < 0 ? 0 : 1},${z < 0 ? 0 : 1}`;
                let cell = cells.get(key);
                if (!cell) {
                    cell = { gp: geo(), gr: geo(), x: x < 0 ? -21 : 21, z: z < 0 ? -64 : 64 };
                    cells.set(key, cell);
                }
                const seed = Math.round(x * 13 + z * 7);
                const y = surface.height(x, z) - 0.1;
                if (kind === 1) {
                    // crag: a leaning faceted spire on a broad foot
                    const hgt = 1.8 + 2.2 * hash(seed * 1.9),
                        r = 0.6 + 0.45 * hash(seed * 2.3);
                    const lo = [0.14, 0.13, 0.12],
                        hi = [0.36, 0.33, 0.29];
                    const lean = hash(seed) - 0.5;
                    blob(cell.gr, x, y + 0.4, z, r * 1.6, 0.9, r * 1.3, lo, hi, seed, 0.5);
                    blob(cell.gr, x + 0.35 * lean, y + hgt * 0.45, z, r, hgt * 0.45, r * 0.8, lo, hi, seed + 1, 0.55);
                    blob(cell.gr, x + 0.8 * lean, y + hgt * 0.85, z + 0.2, r * 0.55, hgt * 0.3, r * 0.5, lo, hi, seed + 2, 0.6);
                } else {
                    pine(cell.gp, x, y, z, 3.4 + 2.0 * hash(seed * 3.7), seed);
                    stats.trees++;
                }
            }
        // one mesh per quarter (pines + crags share the matte vertex-colour material): at most 4 draws
        for (const c of cells.values()) {
            const o = c.gp.p.length / 3;
            c.gp.p.push(...c.gr.p);
            c.gp.c.push(...c.gr.c);
            c.gp.i.push(...c.gr.i.map((i) => i + o));
            build(c.gp, pineMat, 'kit-backlot', true, c);
        }
    }

    // ---- stadium (stage 4): parapet + torches + team banners, two seating bowls, arcade with gold pilasters, gate
    // towers at each end, dome ribs and the hanging crown. Pure framing outside the floor; nothing here collides.
    const sd0 = data.stadium ?? { hx: 35, hz: 76, r: 26 };
    const ca = sd0.hx - sd0.r,
        cb = sd0.hz - sd0.r;
    const ring: { x: number; z: number; nx: number; nz: number }[] = [];
    const straight = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number) => {
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3));
        for (let k = 0; k < n; k++) ring.push({ x: x0 + ((x1 - x0) * k) / n, z: z0 + ((z1 - z0) * k) / n, nx, nz });
    };
    const arc = (cx: number, cz: number, a0: number) => {
        for (let k = 0; k < 12; k++) {
            const a = a0 + (k / 12) * (Math.PI / 2);
            ring.push({ x: cx + Math.cos(a) * sd0.r, z: cz + Math.sin(a) * sd0.r, nx: Math.cos(a), nz: Math.sin(a) });
        }
    };
    straight(sd0.hx, -cb, sd0.hx, cb, 1, 0);
    arc(ca, cb, 0);
    straight(ca, sd0.hz, -ca, sd0.hz, 0, 1);
    arc(-ca, cb, Math.PI / 2);
    straight(-sd0.hx, cb, -sd0.hx, -cb, -1, 0);
    arc(-ca, -cb, Math.PI);
    straight(-ca, -sd0.hz, ca, -sd0.hz, 0, -1);
    arc(ca, -cb, (3 * Math.PI) / 2);
    const at = (k: number, d: number, y: number): V3 => {
        const r = ring[k % ring.length];
        return [r.x + r.nx * d, y, r.z + r.nz * d];
    };
    // Walk the contour at offset d, calling back every `spacing` metres with position, normal and running index.
    const along = (d: number, spacing: number, cb2: (x: number, z: number, nx: number, nz: number, n: number) => void) => {
        let carry = spacing / 2,
            n = 0;
        for (let k = 0; k < ring.length; k++) {
            const a = at(k, d, 0),
                b = at(k + 1, d, 0);
            const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
            const ra = ring[k],
                rb = ring[(k + 1) % ring.length];
            while (carry <= L) {
                const t = carry / L;
                const nx = ra.nx + (rb.nx - ra.nx) * t,
                    nz = ra.nz + (rb.nz - ra.nz) * t,
                    l = Math.hypot(nx, nz);
                cb2(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t, nx / l, nz / l, n++);
                carry += spacing;
            }
            carry -= L;
        }
    };
    const SEATS = 9,
        RUN = 1.25,
        RISE = 0.72,
        BOWL_D = 6.8,
        BOWL_Y = 8.4;
    const concourseY = BOWL_Y + SEATS * RISE,
        concourseD = BOWL_D + SEATS * RUN;
    const ARC_D = 20.3,
        BACK_D = 23.2,
        LINTEL_Y = 23.8,
        ROOF_Y = 26;
    const UP_SEATS = 6,
        UP_RUN = 1.3,
        UP_RISE = 0.85;
    const rimD = BACK_D + UP_SEATS * UP_RUN,
        rimY = ROOF_Y + UP_SEATS * UP_RISE,
        crownY = rimY + 3.4;
    const C_ = {
        parapet: [0.3, 0.25, 0.23],
        brass: [0.62, 0.48, 0.27],
        seat: [0.38, 0.33, 0.3],
        riser: [0.22, 0.19, 0.18],
        aisle: [0.56, 0.49, 0.41],
        floor: [0.33, 0.29, 0.27],
        back: [0.07, 0.06, 0.07],
        pillar: [0.29, 0.25, 0.24],
        rimwall: [0.25, 0.21, 0.21],
        gold: [1.0, 0.68, 0.26],
        flame: [1.0, 0.55, 0.16]
    };
    // profile edges (d0, y0) -> (d1, y1) swept round the contour; [colour, aisle colour]
    const prof: [number, number, number, number, number[], number[] | null][] = [];
    prof.push([6.0, 5.2, 6.0, 8.8, C_.parapet, null], [6.0, 8.8, 6.8, 8.8, C_.brass, null], [6.8, 8.8, 6.8, BOWL_Y, C_.riser, null]);
    for (let s = 0; s < SEATS; s++) {
        const d = BOWL_D + s * RUN,
            y = BOWL_Y + s * RISE;
        prof.push([d, y, d + RUN, y, C_.seat, C_.aisle], [d + RUN, y, d + RUN, y + RISE, C_.riser, C_.aisle]);
    }
    prof.push([concourseD, concourseY, BACK_D, concourseY, C_.floor, null]);
    prof.push([BACK_D, concourseY, BACK_D, ROOF_Y, C_.back, null]);
    prof.push([ARC_D, LINTEL_Y, ARC_D, ROOF_Y, C_.pillar, null], [ARC_D, ROOF_Y, BACK_D, ROOF_Y, C_.brass, null]);
    for (let s = 0; s < UP_SEATS; s++) {
        const d = BACK_D + s * UP_RUN,
            y = ROOF_Y + s * UP_RISE;
        prof.push([d, y, d, y + UP_RISE, C_.riser, C_.aisle], [d, y + UP_RISE, d + UP_RUN, y + UP_RISE, C_.seat, C_.aisle]);
    }
    prof.push([rimD, rimY, rimD, crownY, C_.rimwall, null], [rimD, crownY, rimD + 1.4, crownY, C_.brass, null]);

    const SECTORS = 8;
    const sectors = Array.from({ length: SECTORS }, () => ({ stone: geo(), glow: geo(), x: 0, z: 0, n: 0 }));
    // Spatial sectors: west/east x four z bands. Band 3 (the Blue end, +z) sits behind the competitive camera, so it
    // hides while the player is in the Blue third (its torches would otherwise poke into the bottom of the view).
    const sectorOf = (x: number, z: number) => (x < 0 ? 0 : 1) + 2 * (z < -60 ? 0 : z < 0 ? 1 : z < 60 ? 2 : 3);
    for (let k = 0; k < ring.length; k++) {
        const sec = sectors[sectorOf(ring[k].x, ring[k].z)];
        const aisle = k % 5 === 2;
        const r = ring[k];
        sec.x += r.x;
        sec.z += r.z;
        sec.n++;
        for (const [d0, y0, d1, y1, col, ac] of prof) {
            const c = aisle && ac ? ac : col;
            const tone = 0.93 + 0.1 * hash(k * 3.7 + d0);
            const shade = [c[0] * tone, c[1] * tone, c[2] * tone];
            const want = [-(y1 - y0) * r.nx, d1 - d0, -(y1 - y0) * r.nz];
            quad(sec.stone, at(k, d0, y0), at(k + 1, d0, y0), at(k + 1, d1, y1), at(k, d1, y1), shade, want);
        }
    }
    const yawOf = (nx: number, nz: number) => Math.atan2(nx, -nz);
    // arcade pillars with pointed-arch spandrels; a gold pilaster on every second pillar
    along(ARC_D + 0.5, 5.6, (x, z, nx, nz, n) => {
        const sec = sectors[sectorOf(x, z)];
        const yaw = yawOf(nx, nz);
        const h = LINTEL_Y - concourseY + 0.05;
        box(sec.stone, x, concourseY + h / 2, z, 1.5, h, 1.0, C_.pillar, yaw);
        const tx = -nz,
            tz = nx,
            fx = x - nx * 0.52,
            fz = z - nz * 0.52;
        for (const sgn of [-1, 1]) {
            const ex = fx + tx * 0.75 * sgn,
                ez = fz + tz * 0.75 * sgn;
            quad(
                sec.stone,
                [ex, LINTEL_Y - 2.4, ez],
                [ex, LINTEL_Y, ez],
                [ex + tx * 1.9 * sgn, LINTEL_Y, ez + tz * 1.9 * sgn],
                [ex + tx * 1.9 * sgn, LINTEL_Y, ez + tz * 1.9 * sgn],
                C_.pillar,
                [-nx, 0, -nz]
            );
        }
        if (n % 2 === 0) box(sec.glow, fx - nx * 0.04, concourseY + h / 2 + 0.3, fz - nz * 0.04, 0.24, h - 1.2, 0.1, C_.gold, yaw);
    });
    // parapet torches and team banners (Blue half +z, Red half -z)
    along(6.35, 7.2, (x, z, nx, nz, n) => {
        const sec = sectors[sectorOf(x, z)];
        const yaw = yawOf(nx, nz);
        box(sec.stone, x, 9.25, z, 0.3, 0.9, 0.3, C_.brass, yaw);
        cone(sec.glow, x, 9.7, z, 0.24, 0.6, C_.flame, 5, n);
        if (n % 2 === 1) {
            const team = z > 0 ? [0.12, 0.3, 0.72] : [0.66, 0.12, 0.1];
            const bx = x - nx * 0.42,
                bz = z - nz * 0.42,
                tx = -nz * 0.7,
                tz = nx * 0.7;
            quad(sec.stone, [bx - tx, 8.7, bz - tz], [bx + tx, 8.7, bz + tz], [bx + tx, 6.4, bz + tz], [bx - tx, 6.4, bz - tz], team, [-nx, 0, -nz]);
            quad(sec.stone, [bx - tx, 6.4, bz - tz], [bx + tx, 6.4, bz + tz], [bx, 5.8, bz], [bx, 5.8, bz], team, [-nx, 0, -nz]);
            box(sec.glow, bx - nx * 0.02, 8.6, bz - nz * 0.02, 1.5, 0.12, 0.06, C_.gold, yaw);
        }
    });
    // gate towers at each end: a gate block with a glowing slit between two spired towers
    for (const end of [1, -1]) {
        const zg = end * (sd0.hz + ARC_D + 1.2);
        const sec = sectors[sectorOf(0, zg)];
        box(sec.stone, 0, concourseY + 8, zg, 9, 16, 3, C_.pillar);
        quad(sec.stone, [-2, concourseY, zg - end * 1.52], [2, concourseY, zg - end * 1.52], [2, concourseY + 9, zg - end * 1.52], [-2, concourseY + 9, zg - end * 1.52], C_.back, [0, 0, -end]);
        box(sec.glow, 0, concourseY + 7.5, zg - end * 1.56, 0.4, 14, 0.06, C_.gold);
        for (const sx of [-1, 1]) {
            const tx = sx * 7.2;
            box(sec.stone, tx, 20, zg, 3.6, 24, 3.6, C_.rimwall);
            box(sec.stone, tx, 32.6, zg, 4.2, 1.2, 4.2, C_.brass);
            cone(sec.stone, tx, 33.2, zg, 2.2, 9, C_.rimwall, 6, sx + end);
            for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
                cone(sec.stone, tx + px * 1.8, 33.2, zg + pz * 1.8, 0.4, 3, C_.pillar, 4, px + pz);
            box(sec.glow, tx, 20, zg - end * 1.83, 0.3, 18, 0.06, C_.gold);
        }
    }
    const stoneMat = vmat(0.12);

    // dome ribs converging on an oculus, two purlin rings; the crown hangs from the oculus on four chains
    {
        const g = geo();
        const RIBS = 28,
            apex = rimY + 36,
            ocul = 9;
        const ribs: V3[][] = [];
        let perim = 0;
        for (let k = 0; k < ring.length; k++) {
            const a = at(k, rimD + 0.7, 0),
                b = at(k + 1, rimD + 0.7, 0);
            perim += Math.hypot(b[0] - a[0], b[2] - a[2]);
        }
        along(rimD + 0.7, perim / RIBS, (x, z) => {
            const l = Math.hypot(x, z);
            const ox = (x / l) * ocul,
                oz = (z / l) * ocul;
            const pts: V3[] = [];
            for (let s = 0; s <= 10; s++) {
                const t = s / 10;
                pts.push([x + (ox - x) * t, crownY + (apex - crownY) * Math.sin((t * Math.PI) / 2), z + (oz - z) * t]);
            }
            ribs.push(pts);
        });
        for (const pts of ribs) for (let s = 0; s < 10; s++) beam(g, pts[s], pts[s + 1], 0.7, C_.pillar);
        for (const s of [4, 7, 10])
            for (let r = 0; r < ribs.length; r++) beam(g, ribs[r][s], ribs[(r + 1) % ribs.length][s], 0.4, C_.brass);
        build(g, stoneMat, 'kit-dome', true);
        const crown = geo();
        const cy = apex - 22,
            R = 6.6;
        for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + 0.4;
            beam(crown, [Math.cos(a) * R * 0.9, cy + 2, Math.sin(a) * R * 0.9], [Math.cos(a) * ocul * 0.8, apex, Math.sin(a) * ocul * 0.8], 0.18, C_.riser);
        }
        const N = 18;
        for (let k = 0; k < N; k++) {
            const a0 = (k / N) * Math.PI * 2,
                a1 = ((k + 1) / N) * Math.PI * 2;
            const P = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
            const out = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
            quad(crown, P(a0, R, cy), P(a1, R, cy), P(a1, R, cy + 1.8), P(a0, R, cy + 1.8), C_.gold, out);
            quad(crown, P(a0, R - 0.6, cy), P(a1, R - 0.6, cy), P(a1, R - 0.6, cy + 1.8), P(a0, R - 0.6, cy + 1.8), C_.brass, [-out[0], 0, -out[2]]);
            quad(crown, P(a0, R - 0.6, cy + 1.8), P(a1, R - 0.6, cy + 1.8), P(a1, R, cy + 1.8), P(a0, R, cy + 1.8), C_.brass, [0, 1, 0]);
            quad(crown, P(a0, R - 0.6, cy), P(a1, R - 0.6, cy), P(a1, R, cy), P(a0, R, cy), C_.flame, [0, -1, 0]);
            const tall = k % 3 === 0;
            cone(crown, Math.cos(a0) * (R - 0.3), cy + 1.8, Math.sin(a0) * (R - 0.3), tall ? 0.5 : 0.32, tall ? 4.2 : 2.2, C_.gold, 4, k);
        }
        cone(crown, 0, cy - 2.4, 0, 1.4, -2.6, C_.gold, 8, 1);
        const crownMat = vmat(0.6, new Color(0.45, 0.42, 0.38));
        build(crown, crownMat, 'kit-crown', true);
    }

    // waterfalls: each river spills from a spout in the parapet, down the seating tiers, into its channel
    const fallTex = waterTex; // same tile; the fall scrolls on its own material
    const fallMat = new StandardMaterial();
    fallMat.diffuseMap = fallTex.texture;
    fallMat.diffuse = new Color(0.85, 0.95, 1);
    fallMat.emissiveMap = fallTex.texture;
    fallMat.emissive = new Color(0.55, 0.6, 0.62);
    fallMat.gloss = 0.7;
    fallMat.useMetalness = false;
    fallMat.update();
    materials.push(fallMat);
    {
        const p: number[] = [],
            uv: number[] = [],
            idx: number[] = [];
        for (const [side, half] of [
            [-1, 1.8],
            [1, 2.0]
        ]) {
            const xs: number[][] = [[side * 40.9, 8.7]];
            for (let x = 40.9; x >= 35.2; x -= 0.3) xs.push([side * x, surface.height(side * x, 0) + 0.08]);
            xs.push([side * 34.95, surface.height(side * 35.2, 0) + 0.08], [side * 34.95, data.waterY + 0.02]);
            let v = 0;
            const o = p.length / 3;
            xs.forEach(([x, y], k) => {
                if (k) v += Math.hypot(x - xs[k - 1][0], y - xs[k - 1][1]) / 3;
                for (const zz of [-half, half]) {
                    p.push(x, y, zz);
                    uv.push(zz / 3, -v);
                }
            });
            for (let k = 0; k < xs.length - 1; k++) {
                const a = o + k * 2;
                // face up/inward toward the arena (-side on x)
                if (side < 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
                else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
            }
            const { stone: spout } = sectors[sectorOf(side * 41, 0)];
            const mist = spout;
            box(spout, side * 41.1, 9.3, 0, 1.2, 0.6, half * 2 + 1.2, C_.brass);
            for (const zz of [-1, 1]) box(spout, side * 41.1, 9.6, zz * (half + 0.45), 1.0, 1.8, 0.7, C_.pillar);
            for (let m = 0; m < 4; m++)
                blob(mist, side * (34.3 - 0.5 * hash(m + side)), data.waterY + 0.05, (m / 3 - 0.5) * half * 1.6, 0.6, 0.28, 0.55, [0.75, 0.86, 0.9], [0.95, 0.98, 1], m * 7 + side, 0.3);
        }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, idx));
        mesh.setUvs(0, uv);
        mesh.setIndices(idx);
        mesh.update();
        addMesh(mesh, fallMat, 'kit-waterfalls');
        stats.triangles += idx.length / 3;
    }
    // One draw per stadium sector: glow parts carry vertex alpha 1 and the material reads emissive from alpha,
    // so the gold pilasters, torches and gate slits light up without a second material.
    const blueEnd: Entity[] = [];
    const stadiumMat = vmat(0.14);
    stadiumMat.emissive = new Color(1, 0.7, 0.3);
    stadiumMat.emissiveVertexColor = true;
    stadiumMat.emissiveVertexColorChannel = 'a';
    stadiumMat.update();
    sectors.forEach((s, k) => {
        for (let v = 3; v < s.stone.c.length; v += 4) s.stone.c[v] = 0;
        const o = s.stone.p.length / 3;
        s.stone.p.push(...s.glow.p);
        s.stone.c.push(...s.glow.c);
        s.stone.i.push(...s.glow.i.map((i) => i + o));
        const b = build(s.stone, stadiumMat, `kit-stadium-${k}`, true);
        if (b && k >= 6) blueEnd.push(b.e);
    });

    const offset = new Vec2();
    const fallOffset = new Vec2();
    return {
        ready: Promise.all([groundTex.ready, detailTex.ready, cliffTex.ready, waterTex.ready]),
        stats,
        update(time: number) {
            offset.set((time * 0.018) % 1, (time * 0.045) % 1);
            waterMat.diffuseMapOffset = offset;
            waterMat.emissiveMapOffset = offset;
            waterMat.update();
            fallOffset.set(0, (time * 0.55) % 1);
            fallMat.diffuseMapOffset = fallOffset;
            fallMat.emissiveMapOffset = fallOffset;
            fallMat.update();
        },
        // Hide tree chunks standing between the competitive camera (+18 m on +Z) and the player.
        framePlayer(x: number, z: number) {
            for (const t of treeChunks) t.e.enabled = !(Math.abs(t.x - x) < 5.5 && t.z > z - 2 && t.z < z + 15);
            for (const e of blueEnd) e.enabled = z < 40;
        },
        destroy() {
            root.destroy();
            meshes.forEach((m) => m.destroy());
            materials.forEach((m) => m.destroy());
            maps.destroy();
        }
    };
}
