import { describe, expect, it } from 'vitest';

import { FrameWindow } from '../src/ui/performance-monitor';

describe('completed-render wall-time monitor', () => {
    it('reports approximately one-second FPS/mean and nearest-rank rolling p95', () => {
        const frames = new FrameWindow();
        expect(frames.record(0)).toBeNull();
        for (let i = 1; i < 50; i++) expect(frames.record(i * 20)).toBeNull();
        expect(frames.record(1000)).toEqual({ fps: 50, meanMs: 20, p95Ms: 20, samples: 50 });
        for (let i = 1; i <= 9; i++) frames.record(1000 + i * 100);
        expect(frames.record(2000)).toEqual({ fps: 10, meanMs: 100, p95Ms: 100, samples: 60 });
    });
    it('evicts old stalls and clears pause/background/quality gaps on reset', () => {
        const frames = new FrameWindow();
        frames.record(0);
        frames.record(1000);
        let sample;
        for (let now = 1020; now <= 12000; now += 20) sample = frames.record(now) ?? sample;
        expect(sample?.p95Ms).toBe(20);
        frames.reset();
        expect(frames.record(50000)).toBeNull();
        for (let now = 50020; now <= 51000; now += 20) sample = frames.record(now) ?? sample;
        expect(sample).toEqual({ fps: 50, meanMs: 20, p95Ms: 20, samples: 50 });
    });
    it('bounds storage even at unusually high refresh rates', () => {
        const frames = new FrameWindow();
        frames.record(0);
        let sample;
        for (let now = 1; now <= 5000; now++) sample = frames.record(now) ?? sample;
        expect(sample?.samples).toBe(2048);
        expect(sample?.fps).toBe(1000);
    });
});
