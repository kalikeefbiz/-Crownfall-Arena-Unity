import { Color, Entity, Mesh, MeshInstance, StandardMaterial, calculateNormals, CULLFACE_NONE } from 'playcanvas';
import type { AppBase, Texture } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';

// Original studio-authored presentation mesh. Every top vertex samples the
// unchanged triangle surface. Thin embedded pieces add no traversal obstacle.
export function createSolrahnCauseway(app: AppBase, parent: Entity, surface: SolrahnV2, stoneTexture?: Texture) {
    const root = new Entity('Solrahn-weathered-causeway');
    parent.addChild(root);
    const stone = new StandardMaterial();
    stone.name = 'weathered-limestone';
    stone.diffuse = new Color(0.97, 0.93, 0.8);
    stone.diffuseMap = stoneTexture ?? null;
    stone.diffuseVertexColor = true;
    stone.gloss = 0.08;
    stone.update();
    const grass = new StandardMaterial();
    grass.name = 'bank-sedges';
    grass.diffuseVertexColor = true;
    grass.cull = CULLFACE_NONE;
    grass.update();
    const meshes: Mesh[] = [];
    let slabs = 0,
        triangles = 0;
    const hash = (i: number) => {
        const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        return n - Math.floor(n);
    };
    for (let sector = 0; sector < 8; sector++) {
        const p: number[] = [],
            c: number[] = [],
            uv: number[] = [],
            indices: number[] = [];
        const blades: number[] = [],
            bc: number[] = [],
            bi: number[] = [];
        const slab = (x: number, z: number, rx: number, rz: number, id: number, moss = 0) => {
            const base = p.length / 3,
                angle = (hash(id + 2) - 0.5) * 0.55,
                ca = Math.cos(angle),
                sa = Math.sin(angle);
            const col = 0.86 + hash(id) * 0.3,
                mr = 1 - 0.2 * moss,
                mg = 1 - 0.02 * moss,
                mb = 1 - 0.3 * moss;
            const points = [
                [-0.78, -1],
                [0.68, -1],
                [1, -0.68],
                [1, 0.64],
                [0.64, 1],
                [-0.8, 1],
                [-1, 0.57],
                [-1, -0.57]
            ];
            for (let ring = 0; ring < 2; ring++)
                for (let k = 0; k < 8; k++) {
                    const jitter = 0.72 + hash(id * 17 + k) * 0.28;
                    const dx = points[k][0] * rx * jitter * (ring ? 1 : 0.92),
                        dz = points[k][1] * rz * jitter * (ring ? 1 : 0.92);
                    const xx = x + dx * ca - dz * sa,
                        zz = z + dx * sa + dz * ca;
                    p.push(xx, surface.height(xx, zz) + (ring ? -0.05 : 0.04 + hash(id + 9) * 0.075), zz);
                    c.push(col * mr * (ring ? 0.5 : 1), col * mg * (ring ? 0.52 : 1), col * mb * (ring ? 0.48 : 1), 1);
                    uv.push(xx / 2.9 + hash(id), zz / 2.9 + hash(id + 8));
                }
            p.push(x, surface.height(x, z) + 0.09, z);
            c.push(col * mr, col * mg, col * mb, 1);
            uv.push(x / 2.9 + hash(id), z / 2.9 + hash(id + 8));
            for (let k = 0; k < 8; k++) {
                const n = (k + 1) % 8;
                indices.push(
                    base + 16,
                    base + n,
                    base + k,
                    base + k,
                    base + n,
                    base + 8 + n,
                    base + k,
                    base + 8 + n,
                    base + 8 + k
                );
            }
            slabs++;
        };
        const zStart = -75 + sector * 19;
        // GOAL 020: in-path flagstones, spawn rings and kerb removed at founder request (triangle budget);
        // the lane now reads from the baked ground and the enclosure walls.
        // Eroded waystones on navigation-blocked bank islands. Narrow bases
        // fit the original blocked footprint; they introduce no new collision.
        const waystones = [
            [-14, -58.5, 3.3],
            [-19, -35, 2.7],
            [-17.5, -8.5, 3.8],
            [17.5, 15, 3.2],
            [-17.5, 40, 2.8],
            [17.5, 65, 3.5]
        ];
        for (const [x, z, h] of waystones) {
            if (z < zStart || z >= zStart + 19) continue;
            const y = surface.height(x, z) - 0.12,
                base = p.length / 3;
            const rings = [
                [0.61, 0],
                [0.61, 0.27],
                [0.42, 0.38],
                [0.37, h - 0.35],
                [0.49, h - 0.3],
                [0.43, h]
            ];
            for (let r = 0; r < rings.length; r++)
                for (let k = 0; k < 8; k++) {
                    const a = (k * Math.PI) / 4 + Math.PI / 8,
                        xx = x + Math.cos(a) * rings[r][0],
                        zz = z + Math.sin(a) * rings[r][0];
                    const yy = y + rings[r][1] - (r === 5 ? hash(k + x) * 0.32 : 0);
                    p.push(xx, yy, zz);
                    c.push(0.87, 0.87, 0.8, 1);
                    uv.push(k * 0.25, yy * 0.7);
                }
            for (let r = 0; r < rings.length - 1; r++)
                for (let k = 0; k < 8; k++) {
                    const a = base + r * 8 + k,
                        b = base + r * 8 + ((k + 1) % 8);
                    indices.push(a, a + 8, b + 8, a, b + 8, b);
                }
            for (let k = 1; k < 7; k++) indices.push(base + 40, base + 40 + k + 1, base + 40 + k);
        }
        // Shattered foundations at the existing clearings. No reward glyphs,
        // neutral discs or activation lights are added to inactive objectives.
        for (const landmark of surface.metadata.landmarks) {
            if (landmark.z < zStart || landmark.z >= zStart + 19) continue;
            for (let k = 0; k < 22; k++) {
                if (hash(k + sector * 79) > 0.66) continue;
                const a = (k * Math.PI * 2) / 22;
                const r = landmark.radius + 1.25 + hash(k + 88) * 0.35;
                slab(landmark.x + Math.cos(a) * r, landmark.z + Math.sin(a) * r, 0.48, 0.4, 40000 + sector * 100 + k);
            }
        }
        // Sparse opaque grass fans: shoulders are richer, the route stays clear.
        for (let j = 0; j < 320; j++) {
            const id = sector * 1000 + j,
                x = (hash(id + 501) > 0.5 ? 1 : -1) * (5.4 + hash(id + 502) * (j > 120 ? 21 : 8)),
                z = zStart + hash(id + 503) * 19;
            if (
                z > 75 ||
                surface.metadata.landmarks.some((m) => Math.hypot(m.x - x, m.z - z) < m.radius + 1) ||
                !surface.walkable(x, z)
            )
                continue;
            const y = surface.height(x, z) + 0.025,
                h = 0.13 + hash(id + 504) * 0.28;
            for (let k = 0; k < 3; k++) {
                const a = hash(id + 505) * 6.28 + k * 2.1,
                    dx = Math.cos(a) * 0.065,
                    dz = Math.sin(a) * 0.065,
                    n = blades.length / 3;
                blades.push(x - dx, y, z - dz, x + dx, y, z + dz, x + dx * 0.6, y + h, z + dz * 0.6);
                bc.push(0.18, 0.25, 0.075, 1, 0.26, 0.31, 0.1, 1, 0.42, 0.45, 0.2, 1);
                bi.push(n, n + 1, n + 2);
            }
        }
        for (const [positions, colors, ind, mat, name] of [
            [p, c, indices, stone, 'broken-flagstone'],
            [blades, bc, bi, grass, 'shoulder-sedges']
        ] as const) {
            const mesh = new Mesh(app.graphicsDevice);
            mesh.setPositions(positions);
            mesh.setNormals(calculateNormals(positions, ind));
            mesh.setColors(colors);
            if (mat === stone) mesh.setUvs(0, uv);
            mesh.setIndices(ind);
            mesh.update();
            meshes.push(mesh);
            triangles += ind.length / 3;
            const e = new Entity(`${name}-${sector}`);
            root.addChild(e);
            e.addComponent('render', {
                meshInstances: [new MeshInstance(mesh, mat, e)],
                castShadows: false,
                receiveShadows: false
            });
        }
    }
    return {
        diagnostics: { slabs, triangles, batches: meshes.length },
        destroy() {
            root.destroy();
            meshes.forEach((m) => m.destroy());
            stone.destroy();
            grass.destroy();
        }
    };
}
