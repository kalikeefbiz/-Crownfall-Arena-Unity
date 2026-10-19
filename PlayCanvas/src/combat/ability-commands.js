import { hasStatus } from './combat-core.js';

// Device-independent intentions. Coordinates are supplied by the input adapter;
// neither gameplay commitment nor follow-up scheduling depends on DOM elements.
export class AbilityCommands {
    constructor(input, getFacing, definition, mapDrag = (x, z) => ({ x, z })) {
        this.mapDrag = mapDrag;
        this.input = input;
        this.getFacing = getFacing;
        this.definition = definition;
        this.actions = [];
        this.active = null;
        this.preview = null;
        this.pendingBasic = null;
        this.keyboardBasic = null;
        this.attackHeld = false;
    }
    releaseBasic(ability) {
        return this.definition.id === 'riven' && ability.basic;
    }
    begin(ability, pointer, x, y, time) {
        if (!this.input.enabled || this.active) return false;
        const angle = this.getFacing();
        this.active = { id: ability.id, ability, pointer, x, y, angle, started: time, cancel: false, dragged: false };
        if (ability.aim === 'ground')
            this.active.targetOffset = {
                x: Math.sin(angle) * ability.range * 0.65,
                z: Math.cos(angle) * ability.range * 0.65
            };
        this.publishPreview();
        if (this.releaseBasic(ability)) this.pendingBasic = null;
        else if (ability.basic) this.attackHeld = true;
        return true;
    }
    drag(pointer, x, y) {
        const p = this.active;
        if (!p || p.pointer !== pointer) return;
        const dx = x - p.x,
            dz = y - p.y,
            distance = Math.hypot(dx, dz),
            a = p.ability;
        p.cancel = distance > 150;
        if (distance > 12) {
            p.dragged = true;
            const world = this.mapDrag(dx, dz);
            p.angle = Math.atan2(world.x, world.z);
        }
        if (a.aim === 'ground' && p.dragged) {
            const world = this.mapDrag(dx, dz);
            const vx = (world.x / 90) * a.range,
                vz = (world.z / 90) * a.range;
            const scale = Math.min(1, a.range / Math.hypot(vx, vz));
            p.targetOffset = { x: vx * scale, z: vz * scale };
        }
        this.publishPreview();
        if (a.basic && !this.releaseBasic(a)) this.attackHeld = !p.cancel;
    }
    publishPreview() {
        const p = this.active;
        this.preview = { ability: p.ability, angle: p.angle, cancel: p.cancel, targetOffset: p.targetOffset };
    }
    finish(pointer, time, confirm = true) {
        const p = this.active;
        if (!p || p.pointer !== pointer) return;
        if (confirm && !p.cancel && this.input.enabled) {
            if (this.releaseBasic(p.ability))
                this.commitBasic(p.ability, !p.dragged && time - p.started < 180 ? p.angle : this.preview.angle);
            else if (p.ability.basic && !p.sampled) this.actions.push({ id: p.id, angle: p.angle });
            else if (!p.ability.basic)
                this.actions.push({
                    id: p.id,
                    angle: p.angle,
                    ...(p.targetOffset ? { targetOffset: { ...p.targetOffset } } : {})
                });
        }
        this.release();
    }
    release() {
        this.active = null;
        this.preview = null;
        this.attackHeld = false;
    }
    clear() {
        this.release();
        this.actions = [];
        this.pendingBasic = null;
        this.keyboardBasic = null;
        this.heldKey = null;
    }
    commitBasic(ability, angle) {
        this.actions.push({ id: ability.id, angle });
        this.pendingBasic =
            ability.effect === 'weaponSequence' && this.sim?.weapons.next === 0
                ? { id: ability.id, angle, submitted: false }
                : null;
    }
    keyDown(code, time) {
        if (!this.input.enabled) return false;
        const ability = [...this.definition.abilities, ...(this.definition.bonus ? [this.definition.bonus] : [])].find(
            (a) => a.key === code
        );
        if (!ability) return false;
        const angle = this.getFacing();
        if (this.releaseBasic(ability)) {
            this.pendingBasic = null;
            this.keyboardBasic = { ability, angle, started: time };
            this.preview = { ability, angle, cancel: false };
        } else if (ability.basic) {
            this.heldKey = { id: ability.id, angle, sampled: false };
            this.attackHeld = true;
        } else this.actions.push({ id: ability.id, angle });
        return true;
    }
    keyUp(code, time) {
        if (code !== 'Space') return;
        const p = this.keyboardBasic;
        if (p && this.input.enabled) this.commitBasic(p.ability, time - p.started < 180 ? p.angle : this.preview.angle);
        if (this.heldKey && !this.heldKey.sampled && this.input.enabled)
            this.actions.push({ id: this.heldKey.id, angle: this.heldKey.angle });
        this.heldKey = null;
        this.keyboardBasic = null;
        if (p) this.preview = null;
        this.attackHeld = false;
    }
    read() {
        if (this.attackHeld) {
            if (this.active) this.active.sampled = true;
            if (this.heldKey) this.heldKey.sampled = true;
        }
        const actions = this.actions.splice(0);
        if (this.pendingBasic && actions.some((a) => a.id === this.pendingBasic.id)) this.pendingBasic.submitted = true;
        return { actions, attackHeld: this.attackHeld };
    }
    synchronize(sim) {
        this.sim = sim;
        if (!this.input.enabled || sim.player.dead || hasStatus(sim.player, 'stun', sim.now)) {
            this.clear();
            return;
        }
        const pending = this.pendingBasic;
        if (!pending?.submitted) return;
        if (sim.stance !== 'reso' || sim.weapons.next !== 1 || sim.weapons.returning) {
            this.pendingBasic = null;
            return;
        }
        const ability = sim.ability(pending.id);
        if (sim.cooldowns.ready(ability.cooldownKey || ability.id, sim.now)) {
            this.actions.push({ id: pending.id, angle: pending.angle });
            this.pendingBasic = null;
        }
    }
}
