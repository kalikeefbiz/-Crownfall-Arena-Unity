import { AnimCurve, AnimData, AnimTrack, Mat4, Quat, Vec3 } from 'playcanvas';
import type { Entity, GraphNode } from 'playcanvas';

// Set's panther locomotion, generated in code on Set's own skeleton (no new asset). Two gaits:
//
// - PantherSprint (his run): an upright, forward-leaning, digitigrade sprint. He stays on two legs (his humanoid combat
//   identity) but moves like a cat: running on the balls of his feet with heels never down, sinking low through each
//   stance and springing into a flight phase, hips swaying over the planted leg and turning with the stride while the
//   shoulders counter-rotate, clawed hands carried forward and low, tail streaming back as a counterweight.
// - PantherBurst: a four-legged half-bound (body low, arms as forelegs, spine flexing and stretching per bound). Kept
//   for a future quadrupedal special movement ability; not used for ordinary running.
//
// It is baked ONCE when the model loads: for each sample the skeleton is posed with simple two-bone IK in the model's
// bind space (forward +Z, up +Y, bind units), every animated bone's local rotation is read back, and the samples become
// an ordinary AnimTrack. At runtime it costs the same as any other clip.

export const PANTHER_SPRINT = 'PantherSprint';
export const PANTHER_BURST = 'PantherBurst';
// One full stride (both feet). Foot travel during stance is matched to the game's 6 m/s run so planted feet do not skate.
export const PANTHER_CYCLE = { [PANTHER_SPRINT]: 0.44, [PANTHER_BURST]: 0.34 } as const;
type Gait = keyof typeof PANTHER_CYCLE;

const B = {
    hips: 'mixamorig:Hips',
    spine: ['mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2'],
    neck: 'mixamorig:Neck',
    head: 'mixamorig:Head',
    tail: ['Bone_020', 'Bone_019', 'Bone_018', 'Bone_017', 'Bone_016'],
    sash: [
        'Bone_003',
        'Bone_002',
        'Bone_005',
        'Bone_004',
        'Bone_007',
        'Bone_006',
        'Bone_015',
        'Bone_014',
        'Bone_013',
        'Bone_012'
    ]
};
const side = (s: 'Left' | 'Right', part: string) => `mixamorig:${s}${part}`;

type Rest = { node: GraphNode; pos: Vec3; rot: Quat; lpos: Vec3; lrot: Quat; lscale: Vec3 };

const v3 = (x: number, y: number, z: number) => new Vec3(x, y, z);
const sub = (a: Vec3, b: Vec3) => new Vec3().sub2(a, b);
const nrm = (a: Vec3) => a.clone().normalize();
const smooth = (t: number) => t * t * (3 - 2 * t);

// Rotation taking frame (a0, r0) to frame (a1, r1): each frame is a direction plus a reference that fixes the twist.
function frameMat(a: Vec3, r: Vec3) {
    const x = nrm(a);
    const z = nrm(sub(r, x.clone().mulScalar(x.dot(r))));
    const y = new Vec3().cross(z, x);
    const m = new Mat4();
    const d = m.data;
    d[0] = x.x;
    d[1] = x.y;
    d[2] = x.z;
    d[4] = y.x;
    d[5] = y.y;
    d[6] = y.z;
    d[8] = z.x;
    d[9] = z.y;
    d[10] = z.z;
    return m;
}
function swing(a0: Vec3, r0: Vec3, a1: Vec3, r1: Vec3) {
    const m0 = frameMat(a0, r0).invert();
    const m = new Mat4().mul2(frameMat(a1, r1), m0);
    return new Quat().setFromMat4(m);
}
const rotX = (deg: number) => new Quat().setFromEulerAngles(deg, 0, 0);

// Knee/elbow position for a two-bone chain root -> target with a pole direction.
function ik(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3) {
    const to = sub(target, root);
    let d = to.length();
    const u = to.clone().normalize();
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const w = nrm(sub(pole, u.clone().mulScalar(u.dot(pole))));
    return {
        joint: root.clone().add(u.clone().mulScalar(a)).add(w.mulScalar(h)),
        end: root.clone().add(u.mulScalar(d))
    };
}

const rotY = (deg: number) => new Quat().setFromEulerAngles(0, deg, 0);
const yawPitch = (yaw: number, pitch: number) => new Quat().mul2(rotY(yaw), rotX(pitch));

export function bakePantherRun(model: Entity, ready: AnimTrack, gait: Gait = PANTHER_SPRINT) {
    const SAMPLES = gait === PANTHER_SPRINT ? 32 : 34;
    const CYCLE = PANTHER_CYCLE[gait];
    // Pose in clean bind space: identity root, every node at its bind transform.
    const savedPos = model.getLocalPosition().clone(),
        savedScale = model.getLocalScale().clone(),
        savedRot = model.getLocalRotation().clone();
    model.setLocalPosition(0, 0, 0);
    model.setLocalScale(1, 1, 1);
    model.setLocalRotation(0, 0, 0, 1);
    const rest = new Map<string, Rest>();
    const all: GraphNode[] = [];
    model.forEach((n) => void all.push(n));
    for (const node of all)
        rest.set(node.name, {
            node,
            pos: node.getPosition().clone(),
            rot: node.getRotation().clone(),
            lpos: node.getLocalPosition().clone(),
            lrot: node.getLocalRotation().clone(),
            lscale: node.getLocalScale().clone()
        });
    const R = (name: string) => {
        const r = rest.get(name);
        if (!r) throw new Error(`Set panther run: missing bone ${name}`);
        return r;
    };
    const restoreBind = () => {
        for (const r of rest.values()) {
            r.node.setLocalPosition(r.lpos);
            r.node.setLocalRotation(r.lrot);
            r.node.setLocalScale(r.lscale);
        }
    };
    // Turn bone `name` (rest direction toward `child`, rest twist reference r0) to point along dir with twist ref r1.
    const aim = (name: string, child: string | Vec3, r0: Vec3, dir: Vec3, r1: Vec3) => {
        const b = R(name);
        const a0 = typeof child === 'string' ? sub(R(child).pos, b.pos) : child;
        const q = swing(a0, r0, dir, r1);
        b.node.setRotation(new Quat().mul2(q, b.rot));
        return q;
    };
    const turn = (name: string, q: Quat) => R(name).node.setRotation(new Quat().mul2(q, R(name).rot));
    const len = (a: string, b: string) => sub(R(b).pos, R(a).pos).length();

    // Proportions from Set's own bind skeleton.
    const hipRest = R(B.hips).pos;
    const legL1 = len(side('Left', 'UpLeg'), side('Left', 'Leg')),
        legL2 = len(side('Left', 'Leg'), side('Left', 'Foot'));
    const armL1 = len(side('Left', 'Arm'), side('Left', 'ForeArm')),
        armL2 = len(side('Left', 'ForeArm'), side('Left', 'Hand'));
    const toeY = R(side('Left', 'ToeBase')).pos.y;
    const HIP_Y = 0.5,
        HIP_Z = hipRest.z - 0.16;
    const X = v3(1, 0, 0),
        FWD = v3(0, 0, 1),
        BACK = v3(0, 0, -1);

    // Half-bound footfalls: hind pair lands together (slight lead), fore pair half a stride later.
    const limbs = [
        { s: 'Left' as const, hind: true, off: 0.0 },
        { s: 'Right' as const, hind: true, off: 0.08 },
        { s: 'Left' as const, hind: false, off: 0.52 },
        { s: 'Right' as const, hind: false, off: 0.62 }
    ];
    const DUTY = 0.38;
    const paw = (phase: number, off: number, reach: number, lift: number) => {
        const p = (((phase - off) % 1) + 1) % 1;
        if (p < DUTY) return { z: reach * (1 - (2 * p) / DUTY), y: 0, planted: 1 - Math.abs(1 - (2 * p) / DUTY) };
        const s = (p - DUTY) / (1 - DUTY);
        return { z: -reach + 2 * reach * smooth(s), y: lift * Math.sin(Math.PI * s), planted: 0 };
    };

    const animated = new Set<string>([B.hips, ...B.spine, B.neck, B.head, ...B.tail, ...B.sash]);
    for (const s of ['Left', 'Right'] as const)
        for (const p of ['Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase'])
            animated.add(side(s, p));
    // fingers held open (claws spread) instead of the punch frame's fist
    for (const s of ['Left', 'Right'] as const)
        for (const f of ['Thumb', 'Middle', 'Ring', 'Pinky'])
            for (const j of [1, 2, 3]) if (rest.has(side(s, `Hand${f}${j}`))) animated.add(side(s, `Hand${f}${j}`));
    const samples = new Map<string, number[]>();
    for (const n of animated) samples.set(n, []);
    const hipPos: number[] = [];

    const record = () => {
        for (const n of animated) {
            const q = R(n).node.getLocalRotation();
            const arr = samples.get(n)!;
            const at = arr.length;
            // keep quaternion sign continuous so interpolation takes the short way
            if (at >= 4 && arr[at - 4] * q.x + arr[at - 3] * q.y + arr[at - 2] * q.z + arr[at - 1] * q.w < 0)
                arr.push(-q.x, -q.y, -q.z, -q.w);
            else arr.push(q.x, q.y, q.z, q.w);
        }
        const hp = R(B.hips).node.getLocalPosition();
        hipPos.push(hp.x, hp.y, hp.z);
    };
    const handAim = (s: 'Left' | 'Right', dir: Vec3, thumbRef: Vec3) => {
        const hand = R(side(s, 'Hand'));
        const mid = R(side(s, 'HandMiddle1')).pos,
            thumb = R(side(s, 'HandThumb1')).pos;
        aim(side(s, 'Hand'), sub(mid, hand.pos), sub(thumb, hand.pos), dir, thumbRef);
    };
    const tailEnd = () => {
        const parent = R(B.tail[B.tail.length - 2]);
        turn(B.tail[B.tail.length - 1], new Quat().mul2(parent.node.getRotation(), parent.rot.clone().invert()));
    };

    // Upright sprint: one leg cycle per stride, left foot strikes at phase 0, right at 0.5.
    const SDUTY = 0.34,
        SREACH = 0.4;
    const stride = (phase: number, off: number) => {
        const p = (((phase - off) % 1) + 1) % 1;
        if (p < SDUTY) return { z: SREACH * (1 - (2 * p) / SDUTY), y: 0, swing: 0 };
        const s = (p - SDUTY) / (1 - SDUTY);
        // swing: heel kicks up under the hip first, then the foot reaches forward and drops for the next strike
        return {
            z: -SREACH + 2 * SREACH * smooth(Math.min(1, s * 1.08)),
            y: 0.32 * Math.sin(Math.PI * s) ** 0.8 * (1 - 0.35 * s),
            swing: Math.sin(Math.PI * s)
        };
    };
    const sprintPose = (phase: number) => {
        const w = 2 * Math.PI * phase;
        // compression at each mid-stance (phase 0.17 / 0.67), lift through the flight phases between
        const sink = Math.cos(2 * (w - 2 * Math.PI * (SDUTY / 2)));
        const sway = Math.cos(w - 2 * Math.PI * (SDUTY / 2)); // +1 over the planted left leg, -1 over the right
        const yaw = -9 * Math.cos(w - 2 * Math.PI * (0.5 + SDUTY / 2)); // pelvis turns with the swinging leg
        R(B.hips).node.setPosition(hipRest.x + 0.03 * sway, 0.97 - 0.045 * sink, hipRest.z + 0.02);
        turn(B.hips, yawPitch(yaw, 36 + 2 * sink));
        const lean = [52, 60, 66];
        B.spine.forEach((n, i) => turn(n, yawPitch(yaw * (1 - i * 0.9), lean[i] + 3 * sink)));
        turn(B.neck, yawPitch(-yaw * 0.6, 30));
        turn(B.head, yawPitch(0, 0 - 2 * sink));

        for (const s of ['Left', 'Right'] as const) {
            const sx = s === 'Left' ? 1 : -1;
            const up = R(side(s, 'UpLeg')).node.getPosition();
            const f = stride(phase, s === 'Left' ? 0 : 0.5);
            // ball of the foot contacts; the heel stays high behind it (digitigrade)
            const toe = v3(up.x - sx * 0.005, toeY + f.y, hipRest.z + 0.08 + f.z);
            const ankle = toe.clone().add(v3(0, 0.16 - 0.03 * f.swing, -0.09 - 0.05 * f.swing));
            const pole = v3(sx * 0.15, 0, 1);
            const knee = ik(up, ankle, legL1, legL2, pole);
            aim(side(s, 'UpLeg'), side(s, 'Leg'), FWD, sub(knee.joint, up), pole);
            aim(side(s, 'Leg'), side(s, 'Foot'), FWD, sub(knee.end, knee.joint), v3(sx * 0.1, 0, 1));
            aim(side(s, 'Foot'), side(s, 'ToeBase'), X, sub(toe, knee.end), X);
            aim(side(s, 'ToeBase'), side(s, 'Toe_End'), X, v3(0, -0.12 - 1.4 * f.swing, 1), X);

            // arms swing against the legs, carried forward and low with the claws out
            const swingA = -sx * Math.cos(w);
            const sh = R(side(s, 'Arm')).node.getPosition();
            const wrist = sh.clone().add(v3(sx * 0.05, -0.3 + 0.07 * swingA, 0.2 + 0.2 * swingA));
            const ePole = v3(sx * 0.7, 0, -1);
            const elbow = ik(sh, wrist, armL1, armL2, ePole);
            aim(side(s, 'Arm'), side(s, 'ForeArm'), BACK, sub(elbow.joint, sh), ePole);
            aim(side(s, 'ForeArm'), side(s, 'Hand'), BACK, sub(elbow.end, elbow.joint), v3(sx * 0.3, 0.3, -1));
            handAim(s, v3(0, -0.45, 1), v3(-sx, 0.4, 0));
        }
        // tail streams back, a little above level, waving once per stride as a counterweight
        for (let i = 0; i < B.tail.length - 1; i++)
            aim(
                B.tail[i],
                B.tail[i + 1],
                X,
                v3(0.24 * Math.sin(w + 0.6 + i * 0.8), 0.02 + 0.16 * i + 0.05 * sink, -1),
                X
            );
        tailEnd();
        B.sash.forEach((n, i) => turn(n, rotX((i >= 6 ? 34 : 24) + 7 * Math.sin(w * 2 + i))));
    };

    for (let k = 0; k <= SAMPLES; k++) {
        const phase = (k % SAMPLES) / SAMPLES;
        restoreBind();
        const w = 2 * Math.PI * phase;
        if (gait === PANTHER_SPRINT) {
            sprintPose(phase);
            record();
            continue;
        }
        // Spine flexes (arches) as the hind legs swing under, stretches as the forelegs reach out.
        const flex = Math.cos(w - 2 * Math.PI * 0.2);
        const bob = 0.03 * Math.cos(2 * w - 0.6);

        R(B.hips).node.setPosition(hipRest.x, HIP_Y + bob, HIP_Z);
        turn(B.hips, rotX(78 + 6 * flex));
        const spinePitch = [86, 92, 96];
        B.spine.forEach((n, i) => turn(n, rotX(spinePitch[i] - (i + 1) * 4 * flex)));
        turn(B.neck, rotX(52 - 4 * flex));
        turn(B.head, rotX(8 + 3 * Math.cos(2 * w)));

        for (const L of limbs) {
            const sx = L.s === 'Left' ? 1 : -1;
            if (L.hind) {
                const up = R(side(L.s, 'UpLeg')).node.getPosition();
                const f = paw(phase, L.off, 0.32, 0.16);
                // toe contact; the ankle sits up and behind it (digitigrade, heel off the ground)
                const toe = v3(up.x + sx * 0.03, toeY + f.y, HIP_Z + 0.05 + f.z);
                const ankle = toe.clone().add(v3(0, 0.2, -0.08 + 0.04 * f.planted));
                const knee = ik(up, ankle, legL1, legL2, v3(sx * 0.25, 0.2, 1));
                aim(side(L.s, 'UpLeg'), side(L.s, 'Leg'), FWD, sub(knee.joint, up), v3(sx * 0.25, 0.2, 1));
                aim(side(L.s, 'Leg'), side(L.s, 'Foot'), FWD, sub(knee.end, knee.joint), v3(sx * 0.1, 0, 1));
                aim(side(L.s, 'Foot'), side(L.s, 'ToeBase'), X, sub(toe, knee.end), X);
                aim(side(L.s, 'ToeBase'), side(L.s, 'Toe_End'), X, v3(0, -0.15 - 0.5 * f.y, 1), X);
            } else {
                const sh = R(side(L.s, 'Arm')).node.getPosition();
                const f = paw(phase, L.off, 0.3, 0.14);
                const wrist = v3(sh.x + sx * 0.02, 0.05 + f.y, sh.z + 0.12 + f.z);
                const elbow = ik(sh, wrist, armL1, armL2, v3(sx * 0.1, 0.25, -1));
                aim(side(L.s, 'Arm'), side(L.s, 'ForeArm'), BACK, sub(elbow.joint, sh), v3(sx * 0.1, 0.25, -1));
                aim(side(L.s, 'ForeArm'), side(L.s, 'Hand'), BACK, sub(elbow.end, elbow.joint), v3(0, 0.2, -1));
                // paw: flat and forward when planted, tucked under in swing; thumb toward the body's midline
                const hand = R(side(L.s, 'Hand'));
                const mid = R(side(L.s, 'HandMiddle1')).pos,
                    thumb = R(side(L.s, 'HandThumb1')).pos;
                const hd = sub(mid, hand.pos);
                const tuck = f.planted > 0 ? 0 : Math.sin(Math.PI * Math.min(1, f.y / 0.14));
                aim(side(L.s, 'Hand'), hd, sub(thumb, hand.pos), v3(0, -0.18 - 1.2 * tuck, 1), v3(-sx, 0, 0));
            }
        }
        // Tail: rises behind, counter-swings in an S against the bound.
        const tail = B.tail;
        for (let i = 0; i < tail.length - 1; i++) {
            const lift = 0.15 + 0.32 * i - 0.12 * flex;
            const sway = 0.28 * Math.sin(w + i * 0.7);
            aim(tail[i], tail[i + 1], X, v3(sway, lift, -1), X);
        }
        {
            const parent = R(tail[tail.length - 2]);
            const q = new Quat().mul2(parent.node.getRotation(), parent.rot.clone().invert());
            turn(tail[tail.length - 1], q);
        }
        // Sash strips keep hanging with gravity instead of tilting with the pelvis; a little flutter.
        B.sash.forEach((n, i) => turn(n, rotX((i >= 6 ? 40 : 16) + 6 * Math.sin(w * 2 + i))));

        record();
    }
    restoreBind();
    model.setLocalPosition(savedPos);
    model.setLocalScale(savedScale);
    model.setLocalRotation(savedRot);

    // Same curve layout as the Ready track; animated bones get the baked samples, everything else holds Ready.
    const times = Array.from({ length: SAMPLES + 1 }, (_, k) => (k / SAMPLES) * CYCLE);
    const inputs = [new AnimData(1, [0, CYCLE]), new AnimData(1, times)];
    const outputs: AnimData[] = [];
    const curves: AnimCurve[] = [];
    let baked = 0;
    ready.curves.forEach((curve) => {
        const path = curve.paths[0];
        const bone = path.entityPath.at(-1) as string;
        const prop = path.propertyPath[0];
        let data: number[] | null = null;
        if (prop === 'localRotation' && samples.has(bone)) data = samples.get(bone)!;
        if (prop === 'localPosition' && bone === B.hips) data = hipPos;
        if (data) {
            outputs.push(new AnimData(prop === 'localRotation' ? 4 : 3, data));
            curves.push(new AnimCurve(curve.paths, 1, outputs.length - 1, 1));
            baked++;
        } else {
            outputs.push(ready.outputs[curve.output]);
            curves.push(new AnimCurve(curve.paths, 0, outputs.length - 1, 1));
        }
    });
    if (baked < animated.size) throw new Error(`Set panther run: only ${baked} of ${animated.size + 1} curves bound`);
    return new AnimTrack(gait, CYCLE, inputs, outputs, curves);
}
