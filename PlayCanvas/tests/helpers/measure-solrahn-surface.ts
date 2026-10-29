// Run separately, after browser suites, to avoid CPU contention.
// node tests/helpers/measure-solrahn-v2.ts [candidate URL] [unchanged production URL]
import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type API = {
    snapshot(): { frames: number; environment: unknown; modelAssets: unknown; match: { phase: string } };
    verification: { pause(): void; advance(seconds: number): void; arrange(name: string): void };
};
const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const results = [];
try {
    for (const [name, url] of [
        [
            'candidate',
            process.argv[2] || 'http://127.0.0.1:4173/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1'
        ],
        ['approved-goal-016', process.argv[3] || 'http://127.0.0.1:4175/?mapPreview=solrahn-v2&frontend=1&verify=1']
    ]) {
        const context = await browser.newContext({
            viewport: { width: 844, height: 390 },
            hasTouch: true,
            isMobile: true
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('response', (r) => {
            if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
        });
        await page.addInitScript(() => {
            localStorage.setItem('crownfall.quality', 'low');
            const counter = { total: 0 };
            (window as unknown as { __crownfallDraws: { total: number } }).__crownfallDraws = counter;
            for (const prototype of [
                WebGLRenderingContext.prototype,
                WebGL2RenderingContext.prototype
            ] as unknown as Record<string, unknown>[])
                for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
                    const original = prototype[name];
                    if (typeof original !== 'function') continue;
                    prototype[name] = function (this: unknown, ...args: unknown[]) {
                        counter.total++;
                        return Reflect.apply(original, this, args);
                    };
                }
        });
        for (const warmth of ['cold', 'warm']) {
            await page.goto(url);
            const start = Date.now();
            await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
            await page.getByRole('button', { name: 'Enter Arena' }).tap();
            await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
            const readyMs = Date.now() - start;
            console.log(name, warmth, 'readyMs', readyMs);
            // Identical existing fixture in both immutable builds: start live central
            // combat, then sample real wall-clock rendering with ordinary bots/effects.
            await page.evaluate(() => {
                const v = (window as unknown as { __crownfall: API }).__crownfall.verification;
                v.pause();
                v.advance(3.1);
                v.arrange('roster');
            });
            await page.locator('.ability-ring').tap();
            const samples = [];
            let excludedEndingPhase: string | null = null;
            // 120 wall seconds of central live combat, no accelerated ticks during sampling.
            const duration = warmth === 'cold' ? 120000 : 20000,
                end = Date.now() + duration;
            while (Date.now() < end) {
                const timing = await page.evaluate(async () => {
                    const harness = (window as unknown as { __crownfall: API }).__crownfall;
                    const calls = () =>
                        (window as unknown as { __crownfallDraws: { total: number } }).__crownfallDraws.total;
                    const beforeFrames = harness.snapshot().frames,
                        beforeCalls = calls();
                    let previous = await new Promise<number>(requestAnimationFrame);
                    const intervals: number[] = [],
                        end = previous + 5000;
                    while (previous < end) {
                        const t = await new Promise<number>(requestAnimationFrame);
                        intervals.push(t - previous);
                        previous = t;
                    }
                    const state = (window as unknown as { __crownfall: API }).__crownfall.snapshot();
                    return {
                        intervals,
                        state,
                        estimatedWebGLDrawsPerFrame: (calls() - beforeCalls) / Math.max(1, state.frames - beforeFrames)
                    };
                });
                // Never count menu/results frames as six-actor combat performance.
                if (timing.state.match.phase !== 'active') {
                    excludedEndingPhase = timing.state.match.phase;
                    break;
                }
                const metrics = await cdp.send('Performance.getMetrics');
                samples.push({
                    ...timing,
                    jsHeapUsed: metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value
                });
            }
            const times = samples.flatMap((s) => s.intervals).sort((a, b) => a - b);
            if (!times.length) throw new Error('No active-match frame samples');
            console.log(
                name,
                warmth,
                'activeFrames',
                times.length,
                'medianMs',
                times[Math.floor(times.length * 0.5)],
                'p95Ms',
                times[Math.floor(times.length * 0.95)]
            );
            results.push({
                name,
                url,
                warmth,
                readyMs,
                requestedWallDuration: duration,
                sampledActiveWallMs: times.reduce((a, b) => a + b, 0),
                excludedEndingPhase,
                medianFrameMs: times[Math.floor(times.length * 0.5)],
                p95FrameMs: times[Math.floor(times.length * 0.95)],
                meanFps: 1000 / (times.reduce((a, b) => a + b, 0) / times.length),
                samples,
                errors: [...errors],
                resources: await page.evaluate(() =>
                    performance.getEntriesByType('resource').map((e) => {
                        const r = e as PerformanceResourceTiming;
                        return {
                            url: r.name,
                            durationMs: r.duration,
                            encodedBodySize: r.encodedBodySize,
                            transferSize: r.transferSize
                        };
                    })
                )
            });
        }
        await context.close();
    }
} finally {
    await browser.close();
}
await writeFile(
    'evidence/017/performance.json',
    JSON.stringify(
        {
            renderer:
                'Chromium SwiftShader; wall time, low resolution; no hardware GPU; cold empty browser cache vs warm page reload',
            setup: 'Published GOAL 016 JS/CSS verified against gh-pages blobs, served locally on same machine as candidate; identical viewport/DPR, low quality, six full models. Existing roster fixture, then live normal bot combat and ring effect. Only countdown skipped before sampling.',
            gpuTimer:
                'Hardware GPU duration/residency NOT AVAILABLE under SwiftShader; engine allocation accounting only.',
            drawCallMethod:
                'Same WebGL draw API counters for both builds; all render passes averaged over engine updates; wrappers forward original arguments and receiver.',
            physicalIPhoneSafari: 'NOT VERIFIED',
            results
        },
        null,
        2
    ) + '\n'
);
