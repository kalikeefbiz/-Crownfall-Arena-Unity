import metadata from '../../public/assets/solrahn-v2/terrain.json';

type Point = { x: number; z: number };
export async function loadSolrahnV2() {
    const buffers = await Promise.all(
        ['height.u16', 'walk.bin', 'lane.bin'].map(async (name) => {
            const response = await fetch(`${import.meta.env.BASE_URL}assets/solrahn-v2/${name}`);
            if (!response.ok) throw new Error(`V2 ${name}: HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            const spec = metadata.files[name as keyof typeof metadata.files];
            if (buffer.byteLength !== spec.bytes) throw new Error(`V2 ${name}: incomplete data`);
            const digest = await crypto.subtle.digest('SHA-256', buffer);
            if (Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('') !== spec.sha256)
                throw new Error(`V2 ${name}: checksum mismatch`);
            return buffer;
        })
    );
    return createSolrahnV2(buffers[0], buffers[1], buffers[2]);
}
export function createSolrahnV2(heightBuffer: ArrayBuffer, walkBuffer: ArrayBuffer, laneBuffer: ArrayBuffer) {
    const { nx, nz, width, depth, navWidth: nw, navDepth: nd, navStep: step } = metadata;
    if (
        heightBuffer.byteLength !== nx * nz * 2 ||
        walkBuffer.byteLength !== nw * nd * 2 ||
        laneBuffer.byteLength !== nx * nz
    )
        throw new Error('Incomplete V2 terrain');
    const values = new DataView(heightBuffer);
    const heights = new Float32Array(nx * nz);
    for (let i = 0; i < heights.length; i++)
        heights[i] = (values.getUint16(i * 2, true) * metadata.verticalScale) / 65535;
    const laneMask = new Uint8Array(laneBuffer);
    const walk = new Uint8Array(walkBuffer, 0, nw * nd);
    const fullWalk = new Uint8Array(walkBuffer, nw * nd, nw * nd);
    const index = (x: number, z: number) => {
        if (x < -width / 2 || x > width / 2 || z < -depth / 2 || z > depth / 2) return -1;
        return Math.round((z + depth / 2) / step) * nw + Math.round((x + width / 2) / step);
    };
    const point = (i: number): Point => ({ x: (i % nw) * step - width / 2, z: Math.floor(i / nw) * step - depth / 2 });
    const walkable = (x: number, z: number) => !!walk[index(x, z)];
    const height = (x: number, z: number) => {
        const fx = Math.max(0, Math.min(nx - 1.000001, ((x + width / 2) * (nx - 1)) / width));
        const fz = Math.max(0, Math.min(nz - 1.000001, ((z + depth / 2) * (nz - 1)) / depth));
        const ix = Math.floor(fx),
            iz = Math.floor(fz),
            a = fx - ix,
            b = fz - iz,
            i = iz * nx + ix;
        return a + b <= 1
            ? heights[i] + (heights[i + 1] - heights[i]) * a + (heights[i + nx] - heights[i]) * b
            : heights[i + nx + 1] +
                  (heights[i + nx] - heights[i + nx + 1]) * (1 - a) +
                  (heights[i + 1] - heights[i + nx + 1]) * (1 - b);
    };
    // Supercover DDA includes both neighbours when crossing a grid corner.
    const clear = (a: Point, b: Point, mask = walk) => {
        let x = Math.floor((a.x + width / 2) / step + 0.5),
            z = Math.floor((a.z + depth / 2) / step + 0.5);
        const ax = (a.x + width / 2) / step + 0.5,
            az = (a.z + depth / 2) / step + 0.5;
        const bx = (b.x + width / 2) / step + 0.5,
            bz = (b.z + depth / 2) / step + 0.5;
        const dx = bx - ax,
            dz = bz - az,
            sx = Math.sign(dx),
            sz = Math.sign(dz);
        const tx = dx ? Math.abs(1 / dx) : Infinity,
            tz = dz ? Math.abs(1 / dz) : Infinity;
        let nextX = dx ? (sx > 0 ? x + 1 - ax : ax - x) * tx : Infinity,
            nextZ = dz ? (sz > 0 ? z + 1 - az : az - z) * tz : Infinity;
        const valid = (xx: number, zz: number) => xx >= 0 && xx < nw && zz >= 0 && zz < nd && !!mask[zz * nw + xx];
        for (let count = 0; count < nw + nd; count++) {
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
    // Reused bounded scratch storage: no per-think grid allocations or mesh conversion.
    const previous = new Int32Array(nw * nd),
        seen = new Uint32Array(nw * nd),
        queue = new Int32Array(nw * nd);
    const directions = [-1, 1, -nw, nw];
    let generation = 0,
        routeSearches = 0;
    const route = (a: Point, b: Point, full = false): Point[] => {
        const mask = full ? fullWalk : walk,
            start = index(a.x, a.z);
        if (!mask[start]) return [];
        let goal = index(b.x, b.z);
        if (!mask[goal]) {
            let best = Infinity;
            for (let i = 0; i < mask.length; i++)
                if (mask[i]) {
                    const px = (i % nw) * step - width / 2,
                        pz = Math.floor(i / nw) * step - depth / 2,
                        d = (px - b.x) ** 2 + (pz - b.z) ** 2;
                    if (d < best) {
                        best = d;
                        goal = i;
                    }
                }
        }
        if (clear(a, point(goal), mask)) return [a, point(goal)];
        generation = (generation + 1) >>> 0;
        routeSearches++;
        if (!generation) {
            seen.fill(0);
            generation = 1;
        }
        let head = 0,
            tail = 1;
        queue[0] = start;
        seen[start] = generation;
        previous[start] = start;
        while (head < tail && seen[goal] !== generation) {
            const at = queue[head++];
            for (const d of directions) {
                const next = at + d;
                if (
                    next < 0 ||
                    next >= mask.length ||
                    !mask[next] ||
                    seen[next] === generation ||
                    (Math.abs(d) === 1 && Math.floor(next / nw) !== Math.floor(at / nw))
                )
                    continue;
                seen[next] = generation;
                previous[next] = at;
                queue[tail++] = next;
            }
        }
        if (seen[goal] !== generation) return [];
        const result: Point[] = [];
        for (let at = goal; at !== start; at = previous[at]) result.push(point(at));
        result.push(a);
        return result.reverse();
    };
    const navigate = (a: Point, b: Point) => {
        if (clear(a, b)) return b;
        const path = route(a, b);
        let next = a;
        for (let i = 1; i < path.length; i++) {
            if (!clear(a, path[i])) break;
            next = path[i];
        }
        return next;
    };
    const raycast = (near: { x: number; y: number; z: number }, far: { x: number; y: number; z: number }) => {
        // Bracket first terrain intersection, then bisect the exact rendered planes.
        let previousT = 0;
        const at = (t: number) => ({
            x: near.x + (far.x - near.x) * t,
            y: near.y + (far.y - near.y) * t,
            z: near.z + (far.z - near.z) * t
        });
        for (let i = 1; i <= 256; i++) {
            const t = i / 256,
                p = at(t);
            if (
                p.x >= -width / 2 &&
                p.x <= width / 2 &&
                p.z >= -depth / 2 &&
                p.z <= depth / 2 &&
                p.y <= height(p.x, p.z)
            ) {
                let lo = previousT,
                    hi = t;
                for (let j = 0; j < 16; j++) {
                    const mid = (lo + hi) / 2,
                        q = at(mid);
                    if (q.y > height(q.x, q.z)) lo = mid;
                    else hi = mid;
                }
                return at((lo + hi) / 2);
            }
            previousT = t;
        }
        return null;
    };
    return {
        kind: 'solrahn-v2' as const,
        metadata,
        heights,
        laneMask,
        height,
        walkable,
        navigate,
        route,
        clear,
        raycast,
        fullWalkable: (x: number, z: number) => !!fullWalk[index(x, z)],
        width,
        depth,
        walls: [],
        lane: { goalA: -75, goalB: 75, halfWidth: 4 },
        spawn: (team: number, slot: number) => ({ x: [0, -1.45, 1.45][slot], z: team === 1 ? 71 : -71 }),
        zones: [-20, 20].map((x) => ({ x, z: 0, w: 26, d: 145, tag: 'wilderness', name: 'WILDERNESS' })),
        // Preserve the existing two Mobility mechanics at their matching V2 sites.
        // The other four camps and major remain explicitly inert debug footprints.
        camps: metadata.landmarks.filter((m) => m.type === 'mobility').map((m) => ({ ...m, active: true })),
        futureObjectives: metadata.landmarks.filter((m) => m.type !== 'mobility'),
        get navigationStats() {
            return { routeSearches, scratchBytes: previous.byteLength + seen.byteLength + queue.byteLength };
        }
    };
}
export type SolrahnV2 = ReturnType<typeof createSolrahnV2>;
