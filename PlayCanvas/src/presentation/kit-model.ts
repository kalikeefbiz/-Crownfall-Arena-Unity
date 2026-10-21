import { Asset, BoundingBox, Entity } from 'playcanvas';
import type { AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import { KIT } from '../combat/combat-data.js';
import type { Simulation } from '../gameplay/simulation';

export const KIT_ASSET_PATH = 'assets/summoners/kit/kit-10k-test.glb';
export const KIT_ASSET_BYTES = 5317848;
export const KIT_ASSET_SHA256 = '11f0b6ad226eae565ddaa7e9104ca1aae2a85ecc954203a70fdce23b0adfb547';
export const KIT_HEIGHT = 1.75;
// Source forward is +Z, as is atan2(x, z) in the combat authority.
export const KIT_AUTHORED_FORWARD_YAW = 0;

export function normalizeKitBounds(min: number[], max: number[]) {
    const height = max[1] - min[1];
    if (![...min, ...max, height].every(Number.isFinite) || height <= 0 || max.some((v, i) => v < min[i]))
        throw new Error('Invalid Kit bounds');
    const scale = KIT_HEIGHT / height;
    return {
        height,
        scale,
        offset: [(-(min[0] + max[0]) * scale) / 2, -min[1] * scale, (-(min[2] + max[2]) * scale) / 2]
    };
}

export function createKitModel(app: AppBase, root: Entity, primitive: Entity, competitive: boolean) {
    const forcedPrimitive = new URLSearchParams(location.search).get('kitPrimitive') === '1';
    const pivot = new Entity('Kit-3D-facing');
    root.addChild(pivot);
    let model: Entity | null = null;
    let asset: Asset | null = null;
    let destroyed = false;
    let yaw = 180;
    let selected = false;
    let player: Simulation['combat']['player'] | null = null;
    const metrics = {
        state: 'idle' as 'idle' | 'loading' | 'loaded' | 'error',
        bytes: KIT_ASSET_BYTES,
        loadMs: 0,
        error: '',
        bounds: null as null | { min: number[]; max: number[] },
        height: 0,
        scale: 1,
        offset: [0, 0, 0],
        meshInstances: 0,
        authoredForwardYaw: KIT_AUTHORED_FORWARD_YAW
    };
    const start = () => {
        metrics.state = 'loading';
        const started = performance.now();
        asset = new Asset('Kit static 10K', 'container', { url: `${import.meta.env.BASE_URL}${KIT_ASSET_PATH}` });
        asset.once('error', () => {
            if (destroyed) return;
            metrics.state = 'error';
            metrics.error = 'Kit unavailable; using primitive';
            metrics.loadMs = performance.now() - started;
        });
        asset.once('load', () => {
            if (destroyed) return;
            let instance: Entity | null = null;
            try {
                instance = (asset!.resource as ContainerResource).instantiateRenderEntity();
                // Detached identity hierarchy: bounds are not contaminated by player position/yaw.
                const meshes = (instance.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances);
                if (!meshes.length) throw new Error('Empty Kit');
                const bounds = new BoundingBox();
                bounds.copy(meshes[0].aabb);
                for (const mesh of meshes.slice(1)) bounds.add(mesh.aabb);
                const min = bounds.getMin().toArray();
                const max = bounds.getMax().toArray();
                const normalized = normalizeKitBounds(min, max);
                instance.setLocalScale(normalized.scale, normalized.scale, normalized.scale);
                instance.setLocalPosition(...(normalized.offset as [number, number, number]));
                pivot.addChild(instance);
                model = instance;
                Object.assign(metrics, normalized, {
                    bounds: { min, max },
                    meshInstances: meshes.length,
                    state: 'loaded',
                    loadMs: performance.now() - started
                });
            } catch {
                instance?.destroy();
                metrics.state = 'error';
                metrics.error = 'Kit bounds/import invalid; using primitive';
            }
        });
        app.assets.add(asset);
        app.assets.load(asset);
    };
    return {
        update(sim: Simulation) {
            if (player !== sim.combat.player) {
                player = sim.combat.player;
                yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            }
            selected = competitive && sim.combat.definition.id === KIT.id && !forcedPrimitive;
            if (selected && sim.match && sim.match.phase !== 'prematch' && metrics.state === 'idle') start();
            const owner = sim.facing.owner;
            if (owner === 'aim') yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            else if (owner === 'commit') yaw = (sim.combat.committedAngle * 180) / Math.PI;
            else if (owner === 'movement') yaw = (Math.atan2(sim.movement.x, sim.movement.z) * 180) / Math.PI;
            pivot.setLocalEulerAngles(0, yaw + KIT_AUTHORED_FORWARD_YAW, 0);
            pivot.enabled = selected && !!model;
            primitive.enabled = !pivot.enabled;
        },
        snapshot() {
            const p = pivot.getPosition();
            const meshes = model
                ? (model.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances)
                : [];
            const worldBounds = meshes.length ? new BoundingBox() : null;
            if (worldBounds) {
                worldBounds.copy(meshes[0].aabb);
                for (const mesh of meshes.slice(1)) worldBounds.add(mesh.aabb);
            }
            return {
                ...metrics,
                worldBounds: worldBounds
                    ? { min: worldBounds.getMin().toArray(), max: worldBounds.getMax().toArray() }
                    : null,
                selected,
                forcedPrimitive,
                visible: pivot.enabled && !!model && root.enabled,
                primitiveVisible: primitive.enabled,
                yaw,
                position: { x: p.x, y: p.y, z: p.z },
                rootScale: root.getLocalScale().toArray()
            };
        },
        destroy() {
            destroyed = true;
            pivot.destroy();
            if (asset) {
                app.assets.remove(asset);
                asset.unload();
            }
        }
    };
}
