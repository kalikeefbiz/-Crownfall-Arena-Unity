import type { SolrahnV2 } from './solrahn-v2';

export function createV2Geometry(surface: SolrahnV2) {
    const { nx, nz, width, depth, chunkCells } = surface.metadata;
    const chunks: { positions: number[]; indices: number[]; normals: number[]; colors: number[] }[] = [];
    const height = (x: number, z: number) => surface.heights[z * nx + x];
    for (let cz = 0; cz < nz - 1; cz += chunkCells)
        for (let cx = 0; cx < nx - 1; cx += chunkCells) {
            const positions: number[] = [],
                indices: number[] = [],
                normals: number[] = [],
                colors: number[] = [];
            const cols = Math.min(chunkCells, nx - 1 - cx),
                rows = Math.min(chunkCells, nz - 1 - cz);
            for (let j = 0; j <= rows; j++)
                for (let i = 0; i <= cols; i++) {
                    const x = cx + i,
                        z = cz + j,
                        wx = (x / (nx - 1)) * width - width / 2,
                        wz = (z / (nz - 1)) * depth - depth / 2;
                    positions.push(wx, height(x, z), wz);
                    // Global finite differences guarantee identical normals at duplicated seams.
                    const dx =
                        (height(Math.min(nx - 1, x + 1), z) - height(Math.max(0, x - 1), z)) /
                        (((x === 0 || x === nx - 1 ? 1 : 2) * width) / (nx - 1));
                    const dz =
                        (height(x, Math.min(nz - 1, z + 1)) - height(x, Math.max(0, z - 1))) /
                        (((z === 0 || z === nz - 1 ? 1 : 2) * depth) / (nz - 1));
                    const length = Math.hypot(dx, 1, dz);
                    normals.push(-dx / length, 1 / length, -dz / length);
                    const lane = surface.laneMask[z * nx + x];
                    const shade = 0.42 + height(x, z) / 30;
                    colors.push(lane ? 0.56 : shade, lane ? 0.57 : shade + 0.06, lane ? 0.55 : shade + 0.08, 1);
                }
            for (let j = 0; j < rows; j++)
                for (let i = 0; i < cols; i++) {
                    const a = j * (cols + 1) + i,
                        b = a + 1,
                        c = a + cols + 1,
                        d = c + 1;
                    indices.push(a, c, b, b, c, d); // Y-up, counter-clockwise.
                }
            chunks.push({ positions, indices, normals, colors });
        }
    // Outer skirts only, closed to Y=-1. Shared seam vertices never get skirts.
    const positions: number[] = [],
        indices: number[] = [],
        normals: number[] = [],
        colors: number[] = [];
    const edge: { x: number; z: number }[] = [];
    for (let x = 0; x < nx - 1; x++) edge.push({ x, z: 0 });
    for (let z = 0; z < nz - 1; z++) edge.push({ x: nx - 1, z });
    for (let x = nx - 1; x > 0; x--) edge.push({ x, z: nz - 1 });
    for (let z = nz - 1; z > 0; z--) edge.push({ x: 0, z });
    for (let i = 0; i < edge.length; i++) {
        const a = edge[i],
            b = edge[(i + 1) % edge.length],
            offset = positions.length / 3;
        for (const p of [a, b])
            for (const y of [height(p.x, p.z), -1]) {
                positions.push((p.x / (nx - 1)) * width - width / 2, y, (p.z / (nz - 1)) * depth - depth / 2);
                const dx = b.x - a.x,
                    dz = b.z - a.z,
                    len = Math.hypot(dx, dz);
                normals.push(dz / len, 0, -dx / len);
                colors.push(0.28, 0.3, 0.32, 1);
            }
        indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
    }
    chunks.push({ positions, indices, normals, colors });
    return chunks;
}
