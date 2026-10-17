import { Color, Entity, StandardMaterial, Vec3, CULLFACE_NONE } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import { ARENA, OBSTACLES } from '../config/arena';
import type { Simulation } from '../gameplay/simulation';

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
    return {
        update(sim: Simulation, dt: number) {
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
            aimRoot.enabled = sim.targeting || sim.commitRemaining > 0;
            const blend = 1 - Math.exp(-9 * dt);
            follow.x += (sim.position.x - follow.x) * blend;
            follow.z += (sim.position.z - follow.z) * blend;
            updateCamera();
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
