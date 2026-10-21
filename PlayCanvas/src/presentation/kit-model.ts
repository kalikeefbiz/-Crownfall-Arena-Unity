import { Asset, BoundingBox, Entity } from 'playcanvas';
import type { AnimTrack, AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import { KIT } from '../combat/combat-data.js';
import type { Simulation } from '../gameplay/simulation';

import { attachKitAnimations, KitAnimationState } from './kit-animation';

export const KIT_STATIC_PATH = 'assets/summoners/kit/kit-10k-test.glb';
export const KIT_ASSET_PATH = 'assets/summoners/kit/Kit_20K_Animated.glb';
export const KIT_ASSET_BYTES = 26939896;
export const KIT_ASSET_SHA256 = 'b111e1f774b0483b78f45e43413515adb02e501941c5c99a995d09a43f96212f';
export const KIT_HEIGHT = 1.75;
// Offline skinning of the supplied Idle_5 (61 samples) gives min Y -0.05264644
// after bind-height normalization. Fixed idle-reference correction, never per-frame bounds.
export const KIT_IDLE_FLOOR_OFFSET = 0.05264644;
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
    const query = new URLSearchParams(location.search);
    const forcedPrimitive = query.get('kitPrimitive') === '1';
    const staticComparison = query.get('kitModel') === '10k';
    const source = staticComparison ? KIT_STATIC_PATH : KIT_ASSET_PATH;
    const animation = new KitAnimationState();
    let previousX = 0,
        previousZ = 0;
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
        bytes: staticComparison ? 5317848 : KIT_ASSET_BYTES,
        source,
        clips: [] as { name: string; duration: number }[],
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
        asset = new Asset(staticComparison ? 'Kit static 10K' : 'Kit animated 20K', 'container', {
            url: `${import.meta.env.BASE_URL}${source}`
        });
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
                // Stable authored bind mesh bounds, not the conservative skinned AABB.
                bounds.setFromTransformedAabb(meshes[0].mesh!.aabb, meshes[0].node.getWorldTransform());
                for (const mesh of meshes.slice(1)) {
                    const part = new BoundingBox();
                    part.setFromTransformedAabb(mesh.mesh!.aabb, mesh.node.getWorldTransform());
                    bounds.add(part);
                }
                const min = bounds.getMin().toArray();
                const max = bounds.getMax().toArray();
                const normalized = normalizeKitBounds(min, max);
                if (!staticComparison) normalized.offset[1] += KIT_IDLE_FLOOR_OFFSET;
                instance.setLocalScale(normalized.scale, normalized.scale, normalized.scale);
                instance.setLocalPosition(...(normalized.offset as [number, number, number]));
                if (!staticComparison) {
                    const tracks = (asset!.resource as ContainerResource).animations.map(
                        (a) => a.resource as AnimTrack
                    );
                    metrics.clips = attachKitAnimations(instance, tracks);
                }
                pivot.addChild(instance);
                model = instance;
                Object.assign(metrics, normalized, {
                    bounds: { min, max },
                    meshInstances: meshes.length,
                    state: 'loaded',
                    loadMs: performance.now() - started
                });
            } catch (error) {
                instance?.destroy();
                metrics.state = 'error';
                metrics.error = `Kit import invalid: ${error instanceof Error ? error.message : 'unknown error'}; using primitive`;
                metrics.loadMs = performance.now() - started;
            }
        });
        app.assets.add(asset);
        app.assets.load(asset);
    };
    return {
        update(sim: Simulation) {
            if (player !== sim.combat.player) {
                player = sim.combat.player;
                animation.reset();
                model?.anim?.baseLayer!.play('Idle_5');
                previousX = player.x;
                previousZ = player.z;
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
            const moving = Math.hypot(player.x - previousX, player.z - previousZ) > 0.0001;
            previousX = player.x;
            previousZ = player.z;
            const alive = !player.dead && sim.match?.phase === 'active';
            const transition = animation.update(sim.combat.now, moving, alive, sim.combat.journal.attempts);
            if (model?.anim) {
                model.anim.playing = selected && !player.dead && sim.match?.phase !== 'results';
                if (transition || model.anim.baseLayer!.activeState !== animation.active)
                    model.anim.baseLayer!.transition(
                        animation.active,
                        animation.active === 'Punch_Combo_1' ? 0.05 : 0.12
                    );
            }
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
                activeAnimation: model?.anim?.baseLayer!.activeState ?? null,
                playbackTime: model?.anim?.baseLayer!.activeStateCurrentTime ?? 0,
                playing: !!model?.anim?.playing && root.enabled && pivot.enabled,
                attackCount: animation.attackCount,
                lastAttackSerial: animation.lastSerial,
                staticComparison,
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
