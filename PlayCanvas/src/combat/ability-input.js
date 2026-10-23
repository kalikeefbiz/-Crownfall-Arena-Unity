import { protectGameSurface } from '../input/game-gestures.js';

import { AbilityCommands } from './ability-commands.js';
import { KIT } from './combat-data.js';

// Browser adapter for the existing PlayCanvas HUD. Simulation-facing input lives
// in AbilityCommands; this adapter only owns DOM lifetime, capture and labels.
export class AbilityInput extends AbilityCommands {
    constructor(input, getFacing, definition = KIT, mapDrag) {
        super(input, getFacing, definition, mapDrag);
        this.abort = new AbortController();
        this.buttons = new Map();
        this.capture = null;
        this.setDefinition(definition);
        this.listen(window, 'orientationchange', () => this.clear());
        this.listen(window, 'keydown', (event) => {
            if (event.repeat || /SELECT|INPUT|BUTTON/.test(event.target?.tagName || '')) return;
            if (this.keyDown(event.code, event.timeStamp)) event.preventDefault();
        });
        this.listen(window, 'keyup', (event) => this.keyUp(event.code, event.timeStamp));
        for (const event of ['blur', 'resize']) this.listen(window, event, () => this.clear());
        this.listen(document, 'visibilitychange', () => this.clear());
    }
    listen(target, event, callback) {
        target.addEventListener(event, callback, { signal: this.abort.signal });
    }
    setDefinition(definition) {
        this.clear();
        this.definition = definition;
        this.layoutKey = definition.id + definition.abilities.map((a) => a.id).join('|');
        this.buttons.clear();
        const bar = document.getElementById('ability-bar');
        bar.innerHTML = '';
        const abilities = [...definition.abilities, ...(definition.bonus ? [definition.bonus] : [])];
        abilities.forEach((ability, index) => {
            const button = document.createElement('button');
            button.className = 'ability ability-' + ability.id;
            button.dataset.slot = index;
            button.setAttribute('aria-label', ability.name);
            button.innerHTML = `<strong>${ability.basic ? '◎' : ability.ultimate ? '♜' : '✦'}</strong><span>${ability.short}</span><b class="cooldown"></b>`;
            bar.append(button);
            this.buttons.set(ability.id, button);
            protectGameSurface(button, this.abort.signal);
            this.listen(button, 'pointerdown', (event) => {
                if (
                    !this.begin(
                        ability,
                        event.pointerId,
                        event.clientX,
                        event.clientY,
                        event.timeStamp,
                        event.pointerType
                    )
                )
                    return;
                event.preventDefault();
                this.pointerState = 'down';
                this.capture = { button, pointer: event.pointerId };
                button.setPointerCapture(event.pointerId);
            });
            this.listen(button, 'click', (event) => {
                event.preventDefault();
                button.blur();
            });
            this.listen(button, 'pointermove', (event) => this.drag(event.pointerId, event.clientX, event.clientY));
            this.listen(button, 'pointerup', (event) => {
                this.pointerState = 'released';
                this.finish(event.pointerId, event.timeStamp);
            });
            for (const event of ['pointercancel', 'lostpointercapture'])
                this.listen(button, event, (e) => {
                    if (this.active?.pointer === e.pointerId) this.pointerState = event;
                    this.finish(e.pointerId, e.timeStamp, false);
                });
        });
    }
    release() {
        const capture = this.capture;
        this.capture = null;
        super.release();
        if (capture?.button.hasPointerCapture(capture.pointer)) capture.button.releasePointerCapture(capture.pointer);
    }
    update(sim) {
        this.synchronize(sim);
        const active = sim.activeAbilities();
        if (this.layoutKey !== sim.definition.id + active.map((a) => a.id).join('|'))
            this.setDefinition({ ...sim.definition, abilities: active });
        for (const [id, button] of this.buttons) {
            const ability = sim.ability(id);
            const remaining = sim.cooldowns.remaining(ability.cooldownKey || id, sim.now);
            const bonus = id === sim.definition.bonus?.id;
            button.hidden = bonus && !sim.temporary.available(id, sim.now);
            if (button.hidden && this.active?.id === id) this.release();
            const meterLocked = ability.ultimate && sim.player.ultimateMeter < 100;
            button.classList.toggle('unready', remaining > 0 || sim.player.dead || meterLocked);
            button.style.setProperty('--cool', `${(remaining / ability.cooldown) * 100 || 0}%`);
            button.querySelector('.cooldown').textContent =
                remaining > 0
                    ? remaining.toFixed(1)
                    : meterLocked
                      ? Math.floor(sim.player.ultimateMeter) + '%'
                      : bonus
                        ? Math.ceil((sim.temporary.grants.get(id)?.expires || sim.now) - sim.now) + 's'
                        : '';
        }
    }
    destroy() {
        this.clear();
        this.abort.abort();
    }
}
