import {
    Color,
    Entity,
    Mesh,
    MeshInstance,
    StandardMaterial,
    SEMANTIC_TANGENT,
    calculateNormals,
    calculateTangents,
    BLEND_NORMAL
} from 'playcanvas';
import type { AppBase } from 'playcanvas';

import { createLaneGeometry } from './lane-geometry';
import type { SummonerAssets } from './summoner-assets';
import { terrainTextures } from './terrain-textures';
import { createWildernessEnvironment } from './wilderness-environment';

// Six shared 1K maps; AR packs linear AO (R) and roughness (G).
// All images in a set have the same orientation, repeat scale and mip filtering.
export function createLaneEnvironment(app: AppBase, parent: Entity, characters: SummonerAssets) {
    const data = createLaneGeometry();
    const root = new Entity('packed-earth-environment');
    parent.addChild(root);
    const maps = terrainTextures(app, 'assets/environment/polyhaven');
    const { textures, loading } = maps;
    const loadMap = maps.load;
    const materials: StandardMaterial[] = [];
    let destroyed = false;
    const pending: Promise<void>[] = [];
    const makeMaterial = (name: string) => {
        const albedo = loadMap(`${name}_albedo_1k.webp`, true);
        const normal = loadMap(`${name}_normal_1k.webp`, false);
        const ar = loadMap(`${name}_ar_1k.png`, false);
        pending.push(albedo.ready, normal.ready, ar.ready);
        const mat = new StandardMaterial();
        mat.name = `polyhaven-${name}-pbr`;
        mat.diffuse = name === 'dirt' ? new Color(1, 1, 1) : new Color(0.72, 0.76, 0.79);
        mat.diffuseVertexColor = true;
        mat.diffuseMap = albedo.texture;
        mat.normalMap = normal.texture;
        mat.bumpiness = 0.85;
        mat.glossMap = ar.texture;
        mat.glossMapChannel = 'g';
        mat.gloss = 1;
        mat.glossInvert = true;
        mat.aoMap = ar.texture;
        mat.aoMapChannel = 'r';
        mat.aoIntensity = 0.75;
        mat.useMetalness = true;
        mat.metalness = 0;
        mat.update();
        materials.push(mat);
        return mat;
    };
    const dirt = makeMaterial('dirt');
    const rock = makeMaterial('dry_ground_rocks');
    // Keep prematch/countdown and isolated character diagnostics on Goal 009's
    // rendering budget. Optional scenery begins after character imports settle.
    let wilderness: ReturnType<typeof createWildernessEnvironment> | null = null;
    let preparingWilderness = false;
    const params = new URLSearchParams(location.search);
    const wildernessEnabled = params.get('models') !== 'primitive' && params.get('summonerModels') !== 'local';
    const shoulder = rock.clone();
    shoulder.name = 'rocky-soil-feather';
    shoulder.opacityVertexColor = true;
    shoulder.opacityVertexColorChannel = 'a';
    shoulder.blendType = BLEND_NORMAL;
    shoulder.depthWrite = false;
    shoulder.update();
    materials.push(shoulder);
    const ready = Promise.all(pending);
    void ready.then(
        () => {
            if (!destroyed) loading.state = 'loaded';
        },
        (error: unknown) => {
            if (!destroyed) {
                loading.state = 'error';
                loading.error = String(error);
            }
        }
    );
    const meshes: Mesh[] = [];
    for (const b of data.batches) {
        const mesh = new Mesh(app.graphicsDevice);
        const normals = calculateNormals(b.positions, b.indices);
        mesh.setPositions(b.positions);
        mesh.setNormals(normals);
        mesh.setColors(b.colors);
        mesh.setUvs(0, b.uvs);
        mesh.setVertexStream(SEMANTIC_TANGENT, calculateTangents(b.positions, normals, b.uvs, b.indices), 4);
        mesh.setIndices(b.indices);
        mesh.update();
        meshes.push(mesh);
        const e = new Entity(b.name);
        const mat = b.surface === 'dirt' ? dirt : b.surface === 'shoulder' ? shoulder : rock;
        e.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, mat)],
            castShadows: false,
            receiveShadows: false
        });
        root.addChild(e);
    }
    // Analytic soft contact discs, shared by all actors. No shadow-map pass or
    // full-scene caster traversal; team markers sit above these subtle contacts.
    const contactMesh = new Mesh(app.graphicsDevice);
    const cp = [0, 0.006, 0],
        cc = [0, 0, 0, 0.38],
        ci: number[] = [];
    for (const [radius, alpha] of [
        [0.42, 0.28],
        [0.9, 0]
    ]) {
        for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            cp.push(Math.cos(a) * radius, 0.006, -Math.sin(a) * radius);
            cc.push(0, 0, 0, alpha);
        }
    }
    for (let i = 0; i < 24; i++) {
        const a = 1 + i,
            b = 1 + ((i + 1) % 24);
        ci.push(0, a, b, a, a + 24, b + 24, a, b + 24, b);
    }
    contactMesh.setPositions(cp);
    contactMesh.setColors(cc);
    contactMesh.setIndices(ci);
    contactMesh.update();
    const contactMaterial = new StandardMaterial();
    contactMaterial.name = 'soft-ground-contact';
    contactMaterial.useLighting = false;
    contactMaterial.diffuse = new Color(0.025, 0.019, 0.012);
    contactMaterial.opacityVertexColor = true;
    contactMaterial.opacityVertexColorChannel = 'a';
    contactMaterial.blendType = BLEND_NORMAL;
    contactMaterial.depthWrite = false;
    contactMaterial.update();
    materials.push(contactMaterial);
    const diagnostics = {
        mode: 'carved',
        get normalMappedSurfaces() {
            return materials.filter((mat) => !!mat.normalMap).length;
        },
        get occlusionMappedSurfaces() {
            return materials.filter((mat) => !!mat.aoMap).length;
        },
        get wilderness() {
            return wilderness?.diagnostics ?? { state: preparingWilderness ? 'loading' : 'idle' };
        },
        surface: 'polyhaven-packed-earth',
        batches: meshes.length,
        vertices: data.batches.reduce((n, b) => n + b.positions.length / 3, 0),
        triangles: data.batches.reduce((n, b) => n + b.indices.length / 3, 0),
        pavingSlabs: data.slabs,
        textureBytes: 6 * 5592404,
        textureMaps: 6,
        materials: loading,
        tangentBasis: true,
        raisedRelief: 'existing-obstacle-footprints-and-outside-map-only',
        footingRange: [-0.018, 0.024]
    };
    return {
        diagnostics,
        get loading() {
            return wilderness?.loading ?? false;
        },
        ready,
        quality(low: boolean) {
            for (const mat of [dirt, rock, shoulder]) {
                mat.normalMap = low ? null : textures[mat === dirt ? 1 : 4];
                mat.aoMap = low ? null : textures[mat === dirt ? 2 : 5];
                mat.update();
            }
        },
        update(active: boolean) {
            if (!wildernessEnabled || !active || preparingWilderness) return;
            preparingWilderness = true;
            void characters.settled().then(() => {
                if (destroyed) return;
                wilderness = createWildernessEnvironment(app, root, rock, characters);
                wilderness.update(true);
            });
        },
        groundActor(parent: Entity) {
            const contact = new Entity('soft-ground-contact');
            contact.addComponent('render', {
                meshInstances: [new MeshInstance(contactMesh, contactMaterial)],
                castShadows: false,
                receiveShadows: false
            });
            parent.addChild(contact);
        },
        destroy() {
            destroyed = true;
            wilderness?.destroy();
            root.destroy();
            for (const mesh of meshes) mesh.destroy();
            contactMesh.destroy();
            for (const mat of materials) mat.destroy();
            maps.destroy();
        }
    };
}
