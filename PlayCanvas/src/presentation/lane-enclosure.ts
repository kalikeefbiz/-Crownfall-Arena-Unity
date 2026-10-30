import { BoundingBox, Entity, MeshInstance, VertexBuffer, VertexFormat, BUFFER_STATIC } from 'playcanvas';
import type { AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import type { SolrahnV2 } from '../maps/solrahn-v2';

import { ENCLOSURE_ROCKS, ENCLOSURE_SECTION, ENCLOSURE_TREES } from './lane-enclosure-layout';
import { SummonerAssets } from './summoner-assets';
import { TREE_SPECIES } from './wilderness-layout';

// Container owner and mesh/material sharing follow the approved Wilderness loader.
// Deliberately no terrain patches, per-frame work, shadows, physics or nav objects.
export function createLaneEnclosure(app: AppBase, parent: Entity, surface: SolrahnV2, characters: SummonerAssets) {
    const root = new Entity('goal018a-middle-lane-enclosure');
    parent.addChild(root);
    const cache = new SummonerAssets(app);
    const instances: { name: string; position: number[]; meshId: number; materialId: number }[] = [];
    const diagnostics = {
        state: 'loading',
        error: '',
        section: ENCLOSURE_SECTION,
        rocks: ENCLOSURE_ROCKS.length,
        trees: ENCLOSURE_TREES.length,
        instances,
        get resources() {
            return cache.snapshot();
        }
    };
    let destroyed = false;
    const renderParts: MeshInstance[] = [];
    const instanceBuffers: VertexBuffer[] = [];
    const parts = (model: Entity) =>
        (model.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances);
    const record = (model: Entity, pivot: Entity) => {
        for (const component of model.findComponents('render') as RenderComponent[]) {
            component.castShadows = false;
            component.receiveShadows = false;
        }
        for (const part of parts(model)) {
            part.castShadow = false;
            renderParts.push(part);
            instances.push({
                name: pivot.name,
                position: pivot.getPosition().toArray(),
                meshId: part.mesh!.id,
                materialId: part.material!.id
            });
        }
    };
    const ready = (async () => {
        // Run after synchronous character requests have entered their shared cache.
        await Promise.resolve();
        await characters.settled();
        if (destroyed) return;
        for (const name of ['rock_face_02', 'rock_moss_set_02']) {
            const asset = await cache.load(`assets/environment/stones/mobile/${name}.glb`);
            if (destroyed) return;
            const library = (asset.resource as ContainerResource).instantiateRenderEntity();
            for (const p of ENCLOSURE_ROCKS.filter((p) => p.variant.startsWith(name))) {
                const original = library.findByName(p.variant) as Entity | null;
                if (!original) throw new Error(`Missing enclosure mesh: ${p.variant}`);
                const model = original.clone();
                const pivot = new Entity(p.variant);
                root.addChild(pivot);
                pivot.setLocalPosition(p.x, surface.height(p.x, p.z) - p.embed, p.z);
                pivot.setLocalEulerAngles(0, p.yaw, p.variant === 'rock_face_02' ? (p.x < 0 ? 24 : -24) : 0);
                pivot.setLocalScale(p.scale, p.scale, p.scale);
                pivot.addChild(model);
                record(model, pivot);
            }
            library.destroy();
        }
        for (const species of [...new Set(ENCLOSURE_TREES.map((p) => p.species))]) {
            const asset = await cache.load(`assets/environment/trees/mobile/${TREE_SPECIES[species]}`);
            if (destroyed) return;
            const container = asset.resource as ContainerResource;
            let bounds: BoundingBox | null = null;
            for (const p of ENCLOSURE_TREES.filter((p) => p.species === species)) {
                const model = container.instantiateRenderEntity();
                if (!bounds) {
                    bounds = new BoundingBox();
                    parts(model).forEach((part, i) => {
                        const b = new BoundingBox();
                        b.setFromTransformedAabb(part.mesh!.aabb, part.node.getWorldTransform());
                        if (i === 0) bounds!.copy(b);
                        else bounds!.add(b);
                    });
                }
                const min = bounds.getMin(),
                    max = bounds.getMax(),
                    scale = p.height / (max.y - min.y);
                const pivot = new Entity(`enclosure-${species}`);
                root.addChild(pivot);
                pivot.setLocalPosition(p.x, surface.height(p.x, p.z) - 0.12, p.z);
                pivot.setLocalEulerAngles(0, p.yaw, 0);
                pivot.addChild(model);
                model.setLocalScale(scale, scale, scale);
                model.setLocalPosition((-(min.x + max.x) * scale) / 2, -min.y * scale, (-(min.z + max.z) * scale) / 2);
                record(model, pivot);
            }
        }
        // Static hardware instances: one world-matrix buffer per repeated mesh.
        // The batch node is identity; aggregate bounds retain normal frustum culling.
        const groups = new Map<string, MeshInstance[]>();
        for (const part of renderParts) {
            const key = `${part.mesh!.id}/${part.material!.id}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(part);
        }
        for (const group of groups.values()) {
            if (group.length < 2) continue;
            const matrices = new Float32Array(group.length * 16);
            const bounds = group[0].aabb.clone();
            group.forEach((part, i) => {
                matrices.set(part.node.getWorldTransform().data, i * 16);
                bounds.add(part.aabb);
                part.visible = false;
            });
            const buffer = new VertexBuffer(
                app.graphicsDevice,
                VertexFormat.getDefaultInstancingFormat(app.graphicsDevice),
                group.length,
                { usage: BUFFER_STATIC, data: matrices }
            );
            instanceBuffers.push(buffer);
            const entity = new Entity('enclosure-static-instances');
            root.addChild(entity);
            const instance = new MeshInstance(group[0].mesh!, group[0].material!, entity);
            instance.setInstancing(buffer, true);
            entity.addComponent('render', { meshInstances: [instance], castShadows: false, receiveShadows: false });
            // Attachment initializes mesh-instance bounds; set the aggregate afterwards.
            entity.render!.customAabb = bounds;
        }
        if (!destroyed) diagnostics.state = 'loaded';
    })();
    // Preserve an inspectable failure without an unhandled rejection during disposal.
    void ready.catch((error: unknown) => {
        if (!destroyed) {
            diagnostics.state = 'error';
            diagnostics.error = String(error);
        }
    });
    return {
        ready,
        diagnostics,
        get loading() {
            return diagnostics.state === 'loading';
        },
        destroy() {
            destroyed = true;
            root.destroy();
            instanceBuffers.forEach((buffer) => buffer.destroy());
            cache.destroy();
        }
    };
}
