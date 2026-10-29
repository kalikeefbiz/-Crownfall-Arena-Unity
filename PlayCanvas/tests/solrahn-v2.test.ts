import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { CONFIG } from '../src/combat/config.js';
import { CrownfallMatch } from '../src/combat/match.js';
import { MovementSimulation } from '../src/combat/movement.js';
import { createSolrahnV2 } from '../src/maps/solrahn-v2';
import { createV2Geometry } from '../src/maps/solrahn-v2-geometry';

const read = (name: string) => {
    const b = readFileSync(`public/assets/solrahn-v2/${name}`);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const surface = createSolrahnV2(read('height.u16'), read('walk.bin'), read('lane.bin'));

test('original approved ZIP, 16-bit decoding, bounded source error and deterministic conversion', () => {
    const source = readFileSync('assets/solrahn-v2/source/crownfall_terrain_v2_review.zip');
    expect(createHash('sha256').update(source).digest('hex')).toBe(surface.metadata.sourceSha256);
    const before = readFileSync('public/assets/solrahn-v2/terrain.json', 'utf8');
    execFileSync('python3', ['scripts/solrahn-v2.py'], { stdio: 'pipe' });
    expect(readFileSync('public/assets/solrahn-v2/terrain.json', 'utf8')).toBe(before);
    for (const [name, spec] of Object.entries(surface.metadata.files)) {
        expect(
            createHash('sha256')
                .update(new Uint8Array(read(name)))
                .digest('hex')
        ).toBe(spec.sha256);
    }
    expect(surface.metadata.errorMetres.max).toBeLessThan(0.16);
    expect(surface.metadata.errorMetres.p95).toBeLessThan(0.032);
    expect(() => createSolrahnV2(new ArrayBuffer(4), read('walk.bin'), read('lane.bin'))).toThrow();
});

test('finite Y-up chunk geometry, exact triangle-plane collision, watertight internal seams and bounded allocations', () => {
    const chunks = createV2Geometry(surface),
        edges = new Map<string, number>();
    let triangles = 0,
        bytes = 0;
    for (const c of chunks) {
        expect(c.positions.every(Number.isFinite) && c.normals.every(Number.isFinite)).toBe(true);
        expect(c.positions.length).toBe(c.normals.length);
        bytes += (c.positions.length + c.normals.length + c.colors.length) * 4 + c.indices.length * 2;
        for (let i = 0; i < c.indices.length; i += 3) {
            const points = c.indices.slice(i, i + 3).map((index) => {
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThan(c.positions.length / 3);
                return c.positions.slice(index * 3, index * 3 + 3);
            });
            triangles++;
            if (points.every((p) => p[1] >= 0)) {
                const [a, b, d] = points;
                expect((b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2])).toBeGreaterThan(0);
                const x = (a[0] + b[0] + d[0]) / 3,
                    z = (a[2] + b[2] + d[2]) / 3;
                expect(surface.height(x, z)).toBeCloseTo((a[1] + b[1] + d[1]) / 3, 4);
            }
            for (let j = 0; j < 3; j++) {
                const a = points[j],
                    b = points[(j + 1) % 3];
                if (a[1] === -1 && b[1] === -1) continue; // underside is below the visible closed edge
                const key = [a.map((v) => v.toFixed(5)).join(','), b.map((v) => v.toFixed(5)).join(',')]
                    .sort()
                    .join('|');
                edges.set(key, (edges.get(key) || 0) + 1);
            }
        }
    }
    expect(triangles).toBe(56640);
    expect(chunks).toHaveLength(49);
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    expect(bytes).toBeLessThan(1800000);
    expect(surface.navigationStats.scratchBytes).toBeLessThan(1000000);
}, 30000);

function traverse(a: { x: number; z: number }, b: { x: number; z: number }, full = false) {
    const path = surface.route(a, b, full);
    expect(path.length).toBeGreaterThan(1);
    expect(Math.hypot(path.at(-1)!.x - b.x, path.at(-1)!.z - b.z)).toBeLessThan(0.4);
    for (let i = 1; i < path.length; i++) {
        expect(
            surface.clear(path[i - 1], path[i], full ? new Uint8Array(read('walk.bin'), 241 * 321) : undefined)
        ).toBe(true);
        const p = path[i - 1],
            q = path[i],
            n = Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) / 0.1);
        let previous = surface.height(p.x, p.z);
        for (let j = 1; j <= n; j++) {
            const x = p.x + ((q.x - p.x) * j) / n,
                z = p.z + ((q.z - p.z) * j) / n,
                h = surface.height(x, z);
            expect(full ? surface.fullWalkable(x, z) : surface.walkable(x, z)).toBe(true);
            expect(Math.abs(h - previous)).toBeLessThan(0.3);
            previous = h;
        }
    }
    return path.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z) : 0), 0);
}

test('six spawns, middle round trip, all six camps and major have return routes and alternate entrances', () => {
    for (const team of [1, 2])
        for (let slot = 0; slot < 3; slot++) {
            const spawn = surface.spawn(team, slot);
            expect(surface.walkable(spawn.x, spawn.z)).toBe(true);
        }
    traverse(surface.spawn(1, 0), surface.spawn(2, 0));
    traverse(surface.spawn(2, 0), surface.spawn(1, 0));
    for (const camp of surface.metadata.landmarks) {
        for (const team of [1, 2]) {
            traverse(surface.spawn(team, 0), camp);
            traverse(camp, surface.spawn(team, 0));
        }
        // Distinct north/south entrances and room to retreat into each clearing.
        for (const dx of [-2, 2]) {
            const entrance = { x: camp.x + dx, z: camp.z };
            expect(surface.walkable(entrance.x, entrance.z)).toBe(true);
            traverse(entrance, camp);
        }
    }
}, 30000);

test('3v3 radius-eroded mode gates reject ordinary and dash-sized substeps; future three lanes connect', () => {
    const sim = new MovementSimulation(
        { ...CONFIG, summoner: { ...CONFIG.summoner, radius: 0.45, speed: 6, spawn: { x: 0, z: 0 } } },
        // JS inference narrows the legacy default map literal; runtime accepts the
        // same width/depth/walls/walkable interface already used by real matches.
        surface as unknown as ConstructorParameters<typeof MovementSimulation>[1]
    );
    for (const sign of [-1, 1]) {
        sim.reset();
        for (let i = 0; i < 2000; i++) sim.step({ moveX: sign, speedMultiplier: 10 });
        expect(surface.walkable(sim.player!.x, sim.player!.z)).toBe(true);
        expect(Math.abs(sim.player!.x)).toBeLessThan(28.8);
    }
    for (const x of [-40, 40]) {
        expect(surface.walkable(x, 0)).toBe(false);
        // Full-map navigation only; no 5v5 match or rules activation.
        traverse({ x, z: 65 }, { x, z: -65 }, true);
        traverse({ x: 0, z: 65 }, { x, z: 65 }, true);
    }
    const hit = surface.raycast({ x: 0, y: 40, z: 0 }, { x: 0, y: -10, z: 0 });
    expect(hit?.y).toBeCloseTo(surface.height(0, 0), 3);
}, 30000);

test('real 3v3 rules, bots, damage, deaths, respawn, results and rematch retain shared floor', () => {
    const match = new CrownfallMatch(0, { bots: true, arena: surface });
    match.start();
    match.debugAdvance(3.1);
    expect(match.wilderness.camps).toHaveLength(2);
    expect(match.wilderness.camps.every((c) => c.type === 'mobility')).toBe(true);
    for (let tick = 0; tick < 18001 && !match.results; tick++) {
        match.step();
        if (tick % 60 === 0) for (const p of match.entities) expect(surface.walkable(p.x, p.z)).toBe(true);
    }
    expect(match.results?.participants).toHaveLength(6);
    expect(match.actors.filter((a) => a.bot).every((a) => a.record.damage > 0)).toBe(true);
    expect(match.actors.some((a) => a.record.deaths > 0)).toBe(true);
    const again = new CrownfallMatch(0, { bots: true, arena: surface });
    expect(again.snapshot().elapsed).toBe(0);
}, 120000);

test('ordinary movement follows bot waypoints to every clearing and retreats without teleporting', () => {
    const journeys = [];
    for (const team of [1, 2])
        for (const camp of surface.metadata.landmarks) {
            const start = surface.spawn(team, 0);
            const sim = new MovementSimulation(
                { ...CONFIG, summoner: { ...CONFIG.summoner, radius: 0.45, speed: 6, spawn: start } },
                surface as unknown as ConstructorParameters<typeof MovementSimulation>[1]
            );
            let tick = 0,
                distance = 0;
            const traces = [];
            for (const target of [camp, start]) {
                let waypoint = start;
                for (
                    let n = 0;
                    n < 8000 && Math.hypot(sim.player!.x - target.x, sim.player!.z - target.z) > 0.35;
                    n++
                ) {
                    if (n % 15 === 0) waypoint = surface.navigate(sim.player!, target);
                    const before = { ...sim.player! },
                        dx = waypoint.x - before.x,
                        dz = waypoint.z - before.z,
                        d = Math.hypot(dx, dz);
                    sim.step({
                        moveX: d > 0.01 ? (dx / d) * Math.min(1, d / 0.1) : 0,
                        moveZ: d > 0.01 ? (dz / d) * Math.min(1, d / 0.1) : 0
                    });
                    const moved = Math.hypot(sim.player!.x - before.x, sim.player!.z - before.z);
                    expect(moved).toBeLessThanOrEqual(0.101);
                    expect(surface.walkable(sim.player!.x, sim.player!.z)).toBe(true);
                    expect(
                        Math.abs(surface.height(sim.player!.x, sim.player!.z) - surface.height(before.x, before.z))
                    ).toBeLessThan(0.3);
                    tick++;
                    distance += moved;
                    if (n % 30 === 0) traces.push({ x: sim.player!.x, z: sim.player!.z });
                }
                expect(Math.hypot(sim.player!.x - target.x, sim.player!.z - target.z)).toBeLessThan(0.35);
            }
            journeys.push({
                team,
                objective: camp.id,
                roundTripMetres: distance,
                secondsAt6mPerSecond: tick / 60,
                traces
            });
        }
    writeFileSync('evidence/016/routes.json', JSON.stringify(journeys, null, 2) + '\n');
}, 120000);

test('competitive camera clears terrain and sees the player at every sampled navigable elevation', () => {
    for (let x = -27; x <= 27; x += 2)
        for (let z = -77; z <= 77; z += 2) {
            if (!surface.walkable(x, z)) continue;
            const y = surface.height(x, z),
                cy = Math.max(y + 15.5, surface.height(x, z + 18) + 3);
            expect(cy - surface.height(x, z + 18)).toBeGreaterThan(3);
            expect(surface.raycast({ x, y: cy, z: z + 18 }, { x, y: y + 1, z })).toBe(null);
        }
});
