import { describe, expect, it } from 'vitest';

import { MATCH_WORLD } from '../src/combat/match-space.js';
import { CAMP_SITES } from '../src/combat/wilderness-data.js';
import { createLaneGeometry } from '../src/presentation/lane-geometry';

const { batches } = createLaneGeometry();
// A vertical ray against the actual presentation triangles, independent of
// gameplay collision. This catches unsupported footing and misleading relief.
function heightAt(x: number, z: number) {
    let height = -Infinity;
    for (const b of batches) {
        for (let i = 0; i < b.indices.length; i += 3) {
            const [a, c, d] = b.indices.slice(i, i + 3).map((index) => b.positions.slice(index * 3, index * 3 + 3));
            const det = (c[2] - d[2]) * (a[0] - d[0]) + (d[0] - c[0]) * (a[2] - d[2]);
            if (Math.abs(det) < 1e-10) continue;
            const u = ((c[2] - d[2]) * (x - d[0]) + (d[0] - c[0]) * (z - d[2])) / det;
            const v = ((d[2] - a[2]) * (x - d[0]) + (a[0] - d[0]) * (z - d[2])) / det;
            if (u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8)
                height = Math.max(height, a[1] * u + c[1] * v + d[1] * (1 - u - v));
        }
    }
    return height;
}

describe('carved lane presentation preserves the authoritative map', () => {
    it('confines every raised triangle to an existing collision footprint or outside movement bounds', () => {
        for (const b of batches)
            for (let i = 0; i < b.indices.length; i += 3) {
                const points = b.indices.slice(i, i + 3).map((index) => b.positions.slice(index * 3, index * 3 + 3));
                if (points.every((p) => p[1] <= 0.028)) continue;
                const outside =
                    points.every((p) => p[0] > MATCH_WORLD.width / 2) ||
                    points.every((p) => p[0] < -MATCH_WORLD.width / 2) ||
                    points.every((p) => p[2] > MATCH_WORLD.depth / 2) ||
                    points.every((p) => p[2] < -MATCH_WORLD.depth / 2);
                if (outside) continue;
                expect(
                    MATCH_WORLD.walls.some((w) =>
                        points.every(
                            (p) => Math.abs(p[0] - w.x) <= w.w / 2 + 1e-8 && Math.abs(p[2] - w.z) <= w.d / 2 + 1e-8
                        )
                    ),
                    `${b.name}: ${JSON.stringify(points)}`
                ).toBe(true);
            }
    });

    it('provides grounded footing across both Wilderness access routes, camps and spawns', () => {
        const points = CAMP_SITES.map(({ x, z }) => [x, z]);
        for (const z of [-30, -22, -18, -7, 0, 7, 18, 22, 30])
            for (let x = -31; x <= 31; x++)
                if (!MATCH_WORLD.walls.some((w) => Math.abs(x - w.x) <= w.w / 2 && Math.abs(z - w.z) <= w.d / 2))
                    points.push([x, z]);
        for (const [x, z] of points) {
            const height = heightAt(x, z);
            expect(height, `footing at ${x}, ${z}`).toBeGreaterThanOrEqual(-0.01801);
            expect(height, `footing at ${x}, ${z}`).toBeLessThanOrEqual(0.028);
        }
    });

    it('has upward road/earth faces, valid UVs and a bounded static geometry budget', () => {
        expect(batches.reduce((n, b) => n + b.indices.length / 3, 0)).toBeLessThan(28000);
        for (const b of batches) {
            expect(b.positions.every(Number.isFinite)).toBe(true);
            expect(b.colors).toHaveLength((b.positions.length / 3) * 4);
            expect(b.uvs).toHaveLength((b.positions.length / 3) * 2);
            expect(Math.max(...b.indices)).toBeLessThan(b.positions.length / 3);
        }
        const ground = batches[0];
        for (let i = 0; i < ground.indices.length; i += 3) {
            const [a, b, c] = ground.indices
                .slice(i, i + 3)
                .map((index) => ground.positions.slice(index * 3, index * 3 + 3));
            expect((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])).toBeGreaterThan(0);
        }
    });
});
