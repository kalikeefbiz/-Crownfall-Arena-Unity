import { Asset, BLEND_NORMAL, Color, CULLFACE_NONE, Entity, StandardMaterial, Vec2, Vec3 } from 'playcanvas';
import type { AppBase, Texture } from 'playcanvas';

// 2.5D proof: Set drawn from the founder's painted 2D frames (the 2D build's 8-frame run and idle) on a camera-facing
// card in the 3D arena, instead of the Meshy model. Presentation only; collision and simulation are unchanged.
// Layout and foot line come from scripts/summoners/build-set-sprites.py.
export const SET_SPRITE_ATLAS = 'assets/summoners/set/sprite/set-atlas.webp';
const COLS = 3,
    ROWS = 3,
    FPS = 12,
    IDLE = 8;
const FOOT_Y = 0.9443,
    IDLE_FOOT_Y = 0.9629,
    CENTRE_X = 0.5084;
// Every cell maps to the same world box (as in the 2D build): ~2.3 m standing, ~1.8 m in the running crouch.
export const SET_SPRITE_HEIGHT = 2.4;
const ASPECT = 437 / 431;

let shared: { asset: Asset; ready: Promise<Texture> } | null = null;
function atlas(app: AppBase) {
    if (shared && app.assets.get(shared.asset.id)) return shared;
    const asset = new Asset(
        'set-sprite-atlas',
        'texture',
        { url: `${import.meta.env.BASE_URL}${SET_SPRITE_ATLAS}` },
        {
            mipmaps: true,
            srgb: true
        }
    );
    const ready = new Promise<Texture>((resolve, reject) => {
        asset.ready((a) => resolve(a.resource as Texture));
        asset.once('error', reject);
    });
    app.assets.add(asset);
    app.assets.load(asset);
    shared = { asset, ready };
    return shared;
}

export function createSetSprite(app: AppBase, root: Entity) {
    const card = new Entity('Set-sprite');
    const quad = new Entity('Set-sprite-quad');
    card.addChild(quad);
    root.addChild(card);
    card.enabled = false;
    const material = new StandardMaterial();
    material.useLighting = false;
    material.useSkybox = false;
    material.useFog = true;
    material.diffuse = new Color(0, 0, 0);
    material.emissive = new Color(0.97, 0.97, 0.97);
    material.opacityMapChannel = 'a';
    material.blendType = BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = CULLFACE_NONE;
    const tiling = new Vec2(1 / COLS, 1 / ROWS),
        offset = new Vec2();
    material.emissiveMapTiling = tiling;
    material.opacityMapTiling = tiling;
    material.emissiveMapOffset = offset;
    material.opacityMapOffset = offset;
    material.update();
    quad.addComponent('render', { type: 'plane', material, castShadows: false, receiveShadows: false });
    quad.setLocalEulerAngles(90, 0, 0); // plane normal +Y -> +Z, toward the camera once the card copies its rotation
    let loaded = false;
    const state = { loaded: false, frame: 0, mirrored: false, error: '' };
    void atlas(app).ready.then(
        (texture) => {
            material.emissiveMap = texture;
            material.opacityMap = texture;
            material.update();
            loaded = state.loaded = true;
        },
        () => (state.error = 'Set sprite atlas unavailable')
    );
    let mirrored = false,
        clock = 0,
        lastFrame = -1,
        lastMirror = false;
    const right = new Vec3();
    const scaleWorld = new Vec3();
    return {
        state,
        get ready() {
            return loaded;
        },
        // facing: world direction the character faces (x, z); moving selects the run cycle.
        update(dt: number, visible: boolean, moving: boolean, faceX: number, faceZ: number) {
            card.enabled = visible && loaded;
            if (!card.enabled) return;
            const cam = app.root.findByName('MOBA-camera') as Entity | null;
            if (!cam) return;
            clock += dt;
            // The painted frames face right; mirror when the facing points left on screen. Hold when nearly vertical.
            right.copy(cam.right);
            const sx = faceX * right.x + faceZ * right.z;
            if (Math.abs(sx) > 0.25) mirrored = sx < 0;
            const frame = moving ? Math.floor(clock * FPS) % 8 : IDLE;
            if (frame !== lastFrame || mirrored !== lastMirror) {
                const col = frame % COLS,
                    row = Math.floor(frame / COLS);
                tiling.set((mirrored ? -1 : 1) / COLS, 1 / ROWS);
                offset.set((col + (mirrored ? 1 : 0)) / COLS, 1 - (row + 1) / ROWS);
                material.emissiveMapTiling = tiling;
                material.opacityMapTiling = tiling;
                material.emissiveMapOffset = offset;
                material.opacityMapOffset = offset;
                material.update();
                lastFrame = frame;
                lastMirror = mirrored;
            }
            state.frame = frame;
            state.mirrored = mirrored;
            // Card: at the feet, facing the camera, undoing any scale on the actor root.
            const p = root.getPosition();
            card.setPosition(p.x, p.y + 0.02, p.z);
            card.setRotation(cam.getRotation());
            scaleWorld.copy(root.getScale());
            const H = SET_SPRITE_HEIGHT,
                W = H * ASPECT;
            card.setLocalScale(1 / (scaleWorld.x || 1), 1 / (scaleWorld.y || 1), 1 / (scaleWorld.z || 1));
            const foot = frame === IDLE ? IDLE_FOOT_Y : FOOT_Y;
            quad.setLocalScale(W, 1, H);
            quad.setLocalPosition((mirrored ? 1 : -1) * (CENTRE_X - 0.5) * W, H * (foot - 0.5), 0);
        },
        destroy() {
            card.destroy();
        }
    };
}
