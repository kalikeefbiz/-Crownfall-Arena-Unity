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

import { AbilityInput } from './combat/ability-input.js';
import { hasStatus } from './combat/combat-core.js';
import { CommandStepper } from './combat/command-stepper.js';
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
    const abilities = new AbilityInput(
        { enabled: true },
        () => simulation.combat.player.angle,
        simulation.combat.definition,
        (x: number, y: number) => scene.dragVector(x, y, simulation)
    );
    abilities.update(simulation.combat);
    const refreshInspection = () => {
        const select = document.querySelector<HTMLSelectElement>('#inspect-actor')!;
        select.replaceChildren(...(simulation.match?.entities || []).map((a) => new Option(`${a.id} ${a.name}`, a.id)));
    };
    hud.onSelect((index) => {
        simulation.select(index);
        refreshInspection();
        abilities.setDefinition(simulation.combat.definition);
        abilities.update(simulation.combat);
    });
    document.querySelector('#reset-combat')!.addEventListener('click', () => {
        const index = (document.querySelector('#summoner') as HTMLSelectElement).selectedIndex;
        simulation.select(index);
        refreshInspection();
        abilities.setDefinition(simulation.combat.definition);
        abilities.clear();
        abilities.update(simulation.combat);
    });
    document.querySelector('#lifecycle-mode')!.addEventListener('change', (event) => {
        simulation.lifecycle = (event.target as HTMLInputElement).checked;
        document.body.classList.toggle('lifecycle', simulation.lifecycle);
        (document.querySelector('#reset-combat') as HTMLButtonElement).click();
    });
    document.querySelector('#start-match')!.addEventListener('click', () => simulation.match?.start());
    document.querySelector('#advance-match')!.addEventListener('click', () => simulation.match?.debugAdvance());
    for (const [id, lethal] of [
        ['lethal-actor', true],
        ['damage-actor', false]
    ] as const) {
        document
            .querySelector('#' + id)!
            .addEventListener('click', () =>
                simulation.match?.debugDamage(
                    (document.querySelector('#inspect-actor') as HTMLSelectElement).value,
                    lethal
                )
            );
    }
    document.querySelector('#charge')!.addEventListener('click', () => {
        if (!simulation.match || simulation.match.active) simulation.combat.player.ultimateMeter = 100;
    });
    document.querySelector('#damage-player')!.addEventListener('click', () => {
        simulation.combat.damage(simulation.combat.player, 100, simulation.combat.targets[0]);
    });
    const stepper = new CommandStepper();
    let frames = 0,
        hudElapsed = 0,
        smoothedDt = 1 / 60;
    app.on('update', (elapsed: number) => {
        const dt = Math.min(elapsed, 0.1);
        const frame = input.sample();
        const preview = abilities.preview;
        if (preview) {
            frame.aim = { x: Math.sin(preview.angle), z: Math.cos(preview.angle) };
            frame.targeting = true;
        }
        const accepted = stepper.advance(simulation.combat, abilities, frame, dt);
        const c = simulation.combat;
        simulation.update(
            {
                ...frame,
                movement: c.player.dead || hasStatus(c.player, 'stun', c.now) ? { x: 0, z: 0 } : frame.movement,
                aim: accepted ? { x: Math.sin(c.committedAngle), z: Math.cos(c.committedAngle) } : frame.aim,
                commit: accepted || frame.commit
            },
            dt,
            false
        );
        simulation.position = { x: c.player.x, z: c.player.z };
        simulation.collisions = c.collisions;
        abilities.update(c);
        scene.update(simulation, dt, abilities.preview);
        frames++;
        smoothedDt += (Math.max(elapsed, 0.001) - smoothedDt) * 0.1;
        hudElapsed += elapsed;
        if (hudElapsed >= 0.1) {
            hud.update(simulation, smoothedDt, frames, abilities.preview);
            hudElapsed = 0;
        }
    });
    app.on('destroy', () => {
        scene.destroy();
        input.destroy();
        abilities.destroy();
        window.removeEventListener('resize', resize);
        window.visualViewport?.removeEventListener('resize', resize);
    });
    // Read-only snapshots for browser smoke checks.
    Object.defineProperty(window, '__crownfall', {
        configurable: true,
        value: {
            snapshot: () =>
                structuredClone({
                    match: simulation.match?.snapshot() ?? null,
                    combat: {
                        name: simulation.combat.definition.id,
                        stance: simulation.combat.stance,
                        player: simulation.combat.player,
                        targets: simulation.combat.targets,
                        cooldowns: simulation.combat.cooldowns.ends,
                        now: simulation.combat.now,
                        transactions: simulation.combat.transactions,
                        journal: {
                            latestAttempt: simulation.combat.journal.latestAttempt,
                            latestAccepted: simulation.combat.journal.latestAccepted,
                            latestResolution: simulation.combat.journal.latestResolution,
                            hits: simulation.combat.journal.hits
                        },
                        weapons: simulation.combat.weapons.blades.map((b) => ({ x: b.x, z: b.z, phase: b.phase }))
                    },
                    preview: scene.preview,
                    input: { pointer: abilities.pointerState, cancel: !!abilities.preview?.cancel },
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
