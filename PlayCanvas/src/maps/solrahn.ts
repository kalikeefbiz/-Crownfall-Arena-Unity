import metadata from '../../public/assets/solrahn/surface.json';

// This raster is collision data sampled from the accepted visual GLB, never a rendered floor.
export const SOLRAHN_TRANSFORM = { scale: 80, translation: [0, 8, 0], rotation: [0, 0, 0] };
export const SOLRAHN_ASSET = import.meta.env.DEV
    ? 'assets/solrahn/solrahn-three-lane-visual.glb'
    : 'https://media.githubusercontent.com/media/kalikeefbiz/-Crownfall-Arena-Unity/64019b48ec997d7b3873dc6628b7796c10498835/PlayCanvas/assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb';
export async function loadSolrahnSurface() {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/solrahn/surface.bin`);
    if (!response.ok) throw new Error(`Sol’Rahn surface: HTTP ${response.status}`);
    return createSolrahnSurface(await response.arrayBuffer());
}
export function createSolrahnSurface(buffer: ArrayBuffer) {
    const { width, depth, xMin, zMin, step } = metadata;
    const size = width * depth;
    if (buffer.byteLength !== size * 3) throw new Error('Incomplete Sol’Rahn collision data');
    const heights = new Int16Array(buffer, 0, size);
    const walk = new Uint8Array(buffer, size * 2, size);
    const cell = (x: number, z: number) => {
        const ix = Math.round((x - xMin) / step),
            iz = Math.round((z - zMin) / step);
        return ix < 0 || ix >= width || iz < 0 || iz >= depth ? -1 : iz * width + ix;
    };
    const point = (i: number) => ({ x: xMin + (i % width) * step, z: zMin + Math.floor(i / width) * step });
    const walkable = (x: number, z: number) => !!walk[cell(x, z)];
    const height = (x: number, z: number) => {
        const fx = Math.max(0, Math.min(width - 1.001, (x - xMin) / step));
        const fz = Math.max(0, Math.min(depth - 1.001, (z - zMin) / step));
        const ix = Math.floor(fx),
            iz = Math.floor(fz),
            i = iz * width + ix;
        const a = fx - ix,
            b = fz - iz;
        return (
            ((heights[i] * (1 - a) + heights[i + 1] * a) * (1 - b) +
                (heights[i + width] * (1 - a) + heights[i + width + 1] * a) * b) /
            1000
        );
    };
    const clear = (a: { x: number; z: number }, b: { x: number; z: number }) => {
        // Supercover grid traversal: sparse line samples could skip the corner of a blocked cell.
        let x = Math.floor((a.x - xMin) / step + 0.5),
            z = Math.floor((a.z - zMin) / step + 0.5);
        const bx = (b.x - xMin) / step + 0.5,
            bz = (b.z - zMin) / step + 0.5;
        const ax = (a.x - xMin) / step + 0.5,
            az = (a.z - zMin) / step + 0.5;
        const dx = bx - ax,
            dz = bz - az,
            sx = Math.sign(dx),
            sz = Math.sign(dz);
        const tx = dx ? Math.abs(1 / dx) : Infinity,
            tz = dz ? Math.abs(1 / dz) : Infinity;
        let nextX = dx ? (sx > 0 ? x + 1 - ax : ax - x) * tx : Infinity;
        let nextZ = dz ? (sz > 0 ? z + 1 - az : az - z) * tz : Infinity;
        const valid = (ix: number, iz: number) =>
            ix >= 0 && ix < width && iz >= 0 && iz < depth && !!walk[iz * width + ix];
        for (let count = 0; count < width + depth; count++) {
            if (!valid(x, z)) return false;
            if (x === Math.floor(bx) && z === Math.floor(bz)) return true;
            if (Math.abs(nextX - nextZ) < 1e-9) {
                if (!valid(x + sx, z) || !valid(x, z + sz)) return false;
                x += sx;
                z += sz;
                nextX += tx;
                nextZ += tz;
            } else if (nextX < nextZ) {
                x += sx;
                nextX += tx;
            } else {
                z += sz;
                nextZ += tz;
            }
        }
        return false;
    };
    const navigate = (a: { x: number; z: number }, b: { x: number; z: number }) => {
        const start = cell(a.x, a.z);
        if (!walk[start]) return a;
        let goal = cell(b.x, b.z);
        if (!walk[goal]) {
            let best = Infinity;
            for (let i = 0; i < size; i++)
                if (walk[i]) {
                    const p = point(i),
                        d = (p.x - b.x) ** 2 + (p.z - b.z) ** 2;
                    if (d < best) {
                        best = d;
                        goal = i;
                    }
                }
        }
        const target = point(goal);
        if (clear(a, target)) return target;
        // Bounded flood route over exactly the same eroded collision cells used by movement.
        const previous = new Int32Array(size).fill(-1),
            queue = new Int32Array(size);
        let head = 0,
            tail = 1;
        queue[0] = start;
        previous[start] = start;
        while (head < tail && previous[goal] < 0) {
            const at = queue[head++];
            for (const d of [-1, 1, -width, width]) {
                const next = at + d;
                if (
                    next < 0 ||
                    next >= size ||
                    !walk[next] ||
                    previous[next] >= 0 ||
                    (Math.abs(d) === 1 && Math.floor(next / width) !== Math.floor(at / width))
                )
                    continue;
                previous[next] = at;
                queue[tail++] = next;
            }
        }
        if (previous[goal] < 0) return a;
        const route = [goal];
        while (route[route.length - 1] !== start) route.push(previous[route[route.length - 1]]);
        route.reverse();
        let next = route[1] ?? start;
        for (const i of route.slice(1)) {
            if (!clear(a, point(i))) break;
            next = i;
        }
        return point(next);
    };
    return {
        metadata,
        height,
        width: 60,
        depth: 104,
        walls: [],
        walkable,
        navigate,
        lane: { goalA: -50, goalB: 50, halfWidth: 2.6 },
        spawn: (team: number, slot: number) => ({ x: [0, -1.45, 1.45][slot], z: team === 1 ? 47 : -47 }),
        zones: [-16, 16].map((x) => ({ x, z: 0, w: 25, d: 86, tag: 'wilderness', name: 'WILDERNESS' })),
        camps: [
            { id: 'mobility-a', type: 'mobility', x: -20, z: -6 },
            { id: 'mobility-b', type: 'mobility', x: 20, z: -6 }
        ],
        futureObjectives: ['cooldown-a', 'cooldown-b', 'defense-a', 'defense-b', 'major'].map((id) => ({
            id,
            active: false
        }))
    };
}
export type SolrahnSurface = ReturnType<typeof createSolrahnSurface>;
