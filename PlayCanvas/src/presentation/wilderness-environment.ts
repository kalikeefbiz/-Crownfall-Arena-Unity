import {
    BoundingBox,
    Entity,
    Mesh,
    MeshInstance,
    StandardMaterial,
    Texture,
    SEMANTIC_TANGENT,
    calculateNormals,
    calculateTangents,
    ADDRESS_REPEAT,
    BLEND_NORMAL,
    FILTER_LINEAR_MIPMAP_LINEAR,
    CULLFACE_NONE
} from 'playcanvas';
import type { AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import { SummonerAssets } from './summoner-assets';
import { TREE_SPECIES, WILDERNESS_TREES, westernBankHeight } from './wilderness-layout';

// Shared resources per species; no cloned textures, collider or navigation data.
export function createWildernessEnvironment(
    app: AppBase,
    parent: Entity,
    rock: StandardMaterial,
    characters: SummonerAssets
) {
    const root = new Entity('western-wilderness-showcase');
    parent.addChild(root);
    const cache = new SummonerAssets(app);
    const textures: Texture[] = [],
        materials: StandardMaterial[] = [],
        meshes: Mesh[] = [];
    const renderParts: MeshInstance[] = [];
    const instances: { species: string; height: number; position: number[]; meshId: number; materialId: number }[] = [];
    let destroyed = false;
    const diagnostics = {
        state: 'idle',
        error: '',
        trees: instances,
        species: 4,
        textureResolution: 512,
        textureBytes: 12 * 1398100 + 6 * 1398100,
        groundMaps: 0,
        groundBatches: 0,
        grassTriangles: 0,
        solidPlacement: 'outside-western-movement-boundary',
        get resources() {
            return cache.snapshot();
        }
    };
    const pending: Promise<unknown>[] = [];
    const groundMaterial = (name: string) => {
        const mat = new StandardMaterial();
        const load = (suffix: string, srgb: boolean) => {
            const texture = new Texture(app.graphicsDevice, {
                name: `${name}-${suffix}`,
                width: 512,
                height: 512,
                srgb,
                flipY: true,
                mipmaps: true,
                addressU: ADDRESS_REPEAT,
                addressV: ADDRESS_REPEAT,
                minFilter: FILTER_LINEAR_MIPMAP_LINEAR
            });
            textures.push(texture);
            const image = new Image();
            pending.push(
                new Promise<void>((resolve, reject) => {
                    image.onload = () => {
                        if (!destroyed) {
                            texture.setSource(image);
                            diagnostics.groundMaps++;
                        }
                        resolve();
                    };
                    image.onerror = () => reject(new Error(`Wilderness map unavailable: ${name}-${suffix}`));
                })
            );
            image.src = `${import.meta.env.BASE_URL}assets/environment/polyhaven/${name}_${suffix}`;
            return texture;
        };
        mat.name = `woodland-${name}`;
        mat.diffuseMap = load('albedo_512.webp', true);
        mat.normalMap = load('normal_512.webp', false);
        mat.glossMap = mat.aoMap = load('ar_512.png', false);
        mat.glossMapChannel = 'g';
        mat.aoMapChannel = 'r';
        mat.glossInvert = true;
        mat.gloss = 1;
        mat.useMetalness = true;
        mat.metalness = 0;
        mat.bumpiness = 0.55;
        mat.diffuseVertexColor = true;
        mat.opacityVertexColor = true;
        mat.opacityVertexColorChannel = 'a';
        mat.blendType = BLEND_NORMAL;
        mat.depthWrite = false;
        mat.update();
        materials.push(mat);
        return mat;
    };
    const grass = groundMaterial('sparse_grass'),
        litter = groundMaterial('forest_leaves_02');
    type Batch = { p: number[]; uv: number[]; c: number[]; i: number[] };
    const batch = (): Batch => ({ p: [], uv: [], c: [], i: [] });
    const grassy = batch(),
        leaves = batch(),
        stones = batch(),
        blades = batch();
    const vertex = (b: Batch, x: number, y: number, z: number, alpha: number, color = [0.84, 0.88, 0.77]) => {
        const n = b.p.length / 3;
        b.p.push(x, y, z);
        b.uv.push((x + Math.sin(z * 0.7) * 0.2) / 3, -z / 3);
        b.c.push(...color, alpha);
        return n;
    };
    // Conforming radial subdivisions follow the bank relief, including its
    // creases. Vertex alpha feathers irregular edges into the Goal 009 soil.
    const groundY = (x: number, z: number) => (x < -32 ? westernBankHeight(x, z) : 0);
    const patch = (b: Batch, x: number, z: number, rx: number, rz: number, phase: number) => {
        const base = vertex(b, x, groundY(x, z) + 0.035, z, 0.9);
        for (let ring = 1; ring <= 10; ring++)
            for (let k = 0; k < 20; k++) {
                const a = (k * Math.PI) / 10,
                    fraction = ring / 10;
                const r = fraction * (1 + 0.14 * Math.sin(a * 3 + phase) + 0.09 * Math.cos(a * 7 - phase));
                const px = x + Math.cos(a) * rx * r,
                    pz = z - Math.sin(a) * rz * r;
                vertex(
                    b,
                    px,
                    groundY(px, pz) + 0.035,
                    pz,
                    fraction < 0.7 ? 0.9 : Math.max(0, (1 - fraction) / 0.3) * 0.9
                );
            }
        for (let k = 0; k < 20; k++) b.i.push(base, base + 1 + k, base + 1 + ((k + 1) % 20));
        for (let ring = 0; ring < 9; ring++)
            for (let k = 0; k < 20; k++) {
                const a = base + 1 + ring * 20 + k,
                    n = base + 1 + ring * 20 + ((k + 1) % 20);
                b.i.push(a, a + 20, n + 20, a, n + 20, n);
            }
    };
    // Low ground cover carries the grove into the outer Wilderness shoulder.
    // Routes and camps remain entirely traversable and the main lane stays bare.
    for (const [i, p] of [
        [-30.3, -9, 1.7, 3.4],
        [-29.8, 5.5, 1.9, 2.7],
        [-25.4, -14, 2.3, 1.2],
        [-21, -11.5, 0.9, 2.1]
    ].entries())
        patch(grassy, p[0], p[1], p[2], p[3], i * 2.3);
    for (const [i, t] of WILDERNESS_TREES.entries()) {
        patch(i % 3 === 0 ? leaves : grassy, t.x + 0.4, t.z, 1.9, 2.8, i * 1.7);
        if (i % 2 === 0) patch(grassy, -33.1, t.z + 1.6, 0.85, 2.3, i);
    }
    // Low relief rocks stay outside the existing movement limit, framing the grove.
    for (const [i, z] of [-19, -15, -7.2, -3.8, 5, 11.2, 14].entries()) {
        const x = -33.7 - (i % 3) * 0.45,
            y = westernBankHeight(x, z);
        const start = stones.p.length / 3;
        const rx = 0.75 + (i % 2) * 0.35,
            rz = 1.1 + (i % 3) * 0.25,
            h = 0.55 + (i % 3) * 0.23;
        for (const ring of [0, 1])
            for (let k = 0; k < 7; k++) {
                const a = (k * Math.PI * 2) / 7;
                vertex(
                    stones,
                    x + Math.cos(a) * rx * (ring ? 0.65 : 1),
                    y + (ring ? h : -0.25),
                    z - Math.sin(a) * rz * (ring ? 0.7 : 1),
                    1,
                    [0.69, 0.75, 0.68]
                );
            }
        const top = vertex(stones, x - 0.2, y + h * 1.25, z, 1, [0.77, 0.81, 0.72]);
        for (let k = 0; k < 7; k++) {
            const a = start + k,
                n = start + ((k + 1) % 7);
            stones.i.push(a, n, n + 7, a, n + 7, a + 7, a + 7, n + 7, top);
        }
        // Moss uses the grass scan on small irregular upper rock facets.
        const a = vertex(grassy, x - rx * 0.4, y + h + 0.025, z - rz * 0.3, 0.55);
        vertex(grassy, x - 0.2, y + h * 1.25 + 0.025, z, 0.8);
        vertex(grassy, x + rx * 0.4, y + h + 0.025, z + rz * 0.4, 0);
        grassy.i.push(a, a + 1, a + 2);
    }
    // A single tiny opaque batch: sparse blade fans only on the outer bank.
    for (let k = 0; k < 80; k++) {
        const z = -24 + k * 0.52 + Math.sin(k * 4.2) * 0.7,
            x = -33.2 - Math.sin(k * 1.7) ** 2 * 1.6;
        const y = westernBankHeight(x, z) + 0.025,
            h = 0.12 + (k % 5) * 0.027;
        for (let j = 0; j < 3; j++) {
            const a = j * 2.1 + k,
                dx = Math.cos(a) * 0.055,
                dz = Math.sin(a) * 0.055;
            const n = vertex(blades, x - dx, y, z - dz, 1, [0.21, 0.28, 0.095]);
            vertex(blades, x + dx, y, z + dz, 1, [0.28, 0.35, 0.12]);
            vertex(blades, x + dx * 2, y + h, z + dz * 2, 1, [0.45, 0.49, 0.21]);
            blades.i.push(n, n + 1, n + 2);
        }
    }
    const bladeMat = new StandardMaterial();
    bladeMat.diffuseVertexColor = true;
    bladeMat.cull = CULLFACE_NONE;
    bladeMat.update();
    materials.push(bladeMat);
    for (const [b, mat, name] of [
        [grassy, grass, 'moss-and-sparse-grass'],
        [leaves, litter, 'leaf-litter'],
        [stones, rock, 'grove-rocks'],
        [blades, bladeMat, 'sparse-blade-fans']
    ] as const) {
        const mesh = new Mesh(app.graphicsDevice);
        const normals = calculateNormals(b.p, b.i);
        mesh.setPositions(b.p);
        mesh.setNormals(normals);
        mesh.setColors(b.c);
        mesh.setUvs(0, b.uv);
        mesh.setVertexStream(SEMANTIC_TANGENT, calculateTangents(b.p, normals, b.uv, b.i), 4);
        mesh.setIndices(b.i);
        mesh.update();
        meshes.push(mesh);
        const entity = new Entity(name);
        entity.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat)],
            castShadows: false,
            receiveShadows: false
        });
        root.addChild(entity);
        renderParts.push(...entity.render!.meshInstances);
    }
    diagnostics.groundBatches = meshes.length;
    diagnostics.grassTriangles = blades.i.length / 3;
    const groundReady = Promise.all(pending);
    void groundReady.catch((e: unknown) => {
        if (!destroyed) {
            diagnostics.state = 'error';
            diagnostics.error = String(e);
        }
    });
    pending.length = 0;
    // Upload every static draw's buffers once, including temporarily culled
    // props. Loaded means GPU resources have seen a completed render, so later
    // camera movement/rematches do not lazily grow the uniform-buffer cache.
    const rendered = () => {
        if (destroyed) return;
        for (const part of renderParts) part.cull = true;
        diagnostics.state = 'loaded';
    };
    const params = new URLSearchParams(location.search);
    const enabled = params.get('models') !== 'primitive' && params.get('summonerModels') !== 'local';
    const start = () => {
        diagnostics.state = 'loading';
        void characters.settled().then(() => {
            if (destroyed) return;
            for (const [species, file] of Object.entries(TREE_SPECIES)) {
                pending.push(
                    cache.load(`assets/environment/trees/mobile/${file}`).then((asset) => {
                        if (destroyed) return;
                        const container = asset.resource as ContainerResource;
                        let bounds: BoundingBox | null = null;
                        for (const placement of WILDERNESS_TREES.filter((t) => t.species === species)) {
                            const model = container.instantiateRenderEntity();
                            const parts = (model.findComponents('render') as RenderComponent[]).flatMap(
                                (c) => c.meshInstances
                            );
                            if (!bounds) {
                                bounds = new BoundingBox();
                                parts.forEach((part, i) => {
                                    const b = new BoundingBox();
                                    b.setFromTransformedAabb(part.mesh!.aabb, part.node.getWorldTransform());
                                    if (i === 0) bounds!.copy(b);
                                    else bounds!.add(b);
                                });
                            }
                            const min = bounds.getMin(),
                                max = bounds.getMax();
                            const scale = placement.height / (max.y - min.y);
                            const pivot = new Entity(`woodland-${species}`);
                            root.addChild(pivot);
                            pivot.setLocalPosition(
                                placement.x,
                                westernBankHeight(placement.x, placement.z) - 0.06,
                                placement.z
                            );
                            pivot.setLocalEulerAngles(0, placement.yaw, 0);
                            model.setLocalScale(scale, scale, scale);
                            model.setLocalPosition(
                                (-(min.x + max.x) * scale) / 2,
                                -min.y * scale,
                                (-(min.z + max.z) * scale) / 2
                            );
                            pivot.addChild(model);
                            for (const part of parts) part.castShadow = false;
                            renderParts.push(...parts);
                            instances.push({
                                species,
                                height: placement.height,
                                position: pivot.getPosition().toArray(),
                                meshId: parts[0].mesh!.id,
                                materialId: parts[0].material!.id
                            });
                        }
                    })
                );
            }
            void Promise.all([...pending, groundReady]).then(
                () => {
                    if (destroyed) return;
                    for (const part of renderParts) part.cull = false;
                    app.once('postrender', rendered);
                },
                (e: unknown) => {
                    if (!destroyed) {
                        diagnostics.state = 'error';
                        diagnostics.error = String(e);
                    }
                }
            );
        });
    };
    return {
        diagnostics,
        update(active: boolean) {
            if (enabled && active && diagnostics.state === 'idle') start();
        },
        destroy() {
            destroyed = true;
            app.off('postrender', rendered);
            root.destroy();
            cache.destroy();
            meshes.forEach((m) => m.destroy());
            materials.forEach((m) => m.destroy());
            textures.forEach((t) => t.destroy());
        }
    };
}
