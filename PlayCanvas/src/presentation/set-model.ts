import { BoundingBox, Entity } from 'playcanvas';
import type { AnimTrack, AppBase, ContainerResource, RenderComponent } from 'playcanvas';

import { attachSetAnimations, SetAnimationState } from './set-animation';
import { SummonerAssets } from './summoner-assets';
import type { ModelFrame } from './summoner-assets';

export const SET_ASSET_PATH = 'assets/summoners/set/Set_Animated.glb';
export const SET_ASSET_BYTES = 10000416;
export const SET_ASSET_SHA256 = 'dbee0fd906f786f4af04eb87f130a816c0f98aa04531874487b403f7ca23e154';
export const SET_HEIGHT = 1.9;
// Fixed idle-reference sole correction from offline inverse-bind skinning.
// Never follow the changing conservative skinned culling bounds.
export const SET_IDLE_FLOOR_OFFSET = 0.0093135;
// Authored forward +Z matches the authoritative atan2(x, z) facing convention.
export const SET_AUTHORED_FORWARD_YAW = 0;

export function normalizeSetBounds(min: number[], max: number[]) {
    const height = max[1] - min[1];
    if (
        min.length !== 3 ||
        max.length !== 3 ||
        ![...min, ...max, height].every(Number.isFinite) ||
        height <= 0 ||
        max.some((v, i) => v < min[i])
    )
        throw new Error('Invalid Set bounds');
    const scale = SET_HEIGHT / height;
    return {
        height,
        scale,
        offset: [(-(min[0] + max[0]) * scale) / 2, -min[1] * scale, (-(min[2] + max[2]) * scale) / 2]
    };
}

export function createSetModel(
    app: AppBase,
    root: Entity,
    primitive: Entity,
    competitive = false,
    sharedAssets?: SummonerAssets
) {
    const assets = sharedAssets ?? new SummonerAssets(app);
    const query = new URLSearchParams(location.search);
    const previewEnabled = query.get('setPreview') === '1';
    const forcedPrimitive = query.get('models') === 'primitive' || query.get('setPrimitive') === '1';
    const source = SET_ASSET_PATH;
    const animation = new SetAnimationState();
    const pivot = new Entity('Set-3D-facing');
    root.addChild(pivot);
    let model: Entity | null = null;

    let destroyed = false;
    let yaw = 180;
    let selected = false;
    let player: ModelFrame['combat']['player'] | null = null;
    const metrics = {
        state: 'idle' as 'idle' | 'loading' | 'loaded' | 'error',
        bytes: SET_ASSET_BYTES,
        source,
        clips: [] as { name: string; duration: number }[],
        registeredStates: [] as string[],
        runningClip: 'Running' as const,
        locomotionReason: '',
        readySource: '',
        readyTime: 0,
        loadMs: 0,
        error: '',
        bounds: null as null | { min: number[]; max: number[] },
        height: 0,
        scale: 1,
        offset: [0, 0, 0],
        meshInstances: 0,
        jointCount: 0,
        authoredForwardYaw: SET_AUTHORED_FORWARD_YAW
    };
    const start = () => {
        metrics.state = 'loading';
        const started = performance.now();
        void assets.load(source).then(
            (asset) => {
                if (destroyed) return;
                let instance: Entity | null = null;
                try {
                    instance = (asset!.resource as ContainerResource).instantiateRenderEntity();
                    // Detached identity hierarchy: bounds are not contaminated by player position/yaw.
                    const meshes = (instance.findComponents('render') as RenderComponent[]).flatMap(
                        (c) => c.meshInstances
                    );
                    if (!meshes.length) throw new Error('Empty Set');
                    if (meshes.some((mesh) => mesh.skinInstance?.skin.boneNames.length !== 87))
                        throw new Error('Expected Set 87-joint skeleton');
                    const normalized = assets.normalization(source, () => {
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
                        const normalized = normalizeSetBounds(min, max);
                        normalized.offset[1] += SET_IDLE_FLOOR_OFFSET;
                        return { ...normalized, bounds: { min, max } };
                    });
                    instance.setLocalScale(normalized.scale, normalized.scale, normalized.scale);
                    instance.setLocalPosition(...(normalized.offset as [number, number, number]));
                    const tracks = (asset!.resource as ContainerResource).animations.map(
                        (a) => a.resource as AnimTrack
                    );
                    Object.assign(metrics, attachSetAnimations(instance, tracks));
                    pivot.addChild(instance);
                    model = instance;
                    Object.assign(metrics, normalized, {
                        bounds: normalized.bounds,
                        meshInstances: meshes.length,
                        jointCount: meshes[0].skinInstance!.skin.boneNames.length,
                        state: 'loaded',
                        loadMs: performance.now() - started
                    });
                } catch (error) {
                    instance?.destroy();
                    metrics.state = 'error';
                    metrics.error = `Set import invalid: ${error instanceof Error ? error.message : 'unknown error'}; using primitive`;
                    metrics.loadMs = performance.now() - started;
                }
            },
            () => {
                if (destroyed) return;
                metrics.state = 'error';
                metrics.error = 'Asset unavailable; using primitive';
                metrics.loadMs = performance.now() - started;
            }
        );
    };
    return {
        update(sim: ModelFrame) {
            if (player !== sim.combat.player) {
                player = sim.combat.player;
                animation.reset();
                model?.anim?.baseLayer!.play('Ready');
                yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            }
            selected = (competitive || previewEnabled) && sim.combat.definition.id === 'set' && !forcedPrimitive;
            if (selected && sim.match?.phase !== 'prematch' && metrics.state === 'idle') start();
            const owner = sim.facing.owner;
            if (owner === 'aim') yaw = (Math.atan2(sim.aim.x, sim.aim.z) * 180) / Math.PI;
            else if (owner === 'commit') yaw = (sim.combat.committedAngle * 180) / Math.PI;
            else if (owner === 'movement') yaw = (Math.atan2(sim.movement.x, sim.movement.z) * 180) / Math.PI;
            pivot.setLocalEulerAngles(0, yaw + SET_AUTHORED_FORWARD_YAW, 0);
            pivot.enabled = selected && !!model;
            // Only the matching character presenter can hide the fallback.
            if (selected) primitive.enabled = !pivot.enabled;
            // Retain the last authoritative tick's locomotion between render updates.
            const moving = player.animation === 'run';
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
                instanceId: model?.getGuid() ?? null,
                meshId: model
                    ? (model.findComponents('render') as RenderComponent[])[0]?.meshInstances[0]?.mesh?.id
                    : null,
                materialId: model
                    ? (model.findComponents('render') as RenderComponent[])[0]?.meshInstances[0]?.material?.id
                    : null,
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
            if (!sharedAssets) assets.destroy();
        }
    };
}
