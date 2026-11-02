import {
    ADDRESS_CLAMP_TO_EDGE,
    Color,
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

// GOAL 021 art kit (founder pick: A "Gilded Sanctum" + B's richer colour), dressed on one slice:
// x -26..20, z -6..42 (centre plaza, both rivers, z=30 plaza, ramps, groves). Presentation only.
// Groves are solid in the collision mask (build-coliseum.py), so every trunk is an honest obstacle.
type SliceData = { bounds: [number, number, number, number]; water: number[][]; waterY: number; groves: number[][] };
type RampDef = [number, number, number];

export function createColiseumKitSlice(app: AppBase, parent: Entity, surface: SolrahnV2, data: SliceData) {
    const [X0, X1, Z0, Z1] = data.bounds;
    const layout = (surface.metadata.layout ?? {}) as { ramps?: RampDef[]; bridges?: number[][] };
    const ramps = layout.ramps ?? [];
    const laneEdge = (z: number) =>
        Math.max(5, Math.sqrt(Math.max(0, 64 - (z - 30) ** 2)), Math.sqrt(Math.max(0, 64 - z * z)));
    const inRamp = (side: number, z: number, margin = 0) =>
        ramps.some(([s, rz, w]) => s === side && Math.abs(z - rz) <= w / 2 + 0.8 + margin);
    const root = new Entity('coliseum-art-kit-slice');
    parent.addChild(root);
    const maps = terrainTextures(app, 'assets/coliseum/kit');
    const meshes: Mesh[] = [];
    const materials: StandardMaterial[] = [];
    const stats = { triangles: 0, trees: 0, waterQuads: data.water.length };
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
        meshes.push(mesh);
        const e = new Entity(name);
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat, e)],
            castShadows: false,
            receiveShadows: false
        });
        stats.triangles += i.length / 3;
        return at ? { e, ...at } : { e, x: 0, z: 0 };
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

    // ---- draped ground ----
    const groundTex = maps.load('ground.webp', true, {
        width: 1104,
        height: 1152,
        flipY: false,
        clamp: ADDRESS_CLAMP_TO_EDGE,
        anisotropy: 2
    });
    const groundMat = new StandardMaterial();
    groundMat.diffuseMap = groundTex.texture;
    groundMat.gloss = 0.14;
    groundMat.useMetalness = false;
    groundMat.specular = new Color(0.05, 0.045, 0.04);
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
                const a = j * nx + i;
                idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
            }
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(p);
        mesh.setNormals(calculateNormals(p, idx));
        mesh.setUvs(0, uv);
        mesh.setIndices(idx);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity('kit-ground');
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, groundMat, e)],
            castShadows: false,
            receiveShadows: false
        });
        stats.triangles += idx.length / 3;
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
        meshes.push(mesh);
        const e = new Entity('kit-water');
        root.addChild(e);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, waterMat, e)],
            castShadows: false,
            receiveShadows: false
        });
        stats.triangles += idx.length / 3;
    }

    // ---- lane walls: three courses of warm limestone masonry, lighter toward the top; brass cap ----
    const wall = geo(),
        trim = geo();
    for (const side of [-1, 1])
        for (let z = Math.max(Z0, -58) + 0.3; z < Z1 - 0.3;) {
            if (inRamp(side, z)) {
                z += 0.5;
                continue;
            }
            const edge = laneEdge(z);
            const len = 0.95 + 0.6 * hash(z * 3.1 + side);
            for (let r = 0; r < 3; r++) {
                const tone = 0.86 + 0.16 * hash(z * 7 + r * 13 + side);
                const lift = 1 + r * 0.07;
                box(wall, side * (edge + 0.33), 2.36 + r * 0.66, z + (r % 2) * 0.12, 0.64, 0.64, len - 0.07, [
                    0.74 * tone * lift,
                    0.66 * tone * lift,
                    0.53 * tone * lift
                ]);
            }
            box(trim, side * (edge + 0.3), 4.06, z, 0.74, 0.12, len, [0.7, 0.53, 0.27]);
            z += len;
        }
    // bridge parapets
    for (const [bx0, bx1, bz0, bz1, bh] of layout.bridges ?? []) {
        if (bx1 < X0 || bx0 > X1 || bz1 < Z0 || bz0 > Z1) continue;
        const alongZ = bz1 - bz0 > bx1 - bx0;
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
    build(wall, vmat(0.16), 'kit-masonry', true);
    build(trim, vmat(0.3, new Color(0.14, 0.1, 0.03)), 'kit-brass-cap', true);

    // ---- trees: faceted pines + smooth red/gold broadleaf crowns, in groves and along the wall tops ----
    const treeChunks: { e: Entity; x: number; z: number }[] = [];
    const pineMat = vmat(0.05),
        leafMat = vmat(0.08);
    const pine = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) => {
        cone(g, x, y, z, 0.16, hgt * 0.3, [0.22, 0.14, 0.08], 5, seed);
        for (let t = 0; t < 3; t++)
            cone(
                g,
                x,
                y + hgt * (0.16 + t * 0.22),
                z,
                hgt * (0.29 - t * 0.065),
                hgt * 0.44,
                [0.09 + 0.02 * hash(seed), 0.2 + 0.03 * hash(seed + 1), 0.1],
                7,
                seed + t
            );
    };
    const broad = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) => {
        const red = hash(seed * 3) > 0.45;
        const low = red ? [0.46, 0.13, 0.06] : [0.55, 0.36, 0.08],
            high = red ? [0.95, 0.4, 0.16] : [1, 0.78, 0.3];
        blob(g, x, y + hgt * 0.62, z, hgt * 0.3, hgt * 0.27, hgt * 0.3, low, high, seed, 0.12);
        blob(
            g,
            x + hgt * 0.16,
            y + hgt * 0.5,
            z + hgt * 0.06,
            hgt * 0.2,
            hgt * 0.18,
            hgt * 0.2,
            low,
            high,
            seed + 1,
            0.12
        );
    };
    const trunks = (g: Geo, x: number, y: number, z: number, hgt: number, seed: number) =>
        cone(g, x, y, z, 0.13, hgt * 0.55, [0.24, 0.15, 0.09], 5, seed);
    const plant = (gp: Geo, gb: Geo, x: number, z: number, hgt: number, seed: number) => {
        const y = surface.height(x, z) - 0.05;
        if (hash(seed * 1.7) < 0.32) {
            trunks(gp, x, y, z, hgt, seed);
            broad(gb, x, y, z, hgt, seed);
        } else pine(gp, x, y, z, hgt, seed);
        stats.trees++;
    };
    for (const [gx, gz, gr] of data.groves) {
        const gp = geo(),
            gb = geo();
        const n = Math.round(gr * 2.2);
        for (let k = 0; k < n; k++) {
            const a = k * 2.4 + gx,
                d = k === 0 ? 0 : gr * (0.35 + 0.45 * hash(k + gz));
            plant(
                gp,
                gb,
                gx + Math.cos(a) * d,
                gz + Math.sin(a) * d,
                5.2 + 3 * hash(k * 3 + gx),
                Math.round(gx * 13 + gz * 7 + k)
            );
        }
        const a = build(gp, pineMat, 'kit-grove-pines', true, { x: gx, z: gz });
        const b = build(gb, leafMat, 'kit-grove-crowns', false, { x: gx, z: gz });
        if (a) treeChunks.push(a);
        if (b) treeChunks.push(b);
    }
    for (const side of [-1, 1])
        for (let z0 = Z0; z0 < Z1; z0 += 6) {
            const gp = geo(),
                gb = geo();
            for (let z = z0 + 1; z < z0 + 6; z += 2.6 + 1.2 * hash(z + side)) {
                if (laneEdge(z) > 6.4 || inRamp(side, z, 1.6)) continue;
                plant(
                    gp,
                    gb,
                    side * (7.5 + 0.7 * hash(z * 2 + side)),
                    z,
                    3.8 + 2 * hash(z * 5 + side),
                    Math.round(z * 17 + side * 5)
                );
            }
            const a = build(gp, pineMat, 'kit-rim-pines', true, { x: side * 7.5, z: z0 + 3 });
            const b = build(gb, leafMat, 'kit-rim-crowns', false, { x: side * 7.5, z: z0 + 3 });
            if (a) treeChunks.push(a);
            if (b) treeChunks.push(b);
        }

    const offset = new Vec2();
    return {
        ready: Promise.all([groundTex.ready, waterTex.ready]),
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
