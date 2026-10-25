import {
    AnimComponentSystem,
    AppBase,
    AppOptions,
    CameraComponentSystem,
    ContainerHandler,
    TextureHandler,
    RenderHandler,
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
import { HumanAimAssist } from './combat/human-aim.js';
import { matchSpawn } from './combat/match-space.js';
import { Simulation } from './gameplay/simulation';
import { Controls } from './input/controls';
import { createScene } from './presentation/scene';
import { createHud } from './ui/hud';

export async function createGame(
    managed = false,
    onResult: () => void = () => {
        /* Inspection entry has no front-end results callback. */
    },
    practice = false
) {
    let running = !managed;
    let preparing = false;
    let resultReported = false;
    // The canvas owns the application even when the entry module is re-evaluated.
    // A rematch stays inside this owner; only full application disposal releases art.
    const ownerKey = Symbol.for('crownfall.application');
    const canvas = document.getElementById('application-canvas') as HTMLCanvasElement & {
        [ownerKey]?: { destroy(): void };
    };
    canvas[ownerKey]?.destroy();
    const abort = new AbortController();
    const owned: {
        app?: AppBase;
        scene?: ReturnType<typeof createScene>;
        hud?: ReturnType<typeof createHud>;
        input?: Controls;
        abilities?: AbilityInput;
    } = {};
    let disposed = false;
    let diagnostics: object | undefined;
    const priorModes = ['debug', 'playable', 'lifecycle'].map(
        (mode) => [mode, document.body.classList.contains(mode)] as const
    );
    const assertLive = () => {
        if (disposed) throw new Error('Crownfall application disposed');
    };
    const cleanup = () => {
        if (disposed) return;
        disposed = true;
        abort.abort();
        // Release captured pointers before removing their DOM or presentation targets.
        owned.input?.destroy();
        owned.abilities?.destroy();
        owned.hud?.destroy();
        owned.scene?.destroy();
        if (Object.getOwnPropertyDescriptor(window, '__crownfall')?.value === diagnostics)
            Reflect.deleteProperty(window, '__crownfall');
        if (canvas[ownerKey] === owner) delete canvas[ownerKey];
        for (const [mode, present] of priorModes) document.body.classList.toggle(mode, present);
    };
    const owner = {
        destroy() {
            if (disposed) return;
            if (owned.app) owned.app.destroy();
            else cleanup();
        }
    };
    canvas[ownerKey] = owner;
    if (import.meta.hot) import.meta.hot.dispose(() => owner.destroy());
    try {
        const device = await createGraphicsDevice(canvas, { deviceTypes: ['webgl2'] });
        if (disposed) {
            device.destroy();
            assertLive();
        }
        device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
        const options = new AppOptions();
        options.graphicsDevice = device;
        options.resourceHandlers = [ContainerHandler, TextureHandler, RenderHandler];
        options.componentSystems = [
            RenderComponentSystem,
            CameraComponentSystem,
            LightComponentSystem,
            AnimComponentSystem
        ];
        const app = new AppBase(canvas);
        app.init(options);
        owned.app = app;
        app.on('destroy', cleanup);
        app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
        app.setCanvasResolution(RESOLUTION_AUTO);
        // Pinch zoom changes visualViewport, not the game's layout size. Do not rebuild
        // the canvas (or clear captured touches) on every zoom/URL-bar viewport event.
        const resize = () => app.resizeCanvas();
        window.addEventListener('resize', resize, { signal: abort.signal });
        const debug = new URLSearchParams(location.search).get('debug') === '1' || practice;
        document.body.classList.toggle('debug', debug);
        document.body.classList.toggle('playable', !debug);
        const simulation = new Simulation();
        simulation.lifecycle = !debug;
        simulation.bots = !debug;
        simulation.select(0);
        document.body.classList.toggle('lifecycle', simulation.lifecycle);
        const scene = (owned.scene = createScene(app, !debug));
        const hud = (owned.hud = createHud());
        const stepper = new CommandStepper();
        const input = (owned.input = new Controls(hud.move, hud.aim, canvas, (x, y) =>
            scene.screenAim(x, y, simulation)
        ));
        const abilities = (owned.abilities = new AbilityInput(
            { enabled: true },
            () => simulation.combat.player.angle,
            simulation.combat.definition,
            (x: number, y: number) => scene.dragVector(x, y, simulation)
        ));
        const aimAssist = new HumanAimAssist(!debug);
        abilities.aimAssist = aimAssist;
        const assistToggle = document.querySelector<HTMLButtonElement>('#aim-assist')!;
        let savedAssist: string | null = null;
        try {
            savedAssist = localStorage.getItem('crownfall.aimAssist');
        } catch {
            /* Optional preference storage. */
        }
        const assistQuery = new URLSearchParams(location.search).get('aimAssist');
        aimAssist.enabled =
            assistQuery === '0'
                ? false
                : assistQuery === '1'
                  ? true
                  : savedAssist === null
                    ? !debug
                    : savedAssist === 'on';
        const updateAssistToggle = () => {
            assistToggle.textContent = `Aim Assist: ${aimAssist.enabled ? 'On' : 'Off'}`;
            assistToggle.setAttribute('aria-pressed', String(aimAssist.enabled));
        };
        updateAssistToggle();
        assistToggle.addEventListener(
            'click',
            (event) => {
                if (event.detail > 0) assistToggle.blur();
                aimAssist.enabled = !aimAssist.enabled;
                aimAssist.clear();
                updateAssistToggle();
                try {
                    localStorage.setItem('crownfall.aimAssist', aimAssist.enabled ? 'on' : 'off');
                } catch {
                    /* Play without persistence. */
                }
            },
            { signal: abort.signal }
        );
        abilities.update(simulation.combat);
        const refreshInspection = () => {
            const select = document.querySelector<HTMLSelectElement>('#inspect-actor')!;
            select.replaceChildren(
                ...(simulation.match?.entities || []).map((a) => new Option(`${a.id} ${a.name}`, a.id))
            );
        };
        hud.onSelect((index) => {
            verificationPaused = false;
            simulation.select(index);
            stepper.accumulator = 0;
            abilities.clear();
            input.reset();
            refreshInspection();
            abilities.setDefinition(simulation.combat.definition);
            abilities.update(simulation.combat);
        });
        document.querySelector('#reset-combat')!.addEventListener(
            'click',
            () => {
                const index = (document.querySelector('#summoner') as HTMLSelectElement).selectedIndex;
                verificationPaused = false;
                simulation.select(index);
                stepper.accumulator = 0;
                abilities.clear();
                input.reset();
                refreshInspection();
                abilities.setDefinition(simulation.combat.definition);
                abilities.update(simulation.combat);
            },
            { signal: abort.signal }
        );
        document.querySelector('#lifecycle-mode')!.addEventListener(
            'change',
            (event) => {
                simulation.lifecycle = (event.target as HTMLInputElement).checked;
                document.body.classList.toggle('lifecycle', simulation.lifecycle);
                (document.querySelector('#reset-combat') as HTMLButtonElement).click();
            },
            { signal: abort.signal }
        );
        refreshInspection();
        document
            .querySelector('#play-match')!
            .addEventListener('click', () => simulation.match?.start(), { signal: abort.signal });
        document
            .querySelector('#restart-match')!
            .addEventListener('click', () => (document.querySelector('#reset-combat') as HTMLButtonElement).click(), {
                signal: abort.signal
            });
        document
            .querySelector('#start-match')!
            .addEventListener('click', () => simulation.match?.start(), { signal: abort.signal });
        document
            .querySelector('#advance-match')!
            .addEventListener('click', () => simulation.match?.debugAdvance(), { signal: abort.signal });
        for (const [id, lethal] of [
            ['lethal-actor', true],
            ['damage-actor', false]
        ] as const) {
            document
                .querySelector('#' + id)!
                .addEventListener(
                    'click',
                    () =>
                        simulation.match?.debugDamage(
                            (document.querySelector('#inspect-actor') as HTMLSelectElement).value,
                            lethal
                        ),
                    { signal: abort.signal }
                );
        }
        document.querySelector('#charge')!.addEventListener(
            'click',
            () => {
                if (!simulation.match || simulation.match.active) simulation.combat.player.ultimateMeter = 100;
            },
            { signal: abort.signal }
        );
        document.querySelector('#damage-player')!.addEventListener(
            'click',
            () => {
                simulation.combat.damage(simulation.combat.player, 100, simulation.combat.targets[0]);
            },
            { signal: abort.signal }
        );
        // Opt-in deterministic production verification; normal play exposes snapshots only.
        let verificationPaused = false;
        const verification =
            new URLSearchParams(location.search).get('verify') === '1'
                ? {
                      arrange(name: string) {
                          assertLive();
                          const m = simulation.match;
                          if (
                              !m ||
                              ![
                                  'aim-retreat',
                                  'aim-chase',
                                  'roster',
                                  'pressure',
                                  'neutral',
                                  'red-pressure',
                                  'total-control',
                                  'points',
                                  'combat',
                                  'natural-blue',
                                  'natural-red',
                                  'crossed',
                                  'camp-mobility',
                                  'camp-cooldown',
                                  'camp-defense',
                                  'camp-damage',
                                  'wilderness-entry',
                                  'wilderness-left-entry',
                                  'rotation',
                                  'all-buffs'
                              ].includes(name)
                          )
                              throw new Error('Unknown verification fixture');
                          verificationPaused = true;
                          if (m.phase === 'prematch') {
                              m.start();
                              m.step(undefined, 3);
                          }
                          for (const [i, actor] of m.actors.entries()) {
                              if (!['rotation', 'aim-chase'].includes(name)) Object.assign(actor, { bot: null });
                              const p = actor.sim.player;
                              p.x = ((i % 3) - 1) * 8;
                              p.z = p.team === 1 ? -4 : -8;
                              Object.assign(p, { previous: { x: p.x, z: p.z } });
                          }
                          if (name.startsWith('aim-')) {
                              for (const [i, actor] of m.actors.entries()) {
                                  const p = actor.sim.player;
                                  Object.assign(p, {
                                      x: i === 0 ? 0 : i < 3 ? (i - 1) * 8 : (i - 4) * 0.8,
                                      z: i === 0 ? 0 : i < 3 ? 12 : -0.9,
                                      angle: 0
                                  });
                              }
                              abilities.clear();
                              input.reset();
                              verificationPaused = false;
                          }
                          if (name === 'all-buffs') {
                              Object.assign(m.human.player, { x: 24, z: 18 });
                              for (const c of m.wilderness.camps) m.human.damage(c, 99999, m.human.player);
                              verificationPaused = false;
                          }
                          if (name.startsWith('camp-')) {
                              const camp = m.wilderness.camps.find((c) => c.type === name.slice(5))!;
                              Object.assign(m.human.player, { x: camp.x, z: camp.z + 2, angle: Math.PI });
                              // Wound through the normal damage boundary. The touch action secures it.
                              m.human.damage(camp, camp.health - 60, m.human.player);
                              verificationPaused = false;
                          }
                          if (name === 'wilderness-entry' || name === 'wilderness-left-entry') {
                              Object.assign(m.human.player, { x: name === 'wilderness-entry' ? 10 : -10, z: 0 });
                              verificationPaused = false;
                          }
                          if (name === 'rotation') {
                              for (const [i, p] of m.entities.entries()) Object.assign(p, matchSpawn(p.team, i % 3));
                              m.rules.elapsed = 14;
                              for (const a of m.actors) a.sim.now = 14;
                          }
                          if (name === 'neutral') for (const p of m.entities) p.z = p.team === 1 ? 4 : -4;
                          if (name === 'red-pressure') for (const p of m.entities) p.z = p.team === 1 ? 8 : 4;
                          if (name === 'total-control')
                              for (const p of m.entities) {
                                  p.x = p.team === 1 ? 0 : 13;
                                  p.z = p.team === 1 ? -28 : -30;
                              }
                          if (name === 'natural-blue' || name === 'natural-red')
                              for (const p of m.entities)
                                  p.z = name === 'natural-blue' ? (p.team === 1 ? -26 : -30) : p.team === 1 ? 30 : 26;
                          if (name === 'crossed') for (const p of m.entities) p.z = p.team === 1 ? -31 : -29;
                          if (name === 'points') m.rules.cp[1] = 999;
                          if (name === 'roster') {
                              for (const [i, actor] of m.actors.entries()) {
                                  const p = actor.sim.player;
                                  Object.assign(p, { x: ((i % 3) - 1) * 2.6, z: p.team === 1 ? 4 : -1 });
                                  Object.assign(p, { previous: { x: p.x, z: p.z } });
                              }
                              verificationPaused = false;
                          }
                          if (name === 'combat') {
                              for (const p of m.entities) {
                                  p.x = 13 + (Number(p.id.at(-1)) || 0) * 3;
                                  p.z = p.team === 1 ? 4 : -4;
                              }
                              Object.assign(m.human.player, { x: 0, z: 4, angle: Math.PI });
                              Object.assign(m.entities[3], { x: 0, z: 2.1 });
                              verificationPaused = false;
                          }
                      },
                      pause() {
                          assertLive();
                          verificationPaused = true;
                      },
                      advance(seconds: number) {
                          assertLive();
                          if (!verificationPaused || !Number.isFinite(seconds) || seconds < 0 || seconds > 300)
                              throw new Error('Invalid verification advance');
                          const m = simulation.match!;
                          for (let remaining = seconds; remaining > 1e-9 && !m.rules.result; remaining -= 1 / 60)
                              m.step(undefined, Math.min(remaining, 1 / 60));
                      }
                  }
                : undefined;
        let frames = 0,
            hudElapsed = 0,
            smoothedDt = 1 / 60;
        app.on('update', (elapsed: number) => {
            if (!running) return;
            const dt = Math.min(elapsed, 0.1);
            const frame = input.sample();
            const accepted = !verificationPaused && stepper.advance(simulation.combat, abilities, frame, dt);
            const preview = abilities.softPreview ? null : abilities.preview;
            if (preview) {
                frame.aim = { x: Math.sin(preview.angle), z: Math.cos(preview.angle) };
                frame.targeting = true;
            }
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
            const assistStatus = aimAssist.status(c);
            const aimFeedback = document.querySelector<HTMLElement>('#aim-feedback')!;
            aimFeedback.dataset.state = assistStatus.state;
            aimFeedback.textContent =
                assistStatus.state === 'acquired'
                    ? '◇ Assisted'
                    : assistStatus.state === 'manual'
                      ? 'Manual aim'
                      : assistStatus.state === 'none'
                        ? 'No nearby target'
                        : '';
            scene.update(simulation, dt, preview, assistStatus.targetId);
            if (managed && simulation.match?.snapshot().result && !resultReported) {
                resultReported = true;
                onResult();
            }
            frames++;
            smoothedDt += (Math.max(elapsed, 0.001) - smoothedDt) * 0.1;
            hudElapsed += elapsed;
            if (hudElapsed >= 0.1) {
                hud.update(simulation, smoothedDt, frames, abilities.preview);
                hudElapsed = 0;
            }
        });
        // Read-only snapshots for browser smoke checks.
        diagnostics = {
            verification,
            snapshot: () => {
                assertLive();
                return structuredClone({
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
                    summonerModels: scene.summonerModels,
                    modelAssets: scene.modelAssets,
                    environment: scene.environment,
                    kitModel: scene.kitModel,
                    rivenModel: scene.rivenModel,
                    rivenWeapons: scene.rivenWeapons,
                    setModel: scene.setModel,
                    frameMs: smoothedDt * 1000,
                    preview: scene.preview,
                    territory: scene.territory,
                    input: { pointer: abilities.pointerState, cancel: !!abilities.preview?.cancel },
                    aimAssist: { enabled: aimAssist.enabled, ...aimAssist.status(simulation.combat) },
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
                });
            }
        };
        Object.defineProperty(window, '__crownfall', { configurable: true, value: diagnostics });
        app.autoRender = !managed;
        app.start();
        const suspend = () => {
            running = false;
            app.timeScale = 0;
            app.autoRender = false;
            input.enabled = false;
            abilities.input.enabled = false;
            input.reset();
            abilities.clear();
            stepper.accumulator = 0;
        };
        if (managed) suspend();
        return {
            destroy: () => owner.destroy(),
            suspend,
            quality(low: boolean) {
                device.maxPixelRatio = low ? 1 : Math.min(window.devicePixelRatio, 2);
                app.resizeCanvas();
                scene.quality(low);
            },
            async prepare(index: number, report: (label: string, done: number, total: number) => void) {
                if (preparing) throw new Error('Arena preparation already running');
                preparing = true;
                suspend();
                try {
                    simulation.select(index);
                    resultReported = false;
                    verificationPaused = false;
                    (document.querySelector('#summoner') as HTMLSelectElement).selectedIndex = index;
                    abilities.setDefinition(simulation.combat.definition);
                    abilities.update(simulation.combat);
                    refreshInspection();
                    await scene.prepare(simulation, report);
                    hud.update(simulation, 1 / 60, frames);
                } finally {
                    preparing = false;
                }
            },
            play() {
                assertLive();
                input.reset();
                abilities.clear();
                input.enabled = true;
                abilities.input.enabled = true;
                running = true;
                app.timeScale = 1;
                app.autoRender = true;
                simulation.match?.start();
            },
            results: () => simulation.match?.snapshot().results,
            snapshot: () => (diagnostics as { snapshot(): unknown }).snapshot()
        };
    } catch (error) {
        if (!disposed) {
            owner.destroy();
            const message = document.createElement('p');
            message.textContent = 'Unable to start WebGL2 arena: ' + String(error);
            document.body.append(message);
            throw error;
        }
    }
}
