import { BoundingBox, Color, Entity, StandardMaterial } from 'playcanvas';
import type { ContainerResource, RenderComponent } from 'playcanvas';

import type { CombatSimulation, Projectile } from '../combat/combat';

import type { SummonerAssets } from './summoner-assets';

export const MOONREAPER_PATH = 'assets/summoners/riven/weapons/Meshy_AI_Azure_Moonreaper_1025005546_texture.glb';
export const MOONREAPER_BYTES = 23080916;
export const MOONREAPER_SHA256 = '20bad659e39bc916b7f34fca587e55beed25eeae9d3e77d856879efd173636c8';
export const MOONREAPER_HEIGHT = 0.6;

export function normalizeMoonreaper(min: number[], max: number[]) {
    const height = max[1] - min[1];
    if (
        min.length !== 3 ||
        max.length !== 3 ||
        height <= 0 ||
        ![...min, ...max, height].every(Number.isFinite) ||
        max.some((v, i) => v < min[i])
    )
        throw new Error('Invalid Moonreaper bounds');
    const scale = MOONREAPER_HEIGHT / height;
    return { height, scale, offset: min.map((v, i) => (-(v + max[i]) * scale) / 2), bounds: { min, max } };
}

// Only these two established identities depict scythes. Pulse remains a wave.
export function moonreaperKind(shot: Projectile) {
    if (shot.persistent && shot.type === 'reso-scythe') return 'reso';
    if (!shot.persistent && shot.ability?.id === 'elf-dance') return 'elf-dance';
    return null;
}

type View = {
    combat: CombatSimulation;
    root: Entity;
    pivot: Entity;
    fallback: Entity;
    model: Entity | null;
    meshId: number | null;
    materialId: number | null;
    spin: number;
    phase: string;
    trace: Projectile['trace'];
    time: number;
};

// Projectile objects (not flattened array indices or actor IDs) bind the visuals.
// Pool reuse is reclassified every frame; removed combat authorities are disposed.
export function createRivenWeapons(
    assets: SummonerAssets,
    parent: Entity,
    enabled: boolean,
    ground: (x: number, z: number) => number = () => 0
) {
    const views = new Map<Projectile, View>();
    const fallbackMaterial = new StandardMaterial();
    fallbackMaterial.diffuse = new Color(0.25, 0.72, 0.95);
    fallbackMaterial.metalness = 0.45;
    fallbackMaterial.update();
    let container: ContainerResource | null = null;
    let state = 'idle';
    let error = '';
    let destroyed = false;
    const mount = (view: View) => {
        let model: Entity | null = null;
        try {
            model = container!.instantiateRenderEntity();
            const meshes = (model.findComponents('render') as RenderComponent[]).flatMap((c) => c.meshInstances);
            if (!meshes.length) throw new Error('Empty Moonreaper');
            const normalized = assets.normalization(MOONREAPER_PATH, () => {
                const bounds = new BoundingBox();
                bounds.setFromTransformedAabb(meshes[0].mesh!.aabb, meshes[0].node.getWorldTransform());
                for (let i = 1; i < meshes.length; i++) {
                    const part = new BoundingBox();
                    part.setFromTransformedAabb(meshes[i].mesh!.aabb, meshes[i].node.getWorldTransform());
                    bounds.add(part);
                }
                return normalizeMoonreaper(bounds.getMin().toArray(), bounds.getMax().toArray());
            });
            model.setLocalScale(normalized.scale, normalized.scale, normalized.scale);
            model.setLocalPosition(...(normalized.offset as [number, number, number]));
            for (const mesh of meshes) mesh.castShadow = false;
            view.pivot.addChild(model);
            view.model = model;
            view.meshId = meshes[0].mesh!.id;
            view.materialId = meshes[0].material!.id;
            view.fallback.enabled = false;
        } catch (cause) {
            model?.destroy();
            error = `Moonreaper import invalid: ${String(cause)}; using fallback`;
            state = 'error';
        }
    };
    const start = () => {
        state = 'loading';
        void assets
            .settled()
            .then(() => (destroyed ? null : assets.load(MOONREAPER_PATH)))
            .then(
                (asset) => {
                    if (destroyed || !asset) return;
                    container = asset.resource as ContainerResource;
                    state = 'loaded';
                    for (const view of views.values()) mount(view);
                },
                () => {
                    if (destroyed) return;
                    state = 'error';
                    error = 'Moonreaper unavailable; using fallback';
                }
            );
    };
    const create = (combat: CombatSimulation, shot: Projectile): View => {
        const root = new Entity('Azure-Moonreaper');
        const pivot = new Entity('Moonreaper-facing');
        const fallback = new Entity('Moonreaper-fallback');
        root.addChild(pivot);
        fallback.setLocalScale(MOONREAPER_HEIGHT / 1.3, MOONREAPER_HEIGHT / 1.3, MOONREAPER_HEIGHT / 1.3);
        pivot.addChild(fallback);
        // A small physical scythe silhouette also works offline/primitive-only.
        for (const [name, x, y, sx, sy, angle] of [
            ['shaft', 0.22, -0.05, 0.055, 1.1, 12],
            ['blade', -0.12, 0.43, 0.7, 0.14, 18],
            ['tip', -0.45, 0.25, 0.08, 0.4, -28]
        ] as const) {
            const part = new Entity(name);
            part.addComponent('render', { type: 'box', material: fallbackMaterial, castShadows: false });
            part.setLocalPosition(x, y, 0);
            part.setLocalScale(sx, sy, 0.065);
            part.setLocalEulerAngles(0, 0, angle);
            fallback.addChild(part);
        }
        parent.addChild(root);
        root.enabled = false;
        const view: View = {
            combat,
            root,
            pivot,
            fallback,
            model: null,
            meshId: null,
            materialId: null,
            spin: 0,
            phase: shot.phase ?? 'outgoing',
            trace: shot.trace,
            time: combat.now
        };
        if (container && state === 'loaded') mount(view);
        return view;
    };
    return {
        // Hides the generic sphere even while loading or in primitive mode.
        handles(combat: CombatSimulation, shot: Projectile) {
            return combat.definition.id === 'riven' && shot.source === combat.player && !!moonreaperKind(shot);
        },
        update(simulations: readonly CombatSimulation[], visible: boolean) {
            for (const [shot, view] of views) {
                if (!simulations.includes(view.combat)) {
                    view.root.destroy();
                    views.delete(shot);
                } else {
                    // Keep live render components registered with their layers;
                    // toggling them off/on each frame churns engine draw lists.
                    view.root.enabled =
                        visible &&
                        !view.combat.player.dead &&
                        shot.active &&
                        shot.source === view.combat.player &&
                        !!moonreaperKind(shot);
                }
            }
            for (const combat of simulations) {
                if (combat.definition.id !== 'riven') continue;
                for (const shot of combat.projectiles.items) {
                    if (!shot.active || shot.source !== combat.player || !moonreaperKind(shot)) continue;
                    if (!visible || combat.player.dead) continue;
                    if (enabled && state === 'idle') start();
                    let view = views.get(shot);
                    if (!view) {
                        view = create(combat, shot);
                        views.set(shot, view);
                    }
                    const phase = shot.phase ?? 'outgoing';
                    if (phase === 'orbit' || (phase === 'outgoing' && view.trace !== shot.trace)) view.spin = 0;
                    // 0.6 turns/sec, frozen at the parked endpoint. Simulation time
                    // also freezes this effect on results/pause, with no render timer.
                    else if (phase === 'outgoing' || phase === 'returning')
                        view.spin += Math.max(0, combat.now - view.time) * 216;
                    view.time = combat.now;
                    view.trace = shot.trace;
                    view.phase = phase;
                    const yaw =
                        phase === 'orbit'
                            ? (Math.atan2(shot.x - combat.player.x, shot.z - combat.player.z) * 180) / Math.PI
                            : ((shot.angle ?? 0) * 180) / Math.PI;
                    view.root.setPosition(shot.x, ground(shot.x, shot.z) + 0.95, shot.z);
                    view.root.setEulerAngles(0, yaw, 0);
                    // Tilt the broad XY face towards the competitive overhead view.
                    view.pivot.setLocalEulerAngles(-60, 0, view.spin);
                    view.root.enabled = true;
                }
            }
        },
        snapshot() {
            return {
                source: MOONREAPER_PATH,
                state,
                error,
                instances: [...views]
                    .filter(([, v]) => v.root.enabled)
                    .map(([shot, v]) => ({
                        ownerId: v.combat.player.id,
                        team: v.combat.player.team,
                        kind: moonreaperKind(shot),
                        phase: v.phase,
                        orbitIndex: shot.orbitIndex ?? null,
                        instanceId: v.model?.getGuid() ?? v.fallback.getGuid(),
                        meshId: v.meshId,
                        materialId: v.materialId,
                        fallback: !v.model,
                        position: v.root.getPosition().toArray(),
                        yaw: v.root.getEulerAngles().y,
                        spin: v.spin,
                        authoritative: { x: shot.x, z: shot.z, angle: shot.angle ?? 0 }
                    }))
            };
        },
        destroy() {
            destroyed = true;
            for (const view of views.values()) view.root.destroy();
            views.clear();
            fallbackMaterial.destroy();
        }
    };
}
