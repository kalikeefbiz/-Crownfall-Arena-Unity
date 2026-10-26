import { writeFile } from 'node:fs/promises';

import { format, resolveConfig } from 'prettier';
import { afterAll, describe, expect, it } from 'vitest';

import { CONFIG } from '../src/combat/config.js';
import { referenceToWorld } from '../src/combat/match-space.js';
import {
    blueprint,
    createTraversal,
    heightAt,
    LANES,
    ROCKS,
    OUTER_WALLS,
    SITES,
    SPAWNS,
    terrainModules,
    traverse,
    worldMap
} from '../src/maps/solrahn';
import type { Mode, Point } from '../src/maps/solrahn';

const results: Record<string, unknown> = {};
afterAll(async () => {
    const options = await resolveConfig('evidence/012/traversal.json');
    await writeFile(
        'evidence/012/traversal.json',
        await format(JSON.stringify(results), { ...options, parser: 'json' })
    );
});
function blocked(p: Point, mode: Mode = 'master') {
    const sim = createTraversal(mode);
    const w = referenceToWorld(p);
    return sim.blocked(w.x, w.z);
}
function network(mode: Mode, bounds = [-119, 119, -71, 71]) {
    const sim = createTraversal(mode);
    const free = new Map<string, Point>();
    for (let x = bounds[0]; x <= bounds[1]; x += 2)
        for (let z = bounds[2]; z <= bounds[3]; z += 2) {
            const w = referenceToWorld({ x, z });
            if (!sim.blocked(w.x, w.z)) free.set(`${x},${z}`, { x, z });
        }
    const seen = new Set<string>(),
        components: number[] = [];
    for (const [key, p] of free) {
        if (seen.has(key)) continue;
        const queue = [p];
        seen.add(key);
        for (let i = 0; i < queue.length; i++)
            for (const [dx, dz] of [
                [2, 0],
                [-2, 0],
                [0, 2],
                [0, -2]
            ]) {
                const next = { x: queue[i].x + dx, z: queue[i].z + dz },
                    k = `${next.x},${next.z}`;
                const mid = referenceToWorld({ x: next.x - dx / 2, z: next.z - dz / 2 });
                if (free.has(k) && !seen.has(k) && !sim.blocked(mid.x, mid.z)) {
                    seen.add(k);
                    queue.push(next);
                }
            }
        components.push(queue.length);
    }
    return { freeNodes: free.size, components };
}
describe('Sol’Rahn shared master geography', () => {
    it('retains the blueprint, objective categories and isolated world coordinate system', () => {
        expect(worldMap('master')).toMatchObject({ width: 144, depth: 240 });
        expect(blueprint.cores.map((p) => p.x)).toEqual([-101, 101]);
        expect(LANES.map((l) => l.width)).toEqual([14, 18, 14]);
        expect(SITES.filter((p) => p.type === 'Mobility')).toHaveLength(2);
        expect(SITES.filter((p) => p.type === 'Cooldown')).toHaveLength(2);
        expect(SITES.filter((p) => p.type === 'Defense')).toHaveLength(2);
        expect(SITES).toHaveLength(9);
        expect(createTraversal().config.summoner).toMatchObject({
            speed: CONFIG.summoner.speed,
            radius: CONFIG.summoner.radius
        });
        for (const site of [...SITES, ...SPAWNS]) expect(blocked(site, '3v3')).toBe(false);
    });
    it('walks all lanes in both directions and across their full nominal widths', () => {
        const lanes = LANES.map((lane) => {
            const outward = traverse(lane.points),
                returning = traverse([...lane.points].reverse());
            expect(outward.success, lane.id).toBe(true);
            expect(returning.success, lane.id).toBe(true);
            expect(outward.collisions).toBe(0);
            expect(returning.seconds).toBeCloseTo(outward.seconds, 1);
            for (let i = 1; i < lane.points.length; i++) {
                const a = lane.points[i - 1],
                    b = lane.points[i],
                    len = Math.hypot(b.x - a.x, b.z - a.z);
                for (let d = 0; d < len; d += 1)
                    for (const offset of [-lane.width / 2 + 0.5, 0, lane.width / 2 - 0.5]) {
                        expect(
                            blocked({
                                x: a.x + ((b.x - a.x) * d) / len - ((b.z - a.z) * offset) / len,
                                z: a.z + ((b.z - a.z) * d) / len + ((b.x - a.x) * offset) / len
                            })
                        ).toBe(false);
                    }
            }
            return { lane: lane.id, outward, returning };
        });
        results.lanes = lanes;
    });
    it('connects every walkable grid sample, including each Wilderness independently', () => {
        const networks = {
            master: network('master'),
            three: network('3v3'),
            upper: network('master', [-79, 79, -41, -11]),
            lower: network('master', [-79, 79, 11, 41])
        };
        for (const n of Object.values(networks)) expect(n.components).toHaveLength(1);
        results.networks = networks;
    });
    it('walks twelve separated blueprint cross-lane routes plus broad unmarked alternatives', () => {
        const rotations = blueprint.rotation_links.map((link) => traverse(link.map(([x, z]) => ({ x, z }))));
        rotations.forEach((r) => expect(r.success).toBe(true));
        const alternatives = [-80, -45, 0, 45, 80].flatMap((x) =>
            [-1, 1].map((s) => ({
                x,
                s,
                result: traverse([
                    { x, z: 0 },
                    { x, z: s * 49 }
                ])
            }))
        );
        alternatives.forEach((r) => expect(r.result.success, JSON.stringify(r)).toBe(true));
        const covered = [-1, 1].map((s) =>
            traverse([
                { x: -70, z: s * 29 },
                { x: -45, z: s * 25 },
                { x: -22, z: s * 28 },
                { x: 0, z: s * 21 },
                { x: 22, z: s * 28 },
                { x: 45, z: s * 25 },
                { x: 70, z: s * 29 }
            ])
        );
        covered.forEach((r) => expect(r.success).toBe(true));
        results.rotations = { blueprint: rotations, openAlternatives: alternatives, coveredLongitudinal: covered };
    });
    it('offers four combat-sized approaches and a loop around every objective', () => {
        const access = SITES.map((s) => {
            const r = s.radius;
            const approaches = [
                [r, 0],
                [-r, 0],
                [0, r],
                [0, -r]
            ].map(([dx, dz]) => traverse([{ x: s.x + dx, z: s.z + dz }, s], '3v3'));
            approaches.forEach((a) => expect(a.success, s.id).toBe(true));
            const loop = Array.from({ length: 33 }, (_, i) => ({
                x: s.x + Math.cos((i / 32) * Math.PI * 2) * r,
                z: s.z + Math.sin((i / 32) * Math.PI * 2) * r
            }));
            const result = traverse(loop, '3v3');
            expect(result.success, s.id).toBe(true);
            return { id: s.id, approaches, loop: result };
        });
        results.objectiveAccess = access;
    });
    it('keeps team travel symmetric and the active band fenced against tunnelling', () => {
        const pairs = SITES.filter((s) => s.x >= 0).map((s) => {
            const blue = traverse([
                { x: -108, z: 0 },
                { x: -80, z: 0 },
                { x: -s.x, z: 0 },
                { x: -s.x, z: s.z }
            ]);
            const red = traverse([
                { x: 108, z: 0 },
                { x: 80, z: 0 },
                { x: s.x, z: 0 },
                { x: s.x, z: s.z }
            ]);
            expect(blue.success).toBe(true);
            expect(red.success).toBe(true);
            expect(blue.seconds).toBeCloseTo(red.seconds, 1);
            return { id: s.id, blue, red };
        });
        results.teamTravel = pairs;
        for (const x of [-95, -80, -40, 0, 40, 80, 95])
            for (const sign of [-1, 1]) {
                const sim = createTraversal('3v3', { x, z: sign * 34 });
                sim.step({ moveX: sign, speedMultiplier: 100 }, 1);
                expect(Math.abs(sim.player.x)).toBeLessThanOrEqual(35 - CONFIG.summoner.radius + 1e-6);
                expect(blocked({ x, z: sign * 35.1 }, '3v3')).toBe(true);
            }
        expect(worldMap('master').walls).toHaveLength(ROCKS.length + OUTER_WALLS.length);
    });
    it('grounds the proxy on mesh triangles and budgets modular geometry and traversable slopes', () => {
        const modules = terrainModules();
        expect(modules).toHaveLength(60);
        expect(modules.reduce((n, g) => n + g.indices.length / 3, 0)).toBeLessThan(17280);
        let maxSlope = 0,
            maxY = 0;
        for (let x = -118; x <= 118; x += 1)
            for (let z = -70; z <= 70; z += 1) {
                if (blocked({ x, z })) continue;
                const y = heightAt(x, z);
                maxY = Math.max(maxY, y);
                for (const [dx, dz] of [
                    [0.5, 0],
                    [0, 0.5]
                ])
                    if (!blocked({ x: x + dx, z: z + dz }))
                        maxSlope = Math.max(maxSlope, Math.abs(heightAt(x + dx, z + dz) - y) / 0.5);
            }
        results.terrain = {
            maxSlope,
            maxSlopeDegrees: (Math.atan(maxSlope) * 180) / Math.PI,
            maxTraversableHeight: maxY,
            modules: modules.length,
            triangles: modules.reduce((n, g) => n + g.indices.length / 3, 0)
        };
        expect(maxSlope).toBeLessThan(0.65);
        for (const g of modules)
            for (let i = 0; i < g.positions.length; i += 3)
                expect(heightAt(-g.positions[i + 2], g.positions[i])).toBeCloseTo(g.positions[i + 1], 8);
    });
});
