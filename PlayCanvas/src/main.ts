import {
    AppBase,
    AppOptions,
    CameraComponentSystem,
    Entity,
    FILLMODE_FILL_WINDOW,
    LightComponentSystem,
    RESOLUTION_AUTO,
    RenderComponentSystem,
    createGraphicsDevice
} from 'playcanvas';

import { Simulation } from './gameplay/simulation';
import { Controls } from './input/controls';
import { createScene } from './presentation/scene';
import { createHud } from './ui/hud';
import './style.css';

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
try {
    const device = await createGraphicsDevice(canvas, { deviceTypes: ['webgl2'] });
    device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem];
    const app = new AppBase(canvas);
    app.init(options);
    app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(RESOLUTION_AUTO);
    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    const simulation = new Simulation();
    const scene = createScene(app);
    const hud = createHud();
    const input = new Controls(hud.move, hud.aim, canvas, (x, y) => scene.screenAim(x, y, simulation));
    let frames = 0,
        hudElapsed = 0,
        smoothedDt = 1 / 60;
    app.on('update', (elapsed: number) => {
        const dt = Math.min(elapsed, 0.05);
        simulation.update(input.sample(), dt);
        scene.update(simulation, dt);
        frames++;
        smoothedDt += (Math.max(elapsed, 0.001) - smoothedDt) * 0.1;
        hudElapsed += elapsed;
        if (hudElapsed >= 0.1) {
            hud.update(simulation, smoothedDt, frames);
            hudElapsed = 0;
        }
    });
    app.on('destroy', () => {
        input.destroy();
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', resize);
    });
    // Read-only snapshots for browser smoke checks.
    Object.defineProperty(window, '__crownfall', {
        configurable: true,
        value: {
            snapshot: () =>
                structuredClone({
                    position: simulation.position,
                    movement: simulation.movement,
                    aim: simulation.aim,
                    facing: simulation.facing,
                    targeting: simulation.targeting,
                    committedFacing: simulation.committedFacing,
                    collisions: simulation.collisions,
                    frames,
                    entities: app.root.find((e) => e instanceof Entity).length,
                    visualScaleX: (app.root.findByName('Kit-presentation') as Entity).getLocalScale().x,
                    rootScaleX: (app.root.findByName('Kit-gameplay-root') as Entity).getLocalScale().x
                })
        }
    });
    app.start();
    if (import.meta.hot) import.meta.hot.dispose(() => app.destroy());
} catch (error) {
    const message = document.createElement('p');
    message.textContent = 'Unable to start WebGL2 arena: ' + String(error);
    document.body.append(message);
    throw error;
}
