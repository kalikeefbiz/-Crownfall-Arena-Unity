import { describe, expect, it, vi } from 'vitest';

import { defaultLayout, parseLayout, resolvedLayout, controlIds } from '../src/ui/control-layout';

describe('persisted mobile control layouts', () => {
    it('recovers corrupt, incomplete, nonfinite and out-of-range data atomically', () => {
        for (const raw of ['{', null, '{}', JSON.stringify({ version: 1, controls: { move: { x: 3 } } })])
            expect(parseLayout(raw)).toEqual(defaultLayout());
        const controls = defaultLayout();
        controls.basic.scale = 1.35;
        controls.special.opacity = 0.35;
        expect(parseLayout(JSON.stringify({ version: 1, controls }))).toEqual(controls);
        controls.aim.x = Infinity;
        expect(parseLayout(JSON.stringify({ version: 1, controls }))).toEqual(defaultLayout());
    });
    for (const [width, height] of [
        [844, 390],
        [667, 375],
        [640, 360],
        [390, 844]
    ]) {
        it(`protects safe bounds and separates overlapping targets at ${width}x${height}`, () => {
            vi.stubGlobal('innerWidth', width);
            vi.stubGlobal('innerHeight', height);
            vi.stubGlobal('document', {
                createElement: () => ({ style: {}, remove: vi.fn() }),
                body: { append: vi.fn() }
            });
            vi.stubGlobal('getComputedStyle', () => ({
                paddingLeft: '44px',
                paddingRight: '44px',
                paddingTop: '0px',
                paddingBottom: '21px'
            }));
            const layout = defaultLayout();
            for (const id of controlIds) Object.assign(layout[id], { x: 0.5, y: 0.5, scale: 1.35 });
            const placed = resolvedLayout(layout);
            for (const [i, p] of placed.entries()) {
                expect(p.size).toBeGreaterThanOrEqual(44);
                expect(p.x - p.size / 2).toBeGreaterThanOrEqual(44);
                expect(p.x + p.size / 2).toBeLessThanOrEqual(width - 44);
                expect(p.y - p.size / 2).toBeGreaterThanOrEqual(105 - 1e-6);
                expect(p.y + p.size / 2).toBeLessThanOrEqual(height - 21);
                for (const q of placed.slice(i + 1))
                    expect(
                        Math.abs(p.x - q.x) >= (p.size + q.size) / 2 || Math.abs(p.y - q.y) >= (p.size + q.size) / 2
                    ).toBe(true);
            }
            vi.unstubAllGlobals();
        });
    }
});
