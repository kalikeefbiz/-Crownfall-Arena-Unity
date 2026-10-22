import { Asset, BoundingBox, Entity } from 'playcanvas';
import type { AnimTrack, AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import type { Simulation } from '../gameplay/simulation';

import { attachRivenAnimations, RivenAnimationState } from './riven-animation';

export const RIVEN_ASSET_PATH = 'assets/summoners/riven/Riven_Animated.glb';
export const RIVEN_ASSET_BYTES = 11170312;
export const RIVEN_ASSET_SHA256 = 'ba2cb5d72eb2bcfe272c59a50b06a594100a5ac3ceac8f6af457c243c6a5de61';
export const RIVEN_HEIGHT = 1.75;
// Fixed idle-reference sole correction from offline inverse-bind skinning.
// Never follow the changing conservative skinned culling bounds.
export const RIVEN_IDLE_FLOOR_OFFSET = 0.035076;
// Authored forward +Z matches the authoritative atan2(x, z) facing convention.
export const RIVEN_AUTHORED_FORWARD_YAW = 0;

export function normalizeRivenBounds(min: number[], max: number[]) {
    const height = max[1] - min[1];
    if (
        min.length !== 3 ||
        max.length !== 3 ||
        ![...min, ...max, height].every(Number.isFinite) ||
        height <= 0 ||
        max.some((v, i) => v < min[i])
    )
        throw new Error('Invalid Riven bounds');
    const scale = RIVEN_HEIGHT / height;
    return {
        height,
        scale,
        offset: [(-(min[0] + max[0]) * scale) / 2, -min[1] * scale, (-(min[2] + max[2]) * scale) / 2]
    };
}

export function createRivenModel(app: AppBase, root: Entity, primitive: Entity) {
    const query = new URLSearchParams(location.search);
    const previewEnabled = query.get('rivenPreview') === '1';
    const forcedPrimitive = query.get('rivenPrimitive') === '1';
    const source = RIVEN_ASSET_PATH;
    const animation = new RivenAnimationState();
    let previousX = 0,
        previousZ = 0;
    const pivot = new Entity('Riven-3D-facing');
    root.addChild(pivot);
    let model: Entity | null = null;
    let asset: Asset | null = null;
    let destroyed = false;
    let yaw = 180;
    let selected = false;
    let player: Simulation['combat']['player'] | null = null;
    const metrics = {
        state: 'idle' as 'idle' | 'loading' | 'loaded' | 'error',
        bytes: RIVEN_ASSET_BYTES,
        source,
        clips: [] as { name: string; duration: number }[],
        registeredStates: [] as string[],
        runningClip: 'Running' as 'Running' | 'run_fast_7',
        locomotionReason: '',
        preferredLoop: null as null | { valid: boolean; positionError: number; rotationErrorDegrees: number },
        loadMs: 0,
        error: '',
        bounds: null as null | { min: number[]; max: number[] },
        height: 0,
        scale: 1,
        offset: [0, 0, 0],
        meshInstances: 0,
        jointCount: 0,
        authoredForwardYaw: RIVEN_AUTHORED_FORWARD_YAW
    };
    const start = () => {
        metrics.state = 'loading';
        const started = performance.now();
        asset = new Asset('Riven animated', 'container', {
            url: `${import.meta.env.BASE_URL}${source}`
        });
        asset.once('error', () => {
            if (destroyed) return;
            metrics.state = 'error';
            metrics.error = 'Riven unavailable; using primitive';
            metrics.loadMs = performance.now() - started;
        });
        asset.once('load', () => {
            if (destroyed) return;
            let instance: Entity | null = null;
            try {
                instance = (asset!.resource as ContainerResource).instantiateRenderEntity();
                // Detached identity hierarchy: bounds are not contaminated by player position/yaw.
                const meshes = (instance.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances);
                if (!meshes.length) throw new Error('Empty Riven');
                if (meshes.some((mesh) => mesh.skinInstance?.skin.boneNames.length !== 68))
                    throw new Error('Expected Riven 68-joint skeleton');
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
                const normalized = normalizeRivenBounds(min, max);
                normalized.offset[1] += RIVEN_IDLE_FLOOR_OFFSET;
                instance.setLocalScale(normalized.scale, normalized.scale, normalized.scale);
                instance.setLocalPosition(...(normalized.offset as [number, number, number]));
                const tracks = (asset!.resource as ContainerResource).animations.map((a) => a.resource as AnimTrack);
                Object.assign(metrics, attachRivenAnimations(instance, tracks));
                animation.runningClip = metrics.runningClip;
                pivot.addChild(instance);
                model = instance;
                Object.assign(metrics, normalized, {
                    bounds: { min, max },
                    meshInstances: meshes.length,
                    jointCount: meshes[0].skinInstance!.skin.boneNames.length,
                    state: 'loaded',
                    loadMs: performance.now() - started
                });
            } catch (error) {
                instance?.destroy();
                metrics.state = 'error';
                metrics.error = `Riven import invalid: ${error instanceof Error ? error.message : 'unknown error'}; using primitive`;
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
                model?.anim?.baseLayer!.play('Idle_6');
                previousX = player.x;
                previousZ = player.z;
                yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            }
            selected = previewEnabled && sim.combat.definition.id === 'riven' && !forcedPrimitive;
            if (selected && sim.match?.phase !== 'prematch' && metrics.state === 'idle') start();
            const owner = sim.facing.owner;
            if (owner === 'aim') yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            else if (owner === 'commit') yaw = (sim.combat.committedAngle * 180) / Math.PI;
            else if (owner === 'movement') yaw = (Math.atan2(sim.movement.x, sim.movement.z) * 180) / Math.PI;
            pivot.setLocalEulerAngles(0, yaw + RIVEN_AUTHORED_FORWARD_YAW, 0);
            pivot.enabled = selected && !!model;
            // Kit owns the default primitive each frame; override only for this opt-in Riven selection.
            if (selected) primitive.enabled = !pivot.enabled;
            const moving = Math.hypot(player.x - previousX, player.z - previousZ) > 0.0001;
            previousX = player.x;
            previousZ = player.z;
            const alive = !player.dead && (!sim.match || sim.match.phase === 'active');
            const transition = animation.update(moving, alive);
            if (model?.anim) {
                model.anim.playing = selected && !player.dead && sim.match?.phase !== 'results';
                if (transition || model.anim.baseLayer!.activeState !== animation.active)
                    model.anim.baseLayer!.transition(animation.active, 0.12);
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
                previewEnabled,
                presentationOnly: true,
                worldBounds: worldBounds
                    ? { min: worldBounds.getMin().toArray(), max: worldBounds.getMax().toArray() }
                    : null,
                selected,
                forcedPrimitive,
                visible: pivot.enabled && !!model && root.enabled,
                primitiveVisible: primitive.enabled,
                yaw,
                position: { x: p.x, y: p.y, z: p.z },
                hipLocalPosition: model?.findByName('mixamorig:Hips')?.getLocalPosition().toArray() ?? null,
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
