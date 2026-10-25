import type { InputFrame } from '../gameplay/simulation';
import { clampVector } from '../gameplay/vector';
import type { Vec } from '../gameplay/vector';

import { protectGameSurface } from './game-gestures.js';

export class Controls {
    enabled = true;
    private keys = new Set<string>();
    private move: Vec = { x: 0, z: 0 };
    private aim: Vec = { x: 0, z: -1 };
    private aiming = false;
    private commit = false;
    private mousePointer: number | null = null;
    private captures = new Map<number, { kind: 'move' | 'aim'; x: number; y: number }>();
    private zones: HTMLElement[] = [];
    private abort = new AbortController();
    constructor(
        moveZone: HTMLElement,
        aimZone: HTMLElement,
        canvas: HTMLCanvasElement,
        screenAim: (x: number, y: number) => Vec
    ) {
        const options = { signal: this.abort.signal };
        for (const surface of [moveZone, aimZone, canvas]) protectGameSurface(surface, this.abort.signal);
        this.zones = [moveZone, aimZone, canvas];
        for (const [zone, kind] of [
            [moveZone, 'move'],
            [aimZone, 'aim']
        ] as const) {
            zone.addEventListener(
                'pointerdown',
                (e) => {
                    if (!this.enabled) return;
                    if ([...this.captures.values()].some((c) => c.kind === kind)) return;
                    e.preventDefault();
                    zone.setPointerCapture(e.pointerId);
                    const rect = zone.getBoundingClientRect();
                    const origin =
                        kind === 'move'
                            ? { x: e.clientX, y: e.clientY }
                            : { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
                    this.captures.set(e.pointerId, { kind, ...origin });
                    zone.classList.add('active');
                    if (kind === 'aim') this.aiming = true;
                    this.pointerMove(e);
                },
                options
            );
            zone.addEventListener('pointermove', (e) => this.pointerMove(e), options);
            const release = (e: PointerEvent) => {
                const capture = this.captures.get(e.pointerId);
                if (!capture) return;
                if (kind === 'move') this.move = { x: 0, z: 0 };
                else {
                    this.aiming = false;
                    if (e.type === 'pointerup') this.commit = true;
                }
                this.captures.delete(e.pointerId);
                zone.classList.remove('active');
            };
            zone.addEventListener('pointerup', release, options);
            zone.addEventListener('pointercancel', release, options);
            zone.addEventListener('lostpointercapture', release, options);
        }
        window.addEventListener(
            'keydown',
            (e) => {
                if (!this.enabled) return;
                const tag = (e.target as HTMLElement)?.tagName || '';
                if (/SELECT|INPUT|TEXTAREA/.test(tag)) return;
                if (tag === 'BUTTON' && ['Space', 'Enter'].includes(e.code)) return;
                if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
                this.keys.add(e.code);
            },
            options
        );
        window.addEventListener(
            'keyup',
            (e) => {
                if (e.code === 'Space' && this.keys.has('Space')) this.commit = true;
                this.keys.delete(e.code);
            },
            options
        );
        canvas.addEventListener('contextmenu', (e) => e.preventDefault(), options);
        canvas.addEventListener(
            'pointerdown',
            (e) => {
                if (!this.enabled || e.pointerType !== 'mouse') return;
                canvas.setPointerCapture(e.pointerId);
                this.mousePointer = e.pointerId;
                this.aiming = true;
                this.aim = screenAim(e.clientX, e.clientY);
            },
            options
        );
        canvas.addEventListener(
            'pointermove',
            (e) => {
                if (this.enabled && e.pointerType === 'mouse') this.aim = screenAim(e.clientX, e.clientY);
            },
            options
        );
        canvas.addEventListener(
            'pointerup',
            (e) => {
                if (e.pointerId !== this.mousePointer) return;
                this.mousePointer = null;
                this.aiming = false;
                this.commit = true;
            },
            options
        );
        canvas.addEventListener(
            'pointercancel',
            (e) => {
                if (e.pointerId === this.mousePointer) {
                    this.mousePointer = null;
                    this.aiming = false;
                }
            },
            options
        );
        canvas.addEventListener(
            'lostpointercapture',
            (e) => {
                if (e.pointerId === this.mousePointer) {
                    this.mousePointer = null;
                    this.aiming = false;
                }
            },
            options
        );
        window.addEventListener('resize', () => this.reset(), options);
        window.addEventListener('orientationchange', () => this.reset(), options);
        window.addEventListener('blur', () => this.reset(), options);
        document.addEventListener(
            'visibilitychange',
            () => {
                if (document.hidden) this.reset();
            },
            options
        );
    }
    private pointerMove(e: PointerEvent): void {
        const capture = this.captures.get(e.pointerId);
        if (!capture) return;
        const v = clampVector({ x: (e.clientX - capture.x) / 54, z: (e.clientY - capture.y) / 54 });
        if (capture.kind === 'move') this.move = v;
        else if (Math.hypot(v.x, v.z) > 0.08) this.aim = v;
    }
    reset(): void {
        for (const zone of this.zones)
            for (const id of [...this.captures.keys(), ...(this.mousePointer === null ? [] : [this.mousePointer])])
                if (zone.hasPointerCapture(id)) zone.releasePointerCapture(id);
        this.keys.clear();
        this.move = { x: 0, z: 0 };
        this.aiming = false;
        this.commit = false;
        this.captures.clear();
        this.mousePointer = null;
        document.querySelectorAll('.active').forEach((e) => e.classList.remove('active'));
    }
    sample(): InputFrame {
        const keyboard = {
            x:
                Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
                Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft')),
            z:
                Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) -
                Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'))
        };
        const frame = {
            movement: clampVector({ x: keyboard.x + this.move.x, z: keyboard.z + this.move.z }),
            aim: this.aim,
            targeting: this.aiming || this.keys.has('Space'),
            commit: this.commit
        };
        this.commit = false;
        return frame;
    }
    destroy(): void {
        this.abort.abort();
        this.reset();
    }
}
