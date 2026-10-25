import type { createGame } from '../game';

import {
    applyControlLayout,
    controlIds,
    defaultLayout,
    layoutKey,
    place,
    readLayout,
    resolvedLayout,
    safeRect
} from './control-layout';
import type { ControlId, Layout } from './control-layout';

type Game = NonNullable<Awaited<ReturnType<typeof createGame>>>;
const heroes = [
    { id: 'kit', name: 'Kit Asher', role: 'Damage Dealer', kind: 'Expellant', detail: 'Fire · Solar Whip' },
    { id: 'set', name: 'Set', role: 'Tank', kind: 'Embodiment', detail: 'Panther Fist · War Cry' },
    { id: 'riven', name: 'Riven', role: 'Damage Dealer', kind: 'Shaper', detail: 'Reso Blades · Pulse' }
];
export function createFrontend() {
    const ownerKey = Symbol.for('crownfall.frontend');
    const host = document.body as HTMLBodyElement & { [ownerKey]?: { destroy(): void } };
    host[ownerKey]?.destroy();
    const abort = new AbortController();
    const root = document.createElement('div');
    root.id = 'frontend';
    document.body.append(root);
    document.body.classList.add('official');
    let selected = 0,
        page = 'main',
        game: Game | undefined,
        attempt = 0;
    let gamePractice = false;
    let low = false,
        practice = false,
        settingsReturn = 'main';
    let draft: Layout = readLayout(),
        editing: ControlId = 'move',
        resetArmed = false;
    let notice = '',
        announcementTimer = 0;
    const measurements: { label: string; ms: number; done: number; total: number }[] = [];
    try {
        low = localStorage.getItem('crownfall.quality') === 'low';
    } catch {
        /* Optional storage. */
    }
    const pause = document.createElement('button');
    pause.id = 'pause-game';
    pause.textContent = 'Ⅱ Pause';
    pause.hidden = true;
    document.body.append(pause);
    const header = (label: string, back = 'main') =>
        `<div class="cf-top"><span>ASHES × AETHER <em>/</em> UCL</span><span>${label}</span></div>${page !== 'main' && page !== 'loading' ? `<button class="cf-back" data-action="${back}">← Back</button>` : ''}`;
    const button = (label: string, action: string, primary = false) =>
        `<button class="${primary ? 'cf-primary' : 'cf-button'}" data-action="${action}">${label}${primary ? '<span>›</span>' : ''}</button>`;
    const title = (eyebrow: string, text: string) =>
        `<div class="cf-intro"><div class="cf-eyebrow">${eyebrow}</div><h1>${text}</h1></div>`;
    const footer = (left: string, right = 'LOCAL PLAY · 1 PLAYER + 5 AI') =>
        `<div class="cf-footer"><span>${left}</span><span>${right}</span></div>`;
    const show = (next: string) => {
        page = next;
        document.body.dataset.screen = next;
        root.hidden = next === 'gameplay';
        pause.hidden = next !== 'gameplay';
        if (next !== 'gameplay') game?.suspend();
        render();
    };
    function render() {
        if (page === 'gameplay') return;
        let content = '';
        if (page === 'main')
            content =
                header('SOL’RAHN ARENA · WORLD CUP') +
                `<div class="cf-title-zone"><div class="cf-eyebrow">THE CROWN IS CLAIMED IN COMBAT</div><h1 class="cf-wordmark">CROWNFALL</h1><div class="cf-arena">ARENA</div><p>3V3 TERRITORIAL COMBAT · THE WILDERNESS AWAITS</p>${button('Enter Crownfall', 'select', true)}<div class="cf-subactions">${button('Settings', 'settings')}${button('Combat Practice', 'practice')}</div></div><div class="cf-annotation">THE SOL’RAHN<br>CHAMPIONSHIP</div>` +
                footer('BLACKHOUSE / UCL 3V3');
        if (page === 'select')
            content =
                header('01 / SUMMONER SELECTION') +
                title(
                    practice ? 'COMBAT PRACTICE · CHOOSE A SUMMONER' : 'UCL 3V3 · BLUE TEAM',
                    'Choose your Summoner'
                ) +
                `<div class="cf-roster">${heroes.map((h, i) => `<button class="cf-hero ${i === selected ? 'selected' : ''}" data-hero="${i}" aria-pressed="${i === selected}"><span class="cf-class">0${i + 1} / ${h.kind}</span><img src="${import.meta.env.BASE_URL}assets/frontend/portraits/${h.id}.webp" alt="${h.name}, rendered from the approved character model"><div class="cf-identity"><h2>${h.name}</h2><span>${h.role}</span><small>${h.detail}</small></div></button>`).join('')}</div><div class="cf-select-footer"><span>${heroes[selected].name} <em>/</em> SELECTED</span>${button('Enter Arena', 'enter', true)}</div>` +
                footer('UCL / SUMMONER ROSTER');
        if (page === 'loading')
            content =
                header('02 / PREPARING THE ARENA') +
                `<div class="cf-load"><div class="cf-versus"><span>BLUE TEAM</span><em>VS</em><span>RED TEAM</span></div><img src="${import.meta.env.BASE_URL}assets/frontend/portraits/${heroes[selected].id}.webp" alt=""><h1>${heroes[selected].name}</h1><div>${heroes[selected].role} · ${heroes[selected].kind}</div><progress id="resource-progress" max="1" value="0" aria-label="Completed resource stages"></progress><p id="resource-status" role="status">Initializing rendering device</p><div id="load-actions">${button('Return to Selection', 'cancel-load')}</div></div>` +
                footer('ESSENTIAL RESOURCES / READINESS', 'SOL’RAHN / LOCAL 3V3');
        if (page === 'settings')
            content =
                header('SETTINGS / LOCAL DEVICE', settingsReturn) +
                title('DEVICE & CONTROL CONFIGURATION', 'Settings') +
                `<div class="cf-settings-grid"><div class="cf-setting"><small>01 / GRAPHICS</small><h2>Visual Quality</h2><div class="cf-options">${button(`${!low ? '✓ ' : ''}Standard`, 'standard')}${button(`${low ? '✓ ' : ''}Low`, 'low')}</div><p>Low: reduced resolution, terrain normal and occlusion maps off.</p></div><div class="cf-setting"><small>02 / DISPLAY</small><h2>Fullscreen</h2>${button(document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen', 'fullscreen')}<p id="fullscreen-note">${document.fullscreenEnabled ? 'Landscape is recommended.' : 'On iPhone: Safari → Share → Add to Home Screen for a full-screen display.'}</p></div><div class="cf-setting"><small>03 / MOBILE INPUT</small><h2>Edit Controls</h2>${button('Position · Size · Opacity →', 'controls')}</div><div class="cf-setting"><small>04 / TRAINING</small><h2>Combat Practice</h2>${button('Enter Practice →', 'practice')}</div></div><div class="cf-notice" role="status">${notice}</div>` +
                footer('SETTINGS · DEVICE SAVED', 'STANDARD / LOW');
        if (page === 'controls')
            content = `<div class="cf-editor-toolbar"><strong>EDIT CONTROLS</strong><label>Control <select id="edit-control">${controlIds.map((id) => `<option ${id === editing ? 'selected' : ''}>${id}</option>`).join('')}</select></label><label>Size <input id="edit-size" aria-label="Control size" type="range" min="0.8" max="1.35" step="0.05" value="${draft[editing].scale}"></label><label>Opacity <input id="edit-opacity" aria-label="Control opacity" type="range" min="0.35" max="1" step="0.05" value="${draft[editing].opacity}"></label>${button('Save', 'save-controls')}${button('Cancel', 'cancel-controls')}${button(resetArmed ? 'Confirm Reset' : 'Reset', 'reset-controls')}</div><p class="cf-editor-help" role="status">${notice || 'Drag controls to position · safe area and overlap protection enabled'}</p><div id="control-preview">${controlIds.map((id) => `<button class="cf-edit-pad ${id === editing ? 'selected' : ''}" data-control="${id}" aria-label="Position ${id}">${id === 'special' ? 'Stance / Special' : id}</button>`).join('')}</div>`;
        if (page === 'pause')
            content =
                header('UCL / MATCH PAUSED', 'resume') +
                `<div class="cf-center">${title('THE ARENA AWAITS', 'Paused')}${button('Resume', 'resume', true)}${button('Settings', 'settings')}${button('Main Menu', 'main')}</div>` +
                footer('MATCH PAUSED', 'LOCAL 3V3');
        if (page === 'announcement') {
            const result = game?.results();
            content =
                header('UCL / MATCH CONCLUDED', 'results') +
                `<div class="cf-center cf-crownfall"><div class="cf-eyebrow">${result?.winner === 0 ? 'THE CROWN REMAINS UNCLAIMED' : `${result?.winner === 1 ? 'BLUE' : 'RED'} TEAM CLAIMS THE CROWN`}</div><h1>CROWNFALL</h1>${button('View Results', 'results', true)}</div>` +
                footer('SOL’RAHN / CHAMPIONSHIP');
        }
        if (page === 'results') {
            const result = game?.results();
            content =
                header('UCL / MATCH RESULTS') +
                title('MATCH CONCLUDED', result?.winner === 0 ? 'Draw' : result?.winner === 1 ? 'Victory' : 'Defeat') +
                `<p class="cf-result-detail">${result ? `${result.reason.toUpperCase()} · ${result.duration.toFixed(1)}s · CP ${Math.floor(result.cp[1])} / ${Math.floor(result.cp[2])} · Tickets ${result.tickets[1]} / ${result.tickets[2]}` : ''}</p><div class="cf-result-table"><table><thead><tr><th>Team</th><th>Summoner</th><th>K / D / A</th><th>Damage</th><th>Pressure</th></tr></thead><tbody>${result?.participants.map((a) => `<tr class="${a.team === 1 ? 'blue-team' : 'red-team'}"><td>${a.team === 1 ? 'Blue' : 'Red'}</td><td>${a.name}</td><td>${a.kills} / ${a.deaths} / ${a.assists}</td><td>${Math.round(a.damage)}</td><td>${a.pressureSeconds.toFixed(1)}s</td></tr>`).join('') || ''}</tbody></table></div><div class="cf-result-actions">${button('Play Again', 'enter', true)}${button('Change Summoner', 'select')}${button('Main Menu', 'main')}</div>` +
                footer('UCL / SIX-COMBATANT REPORT');
        }
        root.innerHTML = `<section class="cf-page cf-${page}" aria-label="${page}">${content}</section>`;
        if (page === 'controls') positionEditor();
    }
    function positionEditor() {
        for (const p of resolvedLayout(draft)) place(root.querySelector<HTMLElement>(`[data-control="${p.id}"]`)!, p);
    }
    const result = () => {
        game?.suspend();
        show('announcement');
        clearTimeout(announcementTimer);
        announcementTimer = window.setTimeout(() => {
            if (page === 'announcement') show('results');
        }, 2400);
    };
    async function enter() {
        const token = ++attempt;
        measurements.length = 0;
        show('loading');
        const started = performance.now();
        let timer = 0;
        try {
            const prepare = async () => {
                if (game && gamePractice !== practice) {
                    game.destroy();
                    game = undefined;
                }
                if (!game) {
                    const { createGame } = await import('../game');
                    if (token !== attempt) return;
                    const created = await createGame(true, result, practice);
                    if (token !== attempt) {
                        created?.destroy();
                        return;
                    }
                    game = created;
                    gamePractice = practice;
                }
                if (!game || token !== attempt) return;
                observer.disconnect();
                observer.observe(document.getElementById('ability-bar')!, { childList: true });
                game.quality(low);
                await game.prepare(selected, (label, done, total) => {
                    if (token !== attempt) return;
                    measurements.push({ label, done, total, ms: Math.round(performance.now() - started) });
                    const progress = root.querySelector<HTMLProgressElement>('#resource-progress');
                    if (progress) {
                        progress.max = total;
                        progress.value = done;
                    }
                    const status = root.querySelector('#resource-status');
                    if (status) status.textContent = `${label} · ${done}/${total} stages complete`;
                });
            };
            await Promise.race([
                prepare(),
                new Promise<never>((_, reject) => {
                    timer = window.setTimeout(
                        () => reject(new Error('Preparation exceeded 120 seconds. Check the connection and retry.')),
                        120000
                    );
                })
            ]);
            if (token !== attempt) return;
            applyControlLayout();
            show('gameplay');
            game?.play();
        } catch (error) {
            if (token !== attempt) return;
            // A deadline may fire while the module/device is still initializing.
            // Invalidate its token so a late continuation destroys its owner.
            ++attempt;
            game?.destroy();
            game = undefined;
            root.querySelector('#resource-status')!.textContent =
                `Unable to prepare arena. ${error instanceof Error ? error.message : String(error)}`;
            root.querySelector('#load-actions')!.innerHTML =
                button('Retry', 'enter', true) + button('Back', 'cancel-load');
        } finally {
            clearTimeout(timer);
        }
    }
    async function action(name: string) {
        notice = '';
        if (name === 'enter') {
            void enter();
            return;
        }
        if (name === 'cancel-load') {
            ++attempt;
            game?.destroy();
            game = undefined;
            show('select');
            return;
        }
        if (name === 'main') {
            ++attempt;
            clearTimeout(announcementTimer);
            practice = false;
            show('main');
            return;
        }
        if (name === 'select') {
            practice = false;
            show('select');
            return;
        }
        if (name === 'practice') {
            practice = true;
            show('select');
            return;
        }
        if (name === 'settings') {
            settingsReturn = page === 'pause' ? 'pause' : 'main';
            show('settings');
            return;
        }
        if (name === 'controls') {
            draft = readLayout();
            resetArmed = false;
            show('controls');
            return;
        }
        if (name === 'cancel-controls') {
            show('settings');
            return;
        }
        if (name === 'save-controls') {
            // Persist the collision-resolved geometry seen by the player.
            const rect = safeRect();
            for (const p of resolvedLayout(draft)) {
                draft[p.id].x = (p.x - rect.left) / rect.width;
                draft[p.id].y = (p.y - rect.top) / rect.height;
            }
            try {
                localStorage.setItem(layoutKey, JSON.stringify({ version: 1, controls: draft }));
                notice = 'Control layout saved.';
            } catch {
                notice = 'Storage unavailable. Layout could not be saved.';
                render();
                return;
            }
            applyControlLayout();
            show('settings');
            return;
        }
        if (name === 'reset-controls') {
            if (resetArmed) {
                draft = defaultLayout();
                resetArmed = false;
                notice = 'Defaults restored in preview. Save to apply.';
            } else {
                resetArmed = true;
                notice = 'Press Confirm Reset to restore defaults in this preview.';
            }
            render();
            return;
        }
        if (name === 'standard' || name === 'low') {
            low = name === 'low';
            game?.quality(low);
            try {
                localStorage.setItem('crownfall.quality', name);
            } catch {
                notice = 'Quality applied for this session. Storage unavailable.';
            }
            render();
            return;
        }
        if (name === 'fullscreen') {
            try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else if (document.fullscreenEnabled) await document.documentElement.requestFullscreen();
                else notice = 'On iPhone: Safari → Share → Add to Home Screen. Rotate your device to landscape.';
            } catch {
                notice = 'Fullscreen was unavailable. Continue in landscape or add to Home Screen on iPhone.';
            }
            if (page === 'settings') render();
            return;
        }
        if (name === 'resume') {
            show('gameplay');
            game?.play();
            return;
        }
        if (name === 'results') {
            clearTimeout(announcementTimer);
            show('results');
            return;
        }
        if (name === 'pause') show('pause');
    }
    root.addEventListener(
        'click',
        (e) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action], [data-hero]');
            if (target?.dataset.action) void action(target.dataset.action);
            else if (target?.dataset.hero) {
                selected = Number(target.dataset.hero);
                render();
            }
        },
        { signal: abort.signal }
    );
    pause.addEventListener('click', () => show('pause'), { signal: abort.signal });
    root.addEventListener(
        'input',
        (e) => {
            const target = e.target as HTMLInputElement;
            if (target.id === 'edit-size') draft[editing].scale = Number(target.value);
            if (target.id === 'edit-opacity') draft[editing].opacity = Number(target.value);
            positionEditor();
        },
        { signal: abort.signal }
    );
    root.addEventListener(
        'change',
        (e) => {
            if ((e.target as HTMLElement).id === 'edit-control') {
                editing = (e.target as HTMLSelectElement).value as ControlId;
                render();
            }
        },
        { signal: abort.signal }
    );
    let drag: { id: ControlId; pointer: number; target: HTMLElement } | undefined;
    root.addEventListener(
        'pointerdown',
        (e) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-control]');
            if (!target || drag) return;
            editing = target.dataset.control as ControlId;
            root.querySelectorAll<HTMLElement>('[data-control]').forEach((el) =>
                el.classList.toggle('selected', el === target)
            );
            const select = root.querySelector<HTMLSelectElement>('#edit-control')!;
            select.value = editing;
            root.querySelector<HTMLInputElement>('#edit-size')!.value = String(draft[editing].scale);
            root.querySelector<HTMLInputElement>('#edit-opacity')!.value = String(draft[editing].opacity);
            drag = { id: editing, pointer: e.pointerId, target };
            target.setPointerCapture(e.pointerId);
            e.preventDefault();
        },
        { signal: abort.signal }
    );
    root.addEventListener(
        'pointermove',
        (e) => {
            if (!drag || e.pointerId !== drag.pointer) return;
            const rect = safeRect();
            Object.assign(draft[drag.id], {
                x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
                y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
            });
            positionEditor();
        },
        { signal: abort.signal }
    );
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
        root.addEventListener(
            event,
            () => {
                drag = undefined;
            },
            { signal: abort.signal }
        );
    const resize = () => {
        if (page === 'controls') positionEditor();
        applyControlLayout();
    };
    window.addEventListener('resize', resize, { signal: abort.signal });
    window.addEventListener(
        'keydown',
        (e) => {
            if (e.code === 'Escape' && page === 'gameplay') show('pause');
        },
        { signal: abort.signal }
    );
    document.addEventListener(
        'visibilitychange',
        () => {
            if (document.hidden && page === 'gameplay') show('pause');
        },
        { signal: abort.signal }
    );
    // Reapply to actual input elements when stance changes rebuild ability buttons.
    const observer = new MutationObserver((records) => {
        if (
            page === 'gameplay' &&
            records.some((r) =>
                [...r.addedNodes].some((n) => n instanceof HTMLElement && n.classList.contains('ability'))
            )
        )
            applyControlLayout();
    });
    // Read-only lifecycle evidence, including measured stage completion times.
    Object.defineProperty(window, '__crownfallFrontend', {
        configurable: true,
        value: { snapshot: () => structuredClone({ page, selected: heroes[selected].name, low, measurements }) }
    });
    show('main');
    const owner = {
        destroy() {
            ++attempt;
            abort.abort();
            observer.disconnect();
            clearTimeout(announcementTimer);
            game?.destroy();
            root.remove();
            pause.remove();
            document.body.classList.remove('official');
            Reflect.deleteProperty(window, '__crownfallFrontend');
            if (host[ownerKey] === owner) delete host[ownerKey];
        }
    };
    host[ownerKey] = owner;
    if (import.meta.hot) import.meta.hot.dispose(() => owner.destroy());
    return owner;
}
