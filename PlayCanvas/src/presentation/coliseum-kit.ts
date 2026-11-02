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
};
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

    const offset = new Vec2();
    return {
        ready: Promise.all([groundTex.ready, detailTex.ready, cliffTex.ready, waterTex.ready]),
        stats,
        update(time: number) {
            offset.set((time * 0.018) % 1, (time * 0.045) % 1);
            waterMat.diffuseMapOffset = offset;
            waterMat.emissiveMapOffset = offset;
            waterMat.update();
        },
        // Hide tree chunks standing between the competitive camera (+18 m on +Z) and the player.
        framePlayer(x: number, z: number) {
            for (const t of treeChunks) t.e.enabled = !(Math.abs(t.x - x) < 5.5 && t.z > z - 2 && t.z < z + 15);
        },
        destroy() {
            root.destroy();
            meshes.forEach((m) => m.destroy());
            materials.forEach((m) => m.destroy());
            maps.destroy();
        }
    };
}
