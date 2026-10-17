import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AbilityInput } from '../src/combat/ability-input.js';
class Node {
    constructor() {
        this.listeners = {};
        this.dataset = {};
        this.style = {
            setProperty() {
                return undefined;
            }
        };
        this.classList = {
            toggle() {
                return undefined;
            }
        };
        this.capture = new Set();
        this.children = [];
    }
    addEventListener(k, fn) {
        (this.listeners[k] ??= []).push(fn);
    }
    emit(k, e = {}) {
        for (const f of this.listeners[k] || [])
            f({
                preventDefault() {
                    return undefined;
                },
                ...e
            });
    }
    append(n) {
        this.children.push(n);
    }
    setAttribute() {
        return undefined;
    }
    querySelector() {
        return this;
    }
    setPointerCapture(id) {
        this.capture.add(id);
    }
    hasPointerCapture(id) {
        return this.capture.has(id);
    }
    releasePointerCapture(id) {
        this.capture.delete(id);
        this.emit('lostpointercapture', { pointerId: id });
    }
}
function setup() {
    globalThis.window = new Node();
    globalThis.document = new Node();
    document.createElement = () => new Node();
    document.getElementById = () => new Node();
    const input = { enabled: true };
    return new AbilityInput(input, () => Math.PI / 2);
}
test('directional drag-release queues one cast in aimed direction', () => {
    const input = setup(),
        b = input.buttons.get('step');
    b.emit('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    b.emit('pointermove', { pointerId: 1, clientX: 100, clientY: 50 });
    assert.equal(input.preview.angle, Math.PI);
    b.emit('pointerup', { pointerId: 1 });
    assert.deepEqual(input.read().actions, [{ id: 'step', angle: Math.PI }]);
    assert.equal(input.read().actions.length, 0);
});
test('cancelled, distant, or interrupted touches never cast', () => {
    const input = setup(),
        b = input.buttons.get('dragon');
    for (const event of ['pointercancel', 'lostpointercapture']) {
        b.emit('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
        b.emit(event, { pointerId: 1 });
        assert.equal(input.read().actions.length, 0);
    }
    b.emit('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
    b.emit('pointermove', { pointerId: 1, clientX: 210, clientY: 10 });
    b.emit('pointerup', { pointerId: 1 });
    assert.equal(input.read().actions.length, 0);
});
test('holding basic attack repeats without queued double casts; unrelated release ignored', () => {
    const input = setup(),
        b = input.buttons.get('whip');
    b.emit('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
    assert.equal(input.read().attackHeld, true);
    b.emit('pointerup', { pointerId: 2 });
    assert.equal(input.read().attackHeld, true);
    b.emit('pointerup', { pointerId: 1 });
    assert.equal(input.read().attackHeld, false);
    assert.equal(input.read().actions.length, 0);
});
test('focus loss clears attack and pending abilities', () => {
    const input = setup(),
        b = input.buttons.get('whip');
    b.emit('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
    window.emit('blur');
    assert.equal(input.read().attackHeld, false);
    assert.equal(input.preview, null);
});
import { CombatSimulation } from '../src/combat/combat.js';
import { RIVEN, RIVEN_TRAINING } from '../src/combat/riven-data.js';
test('Riven holds fire while moving east and aiming west, then sends both scythes west at existing cadence', () => {
    const input = setup(),
        sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    sim.player.x = 0;
    sim.player.z = 0;
    sim.targets = [];
    input.update(sim);
    const b = input.buttons.get('reso');
    b.emit('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 });
    b.emit('pointermove', { pointerId: 1, clientX: 50, clientY: 100, timeStamp: 250 });
    assert.equal(input.preview.angle, -Math.PI / 2);
    for (let i = 0; i < 30; i++) {
        sim.step({ moveX: 1, moveZ: 0, aiming: true, aimX: -1, aimZ: 0, ...input.read() });
        input.update(sim);
        assert.equal(sim.weapons.next, 0);
    }
    assert.ok(sim.player.x > 0);
    assert.equal(sim.player.angle, -Math.PI / 2);
    b.emit('pointerup', { pointerId: 1, timeStamp: 500 });
    sim.step({ moveX: 1, moveZ: 0, ...input.read() });
    input.update(sim);
    const first = sim.now;
    assert.equal(sim.weapons.next, 1);
    assert.equal(sim.weapons.blades[0].angle, -Math.PI / 2);
    for (let i = 0; i < 40 && sim.weapons.next < 2; i++) {
        sim.step({ moveX: 1, moveZ: 0, ...input.read() });
        input.update(sim);
    }
    assert.equal(sim.weapons.next, 2);
    assert.equal(sim.weapons.blades[1].angle, -Math.PI / 2);
    assert.ok(sim.now - first >= 0.48 - 1e-9);
    assert.ok(sim.now - first < 0.52);
    // Existing recall is still the next explicit basic commitment.
    sim.now += 0.5;
    b.emit('pointerdown', { pointerId: 2, clientX: 100, clientY: 100, timeStamp: 1000 });
    b.emit('pointerup', { pointerId: 2, timeStamp: 1050 });
    sim.step({ moveX: 0, moveZ: 0, ...input.read() });
    assert.equal(sim.weapons.returning, true);
});
test('Riven quick tap snapshots press facing and commits immediately on release', () => {
    const input = setup(),
        sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    let facing = Math.PI / 2;
    input.getFacing = () => facing;
    input.update(sim);
    const b = input.buttons.get('reso');
    b.emit('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, timeStamp: 10 });
    facing = -Math.PI / 2;
    input.preview.angle = facing;
    b.emit('pointerup', { pointerId: 1, timeStamp: 60 });
    assert.deepEqual(input.read().actions, [{ id: 'reso', angle: Math.PI / 2 }]);
});
test('Riven cancelled or interrupted aim casts nothing and clears pending second scythe', () => {
    const input = setup(),
        sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    input.update(sim);
    const b = input.buttons.get('reso');
    for (const event of ['pointercancel', 'lostpointercapture']) {
        b.emit('pointerdown', { pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0 });
        b.emit(event, { pointerId: 1 });
        assert.deepEqual(input.read(), { actions: [], attackHeld: false });
    }
    b.emit('pointerdown', { pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0 });
    b.emit('pointerup', { pointerId: 1, timeStamp: 50 });
    sim.step({ moveX: 0, moveZ: 0, ...input.read() });
    input.update(sim);
    assert.ok(input.pendingBasic);
    window.emit('blur');
    sim.now += 1;
    input.update(sim);
    assert.deepEqual(input.read(), { actions: [], attackHeld: false });
});
test('Riven keyboard basic also waits for release and maintains targeting preview', () => {
    const input = setup(),
        sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    input.update(sim);
    window.emit('keydown', { code: 'Space', timeStamp: 0 });
    assert.equal(input.preview.ability.id, 'reso');
    assert.deepEqual(input.read(), { actions: [], attackHeld: false });
    input.preview.angle = -Math.PI / 2;
    window.emit('keyup', { code: 'Space', timeStamp: 400 });
    assert.deepEqual(input.read().actions, [{ id: 'reso', angle: -Math.PI / 2 }]);
});
test('Riven touch switch rebuilds five controls and preserves shared cooldown display', () => {
    const input = setup(),
        sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
    input.update(sim);
    assert.equal(input.buttons.size, 5);
    const b = input.buttons.get('stance');
    b.emit('pointerdown', { pointerId: 7, clientX: 100, clientY: 100 });
    b.emit('pointerup', { pointerId: 7 });
    const actions = input.read().actions;
    assert.equal(actions.length, 1);
    sim.cast('amp');
    sim.step({ moveX: 0, moveZ: 0, actions });
    input.update(sim);
    assert.ok(input.buttons.has('pulse'));
    assert.ok(input.buttons.has('percussive-solo'));
    assert.equal(input.buttons.has('reso'), false);
    assert.equal(input.buttons.get('amp').textContent, '6.0');
    assert.equal(input.buttons.get('stance').textContent, '3.0');
    const basic = input.buttons.get('pulse');
    basic.emit('pointerdown', { pointerId: 8, clientX: 100, clientY: 100 });
    assert.equal(input.read().attackHeld, false);
    assert.equal(input.preview.ability.id, 'pulse');
    basic.emit('pointercancel', { pointerId: 8 });
    assert.equal(input.read().attackHeld, false);
    assert.equal(window.listeners.keydown.length, 1);
});

test('stun and disabling input clear Riven pending follow-up and active targeting', () => {
    for (const interruption of ['stun', 'disable']) {
        const input = setup(),
            sim = new CombatSimulation(RIVEN, RIVEN_TRAINING);
        input.update(sim);
        const b = input.buttons.get('reso');
        b.emit('pointerdown', { pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0 });
        b.emit('pointerup', { pointerId: 1, timeStamp: 50 });
        sim.step({ ...input.read() });
        input.update(sim);
        assert.ok(input.pendingBasic);
        if (interruption === 'stun') sim.player.statuses.stun = sim.now + 1;
        else input.input.enabled = false;
        input.update(sim);
        assert.equal(input.pendingBasic, null);
        assert.equal(input.preview, null);
        sim.now += 2;
        input.update(sim);
        assert.deepEqual(input.read(), { actions: [], attackHeld: false });
        assert.equal(sim.weapons.next, 1);
    }
});
