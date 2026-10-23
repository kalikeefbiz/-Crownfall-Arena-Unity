import { MATCH_WORLD } from '../combat/match-space.js';

export type TerrainBatch = {
    name: string;
    positions: number[];
    colors: number[];
    uvs: number[];
    indices: number[];
};
type Point = [number, number, number];
type Pigment = [number, number, number];
const batch = (name: string): TerrainBatch => ({ name, positions: [], colors: [], uvs: [], indices: [] });
const earth: Pigment = [0.135, 0.15, 0.125];
const stone: Pigment = [0.29, 0.315, 0.3];
const rock: Pigment = [0.18, 0.205, 0.2];
const mix = (a: Pigment, b: Pigment, t: number): Pigment => a.map((v, i) => v + (b[i] - v) * t) as Pigment;

// Deterministic decoration only. No sampling is used by collision or navigation.
export const laneEdge = (z: number) => 11.35 + 0.25 * Math.sin(z * 0.73) + 0.17 * Math.sin(z * 1.91);
export function createLaneGeometry() {
    let seed = 0x007f;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    const ground = batch('earth-and-compacted-shoulders');
    const paving = batch('fractured-road-and-broken-paving');
    const fissures = batch('recessed-seams-and-wear');
    const banks = batch('rock-banks-in-existing-obstacles');
    const masonry = batch('retaining-masonry-in-existing-obstacles');
    const vertex = (b: TerrainBatch, p: Point, c: Pigment) => {
        const i = b.positions.length / 3;
        b.positions.push(...p);
        b.colors.push(...c, 1);
        b.uvs.push(p[0] * 0.6, p[2] * 0.6);
        return i;
    };
    const triangle = (b: TerrainBatch, a: Point, c: Point, d: Point, color: Pigment) => {
        const start = vertex(b, a, color);
        vertex(b, c, color);
        vertex(b, d, color);
        b.indices.push(start, start + 1, start + 2);
    };
    // Clockwise in X/Z, so the top normals face +Y. Bevels catch the existing sun.
    const slab = (b: TerrainBatch, points: Point[], top: number, bottom: number, color: Pigment, bevel = 0.14) => {
        const cx = points.reduce((a, p) => a + p[0], 0) / points.length;
        const cz = points.reduce((a, p) => a + p[2], 0) / points.length;
        for (let i = 0; i < points.length; i++) {
            const a = points[i],
                d = points[(i + 1) % points.length];
            const inset = (p: Point): Point => [p[0] + (cx - p[0]) * bevel, top, p[2] + (cz - p[2]) * bevel];
            const ta = inset(a),
                td = inset(d);
            triangle(b, [cx, top, cz], ta, td, color);
            const darker = color.map((v) => v * 0.48) as Pigment;
            triangle(b, ta, [a[0], bottom, a[2]], [d[0], bottom, d[2]], darker);
            triangle(b, ta, [d[0], bottom, d[2]], td, darker);
        }
    };
    const polygon = (x: number, z: number, w: number, d: number, turn = 0): Point[] => {
        const clip = 0.04 + random() * 0.13;
        return [
            [-0.5 + clip, -0.5],
            [-0.5, -0.5 + clip],
            [-0.5, 0.5 - clip],
            [-0.5 + clip, 0.5],
            [0.5 - clip, 0.5],
            [0.5, 0.5 - clip],
            [0.5, -0.5 + clip],
            [0.5 - clip, -0.5]
        ].map(([px, pz]) => [
            x + px * w * Math.cos(turn) - pz * d * Math.sin(turn),
            0,
            z + px * w * Math.sin(turn) + pz * d * Math.cos(turn)
        ]);
    };
    // All legal footing stays within 2.8 cm of authoritative Y=0. Raised relief
    // is confined to unchanged collision footprints and beyond the arena bounds.
    for (let z = -34; z < 34; z += 2) {
        for (let x = -32; x < 32; x += 2) {
            const points: Point[] = [
                [x, -0.018, z],
                [x, -0.018, z + 2],
                [x + 2, -0.018, z + 2],
                [x + 2, -0.018, z]
            ];
            const start = ground.positions.length / 3;
            for (const p of points) {
                const shade =
                    0.95 +
                    0.06 * Math.sin(p[0] * 0.7) +
                    0.04 * Math.cos(p[2] * 0.51) +
                    0.035 * Math.sin(p[0] * 0.31 + p[2] * 0.58);
                const shoulder = Math.max(0, 1 - Math.abs(Math.abs(p[0]) - 12) / 3);
                const base = mix(earth, [0.235, 0.205, 0.15], shoulder * 0.9);
                vertex(ground, p, base.map((v) => v * shade) as Pigment);
            }
            ground.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
    }
    let slabs = 0;
    for (let row = 0, z = -34; z < 34; row++, z += 1.65) {
        const endZ = Math.min(z + 1.65, 34);
        const a = laneEdge(z),
            b = laneEdge(endZ);
        // Exposed, irregular foundation and splayed edge profile. The shoulder
        // meets it within centimetres, preserving feet on every legal crossing.
        for (const sign of [-1, 1]) {
            const points: Point[] =
                sign === 1
                    ? [
                          [0, -0.009, z],
                          [0, -0.009, endZ],
                          [b, -0.009, endZ],
                          [a, -0.009, z]
                      ]
                    : [
                          [-a, -0.009, z],
                          [-b, -0.009, endZ],
                          [0, -0.009, endZ],
                          [0, -0.009, z]
                      ];
            triangle(paving, points[0], points[1], points[2], [0.105, 0.115, 0.1]);
            triangle(paving, points[0], points[2], points[3], [0.105, 0.115, 0.1]);
            const edge: Point[] =
                sign === 1
                    ? [
                          [a, -0.009, z],
                          [b, -0.009, endZ],
                          [b + 0.38, -0.018, endZ],
                          [a + 0.38, -0.018, z]
                      ]
                    : [
                          [-a - 0.38, -0.018, z],
                          [-b - 0.38, -0.018, endZ],
                          [-b, -0.009, endZ],
                          [-a, -0.009, z]
                      ];
            triangle(paving, edge[0], edge[1], edge[2], [0.18, 0.175, 0.135]);
            triangle(paving, edge[0], edge[2], edge[3], [0.18, 0.175, 0.135]);
        }
        const stagger = (row % 2) * 0.85;
        for (let x = -12.5 + stagger; x < 12; x += 1.72) {
            const cx = x + (random() - 0.5) * 0.22;
            const cz = z + 0.8 + (random() - 0.5) * 0.16;
            const edge = laneEdge(cz);
            if (Math.abs(cx) + 0.75 > edge || random() < (Math.abs(cx) > 9.2 ? 0.17 : 0.035)) continue;
            const top = 0.002 + random() * 0.012;
            const shade = 0.8 + random() * 0.34;
            // Broad, worn stone courses with mismatched edges and occasional earth gaps.
            slab(
                paving,
                polygon(cx, cz, 1.57 + random() * 0.08, 1.49 + random() * 0.08),
                top,
                -0.016,
                stone.map((v) => v * shade) as Pigment
            );
            slabs++;
            if (random() < 0.29) {
                const x0 = cx - 0.5 + random() * 0.4,
                    z0 = cz - 0.65;
                const x1 = cx + (random() - 0.5) * 0.5,
                    z1 = cz + 0.05;
                const x2 = cx + 0.1 + random() * 0.4,
                    z2 = cz + 0.65;
                const y = top + 0.0005,
                    width = 0.018 + random() * 0.025;
                for (const [ax, az, bx, bz] of [
                    [x0, z0, x1, z1],
                    [x1, z1, x2, z2]
                ]) {
                    triangle(fissures, [ax, y, az], [ax - width, y, az], [bx - width, y, bz], [0.105, 0.105, 0.09]);
                    triangle(fissures, [ax, y, az], [bx - width, y, bz], [bx, y, bz], [0.105, 0.105, 0.09]);
                }
            }
        }
        for (const sign of [-1, 1]) {
            // Discontinuous, chipped edge stones: no kerb or wall across open routes.
            const edge = laneEdge(z + 0.8);
            if (random() > 0.17)
                slab(
                    paving,
                    polygon(sign * (edge - 0.22), z + 0.8, 0.46, 1.2, sign * (random() - 0.5) * 0.3),
                    0.027,
                    -0.018,
                    [0.3, 0.315, 0.28],
                    0.13
                );
            for (let n = 0; n < 3; n++) {
                const x = sign * (edge + random() * 2.3);
                const size = 0.15 + random() * 0.48;
                slab(
                    paving,
                    polygon(x, z + random() * 1.6, size, size * 0.8, random() * 3),
                    0.008 + random() * 0.018,
                    -0.017,
                    [0.25, 0.265, 0.225],
                    0.2
                );
            }
        }
    }
    for (const wall of MATCH_WORLD.walls) {
        const { x, z, w, d, h } = wall;
        // Every outer vertex stays on or inside the original obstacle rectangle.
        const outline = polygon(x, z, w, d);
        const lower = outline.map((p): Point => [
            x + (p[0] - x) * 0.96,
            h * (0.3 + random() * 0.1),
            z + (p[2] - z) * 0.96
        ]);
        const middle = outline.map((p): Point => [
            x + (p[0] - x) * (0.78 + random() * 0.14),
            h * (1.1 + random() * 0.3),
            z + (p[2] - z) * (0.78 + random() * 0.14)
        ]);
        const crown: Point = [x + (random() - 0.5) * w * 0.15, h * 1.45, z + (random() - 0.5) * d * 0.15];
        for (let i = 0; i < outline.length; i++) {
            const j = (i + 1) % outline.length;
            const c = rock.map((v) => v * (0.82 + random() * 0.4)) as Pigment;
            triangle(banks, outline[i], lower[j], lower[i], mix(c, earth, 0.25));
            triangle(banks, outline[i], outline[j], lower[j], mix(c, earth, 0.25));
            triangle(banks, lower[i], middle[j], middle[i], c);
            triangle(banks, lower[i], lower[j], middle[j], c);
            triangle(banks, middle[i], middle[j], crown, mix(c, earth, 0.45));
        }
        // An exposed bedding layer reads as a cut embankment, rather than a
        // freestanding boulder. Its skirt remains inside the blocked footprint.
        slab(banks, polygon(x, z, w * 0.94, d * 0.94), h * 0.66, h * 0.5, [0.205, 0.215, 0.19], 0.07);
        // Short retaining courses face the road, inset into the blocked island.
        const sign = Math.sign(x);
        const faceX = x - sign * (w / 2 - 0.12);
        const pieces = Math.max(2, Math.floor(d / 0.8));
        for (let course = 0; course < 2; course++) {
            for (let n = 0; n < pieces; n++) {
                const blockZ = z - d / 2 + ((n + 0.5) * d) / pieces;
                slab(
                    masonry,
                    polygon(faceX, blockZ, 0.23, (d / pieces) * 0.92),
                    (course + 1) * h * 0.33,
                    course * h * 0.33,
                    [0.37 + random() * 0.06, 0.365 + random() * 0.04, 0.32],
                    0.08
                );
            }
        }
    }
    // The world ends in terrain rather than a floating rectangular floor. These
    // low ridges start strictly beyond the existing movement bounds; camp
    // approaches and the entire playable Wilderness stay at their original Y.
    for (const axis of ['x', 'z'] as const) {
        const bound = axis === 'x' ? MATCH_WORLD.width / 2 : MATCH_WORLD.depth / 2;
        const along = axis === 'x' ? MATCH_WORLD.depth / 2 : MATCH_WORLD.width / 2;
        for (const sign of [-1, 1]) {
            for (let s = -along; s < along; s += 4) {
                const end = Math.min(s + 4, along);
                const heightA = 1.5 + 0.6 * Math.sin(s * 0.51) + 0.2 * Math.cos(s * 1.3);
                const heightB = 1.5 + 0.6 * Math.sin(end * 0.51) + 0.2 * Math.cos(end * 1.3);
                const point = (out: number, y: number, t: number): Point =>
                    axis === 'x' ? [sign * (bound + out), y, t] : [t, y, sign * (bound + out)];
                const rings = [
                    [0.01, -0.018, -0.018],
                    [1.2, 0.65, 0.65],
                    [3.4, heightA, heightB],
                    [7, 0.3, 0.3]
                ];
                for (let r = 0; r < rings.length - 1; r++) {
                    const a = rings[r],
                        b = rings[r + 1];
                    const points = [
                        point(a[0], a[1], s),
                        point(a[0], a[2], end),
                        point(b[0], b[2], end),
                        point(b[0], b[1], s)
                    ];
                    if ((axis === 'x' && sign === -1) || (axis === 'z' && sign === 1)) points.reverse();
                    const color = mix(rock, earth, r === 1 ? 0.2 : 0.6);
                    triangle(banks, points[0], points[1], points[2], color);
                    triangle(banks, points[0], points[2], points[3], color);
                }
            }
        }
    }
    return { batches: [ground, paving, fissures, banks, masonry], slabs };
}
