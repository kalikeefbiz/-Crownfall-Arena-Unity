import blueprint from '../../design/solrahn-graybox-v1/Solrahn_Graybox_Coordinates_V1.json' with { type: 'json' };
import { CONFIG } from '../combat/config.js';
import { referenceToWorld, worldToReference } from '../combat/match-space.js';
import { MovementSimulation } from '../combat/movement.js';

export { blueprint };
export type Point = { x: number; z: number };
export type Mode = 'master' | '3v3';
export type Wall = Point & { w: number; d: number; h: number };
export const LANES = Object.entries(blueprint.lanes).map(([id, lane]) => ({
    id,
    width: lane.nominal_width,
    points: lane.centerline.map(([x, z]) => ({ x, z }))
}));
export const SITES = [
    ...blueprint.cores.map((p) => ({ ...p, id: `${p.team}-core`, type: 'core', radius: 5 })),
    ...blueprint.minor_camps.map((p) => ({ ...p, radius: 7 })),
    { ...blueprint.major_camp, id: 'major', radius: 8 }
];
export const SPAWNS = [-1, 1].flatMap((sign) =>
    [0, -8, 8].map((z, slot) => ({ id: `${sign < 0 ? 'blue' : 'red'}-${slot}`, x: sign * 108, z }))
);
// Isolated rock islands, never maze walls. X reflection preserves team access.
export const ROCKS: Wall[] = [-1, 1].flatMap((side) =>
    [-1, 1].flatMap((sign) =>
        [32, 60].flatMap((x) => [
            { x: sign * x, z: side * 14, w: 6, d: 4, h: 3 },
            { x: sign * x, z: side * 38, w: 6, d: 5, h: 4 }
        ])
    )
);
// Stepped 2m cross-sections of the blueprint's enclosing oval. The same profile
// cuts terrain triangles, closes the cliff skirt, and supplies simple AABB collision.
export const OUTER_ROWS = Array.from({ length: 72 }, (_, i) => {
    const z = -72 + i * 2;
    const halfX = Math.min(120, Math.ceil((120 * Math.sqrt(1 - ((z + 1) / 72) ** 2)) / 2) * 2);
    return { z, halfX };
});
export const OUTER_WALLS: Wall[] = OUTER_ROWS.flatMap(({ z, halfX }) =>
    halfX >= 120
        ? []
        : [-1, 1].map((sign) => ({ x: sign * (halfX + (120 - halfX) / 2), z: z + 1, w: 120 - halfX, d: 2, h: 3 }))
);
export function worldMap(mode: Mode) {
    const modeWalls: Wall[] = mode === '3v3' ? [-1, 1].map((s) => ({ x: 0, z: s * 53.5, w: 240, d: 37, h: 1.8 })) : [];
    return {
        width: 144,
        depth: 240,
        walls: [...ROCKS, ...OUTER_WALLS, ...modeWalls].map((p) => ({ ...referenceToWorld(p), w: p.d, d: p.w, h: p.h }))
    };
}
export function createTraversal(mode: Mode = 'master', spawn: Point = SPAWNS[0]) {
    return new MovementSimulation(
        { ...CONFIG, summoner: { ...CONFIG.summoner, spawn: referenceToWorld(spawn) } },
        worldMap(mode)
    );
}
export function segmentDistance(p: Point, a: Point, b: Point) {
    const dx = b.x - a.x,
        dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
export function laneDistance(p: Point, lane: (typeof LANES)[number]) {
    return Math.min(...lane.points.slice(1).map((b, i) => segmentDistance(p, lane.points[i], b)));
}
export function laneMargin(p: Point) {
    return Math.min(...LANES.map((lane) => laneDistance(p, lane) - lane.width / 2));
}
const smooth = (t: number) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
};
// Analytic contours sampled into editable 24m modules. Lanes and clearings are carved
// into broad rolling shoulders; no vertical jump or movement-speed compensation.
export function vertexHeight(x: number, z: number) {
    const p = { x, z };
    const shoulder = smooth(laneMargin(p) / 8);
    const clearing = Math.min(1, ...SITES.map((s) => smooth((Math.hypot(x - s.x, z - s.z) - s.radius) / 6)));
    const base = smooth((Math.abs(x) - 86) / 6) * (1 - smooth((Math.abs(z) - 16) / 8));
    const hills = (0.7 + 1.05 * Math.sin(x * 0.065) ** 2) * Math.sin(z * 0.06) ** 2;
    const rim = smooth((Math.hypot(x / 120, z / 72) - 0.86) / 0.14);
    return Math.max(hills * shoulder * clearing * (1 - base), rim * 3);
}
// Same diagonal and 2m spacing as the mesh: feet follow the actual triangles.
export function heightAt(x: number, z: number) {
    const ax = Math.floor(x / 2) * 2,
        az = Math.floor(z / 2) * 2;
    const u = (x - ax) / 2,
        v = (z - az) / 2;
    const a = vertexHeight(ax, az),
        b = vertexHeight(ax + 2, az),
        c = vertexHeight(ax, az + 2),
        d = vertexHeight(ax + 2, az + 2);
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}
export function surfaceColor(x: number, z: number): number[] {
    const p = { x, z };
    const base = blueprint.cores.find((c) => Math.abs(x - c.x) <= 12 && Math.abs(z) <= 16);
    let color = base
        ? base.team === 'blue'
            ? [0.19, 0.39, 0.5]
            : [0.52, 0.26, 0.25]
        : laneMargin(p) < 0
          ? [0.57, 0.49, 0.36]
          : Math.abs(z) > 60 || Math.abs(x) > 113
            ? [0.27, 0.3, 0.31]
            : [0.27, 0.39, 0.3];
    if (!base && SITES.some((s) => s.type !== 'core' && Math.hypot(x - s.x, z - s.z) < s.radius))
        color = [0.47, 0.43, 0.3];
    const shade = 0.91 + 0.07 * Math.cos(x * 0.43) * Math.cos(z * 0.37);
    return color.map((c) => c * shade);
}
export type Geometry = { name: string; positions: number[]; colors: number[]; indices: number[] };
export function terrainModules(): Geometry[] {
    const modules: Geometry[] = [];
    for (let x = -120; x < 120; x += 24)
        for (let z = -72; z < 72; z += 24) {
            const g: Geometry = { name: `terrain-${x}-${z}`, positions: [], colors: [], indices: [] };
            for (let iz = 0; iz <= 12; iz++)
                for (let ix = 0; ix <= 12; ix++) {
                    const px = x + ix * 2,
                        pz = z + iz * 2;
                    const world = referenceToWorld({ x: px, z: pz });
                    g.positions.push(world.x, vertexHeight(px, pz), world.z);
                    g.colors.push(...surfaceColor(px, pz), 1);
                }
            for (let iz = 0; iz < 12; iz++)
                for (let ix = 0; ix < 12; ix++) {
                    const row = OUTER_ROWS[Math.round((z + iz * 2 + 72) / 2)];
                    if (Math.abs(x + ix * 2 + 1) > row.halfX) continue;
                    const a = iz * 13 + ix;
                    g.indices.push(a, a + 13, a + 1, a + 1, a + 13, a + 14);
                }
            modules.push(g);
        }
    return modules;
}
// Real authoritative traversal at 60Hz, shared by unit and browser evidence. The
// points must describe a route, not a teleport; only the initial spawn is placed.
export function traverse(points: Point[], mode: Mode = 'master') {
    const sim = createTraversal(mode, points[0]);
    let ticks = 0,
        success = true,
        distance = 0;
    const startCollisions = sim.collisions;
    for (const target of points.slice(1)) {
        const world = referenceToWorld(target);
        let reached = false;
        for (let i = 0; i < 6000; i++) {
            const dx = world.x - sim.player.x,
                dz = world.z - sim.player.z;
            const length = Math.hypot(dx, dz);
            if (length < 0.08) {
                reached = true;
                break;
            }
            const before = { x: sim.player.x, z: sim.player.z };
            sim.step(
                { moveX: (dx / length) * Math.min(1, length * 10), moveZ: (dz / length) * Math.min(1, length * 10) },
                1 / 60
            );
            ticks++;
            const moved = Math.hypot(sim.player.x - before.x, sim.player.z - before.z);
            distance += moved;
            if (moved < 0.00001) break;
        }
        if (!reached) {
            success = false;
            break;
        }
    }
    return {
        success,
        seconds: ticks / 60,
        distance,
        collisions: sim.collisions - startCollisions,
        end: worldToReference(sim.player)
    };
}
