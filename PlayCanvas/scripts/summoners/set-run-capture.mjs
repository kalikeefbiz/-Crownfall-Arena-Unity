// Close-up review frames of Set's locomotion: freezes a live match, poses one Set at fixed points of the run cycle
// and shoots side, three-quarter and gameplay-camera views. Headless SwiftShader: judge pose and shape, not lighting.
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const url = process.env.CAPTURE_URL || 'http://127.0.0.1:4182/';
const name = process.env.CAPTURE_NAME || 'set-run';
const state = process.env.SET_STATE || 'PantherSprint';
const out = process.env.OUT_DIR || 'evidence/summoners';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 420, height: 420 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.route('**/assets/game-*.js', async (r) => {
    const response = await r.fetch();
    let body = await response.text();
    const id = body.match(/entities:(\w+)\.root\.find/)[1];
    body = body.replace('Object.defineProperty(window,"__crownfall",', `window.__reviewApp=${id};Object.defineProperty(window,"__crownfall",`);
    await r.fulfill({ response, body });
});
try {
    await page.goto(url + '?verify=1' + (process.env.CAPTURE_QUERY || ''));
    await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    await page.waitForFunction(
        () => window.__reviewApp.root.find((e) => e.name === 'Set-3D-facing' && e.children[0]?.anim).length > 0,
        null,
        { timeout: 120000 }
    );
    await page.evaluate(() => window.__crownfall.verification.pause());
    await page.addStyleTag({ content: '* { visibility: hidden !important } canvas { visibility: visible !important }' });
    const info = await page.evaluate(() => {
        const pivot = window.__reviewApp.root.find((e) => e.name === 'Set-3D-facing' && e.children[0]?.anim)[0];
        const model = pivot.children[0];
        return { states: model.anim.baseLayer.states, duration: model.anim.baseLayer.activeStateDuration };
    });
    console.log('states', JSON.stringify(info));
    if (process.env.DEBUG_POSE)
        console.log(
            await page.evaluate((state) => {
                const pivot = window.__reviewApp.root.find((e) => e.name === 'Set-3D-facing' && e.children[0]?.anim)[0];
                const m = pivot.children[0];
                m.anim.baseLayer.play(state);
                m.anim.baseLayer.activeStateCurrentTime = 0.1;
                m.anim.update(0);
                const g = (n) => m.findByName(n);
                return JSON.stringify({
                    active: m.anim.baseLayer.activeState,
                    hips: g('mixamorig:Hips').getLocalPosition().toArray(),
                    spine2: g('mixamorig:Spine2').getLocalEulerAngles().toArray(),
                    world: ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine2', 'mixamorig:Neck', 'mixamorig:Head'].map((n) => {
                        const inv = m.getWorldTransform().clone().invert();
                        return inv.transformPoint(g(n).getPosition()).toArray().map((v) => +v.toFixed(3));
                    }),
                    track: m.anim.baseLayer._controller._states?.[state]?._animationList?.[0]?.animTrack?.duration
                });
            }, state)
        );
    const views = (process.env.VIEWS || 'side,quarter,game').split(',');
    const frames = Number(process.env.FRAMES || 6);
    for (const view of views)
        for (let f = 0; f < frames; f++) {
            await page.evaluate(
                ({ view, f, frames, state }) => {
                    const app = window.__reviewApp;
                    const pivot = app.root.find((e) => e.name === 'Set-3D-facing' && e.children[0]?.anim)[0];
                    const model = pivot.children[0];
                    const cam = app.root.findByName('MOBA-camera');
                    if (window.__setShot) app.off('prerender', window.__setShot);
                    window.__setShot = () => {
                        const layer = model.anim.baseLayer;
                        if (layer.activeState !== state) layer.play(state);
                        layer.activeStateCurrentTime = (f / frames) * layer.activeStateDuration;
                        model.anim.playing = true;
                        model.anim.update(0);
                        // isolate this Set: hide every other summoner presenter and fallback for the shot
                        app.root
                            .find((e) => /-3D-facing$/.test(e.name) && e !== pivot)
                            .forEach((e) => (e.enabled = false));
                        app.root.find((e) => e.parent && e.parent.children.includes(pivot) && e !== pivot && e.render && !e.name.includes('kit')).forEach((e) => (e.enabled = false));
                        // stage the shot on open lane ground away from the spawn crowd (presentation only, this frame)
                        const holder = pivot.parent;
                        const hp = holder.getPosition();
                        holder.setPosition(0, hp.y, 22);
                        holder.children.filter((e) => e !== pivot).forEach((e) => (e.enabled = false));
                        app.root.find((e) => /weapon|Moonreaper/i.test(e.name)).forEach((e) => (e.enabled = false));
                        const p = pivot.getPosition();
                        const fwd = pivot.forward.clone().mulScalar(-1); // authored forward is the pivot's +Z
                        const right = fwd.clone().cross(fwd, { x: 0, y: 1, z: 0 }).normalize();
                        const c =
                            view === 'side'
                                ? p.clone().add(right.clone().mulScalar(3.4)).add({ x: 0, y: 0.9, z: 0 })
                                : view === 'quarter'
                                  ? p.clone().add(right.clone().mulScalar(2.2)).add(fwd.clone().mulScalar(2.4)).add({ x: 0, y: 1.3, z: 0 })
                                  : p.clone().add({ x: 0, y: 15.5 * 0.45, z: 18 * 0.45 });
                        cam.camera.fov = view === 'game' ? 48 : 40;
                        cam.setPosition(c.x, c.y, c.z);
                        cam.lookAt(p.x, p.y + (view === 'game' ? 0.4 : 0.75), p.z);
                    };
                    app.on('prerender', window.__setShot);
                },
                { view, f, frames, state }
            );
            await page.waitForTimeout(700);
            await writeFile(
                `${out}/${name}-${view}-${f}.png`,
                Buffer.from(await page.screenshot({ type: 'png' }))
            );
        }
    console.log('done', errors.length ? errors : 'no errors');
} finally {
    await browser.close();
}
