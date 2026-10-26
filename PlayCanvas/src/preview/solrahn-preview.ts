import {
    AppBase,
    AppOptions,
    CameraComponentSystem,
    Color,
    Entity,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    PROJECTION_ORTHOGRAPHIC,
    PROJECTION_PERSPECTIVE,
    RenderComponentSystem,
    RESOLUTION_AUTO,
    Vec3,
    createGraphicsDevice
} from 'playcanvas';

import { CONFIG } from '../combat/config.js';
import {
    CAMERA_FOLLOW_RATE,
    CAMERA_LOOK_AHEAD,
    CAMERA_OFFSET,
    referenceToWorld,
    worldToReference
} from '../combat/match-space.js';
import { Controls } from '../input/controls';
import { blueprint, createTraversal, heightAt, LANES, SITES, traverse, worldMap } from '../maps/solrahn';
import type { Mode, Point } from '../maps/solrahn';

import { createSolrahnScene } from './solrahn-scene';
import './solrahn.css';

export async function createSolrahnPreview() {
    const started = performance.now();
    const canvas = document.querySelector<HTMLCanvasElement>('#application-canvas')!;
    const abort = new AbortController();
    document.body.classList.add('solrahn-preview');
    const panel = document.createElement('section');
    panel.id = 'solrahn-panel';
    panel.innerHTML = `
        <div class="solrahn-title"><strong>SOL’RAHN · GEOGRAPHY PREVIEW</strong><a href="?">Exit</a></div>
        <div class="solrahn-toolbar">
          <label>Region <select id="solrahn-mode"><option value="master">Full master map</option><option value="3v3">3v3 active band</option></select></label>
          <label>View <select id="solrahn-view"><option value="overview">Full overview</option><option value="follow">Gameplay camera</option><option value="upper">Upper lane</option><option value="middle">Middle lane</option><option value="lower">Lower lane</option><option value="wilderness">Wilderness</option><option value="blue">Blue base</option><option value="red">Red base</option></select></label>
          <label>Survey <select id="solrahn-station"><option value="center">Center</option><option value="blue">Blue spawn</option><option value="red">Red spawn</option><option value="upper">Upper lane</option><option value="lower">Lower lane</option><option value="north">Upper Wilderness</option><option value="major">Major objective</option></select></label>
          <label><input id="solrahn-guides" type="checkbox" checked> Routes</label>
          <button id="solrahn-details" aria-expanded="false">Guide</button>
        </div>
        <div id="solrahn-help" hidden>WASD / arrows or left stick to walk at the existing 6 units/s. Survey places the navigation proxy; View changes only the camera. Upper/lower survey sites require Full master map. Cyan fences block |Z| &gt; 35 in 3v3. Dashed lane centers, green route guides, gold objective rings; green ground is open Wilderness, gray rocks block movement. This geography harness uses the existing movement authority and a 1.75m proxy. No match, AI, scoring or rewards run here.</div>
        <output id="solrahn-status" aria-live="off"></output>`;
    document.body.append(panel);
    const labels = document.createElement('div');
    labels.id = 'solrahn-labels';
    document.body.append(labels);
    const moveZone = document.createElement('div');
    moveZone.id = 'solrahn-stick';
    moveZone.textContent = 'MOVE';
    moveZone.setAttribute('aria-label', 'Movement joystick');
    document.body.append(moveZone);
    const aimZone = document.createElement('div');
    aimZone.hidden = true;
    const device = await createGraphicsDevice(canvas, { deviceTypes: ['webgl2'] });
    device.maxPixelRatio = Math.min(window.devicePixelRatio, 1.75);
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem];
    const app = new AppBase(canvas);
    app.init(options);
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    const scene = createSolrahnScene(app);
    const camera = new Entity('solrahn-inspection-camera');
    camera.addComponent('camera', { clearColor: new Color(0.055, 0.08, 0.1), fov: 48, nearClip: 0.1, farClip: 600 });
    app.root.addChild(camera);
    const params = new URLSearchParams(location.search);
    let mode: Mode = params.get('mapMode') === '3v3' ? '3v3' : 'master';
    let sim = createTraversal(mode, { x: 0, z: 0 });
    let view = 'overview';
    const follow = new Vec3(sim.player.x, 0, sim.player.z);
    const modeSelect = panel.querySelector<HTMLSelectElement>('#solrahn-mode')!;
    const viewSelect = panel.querySelector<HTMLSelectElement>('#solrahn-view')!;
    const stationSelect = panel.querySelector<HTMLSelectElement>('#solrahn-station')!;
    modeSelect.value = mode;
    scene.setMode(mode);
    const stations: Record<string, Point> = {
        center: { x: 0, z: 0 },
        blue: { x: -108, z: 0 },
        red: { x: 108, z: 0 },
        upper: { x: 0, z: -51 },
        lower: { x: 0, z: 51 },
        north: { x: 0, z: -25 },
        major: { x: 0, z: 26 }
    };
    const input = new Controls(moveZone, aimZone, canvas, () => ({ x: 0, z: -1 }));
    function place(p: Point) {
        const w = referenceToWorld(p);
        if (sim.blocked(w.x, w.z)) return false;
        sim.player.x = w.x;
        sim.player.z = w.z;
        sim.player.previous = { ...w };
        follow.set(w.x, heightAt(p.x, p.z), w.z);
        return true;
    }
    modeSelect.addEventListener(
        'change',
        () => {
            mode = modeSelect.value as Mode;
            const position = worldToReference(sim.player);
            sim = createTraversal(mode, { x: 0, z: 0 });
            place(position);
            scene.setMode(mode);
            for (const option of stationSelect.options)
                option.disabled = mode === '3v3' && ['upper', 'lower'].includes(option.value);
            if (mode === '3v3' && Math.abs(position.z) > 34.5) stationSelect.value = 'center';
        },
        { signal: abort.signal }
    );
    stationSelect.addEventListener(
        'change',
        () => {
            place(stations[stationSelect.value]);
            input.reset();
        },
        { signal: abort.signal }
    );
    viewSelect.addEventListener(
        'change',
        () => {
            view = viewSelect.value;
            follow.set(
                sim.player.x,
                heightAt(worldToReference(sim.player).x, worldToReference(sim.player).z),
                sim.player.z
            );
        },
        { signal: abort.signal }
    );
    panel
        .querySelector<HTMLInputElement>('#solrahn-guides')!
        .addEventListener('change', (e) => scene.guides((e.target as HTMLInputElement).checked), {
            signal: abort.signal
        });
    panel.querySelector('#solrahn-details')!.addEventListener(
        'click',
        (e) => {
            const help = panel.querySelector<HTMLElement>('#solrahn-help')!;
            help.hidden = !help.hidden;
            (e.target as HTMLElement).setAttribute('aria-expanded', String(!help.hidden));
        },
        { signal: abort.signal }
    );
    window.addEventListener('resize', () => app.resizeCanvas(), { signal: abort.signal });
    for (const option of stationSelect.options)
        option.disabled = mode === '3v3' && ['upper', 'lower'].includes(option.value);
    const labelSites = [
        ...SITES.map((s) => ({
            ...s,
            label:
                s.type === 'core'
                    ? `${s.x < 0 ? 'BLUE' : 'RED'} CROWN CORE`
                    : s.id === 'major'
                      ? 'MAJOR OBJECTIVE'
                      : s.type.toUpperCase()
        })),
        ...LANES.map((l) => ({
            x: 0,
            z: l.points[Math.floor(l.points.length / 2)].z,
            label: `${l.id.toUpperCase()} LANE · ${l.width}m`
        })),
        { x: -101, z: 13, label: 'BLUE BASE' },
        { x: 101, z: 13, label: 'RED BASE' }
    ].map((p) => {
        const element = document.createElement('span');
        element.textContent = p.label;
        labels.append(element);
        return { p, element };
    });
    let frames = 0,
        accumulator = 0,
        elapsed = 0,
        lastFrame = performance.now();
    const frameTimes: number[] = [];
    function present(dt: number) {
        const p = worldToReference(sim.player),
            h = heightAt(p.x, p.z);
        scene.actor.setPosition(sim.player.x, h, sim.player.z);
        scene.actor.setEulerAngles(0, (sim.player.angle * 180) / Math.PI, 0);
        const blend = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
        follow.lerp(follow, new Vec3(sim.player.x, h, sim.player.z), blend);
        if (view === 'follow') {
            camera.camera!.projection = PROJECTION_PERSPECTIVE;
            camera.setPosition(follow.x, follow.y + CAMERA_OFFSET.y, follow.z + CAMERA_OFFSET.z);
            camera.lookAt(new Vec3(follow.x, follow.y, follow.z - CAMERA_LOOK_AHEAD));
        } else {
            camera.camera!.projection = PROJECTION_ORTHOGRAPHIC;
            const centers: Record<string, Point> = {
                overview: { x: 0, z: canvas.clientHeight <= 480 ? -18 : -4 },
                upper: { x: 0, z: -41 },
                middle: { x: 0, z: 0 },
                lower: { x: 0, z: 41 },
                wilderness: { x: 0, z: 25 },
                blue: { x: -96, z: 0 },
                red: { x: 96, z: 0 }
            };
            const center = referenceToWorld(centers[view] ?? centers.overview);
            const halfHeight =
                view === 'overview'
                    ? Math.max(canvas.clientHeight <= 480 ? 120 : 96, 132 / (canvas.clientWidth / canvas.clientHeight))
                    : view === 'blue' || view === 'red'
                      ? 28
                      : 40;
            camera.camera!.orthoHeight = halfHeight;
            camera.setPosition(center.x, 230, center.z);
            camera.lookAt(new Vec3(center.x, 0, center.z), new Vec3(-1, 0, 0));
        }
        for (const { p: site, element } of labelSites) {
            const screen = scene.project(camera, site);
            const hidden =
                (view === 'follow' && screen.z < 0) ||
                screen.x < 0 ||
                screen.x > canvas.clientWidth ||
                screen.y < 100 ||
                screen.y > canvas.clientHeight - 20;
            element.hidden = hidden;
            element.style.transform = `translate(${screen.x}px,${screen.y}px)`;
            element.classList.toggle('inactive', mode === '3v3' && Math.abs(site.z) > 35);
        }
        panel.querySelector('output')!.textContent =
            `${mode === 'master' ? 'MASTER · ALL LANES' : '3v3 · MIDDLE + WILDERNESS'} | X ${p.x.toFixed(1)} · Z ${p.z.toFixed(1)} · Y ${h.toFixed(2)} | 240 × 144m | 6m/s`;
    }
    const snapshot = () => ({
        mode,
        view,
        position: worldToReference(sim.player),
        world: { x: sim.player.x, z: sim.player.z },
        height: heightAt(worldToReference(sim.player).x, worldToReference(sim.player).z),
        collisions: sim.collisions,
        distance: sim.player.distance,
        frames,
        elapsed,
        geometry: scene.stats,
        dimensions: { x: blueprint.extent.x, z: blueprint.extent.z },
        cores: blueprint.cores,
        sites: SITES,
        camera: { offset: CAMERA_OFFSET, lookAhead: CAMERA_LOOK_AHEAD },
        movement: { speed: sim.config.summoner.speed, radius: sim.config.summoner.radius },
        performance: {
            setupMs: readyAt - started,
            documentReadyMs: readyAt,
            frameSamples: frameTimes.length,
            medianMs: percentile(0.5),
            p95Ms: percentile(0.95),
            drawCalls: app.stats.drawCalls.total,
            renderedPrimitiveCounter: app.stats.frame.primitives ?? null,
            vram: device._vram
        },
        boundaries: mode === '3v3' ? blueprint.three_v_three.active_z_bounds : blueprint.extent.z
    });
    function percentile(p: number) {
        return [...frameTimes].sort((a, b) => a - b)[Math.floor((frameTimes.length - 1) * p)] ?? 0;
    }
    const api = {
        snapshot,
        place: (p: Point) => {
            const ok = place(p);
            present(1);
            return ok;
        },
        view: (value: string) => {
            if ([...viewSelect.options].some((o) => o.value === value)) {
                view = value;
                viewSelect.value = value;
                present(1);
            }
        },
        advance: (command: { moveX: number; moveZ: number }, seconds: number) => {
            for (let i = 0; i < Math.min(seconds, 120) * 60; i++) sim.step(command, 1 / 60);
            present(1);
        },
        traverse,
        worldMap
    };
    Object.defineProperty(window, '__solrahn', { value: api, configurable: true });
    const readyAt = performance.now();
    app.on('update', (dt: number) => {
        const now = performance.now(),
            frameMs = now - lastFrame;
        lastFrame = now;
        if (frames > 10) {
            frameTimes.push(frameMs);
            if (frameTimes.length > 300) frameTimes.shift();
        }
        frames++;
        elapsed += dt;
        accumulator += Math.min(dt, CONFIG.maxFrameDelta);
        const frame = input.sample();
        const movement = view === 'follow' ? frame.movement : { x: frame.movement.z, z: -frame.movement.x };
        while (accumulator >= 1 / 60) {
            sim.step({ moveX: movement.x, moveZ: movement.z }, 1 / 60);
            accumulator -= 1 / 60;
        }
        present(dt);
    });
    let destroyed = false;
    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        abort.abort();
        input.destroy();
        scene.destroy();
        camera.destroy();
        panel.remove();
        labels.remove();
        moveZone.remove();
        document.body.classList.remove('solrahn-preview');
        Reflect.deleteProperty(window, '__solrahn');
        app.destroy();
    };
    window.addEventListener('pagehide', destroy, { once: true, signal: abort.signal });
    if (import.meta.hot) import.meta.hot.dispose(destroy);
    present(1);
    app.start();
    return { destroy, snapshot };
}
