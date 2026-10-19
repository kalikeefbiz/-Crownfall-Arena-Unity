import { Color, Entity, StandardMaterial, Vec3, CULLFACE_NONE } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import type { PreviewIntent } from '../combat/ability-input';
import { ARENA, OBSTACLES } from '../config/arena';
import type { Simulation } from '../gameplay/simulation';

import { createCombatOverlay } from './combat-overlay';

function material(hex: number): StandardMaterial {
    const m = new StandardMaterial();
    m.diffuse = new Color(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
    m.cull = CULLFACE_NONE;
    m.update();
    return m;
}
export function createScene(app: AppBase) {
    const stone = material(0x334758),
        boundary = material(0x74b6ba),
        gold = material(0xd6ad64);
    const front = material(0xe4a65c),
        back = material(0xa64852),
        side = material(0xdb7650);
    const dark = material(0x162536),
        white = material(0xf5efdd);
    const primitive = (
        name: string,
        type: 'box' | 'sphere' | 'cylinder',
        position: number[],
        scale: number[],
        mat: StandardMaterial,
        parent = app.root
    ) => {
        const e = new Entity(name);
        e.addComponent('render', { type, material: mat });
        e.setLocalPosition(position[0], position[1], position[2]);
        e.setLocalScale(scale[0], scale[1], scale[2]);
        parent.addChild(e);
        return e;
    };
    primitive('lane-floor', 'box', [0, -0.15, 0], [18, 0.3, 32], stone);
    for (const x of [-ARENA.halfWidth, ARENA.halfWidth])
        primitive('lane-boundary', 'box', [x, 0.15, 0], [0.12, 0.3, 32], boundary);
    for (const z of [-ARENA.halfLength, ARENA.halfLength])
        primitive('lane-end', 'box', [0, 0.15, z], [18, 0.3, 0.12], boundary);
    for (let z = -14; z <= 14; z += 2) primitive('lane-guide', 'box', [0, 0.012, z], [0.07, 0.02, 0.7], boundary);
    primitive('center-line', 'box', [0, 0.015, 0], [18, 0.025, 0.1], gold);
    for (const o of OBSTACLES) {
        primitive('obstruction', 'box', [o.x, 0.65, o.z], [o.halfX * 2, 1.3, o.halfZ * 2], dark);
        primitive('obstruction-cap', 'box', [o.x, 1.32, o.z], [o.halfX * 2, 0.06, o.halfZ * 2], gold);
    }
    const root = new Entity('Kit-gameplay-root');
    app.root.addChild(root);
    primitive('Kit-collision-footprint', 'cylinder', [0, 0.04, 0], [0.8, 0.06, 0.8], boundary, root);
    // Replaceable presentation subtree. Only this child is mirrored.
    const visual = new Entity('Kit-presentation');
    root.addChild(visual);
    const body = primitive('primitive-body', 'box', [0, 0.72, 0], [0.65, 1.15, 0.4], front, visual);
    const head = primitive('primitive-head', 'sphere', [0, 1.45, 0], [0.58, 0.58, 0.45], front, visual);
    const frontEyes = new Entity('front-eyes');
    visual.addChild(frontEyes);
    for (const x of [-0.13, 0.13]) primitive('eye', 'box', [x, 1.5, 0.22], [0.075, 0.08, 0.05], dark, frontEyes);
    const backMark = primitive('back-mark', 'box', [0, 0.82, 0.23], [0.16, 0.65, 0.05], gold, visual);
    const sideProfile = new Entity('right-profile-mirrored-for-left');
    visual.addChild(sideProfile);
    primitive('side-eye', 'box', [0.17, 1.51, 0.22], [0.075, 0.08, 0.06], dark, sideProfile);
    primitive('profile-nose', 'box', [0.32, 1.42, 0.06], [0.21, 0.14, 0.25], white, sideProfile);
    const aimRoot = new Entity('continuous-aim');
    root.addChild(aimRoot);
    primitive('aim-line', 'box', [0, 0.08, -1.4], [0.055, 0.04, 2.8], gold, aimRoot);
    const tip = primitive('aim-tip', 'box', [0, 0.1, -2.8], [0.28, 0.06, 0.28], gold, aimRoot);
    tip.setLocalEulerAngles(0, 45, 0);
    const camera = new Entity('MOBA-camera');
    camera.addComponent('camera', { clearColor: new Color(0.045, 0.065, 0.1), fov: 48, nearClip: 0.1, farClip: 150 });
    app.root.addChild(camera);
    const follow = new Vec3(0, 0, 5);
    const updateCamera = () => {
        camera.setPosition(follow.x, 15, follow.z + 12.5865);
        camera.lookAt(follow.x, 0, follow.z);
    };
    updateCamera();
    const light = new Entity('sun');
    light.addComponent('light', { type: 'directional', color: new Color(1, 0.94, 0.84), intensity: 1.8 });
    light.setEulerAngles(48, -25, 0);
    app.root.addChild(light);
    app.scene.ambientLight = new Color(0.45, 0.5, 0.6);
    const targets = new Map<string, { body: Entity; health: Entity }>();
    const shots: Entity[] = [];
    const flashes: Entity[] = [];
    const red = material(0xb54b5c),
        green = material(0x42b8a0),
        purple = material(0xba79f0),
        hitMaterial = material(0xffee86);
    const overlay = createCombatOverlay();
    const actorLabels = document.createElement('div');
    actorLabels.id = 'actor-labels';
    document.body.append(actorLabels);
    const labelViews = new Map<string, HTMLDivElement>();
    const castViews = new Map<string, Entity>();
    const project = (p: { x: number; z: number }, height = 0) =>
        camera.camera!.worldToScreen(new Vec3(p.x, height, p.z));
    const groundAt = (x: number, y: number) => {
        const near = camera.camera!.screenToWorld(x, y, 0.1),
            far = camera.camera!.screenToWorld(x, y, 100);
        const t = -near.y / (far.y - near.y);
        return { x: near.x + (far.x - near.x) * t, z: near.z + (far.z - near.z) * t };
    };
    return {
        get preview() {
            return overlay.preview;
        },
        destroy() {
            overlay.destroy();
            actorLabels.remove();
        },
        dragVector(dx: number, dy: number, sim: Simulation) {
            const anchor = project(sim.position),
                from = groundAt(anchor.x, anchor.y),
                to = groundAt(anchor.x + dx, anchor.y + dy);
            const length = Math.hypot(to.x - from.x, to.z - from.z) || 1,
                scale = Math.hypot(dx, dy) / length;
            return { x: (to.x - from.x) * scale, z: (to.z - from.z) * scale };
        },
        update(sim: Simulation, dt: number, intent: PreviewIntent | null = null) {
            const combat = sim.combat;
            const actors = sim.match?.actors || [];
            const actorIds = new Set(actors.map((a) => a.sim.player.id));
            for (const [id, label] of labelViews) if (!actorIds.has(id)) label.hidden = true;
            for (const view of castViews.values()) view.enabled = false;
            for (const { sim: actor } of actors) {
                const p = actor.player;
                let label = labelViews.get(p.id);
                if (!label) {
                    label = document.createElement('div');
                    label.className = 'actor-label';
                    labelViews.set(p.id, label);
                    actorLabels.append(label);
                }
                label.hidden = p.dead;
                label.style.color = p.team === 1 ? '#a2dfff' : '#ffb4c1';
                label.textContent = `${p.name}${actor === combat ? ' · YOU' : ''}${sim.match?.protected(p) ? ' · SHIELD' : ''}`;
                const screen = project(p, 1.7);
                label.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`;
                let cast = castViews.get(p.id);
                if (!cast) {
                    cast = primitive('actor-cast', 'box', [0, 0, 0], [0.15, 0.08, 1.8], p.team === 1 ? green : red);
                    castViews.set(p.id, cast);
                }
                const accepted = actor.journal.latestAccepted;
                cast.enabled = !p.dead && !!accepted && actor.now - accepted.time < 0.28;
                cast.setPosition(p.x + Math.sin(p.angle) * 0.9, 0.15, p.z + Math.cos(p.angle) * 0.9);
                cast.setEulerAngles(0, (p.angle * 180) / Math.PI, 0);
            }
            root.enabled = !combat.player.dead;
            const visibleIds = new Set(combat.targets.map((t) => t.id));
            for (const [id, view] of targets)
                if (!visibleIds.has(id)) {
                    view.body.enabled = false;
                    view.health.enabled = false;
                }
            for (const t of combat.targets) {
                let view = targets.get(t.id);
                if (!view) {
                    view = {
                        body: primitive(t.id, 'cylinder', [t.x, 0.5, t.z], [0.7, 1, 0.7], t.team === 1 ? green : red),
                        health: primitive(t.id + '-health', 'box', [t.x, 1.2, t.z], [1, 0.08, 0.08], green)
                    };
                    targets.set(t.id, view);
                }
                view.body.enabled = !t.dead;
                view.body.setPosition(t.x, 0.5, t.z);
                view.health.enabled = !t.dead;
                view.health.setPosition(t.x, 1.2, t.z);
                view.health.setLocalScale(Math.max(0.01, t.health / t.maxHealth), 0.08, 0.08);
                view.body.render!.meshInstances[0].material = combat.journal.hits.some(
                    (hit) => hit.targetId === t.id && combat.now - hit.time < 0.3
                )
                    ? hitMaterial
                    : sim.match?.protected(t)
                      ? white
                      : (t.statuses.stun || 0) > combat.now
                        ? purple
                        : t.id === 'mobile-test'
                          ? gold
                          : t.team === 1
                            ? green
                            : red;
                const pulse = combat.journal.hits.some((hit) => hit.targetId === t.id && combat.now - hit.time < 0.15)
                    ? 1.22
                    : 1;
                view.body.setLocalScale(0.7 * pulse, pulse, 0.7 * pulse);
            }
            const simulations = sim.match ? sim.match.actors.map((a) => a.sim) : [combat];
            const projectiles = simulations.flatMap((c) => c.projectiles.items);
            for (const view of shots) view.enabled = false;
            projectiles.forEach((shot, index) => {
                const view = (shots[index] ||= primitive(
                    'combat-projectile',
                    'sphere',
                    [0, 0, 0],
                    [0.3, 0.3, 0.3],
                    gold
                ));
                view.enabled = shot.active;
                if (shot.active) view.setPosition(shot.x, 0.65, shot.z);
            });
            for (const view of flashes) view.enabled = false;
            simulations
                .flatMap((c) => c.effects.items)
                .forEach((effect, index) => {
                    const view = (flashes[index] ||= primitive(
                        'combat-effect',
                        'cylinder',
                        [0, 0, 0],
                        [1, 0.03, 1],
                        gold
                    ));
                    view.enabled = effect.active && ['trail', 'pantherTrail', 'buffPulse'].includes(effect.type);
                    if (view.enabled) {
                        view.setPosition(effect.x, 0.06, effect.z);
                        const size = (effect.range || 0.4) * 2;
                        view.setLocalScale(size, 0.03, size);
                    }
                });
            root.setPosition(sim.position.x, 0, sim.position.z);
            const facing = sim.facing.facing;
            const isSide = facing === 'Right' || facing === 'Left';
            body.render!.meshInstances[0].material = isSide ? side : facing === 'Back' ? back : front;
            head.render!.meshInstances[0].material = isSide ? side : facing === 'Back' ? back : front;
            visual.setLocalScale(facing === 'Left' ? -1 : 1, 1, 1);
            frontEyes.enabled = facing === 'Front';
            backMark.enabled = facing === 'Back';
            sideProfile.enabled = isSide;
            aimRoot.setLocalEulerAngles(0, (Math.atan2(-sim.aim.x, -sim.aim.z) * 180) / Math.PI, 0);
            aimRoot.enabled = false;
            const blend = 1 - Math.exp(-9 * dt);
            follow.x += (sim.position.x - follow.x) * blend;
            follow.z += (sim.position.z - follow.z) * blend;
            updateCamera();
            const current =
                intent ||
                (sim.targeting
                    ? {
                          ability: combat.activeAbilities().find((a) => a.basic)!,
                          angle: Math.atan2(sim.aim.x, sim.aim.z),
                          cancel: false
                      }
                    : null);
            overlay.update(combat, current, project);
        },
        screenAim(x: number, y: number, sim: Simulation) {
            const near = camera.camera!.screenToWorld(x, y, 0.1);
            const far = camera.camera!.screenToWorld(x, y, 100);
            const t = -near.y / (far.y - near.y);
            if (t < 0 || !Number.isFinite(t)) return sim.aim;
            return {
                x: near.x + (far.x - near.x) * t - sim.position.x,
                z: near.z + (far.z - near.z) * t - sim.position.z
            };
        }
    };
}
