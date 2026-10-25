import { Color, Entity, StandardMaterial, Vec3, CULLFACE_NONE, BLEND_NORMAL } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import type { PreviewIntent } from '../combat/ability-input';
import type { Combatant } from '../combat/combat';
import { MATCH_LANE } from '../combat/match-data.js';
import {
    MATCH_WORLD,
    CAMERA_OFFSET,
    CAMERA_LOOK_AHEAD,
    CAMERA_FOLLOW_RATE,
    TRAINING_CAMERA_OFFSET
} from '../combat/match-space.js';
import { WILDERNESS_REGIONS } from '../combat/wilderness-data.js';
import { ARENA, OBSTACLES } from '../config/arena';
import type { Simulation } from '../gameplay/simulation';

import { createCombatOverlay } from './combat-overlay';
import { createKitModel } from './kit-model';
import { createLaneEnvironment } from './lane-environment';
import { createRivenModel } from './riven-model';
import { createRivenWeapons } from './riven-weapons';
import { createSetModel } from './set-model';
import { SummonerAssets } from './summoner-assets';
import type { ModelFrame } from './summoner-assets';

function material(hex: number): StandardMaterial {
    const m = new StandardMaterial();
    m.diffuse = new Color(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
    m.cull = CULLFACE_NONE;
    m.update();
    return m;
}
export function createScene(app: AppBase, competitive = false) {
    const ownedMaterials = new Set<StandardMaterial>();
    const assets = new SummonerAssets(app);
    const weaponParams = new URLSearchParams(location.search);
    const weaponModels =
        weaponParams.get('models') !== 'primitive' &&
        weaponParams.get('rivenPrimitive') !== '1' &&
        ((competitive && weaponParams.get('summonerModels') !== 'local') || weaponParams.get('rivenPreview') === '1');
    const localOnly = new URLSearchParams(location.search).get('summonerModels') === 'local';
    const teamMaterials = { 1: material(0x369bff), 2: material(0xff425c) };
    const sceneRoot = new Entity('arena-presentation');
    app.root.addChild(sceneRoot);
    const rivenWeapons = createRivenWeapons(assets, sceneRoot, weaponModels);
    const params = new URLSearchParams(location.search);
    const carved = competitive && params.get('environment') !== 'legacy';
    const territoryVisible = params.get('territoryTint') !== '0';
    const environment = carved ? createLaneEnvironment(app, sceneRoot, assets) : null;
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
        parent = sceneRoot
    ) => {
        ownedMaterials.add(mat);
        const e = new Entity(name);
        e.addComponent('render', { type, material: mat });
        e.setLocalPosition(position[0], position[1], position[2]);
        e.setLocalScale(scale[0], scale[1], scale[2]);
        parent.addChild(e);
        return e;
    };
    const geometry = competitive
        ? MATCH_WORLD
        : {
              width: 18,
              depth: 32,
              walls: OBSTACLES.map((o) => ({ x: o.x, z: o.z, w: o.halfX * 2, d: o.halfZ * 2, h: 1.3 }))
          };
    if (!carved) primitive('lane-floor', 'box', [0, -0.15, 0], [geometry.width, 0.3, geometry.depth], stone);
    const laneWidth = competitive ? MATCH_LANE.halfWidth * 2 : ARENA.halfWidth * 2;
    const laneLength = competitive ? MATCH_LANE.goalB - MATCH_LANE.goalA : 32;
    if (!carved)
        for (const x of [-laneWidth / 2, laneWidth / 2])
            primitive('lane-boundary', 'box', [x, 0.04, 0], [0.12, 0.08, geometry.depth], boundary);
    if (!carved)
        for (const z of [-geometry.depth / 2, geometry.depth / 2])
            primitive('lane-end', 'box', [0, 0.15, z], [geometry.width, 0.3, 0.12], boundary);
    if (!carved)
        for (let z = -laneLength / 2; z <= laneLength / 2; z += 2)
            primitive('lane-guide', 'box', [0, 0.012, z], [0.07, 0.02, 0.7], boundary);
    if (!carved)
        for (const o of geometry.walls) {
            primitive('obstruction', 'box', [o.x, o.h / 2, o.z], [o.w, o.h, o.d], dark);
            primitive('obstruction-cap', 'box', [o.x, o.h + 0.02, o.z], [o.w, 0.04, o.d], gold);
        }
    const tint = (hex: number) => {
        const m = material(hex);
        m.blendType = BLEND_NORMAL;
        m.opacity = 0.18;
        m.depthWrite = false;
        m.update();
        return m;
    };
    if (competitive && !carved)
        for (const region of WILDERNESS_REGIONS)
            primitive(
                'wilderness-region',
                'box',
                [region.x, 0.009, region.z],
                [region.w, 0.012, region.d],
                tint(0x42956e)
            );
    const blueTerritory = primitive('blue-territory', 'box', [0, 0.018, 0], [laneWidth, 0.012, 1], tint(0x369bff));
    const redTerritory = primitive('red-territory', 'box', [0, 0.02, 0], [laneWidth, 0.012, 1], tint(0xff425c));
    if (carved) {
        for (const territory of [blueTerritory, redTerritory]) {
            const mat = territory.render!.meshInstances[0].material as StandardMaterial;
            mat.opacity = 0.035;
            mat.update();
        }
    }
    const frontier = primitive('authoritative-frontier', 'box', [0, 0.07, 0], [laneWidth, 0.1, 0.18], gold);
    blueTerritory.enabled = redTerritory.enabled = competitive && territoryVisible;
    frontier.enabled = competitive;
    const root = new Entity('Kit-gameplay-root');
    app.root.addChild(root);
    environment?.groundActor(root);
    const localIndicator = primitive(
        'Kit-collision-footprint',
        'cylinder',
        [0, 0.035, 0],
        [1.15, 0.035, 1.15],
        teamMaterials[1],
        root
    );
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
    const kitModel = createKitModel(app, root, visual, competitive, assets);
    const rivenModel = createRivenModel(app, root, visual, competitive && !localOnly, assets);
    const setModel = createSetModel(app, root, visual, competitive && !localOnly, assets);
    const aimRoot = new Entity('continuous-aim');
    root.addChild(aimRoot);
    primitive('aim-line', 'box', [0, 0.08, -1.4], [0.055, 0.04, 2.8], gold, aimRoot);
    const tip = primitive('aim-tip', 'box', [0, 0.1, -2.8], [0.28, 0.06, 0.28], gold, aimRoot);
    tip.setLocalEulerAngles(0, 45, 0);
    const camera = new Entity('MOBA-camera');
    camera.addComponent('camera', { clearColor: new Color(0.045, 0.065, 0.1), fov: 48, nearClip: 0.1, farClip: 150 });
    app.root.addChild(camera);
    const follow = new Vec3(0, 0, 5);
    const cameraOffset = competitive ? CAMERA_OFFSET : TRAINING_CAMERA_OFFSET;
    const lookAhead = competitive ? CAMERA_LOOK_AHEAD : 0;
    const lookTarget = new Vec3();
    const updateCamera = () => {
        camera.setPosition(follow.x, cameraOffset.y, follow.z + cameraOffset.z);
        lookTarget.set(follow.x, 0, follow.z - lookAhead);
        camera.lookAt(lookTarget);
    };
    updateCamera();
    const light = new Entity('sun');
    light.addComponent('light', { type: 'directional', color: new Color(1, 0.94, 0.84), intensity: 1.8 });
    light.setEulerAngles(48, -25, 0);
    app.root.addChild(light);
    app.scene.ambientLight = new Color(0.45, 0.5, 0.6);
    const targets = new Map<string, { body: Entity; health: Entity }>();
    type ActorModel =
        ReturnType<typeof createKitModel> | ReturnType<typeof createRivenModel> | ReturnType<typeof createSetModel>;
    const actorViews = new Map<
        string,
        { root: Entity; indicator: Entity; model: ActorModel; summonerId: string; frame: ModelFrame }
    >();
    let localId = 'player';
    let localSummonerId = 'kit';
    let localTeam = 1;
    const shots: Entity[] = [];
    const flashes: Entity[] = [];
    const red = material(0xb54b5c),
        green = material(0x42b8a0),
        purple = material(0xba79f0),
        hitMaterial = material(0xffee86);
    for (const mat of [
        stone,
        boundary,
        gold,
        front,
        back,
        side,
        dark,
        white,
        red,
        green,
        purple,
        hitMaterial,
        ...Object.values(teamMaterials)
    ])
        ownedMaterials.add(mat);
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
        get environment() {
            return { ...(environment?.diagnostics ?? { mode: 'legacy', batches: 0 }), territoryTint: territoryVisible };
        },
        get kitModel() {
            return kitModel.snapshot();
        },
        get setModel() {
            return setModel.snapshot();
        },
        get rivenModel() {
            return rivenModel.snapshot();
        },
        get summonerModels() {
            const local = localSummonerId === 'set' ? setModel : localSummonerId === 'riven' ? rivenModel : kitModel;
            return [
                {
                    id: localId,
                    summonerId: localSummonerId,
                    team: localTeam,
                    teamColor: localTeam === 1 ? '#369bff' : '#ff425c',
                    indicatorVisible: root.enabled,
                    indicatorColor: (
                        localIndicator.render!.meshInstances[0].material as StandardMaterial
                    ).diffuse.toArray(),
                    ...local.snapshot()
                },
                ...[...actorViews].map(([id, view]) => ({
                    id,
                    summonerId: view.summonerId,
                    team: view.frame.combat.player.team,
                    teamColor: view.frame.combat.player.team === 1 ? '#369bff' : '#ff425c',
                    indicatorVisible: view.root.enabled,
                    indicatorColor: (
                        view.indicator.render!.meshInstances[0].material as StandardMaterial
                    ).diffuse.toArray(),
                    ...view.model.snapshot()
                }))
            ];
        },
        get rivenWeapons() {
            return rivenWeapons.snapshot();
        },
        get modelAssets() {
            return assets.snapshot();
        },
        get territory() {
            return {
                frontierZ: frontier.getPosition().z,
                camera: { x: camera.getPosition().x, y: camera.getPosition().y, z: camera.getPosition().z },
                lookTarget: { x: lookTarget.x, y: lookTarget.y, z: lookTarget.z },
                cameraForward: { x: camera.forward.x, y: camera.forward.y, z: camera.forward.z },
                follow: { x: follow.x, z: follow.z }
            };
        },
        get preview() {
            return overlay.preview;
        },
        destroy() {
            kitModel.destroy();
            rivenModel.destroy();
            setModel.destroy();
            for (const view of actorViews.values()) {
                view.model.destroy();
                view.root.destroy();
            }
            actorViews.clear();
            rivenWeapons.destroy();
            assets.destroy();
            environment?.destroy();
            sceneRoot.destroy();
            root.destroy();
            camera.destroy();
            light.destroy();
            // Materials created for primitives belong to this scene. Imported
            // character materials are owned and unloaded by the container cache.
            for (const m of ownedMaterials) m.destroy();
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
        update(sim: Simulation, dt: number, intent: PreviewIntent | null = null, assistedTarget: string | null = null) {
            const combat = sim.combat;
            localId = combat.player.id;
            localSummonerId = combat.definition.id;
            localTeam = combat.player.team;
            if (competitive && sim.match) {
                const z = -sim.match.rules.front;
                frontier.setPosition(0, 0.07, z);
                const half = laneLength / 2;
                blueTerritory.setPosition(0, 0.018, (z + half) / 2);
                blueTerritory.setLocalScale(laneWidth, 0.012, Math.max(0.001, half - z));
                redTerritory.setPosition(0, 0.02, (z - half) / 2);
                redTerritory.setLocalScale(laneWidth, 0.012, Math.max(0.001, z + half));
            }
            const actors = sim.match?.actors || [];
            const camps = sim.match?.wilderness.camps || [];
            const actorIds = new Set([...actors.map((a) => a.sim.player.id), ...camps.map((c) => c.id)]);
            for (const [id, label] of labelViews)
                if (!actorIds.has(id)) {
                    label.remove();
                    labelViews.delete(id);
                }
            for (const [id, cast] of castViews)
                if (!actorIds.has(id)) {
                    cast.destroy();
                    castViews.delete(id);
                }
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
                label.dataset.actor = p.id;
                label.classList.toggle('assisted-target', p.id === assistedTarget);
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
            for (const camp of camps) {
                let label = labelViews.get(camp.id);
                if (!label) {
                    label = document.createElement('div');
                    label.className = 'actor-label camp-label';
                    label.dataset.camp = camp.id;
                    labelViews.set(camp.id, label);
                    actorLabels.append(label);
                }
                const screen = project(camp, camp.major ? 2.5 : 1.8);
                label.hidden =
                    screen.z < 0 ||
                    screen.x < 0 ||
                    screen.x > window.innerWidth ||
                    screen.y < 0 ||
                    screen.y > window.innerHeight;
                label.style.color = camp.major ? '#ffe3a4' : '#a9efd0';
                label.textContent = `${camp.name} · ${camp.dead ? `RESPAWN ${Math.ceil(Math.max(0, camp.respawnAt - sim.match!.rules.elapsed))}s` : `${Math.ceil(camp.health)} / ${camp.maxHealth}`}`;
                label.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -100%)`;
            }
            const indicatorFeedback = (indicator: Entity, p: Combatant) => {
                const hit = (sim.match?.actors.map((a) => a.sim) || [combat]).some((c) =>
                    c.journal.hits.some((h) => h.targetId === p.id && c.now - h.time < 0.3)
                );
                indicator.render!.meshInstances[0].material = hit
                    ? hitMaterial
                    : sim.match?.protected(p)
                      ? white
                      : (p.statuses.stun || 0) > combat.now
                        ? purple
                        : teamMaterials[p.team === 1 ? 1 : 2];
                const size = hit ? 1.3 : 1.15;
                indicator.setLocalScale(size, 0.035, size);
            };
            indicatorFeedback(localIndicator, combat.player);
            root.enabled = !combat.player.dead;
            const visibleIds = new Set(combat.targets.map((t) => t.id));
            for (const [id, view] of targets)
                if (!visibleIds.has(id)) {
                    view.body.destroy();
                    view.health.destroy();
                    targets.delete(id);
                }
            const roster = new Map(actors.filter((a) => a.sim !== combat).map((a) => [a.sim.player.id, a.sim]));
            for (const [id, view] of actorViews) {
                if (!roster.has(id) || roster.get(id)!.definition.id !== view.summonerId || localOnly) {
                    view.model.destroy();
                    view.root.destroy();
                    actorViews.delete(id);
                }
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
                view.body.enabled = !t.dead || t.kind === 'monster';
                view.body.setPosition(t.x, t.dead ? 0.08 : t.radius > 1 ? 0.9 : 0.5, t.z);
                view.health.enabled = !t.dead;
                const actor = roster.get(t.id);
                view.health.setPosition(t.x, actor ? (actor.definition.id === 'set' ? 2.15 : 2) : 1.2, t.z);
                view.health.render!.meshInstances[0].material = actor ? teamMaterials[t.team === 1 ? 1 : 2] : green;
                view.health.setLocalScale(Math.max(0.01, t.health / t.maxHealth), 0.08, 0.08);
                view.body.render!.meshInstances[0].material = combat.journal.hits.some(
                    (hit) => hit.targetId === t.id && combat.now - hit.time < 0.3
                )
                    ? hitMaterial
                    : sim.match?.protected(t)
                      ? white
                      : (t.statuses.stun || 0) > combat.now
                        ? purple
                        : t.kind === 'monster'
                          ? t.dead
                              ? dark
                              : t.radius > 1
                                ? gold
                                : boundary
                          : t.id === 'mobile-test'
                            ? gold
                            : t.team === 1
                              ? green
                              : red;
                const pulse = combat.journal.hits.some((hit) => hit.targetId === t.id && combat.now - hit.time < 0.15)
                    ? 1.22
                    : 1;
                const size = t.kind === 'monster' ? t.radius * 2 : 0.7;
                view.body.setLocalScale(size * pulse, t.dead ? 0.12 : t.radius > 1 ? 1.8 : pulse, size * pulse);
                if (actor && !localOnly) {
                    let actorView = actorViews.get(t.id);
                    if (!actorView) {
                        const actorRoot = new Entity(`summoner-${t.id}`);
                        sceneRoot.addChild(actorRoot);
                        environment?.groundActor(actorRoot);
                        const indicator = primitive(
                            `team-${t.id}`,
                            'cylinder',
                            [0, 0.035, 0],
                            [1.15, 0.035, 1.15],
                            teamMaterials[t.team === 1 ? 1 : 2],
                            actorRoot
                        );
                        const create =
                            actor.definition.id === 'set'
                                ? createSetModel
                                : actor.definition.id === 'riven'
                                  ? createRivenModel
                                  : createKitModel;
                        actorView = {
                            root: actorRoot,
                            indicator,
                            summonerId: actor.definition.id,
                            model: create(app, actorRoot, view.body, true, assets),
                            frame: {
                                combat: actor,
                                match: sim.match,
                                aim: { x: 0, z: 1 },
                                movement: { x: 0, z: 0 },
                                facing: { owner: 'aim', facing: 'Front' }
                            }
                        };
                        actorViews.set(t.id, actorView);
                    }
                    actorView.frame.combat = actor;
                    actorView.frame.match = sim.match;
                    actorView.frame.aim.x = Math.sin(actor.player.angle);
                    actorView.frame.aim.z = Math.cos(actor.player.angle);
                    actorView.root.setPosition(t.x, 0, t.z);
                    actorView.root.enabled = !t.dead;
                    indicatorFeedback(actorView.indicator, t);
                    actorView.model.update(actorView.frame);
                    if (t.dead) view.body.enabled = false;
                }
            }
            const simulations = sim.match ? sim.match.actors.map((a) => a.sim) : [combat];
            const projectiles = simulations.flatMap((c) =>
                c.projectiles.items.filter((shot) => !rivenWeapons.handles(c, shot))
            );
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
            kitModel.update(sim);
            rivenModel.update(sim);
            setModel.update(sim);
            rivenWeapons.update(simulations, sim.match?.phase !== 'prematch');
            environment?.update(sim.match?.phase !== 'prematch');
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
            const blend = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
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
