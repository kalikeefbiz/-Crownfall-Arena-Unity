import { Color, Entity, Mesh, MeshInstance, StandardMaterial, Vec3, calculateNormals } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import { referenceToWorld } from '../combat/match-space.js';
import { blueprint, heightAt, LANES, ROCKS, SITES, SPAWNS, terrainModules, OUTER_ROWS } from '../maps/solrahn';
import type { Geometry, Mode, Point } from '../maps/solrahn';

const geometry = (name: string): Geometry => ({ name, positions: [], colors: [], indices: [] });
function merge(target: Geometry, source: Geometry) {
    const offset = target.positions.length / 3;
    target.positions.push(...source.positions);
    target.colors.push(...source.colors);
    target.indices.push(...source.indices.map((i) => i + offset));
}
function vertex(g: Geometry, p: number[], color: number[]) {
    g.positions.push(...p);
    g.colors.push(...color, 1);
}
function triangle(g: Geometry, a: number[], b: number[], c: number[], color: number[]) {
    const n = g.positions.length / 3;
    [a, b, c].forEach((p) => vertex(g, p, color));
    g.indices.push(n, n + 1, n + 2);
}
function disc(g: Geometry, p: Point, radius: number, color: number[], inner = 0, offset = 0.05) {
    for (let i = 0; i < 40; i++) {
        const point = (j: number, r: number) => {
            const x = p.x + Math.cos((j / 40) * Math.PI * 2) * r,
                z = p.z + Math.sin((j / 40) * Math.PI * 2) * r;
            const w = referenceToWorld({ x, z });
            return [w.x, heightAt(x, z) + offset, w.z];
        };
        const a = point(i, radius),
            b = point(i + 1, radius),
            c = point(i, inner),
            d = point(i + 1, inner);
        triangle(g, a, b, c, color);
        triangle(g, b, d, c, color);
    }
}
function ribbon(g: Geometry, points: Point[], width: number, color: number[], offset = 0.04) {
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
            b = points[i],
            length = Math.hypot(b.x - a.x, b.z - a.z);
        const steps = Math.ceil(length / 2),
            nx = ((-(b.z - a.z) / length) * width) / 2,
            nz = (((b.x - a.x) / length) * width) / 2;
        const point = (t: number, sign: number) => {
            const x = a.x + (b.x - a.x) * t + nx * sign,
                z = a.z + (b.z - a.z) * t + nz * sign;
            const w = referenceToWorld({ x, z });
            return [w.x, heightAt(x, z) + offset, w.z];
        };
        for (let j = 0; j < steps; j++) {
            const c = point(j / steps, -1),
                d = point(j / steps, 1),
                e = point((j + 1) / steps, -1),
                f = point((j + 1) / steps, 1);
            triangle(g, c, e, d, color);
            triangle(g, d, e, f, color);
        }
    }
}
export function createSolrahnScene(app: AppBase) {
    const root = new Entity('solrahn-modular-graybox');
    app.root.addChild(root);
    const meshes: Mesh[] = [],
        materials: StandardMaterial[] = [];
    const material = (name: string, unlit = false) => {
        const m = new StandardMaterial();
        m.name = name;
        m.diffuse = new Color(1, 1, 1);
        m.diffuseVertexColor = true;
        m.cull = 0;
        m.gloss = 0.1;
        if (unlit) {
            m.useLighting = false;
            m.emissive = new Color(1, 1, 1);
            m.emissiveVertexColor = true;
        }
        m.update();
        materials.push(m);
        return m;
    };
    const terrainMaterial = material('shared-graybox-earth');
    const stoneMaterial = material('shared-graybox-rock');
    const markerMaterial = material('shared-graybox-markings', true);
    const draw = (g: Geometry, mat: StandardMaterial) => {
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(g.positions);
        mesh.setNormals(calculateNormals(g.positions, g.indices));
        mesh.setColors(g.colors);
        mesh.setIndices(g.indices);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity(g.name);
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat, e)],
            castShadows: false,
            receiveShadows: false
        });
        root.addChild(e);
        return e;
    };
    const modules = terrainModules();
    // Sixty independent source modules, ten runtime strips sharing one material.
    for (let i = 0; i < 10; i++) {
        const group = geometry(`terrain-strip-${i}`);
        modules.slice(i * 6, i * 6 + 6).forEach((g) => merge(group, g));
        draw(group, terrainMaterial);
    }
    const rocks = geometry('rock-islands-and-outer-shelves');
    for (const rock of ROCKS) {
        const outline = [
            [-0.5, -0.5],
            [0.5, -0.5],
            [0.5, 0.5],
            [-0.5, 0.5]
        ];
        const shoulder = [
            [-0.31, -0.35],
            [0.35, -0.29],
            [0.26, 0.37],
            [-0.36, 0.24]
        ];
        const bottom = heightAt(rock.x, rock.z);
        const point = (j: number, upper = false) => {
            const shape = upper ? shoulder : outline;
            const x = rock.x + shape[j % 4][0] * rock.w,
                z = rock.z + shape[j % 4][1] * rock.d;
            const w = referenceToWorld({ x, z });
            return [w.x, upper ? bottom + rock.h * [0.7, 1, 0.55, 0.78][j % 4] : heightAt(x, z), w.z];
        };
        for (let i = 0; i < 4; i++) {
            const color = [0.24 + i * 0.025, 0.28 + i * 0.025, 0.3 + i * 0.025];
            triangle(rocks, point(i), point(i + 1), point(i, true), color);
            triangle(rocks, point(i + 1), point(i + 1, true), point(i, true), color);
        }
        triangle(rocks, point(0, true), point(1, true), point(2, true), [0.4, 0.43, 0.44]);
        triangle(rocks, point(0, true), point(2, true), point(3, true), [0.35, 0.39, 0.4]);
    }
    // Vertical cliff skirt around the shared stepped oval, never a floating border.
    const edge = (a: Point, b: Point) => {
        const wa = referenceToWorld(a),
            wb = referenceToWorld(b);
        const pa = [wa.x, heightAt(a.x, a.z), wa.z],
            pb = [wb.x, heightAt(b.x, b.z), wb.z];
        triangle(rocks, pa, pb, [wa.x, -3, wa.z], [0.27, 0.31, 0.33]);
        triangle(rocks, pb, [wb.x, -3, wb.z], [wa.x, -3, wa.z], [0.23, 0.27, 0.29]);
    };
    for (let i = 0; i < OUTER_ROWS.length; i++)
        for (const sign of [-1, 1]) {
            const row = OUTER_ROWS[i];
            edge({ x: sign * row.halfX, z: row.z }, { x: sign * row.halfX, z: row.z + 2 });
            const next = OUTER_ROWS[i + 1];
            if (next) edge({ x: sign * row.halfX, z: row.z + 2 }, { x: sign * next.halfX, z: row.z + 2 });
        }
    edge({ x: -OUTER_ROWS[0].halfX, z: -72 }, { x: OUTER_ROWS[0].halfX, z: -72 });
    edge({ x: -OUTER_ROWS[71].halfX, z: 72 }, { x: OUTER_ROWS[71].halfX, z: 72 });
    draw(rocks, stoneMaterial);
    const markings = geometry('cores-camps-spawns-territory');
    for (const site of SITES) {
        const color = site.type === 'core' ? (site.x < 0 ? [0.19, 0.65, 0.95] : [0.96, 0.34, 0.3]) : [0.85, 0.7, 0.36];
        disc(markings, site, site.radius, color, site.radius - 0.25);
        disc(markings, site, site.type === 'core' ? 1.8 : 0.9, color);
    }
    for (const s of SPAWNS) disc(markings, s, 0.8, s.x < 0 ? [0.3, 0.65, 0.9] : [0.9, 0.4, 0.4], 0.55);
    // Reserved control areas use the established lane axis; no scoring code changes.
    for (const x of [-45, 0, 45]) disc(markings, { x, z: 0 }, 4, [0.7, 0.67, 0.5], 3.85);
    for (const lane of LANES) {
        for (let i = 1; i < lane.points.length; i++) {
            const a = lane.points[i - 1],
                b = lane.points[i],
                length = Math.hypot(b.x - a.x, b.z - a.z);
            for (let t = 0; t < length; t += 6) {
                const point = (d: number) => ({
                    x: a.x + ((b.x - a.x) * d) / length,
                    z: a.z + ((b.z - a.z) * d) / length
                });
                ribbon(markings, [point(t), point(Math.min(t + 1.5, length))], 0.14, [0.76, 0.68, 0.5]);
            }
        }
    }
    draw(markings, markerMaterial);
    const routeGeometry = geometry('optional-blueprint-rotation-guides');
    for (const link of blueprint.rotation_links)
        ribbon(
            routeGeometry,
            link.map(([x, z]) => ({ x, z })),
            0.22,
            [0.55, 0.73, 0.57],
            0.09
        );
    for (const sign of [-1, 1])
        ribbon(
            routeGeometry,
            [-73, -48, -22, 0, 22, 48, 73].map((x, i) => ({ x, z: sign * [29, 25, 28, 21, 28, 25, 29][i] })),
            0.25,
            [0.55, 0.73, 0.57],
            0.09
        );
    const guides = draw(routeGeometry, markerMaterial);
    const inactiveGeometry = geometry('3v3-inactive-terrain');
    for (const sign of [-1, 1]) {
        // Solid low-contrast overlay follows the same terrain, avoiding ambiguous inactive space.
        for (let z = 36; z < 72; z += 2) {
            const halfX = OUTER_ROWS[Math.floor((sign * z + 72) / 2)].halfX;
            ribbon(
                inactiveGeometry,
                [
                    { x: -halfX, z: sign * z },
                    { x: halfX, z: sign * z }
                ],
                2,
                [0.13, 0.17, 0.21],
                0.12
            );
        }
    }
    const inactive = draw(inactiveGeometry, markerMaterial);
    const boundaryGeometry = geometry('3v3-hard-boundary-z35');
    for (const sign of [-1, 1]) {
        const halfX = OUTER_ROWS[Math.floor((sign * 35 + 72) / 2)].halfX;
        ribbon(
            boundaryGeometry,
            [
                { x: -halfX, z: sign * 35 },
                { x: halfX, z: sign * 35 }
            ],
            0.35,
            [0.3, 0.82, 0.93],
            0.2
        );
        for (let x = -halfX; x < halfX; x += 4) {
            const a = referenceToWorld({ x, z: sign * 35 }),
                b = referenceToWorld({ x: x + 4, z: sign * 35 });
            const y = heightAt(x, sign * 35);
            triangle(boundaryGeometry, [a.x, y, a.z], [b.x, y, b.z], [a.x, y + 1.8, a.z], [0.16, 0.42, 0.5]);
            triangle(boundaryGeometry, [b.x, y, b.z], [b.x, y + 1.8, b.z], [a.x, y + 1.8, a.z], [0.16, 0.42, 0.5]);
        }
    }
    const boundary = draw(boundaryGeometry, markerMaterial);
    const actor = new Entity('Summoner-navigation-proxy-1.75m');
    root.addChild(actor);
    const bodyMat = material('summoner-proxy');
    bodyMat.diffuse = new Color(0.3, 0.75, 1);
    bodyMat.diffuseVertexColor = false;
    bodyMat.update();
    const body = new Entity('proxy-body');
    body.addComponent('render', { type: 'capsule', material: bodyMat });
    body.setLocalPosition(0, 0.875, 0);
    body.setLocalScale(0.65, 1.75, 0.65);
    actor.addChild(body);
    const pointer = new Entity('proxy-facing');
    pointer.addComponent('render', { type: 'box', material: bodyMat });
    pointer.setLocalScale(0.12, 0.08, 0.65);
    pointer.setLocalPosition(0, 0.15, 0.55);
    actor.addChild(pointer);
    const light = new Entity('graybox-key');
    light.addComponent('light', { type: 'directional', intensity: 1.4, color: new Color(1, 0.95, 0.85) });
    light.setEulerAngles(32, -25, 0);
    root.addChild(light);
    app.scene.ambientLight = new Color(0.32, 0.37, 0.42);
    return {
        actor,
        setMode(mode: Mode) {
            inactive.enabled = boundary.enabled = mode === '3v3';
        },
        guides(visible: boolean) {
            guides.enabled = visible;
        },
        stats: {
            sourceModules: modules.length,
            terrainTriangles: modules.reduce((n, g) => n + g.indices.length / 3, 0),
            staticMeshCount: meshes.length,
            staticTriangles: meshes.reduce((n, m) => n + (m.primitive[0]?.count ?? 0) / 3, 0),
            rockIslands: ROCKS.length,
            materials: materials.length,
            textureBytes: 0
        },
        destroy() {
            root.destroy();
            meshes.forEach((m) => m.destroy());
            materials.forEach((m) => m.destroy());
        },
        project(camera: Entity, p: Point) {
            const w = referenceToWorld(p);
            return camera.camera!.worldToScreen(new Vec3(w.x, heightAt(p.x, p.z) + 0.2, w.z));
        }
    };
}
