import {
    Color,
    Entity,
    Mesh,
    MeshInstance,
    StandardMaterial,
    Vec3,
    calculateNormals,
    calculateTangents,
    SEMANTIC_TANGENT
} from 'playcanvas';
import type { AppBase } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';
import { createV2Geometry } from '../maps/solrahn-v2-geometry';

import { createLaneEnclosure } from './lane-enclosure';
import { createSolrahnSurfaceMaterial } from './solrahn-surface-material';
import type { SummonerAssets } from './summoner-assets';

export function createSolrahnV2Environment(
    app: AppBase,
    parent: Entity,
    surface: SolrahnV2,
    characters: SummonerAssets
) {
    const root = new Entity('Solrahn-V2-16bit-graybox');
    parent.addChild(root);
    const enclosure =
        import.meta.env.VITE_LANE_ENCLOSURE === '1' && new URLSearchParams(location.search).get('enclosure') !== '0'
            ? createLaneEnclosure(app, root, surface, characters)
            : null;
    const geometry = createV2Geometry(surface);
    const mat = new StandardMaterial();
    mat.diffuse = new Color(1, 1, 1);
    mat.diffuseVertexColor = true;
    mat.gloss = 0.1;
    mat.update();
    const pbr =
        new URLSearchParams(location.search).get('surface') === 'goal017' ? createSolrahnSurfaceMaterial(app) : null;
    const meshes: Mesh[] = [];
    const instances: MeshInstance[] = [];
    for (const data of geometry) {
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(data.positions);
        mesh.setNormals(data.normals);
        mesh.setColors(data.colors);
        if (pbr) {
            const uvs: number[] = [];
            const skirt = data === geometry[geometry.length - 1];
            for (let i = 0; i < data.positions.length; i += 3) {
                const [x, y, z] = data.positions.slice(i, i + 3);
                if (skirt) uvs.push((Math.abs(data.normals[i]) > 0.5 ? z : x) / 6, y / 6);
                else uvs.push(-z / 6, x / 6);
            }
            mesh.setUvs(0, uvs);
            // Analytic global tangent: u=-worldZ, v=worldX. Duplicated chunk
            // vertices receive identical frames as well as identical normals.
            const tangents = skirt ? calculateTangents(data.positions, data.normals, uvs, data.indices) : [];
            if (!skirt)
                for (let i = 0; i < data.normals.length; i += 3) {
                    const ty = data.normals[i + 2] / data.normals[i + 1];
                    const length = Math.hypot(ty, 1);
                    tangents.push(0, ty / length, -1 / length, -1);
                }
            mesh.setVertexStream(SEMANTIC_TANGENT, tangents, 4);
        }
        mesh.setIndices(data.indices);
        mesh.update();
        meshes.push(mesh);
        const entity = new Entity('V2-heightfield-chunk');
        root.addChild(entity);
        const instance = new MeshInstance(
            mesh,
            pbr ? (data === geometry[geometry.length - 1] ? pbr.skirt : pbr.mat) : mat,
            entity
        );
        instances.push(instance);
        entity.addComponent('render', {
            meshInstances: [instance],
            castShadows: false,
            receiveShadows: false
        });
    }
    const markers = new Entity('V2-neutral-placeholders');
    root.addChild(markers);
    const markerMat = new StandardMaterial();
    markerMat.diffuse = new Color(0.7, 0.7, 0.65);
    markerMat.update();
    for (const m of surface.metadata.landmarks) {
        const e = new Entity(`${m.id} / PLACEHOLDER — NO NEW BONUS`);
        markers.addChild(e);
        e.addComponent('render', { type: 'cylinder', material: markerMat, castShadows: false });
        e.setPosition(m.x, surface.height(m.x, m.z) + 0.035, m.z);
        e.setLocalScale(m.radius * 2, 0.07, m.radius * 2);
    }
    const bounds = new Entity('V2-mode-gates');
    root.addChild(bounds);
    const gateMat = new StandardMaterial();
    gateMat.diffuse = new Color(0.75, 0.58, 0.22);
    gateMat.update();
    const gatePositions: number[] = [],
        gateIndices: number[] = [];
    // Physical envelope: the eroded actor-centre mask keeps character radii inside this line.
    for (const x of surface.metadata.modeX)
        for (let z = -79; z < 79; z += 0.5) {
            const offset = gatePositions.length / 3;
            for (const [xx, zz] of [
                [x - 0.06, z],
                [x + 0.06, z],
                [x - 0.06, z + 0.5],
                [x + 0.06, z + 0.5]
            ])
                gatePositions.push(xx, surface.height(xx, zz) + 0.06, zz);
            gateIndices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
        }
    const gateMesh = new Mesh(app.graphicsDevice);
    gateMesh.setPositions(gatePositions);
    gateMesh.setNormals(calculateNormals(gatePositions, gateIndices));
    gateMesh.setIndices(gateIndices);
    gateMesh.update();
    bounds.addComponent('render', { meshInstances: [new MeshInstance(gateMesh, gateMat, bounds)], castShadows: false });
    const cores = new Entity('V2-core-endpoints');
    root.addChild(cores);
    const coreMaterials: StandardMaterial[] = [];
    for (const team of [1, 2]) {
        const z = team === 1 ? 75 : -75,
            m = new StandardMaterial();
        m.diffuse = team === 1 ? new Color(0.2, 0.5, 0.85) : new Color(0.85, 0.25, 0.3);
        m.update();
        coreMaterials.push(m);
        const core = new Entity(team === 1 ? 'BLUE CROWN CORE' : 'RED CROWN CORE');
        cores.addChild(core);
        core.addComponent('render', { type: 'box', material: m, castShadows: false });
        core.setPosition(0, surface.height(0, z) + 0.15, z);
        core.setLocalScale(6, 0.3, 2);
    }
    let overlay = 'neutral',
        routes = false;
    const panel = document.createElement('details');
    panel.id = 'v2-tools';
    panel.style.cssText =
        'position:fixed;top:6px;left:6px;z-index:25;background:#111e;color:white;padding:6px;font:11px system-ui;max-width:270px;max-height:40vh;overflow:auto;pointer-events:auto';
    panel.innerHTML = `<summary>V2 terrain · developer overlays</summary><p>3v3 only · 4 minor + major placeholders · no new bonuses</p><label>Floor <select><option value="neutral">Surface / lanes</option>${pbr ? '<option value="dirt">Weight: dirt</option><option value="grass">Weight: grass path</option><option value="forest">Weight: forest / moss</option><option value="rock">Weight: exposed rock</option><option value="zones">Material boundaries</option>' : ''}<option value="height">Height samples</option><option value="slope">Slope limit 35°</option><option value="walk">Walkability / collision erosion</option></select></label><br><label><input type="checkbox" data-option="routes"> Routes / both spawns</label><br><label><input type="checkbox" data-option="markers" checked> Camp / major footprints</label><br><label><input type="checkbox" data-option="bounds" checked> Mode gates</label><br><label><input type="checkbox" data-option="camera"> Top-down camera</label><div class="v2-sample"></div>`;
    const focusSelect = document.createElement('select');
    focusSelect.dataset.option = 'focus';
    focusSelect.add(new Option('Camera: follow player', 'player'));
    for (const m of [
        ...surface.metadata.landmarks,
        { id: 'blue-spawn', ...surface.spawn(1, 0) },
        { id: 'red-spawn', ...surface.spawn(2, 0) },
        { id: 'middle-lane', x: 0, z: 0 }
    ])
        focusSelect.add(new Option(`Inspect: ${m.id}`, m.id));
    panel.append(document.createElement('br'), focusSelect);
    const sampleReadout = panel.querySelector('.v2-sample')!;
    document.body.append(panel);
    const recolor = () => {
        const debug = ['neutral', 'dirt', 'grass', 'forest', 'rock', 'zones'].indexOf(overlay);
        if (pbr) {
            pbr.debug(Math.max(0, debug));
            instances.forEach((m, i) => {
                m.material = debug >= 0 ? (i === instances.length - 1 ? pbr.skirt : pbr.mat) : mat;
            });
        }
        for (let k = 0; k < geometry.length - 1; k++) {
            const data = geometry[k],
                colors: number[] = [];
            for (let i = 0; i < data.positions.length; i += 3) {
                const x = data.positions[i],
                    y = data.positions[i + 1],
                    z = data.positions[i + 2];
                if (overlay === 'walk')
                    colors.push(...(surface.walkable(x, z) ? [0.25, 0.65, 0.5, 1] : [0.65, 0.22, 0.24, 1]));
                else if (overlay === 'height') colors.push(0.2 + y / 12, 0.3 + y / 18, 0.5, 1);
                else if (overlay === 'slope') {
                    const n = data.normals[i + 1],
                        steep = Math.acos(Math.min(1, n)) / ((35 * Math.PI) / 180);
                    colors.push(Math.min(1, steep), 0.65 * (1 - steep / 2), 0.25, 1);
                } else colors.push(...data.colors.slice((i / 3) * 4, (i / 3) * 4 + 4));
            }
            meshes[k].setColors(colors);
            meshes[k].update();
        }
    };
    panel.querySelector('select:not([data-option])')!.addEventListener('change', (event) => {
        overlay = (event.target as HTMLSelectElement).value;
        recolor();
    });
    panel.addEventListener('change', () => {
        routes = panel.querySelector<HTMLInputElement>('[data-option=routes]')!.checked;
        markers.enabled = panel.querySelector<HTMLInputElement>('[data-option=markers]')!.checked;
        bounds.enabled = panel.querySelector<HTMLInputElement>('[data-option=bounds]')!.checked;
    });
    // Precompute route polylines once, never during frame updates.
    const debugRoutes = [1, 2].flatMap((team) =>
        surface.metadata.landmarks.map((m) => surface.route(surface.spawn(team, 0), m))
    );
    const routeColor = new Color(0.9, 0.8, 0.3),
        routeA = new Vec3(),
        routeB = new Vec3();
    const labels = document.createElement('div');
    labels.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8';
    document.body.append(labels);
    const labelNodes = surface.metadata.landmarks.map((m) => {
        const node = document.createElement('div');
        node.textContent = `${m.id} · ${m.type === 'mobility' ? 'existing Mobility' : 'INACTIVE'}`;
        node.style.cssText = 'position:absolute;font:10px system-ui;color:#eee;background:#111b;padding:2px';
        labels.append(node);
        return node;
    });
    return {
        ready: Promise.all([pbr?.ready, enclosure?.ready]),
        get loading() {
            return pbr?.diagnostics.state === 'loading' || (enclosure?.loading ?? false);
        },
        get topDown() {
            return panel.querySelector<HTMLInputElement>('[data-option=camera]')!.checked;
        },
        get focus() {
            const id = focusSelect.value;
            if (id === 'player') return null;
            return (
                surface.metadata.landmarks.find((m) => m.id === id) ||
                (id === 'blue-spawn' ? surface.spawn(1, 0) : id === 'red-spawn' ? surface.spawn(2, 0) : { x: 0, z: 0 })
            );
        },
        get diagnostics() {
            return {
                mode: 'solrahn-v2',
                state: pbr?.diagnostics.state ?? 'loaded',
                materials: pbr?.diagnostics,
                enclosure: enclosure?.diagnostics,
                surface: surface.metadata,
                allocations: {
                    textures: app.stats.vram.tex,
                    vertexBuffers: app.stats.vram.vb,
                    indexBuffers: app.stats.vram.ib
                },
                drawCalls: app.stats.drawCalls.total,
                triangles: surface.metadata.totalTriangles,
                meshInstances: meshes.length,
                terrainGpuBytes: geometry.reduce(
                    (sum, c) =>
                        sum +
                        c.positions.length * 4 +
                        c.normals.length * 4 +
                        c.colors.length * 4 +
                        (pbr ? (c.positions.length / 3) * 24 : 0) +
                        c.indices.length * 2,
                    0
                ),
                activeObjectives: surface.camps,
                inactiveObjectives: surface.futureObjectives,
                navigation: surface.navigationStats,
                overlay,
                cameraFocus: focusSelect.value
            };
        },
        quality(low: boolean) {
            pbr?.quality(low);
        },
        groundActor(_parent: Entity) {
            /* Scene uses the shared triangle-plane sampler. */
        },
        update(_active: boolean) {
            if (routes)
                for (const path of debugRoutes)
                    for (let i = 1; i < path.length; i++) {
                        const a = path[i - 1],
                            b = path[i];
                        app.drawLine(
                            routeA.set(a.x, surface.height(a.x, a.z) + 0.15, a.z),
                            routeB.set(b.x, surface.height(b.x, b.z) + 0.15, b.z),
                            routeColor
                        );
                    }
        },
        projectLabels(
            project: (p: { x: number; z: number }, height: number) => { x: number; y: number; z: number },
            x: number,
            z: number
        ) {
            labelNodes.forEach((node, i) => {
                const p = project(surface.metadata.landmarks[i], 0.3);
                node.style.display = markers.enabled && p.z > 0 ? 'block' : 'none';
                node.style.left = `${p.x}px`;
                node.style.top = `${p.y}px`;
            });
            if (panel.open)
                sampleReadout.textContent = `x ${x.toFixed(1)} / z ${z.toFixed(1)} / y ${surface.height(x, z).toFixed(3)}m / ${surface.walkable(x, z) ? 'walkable' : 'blocked'}`;
        },
        destroy() {
            panel.remove();
            labels.remove();
            enclosure?.destroy();
            root.destroy();
            for (const mesh of meshes) mesh.destroy();
            pbr?.destroy();
            mat.destroy();
            markerMat.destroy();
            gateMat.destroy();
            gateMesh.destroy();
            for (const m of coreMaterials) m.destroy();
        }
    };
}
