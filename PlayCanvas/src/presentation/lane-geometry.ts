import { MATCH_WORLD } from '../combat/match-space.js';

export type TerrainBatch = {
    name: string;
    surface: 'dirt' | 'shoulder' | 'rock';
    positions: number[];
    colors: number[];
    uvs: number[];
    indices: number[];
};
type Point = [number, number, number];
const batch = (name: string, surface: TerrainBatch['surface']): TerrainBatch => ({
    name,
    surface,
    positions: [],
    colors: [],
    uvs: [],
    indices: []
});

// Decoration only: neither the lane edge nor relief feeds collision/navigation.
export const laneEdge = (z: number) => 11.35 + 0.25 * Math.sin(z * 0.73) + 0.17 * Math.sin(z * 1.91);
export function createLaneGeometry() {
    let seed = 0x009;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    const ground = batch('continuous-packed-earth', 'dirt');
    const shoulders = batch('feathered-rocky-soil', 'shoulder');
    const banks = batch('eroded-embankments', 'rock');
    const gravel = batch('sparse-embedded-stones', 'rock');
    const shade = (x: number, z: number) =>
        0.93 + 0.045 * Math.sin(x * 0.29 + z * 0.17) + 0.025 * Math.cos(z * 0.43 - x * 0.13);
    const vertex = (b: TerrainBatch, p: Point, alpha = 1, uv?: number[]) => {
        const i = b.positions.length / 3;
        b.positions.push(...p);
        const c = shade(p[0], p[2]);
        b.colors.push(c, c, c, alpha);
        // One scan covers 4.5m: aggregate reads at the actual competitive camera.
        b.uvs.push(
            ...(uv ?? [(p[0] + 0.35 * Math.sin(p[2] * 0.19)) / 4.5, (-p[2] + 0.4 * Math.sin(p[0] * 0.23)) / 4.5])
        );
        return i;
    };
    const quad = (b: TerrainBatch, points: Point[], alpha = [1, 1, 1, 1]) => {
        const start = b.positions.length / 3;
        points.forEach((p, i) => vertex(b, p, alpha[i]));
        b.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    };
    const triangle = (b: TerrainBatch, points: Point[]) => {
        const start = b.positions.length / 3;
        const [a, c, d] = points;
        const nx = (c[1] - a[1]) * (d[2] - a[2]) - (c[2] - a[2]) * (d[1] - a[1]);
        const ny = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]);
        const nz = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
        // Dominant-face projection avoids stretching the scan down exposed banks.
        for (const p of points) {
            const uv =
                Math.abs(ny) >= Math.max(Math.abs(nx), Math.abs(nz))
                    ? [p[0] / 4.5, -p[2] / 4.5]
                    : Math.abs(nx) > Math.abs(nz)
                      ? [p[2] / 4.5, p[1] / 4.5]
                      : [p[0] / 4.5, p[1] / 4.5];
            vertex(b, p, 1, uv);
        }
        b.indices.push(start, start + 1, start + 2);
    };
    // A continuous flat floor. This modest grid carries broad pigment variation,
    // not individual stones or dense displacement. Footing remains at Y=0.
    for (let z = -34; z < 34; z += 2)
        for (let x = -32; x < 32; x += 2)
            quad(ground, [
                [x, -0.018, z],
                [x, -0.018, z + 2],
                [x + 2, -0.018, z + 2],
                [x + 2, -0.018, z]
            ]);
    // Only this narrow feather draws over the dirt; alpha interpolates smoothly
    // between materials, with no rectangular paving seams or hard lane kerb.
    for (let z = -34; z < 34; z += 1)
        for (const sign of [-1, 1]) {
            const distances = [-1, -0.25, 0.8, 2.4, 9, 21];
            const opacity = [0, 0.12, 0.62, 0.96, 1, 1];
            const point = (s: number, t: number): Point => [
                sign * Math.min(32, laneEdge(t) + distances[s]),
                -0.014 + 0.014 * Math.min(1, Math.max(0, distances[s] / 2.4)) * (0.65 + 0.35 * Math.sin(t * 0.8)),
                t
            ];
            for (let i = 0; i < distances.length - 1; i++) {
                const points = [point(i, z), point(i, z + 1), point(i + 1, z + 1), point(i + 1, z)];
                const alphas = [opacity[i], opacity[i], opacity[i + 1], opacity[i + 1]];
                if (sign < 0) {
                    points.reverse();
                    alphas.reverse();
                }
                quad(shoulders, points, alphas);
            }
            // Small, mostly buried fragments, confined to shoulders; no broad slabs.
            if (random() < 0.5) {
                const x = sign * (laneEdge(z) + 0.6 + random() * 2.1),
                    cz = z + random();
                const size = 0.045 + random() * 0.11;
                const outline: Point[] = [
                    [-1, -0.3],
                    [-0.4, 1],
                    [0.7, 0.6],
                    [1, -0.6],
                    [0, -1]
                ].map(([px, pz]) => [x + px * size, -0.014, cz + pz * size]);
                for (let i = 0; i < outline.length; i++)
                    triangle(gravel, [
                        outline[i],
                        outline[(i + 1) % outline.length],
                        [x, 0.009 + random() * 0.015, cz]
                    ]);
            }
        }
    for (const { x, z, w, d, h } of MATCH_WORLD.walls) {
        const outline: Point[] = [
            [-0.44, -0.5],
            [-0.5, -0.3],
            [-0.5, 0.36],
            [-0.3, 0.5],
            [0.4, 0.5],
            [0.5, 0.28],
            [0.5, -0.4],
            [0.25, -0.5]
        ].map(([px, pz]) => [x + px * w, -0.014, z + pz * d]);
        const middle = outline.map((p): Point => [
            x + (p[0] - x) * (0.78 + random() * 0.13),
            h * (0.65 + random() * 0.35),
            z + (p[2] - z) * (0.78 + random() * 0.13)
        ]);
        const crown: Point = [x, h * 1.45, z];
        for (let i = 0; i < outline.length; i++) {
            const j = (i + 1) % outline.length;
            triangle(banks, [outline[i], outline[j], middle[j]]);
            triangle(banks, [outline[i], middle[j], middle[i]]);
            triangle(banks, [middle[i], middle[j], crown]);
        }
    }
    // Silhouette relief begins strictly outside established movement bounds.
    for (const axis of ['x', 'z'] as const) {
        const bound = axis === 'x' ? MATCH_WORLD.width / 2 : MATCH_WORLD.depth / 2;
        const along = axis === 'x' ? MATCH_WORLD.depth / 2 : MATCH_WORLD.width / 2;
        for (const sign of [-1, 1])
            for (let s = -along; s < along; s += 4) {
                const end = Math.min(s + 4, along);
                const point = (out: number, y: number, t: number): Point =>
                    axis === 'x' ? [sign * (bound + out), y, t] : [t, y, sign * (bound + out)];
                const rings = [
                    [0.01, -0.018, -0.018],
                    [1.2, 0.65, 0.65],
                    [3.4, 1.5 + 0.6 * Math.sin(s * 0.51), 1.5 + 0.6 * Math.sin(end * 0.51)],
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
                    triangle(banks, [points[0], points[1], points[2]]);
                    triangle(banks, [points[0], points[2], points[3]]);
                }
            }
    }
    return { batches: [ground, shoulders, banks, gravel], slabs: 0 };
}
