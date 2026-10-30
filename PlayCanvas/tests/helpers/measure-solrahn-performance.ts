// Run separately, after browser suites, to avoid CPU contention.
// BUILDS='[["build","http://127.0.0.1:4173/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1"]]' LABEL=final node tests/helpers/measure-solrahn-performance.ts
import { readFile, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type API = {
    snapshot(): {
        frames: number;
        environment: unknown;
        modelAssets: unknown;
        position: { x: number; z: number };
        match: { phase: string; actors: { id: string; human: boolean; damage: number }[] };
    };
};
const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const results: { round: number; name: string; warmth: string; [key: string]: unknown }[] =
    process.env.RESUME === '1'
        ? JSON.parse(await readFile(`evidence/017a/${process.env.LABEL || 'benchmark'}-progress.json`, 'utf8')).results
        : [];
const builds: [string, string][] = JSON.parse(process.env.BUILDS!);
const rounds = Number(process.env.ROUNDS || 3);
try {
    for (let round = 0; round < rounds; round++) {
        for (const [name, url] of round % 2 ? [...builds].reverse() : builds) {
            const completed = (warmth: string) =>
                results.some((r) => r.round === round && r.name === name && r.warmth === warmth);
            if (completed('cold') && completed('warm')) continue;
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
            page.on('console', (m) => {
                if (m.type() === 'error') errors.push(m.text());
            });
            page.on('response', (r) => {
                if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
            });
            await page.addInitScript(() => {
                localStorage.setItem('crownfall.quality', location.search.includes('auditHigh=1') ? 'high' : 'low');
                const counter = {
                    total: 0,
                    compiles: 0,
                    links: 0,
                    uploads: 0,
                    uploadMs: 0,
                    compileMs: 0,
                    longTasks: [] as number[]
                };
                new PerformanceObserver((list) => {
                    counter.longTasks.push(...list.getEntries().map((e) => e.duration));
                }).observe({ type: 'longtask', buffered: true });
                (window as unknown as { __crownfallDraws: { total: number } }).__crownfallDraws = counter;
                for (const prototype of [
                    WebGLRenderingContext.prototype,
                    WebGL2RenderingContext.prototype
                ] as unknown as Record<string, unknown>[])
                    for (const name of [
                        'drawArrays',
                        'drawElements',
                        'drawArraysInstanced',
                        'drawElementsInstanced',
                        'compileShader',
                        'linkProgram',
                        'texImage2D',
                        'texSubImage2D'
                    ]) {
                        const original = prototype[name];
                        if (typeof original !== 'function') continue;
                        prototype[name] = function (this: unknown, ...args: unknown[]) {
                            const start = performance.now();
                            const result = Reflect.apply(original, this, args);
                            if (name.startsWith('draw')) counter.total++;
                            else if (name === 'compileShader' || name === 'linkProgram') {
                                counter.compileMs += performance.now() - start;
                                if (name === 'compileShader') counter.compiles++;
                                else counter.links++;
                            } else {
                                counter.uploads++;
                                counter.uploadMs += performance.now() - start;
                            }
                            return result;
                        };
                    }
            });
            let resumedWarmCache = false;
            if (completed('cold') && !completed('warm')) {
                // Reconstruct only the interrupted context's HTTP cache. No repeat sample.
                await page.goto(url);
                await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
                await page.getByRole('button', { name: 'Enter Arena' }).tap();
                await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, {
                    timeout: 120000
                });
                resumedWarmCache = true;
                console.log(name, 'warm cache primed after interrupted context; completed cold sample retained');
            }
            for (const warmth of ['cold', 'warm']) {
                if (completed(warmth)) continue;
                const navigationStarted = Date.now();
                await page.goto(url);
                const start = Date.now();
                await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
                await page.getByRole('button', { name: 'Enter Arena' }).tap();
                await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, {
                    timeout: 120000
                });
                const readyMs = Date.now() - start;
                const navigationToMatchMs = Date.now() - navigationStarted;
                const readyCounters = await page.evaluate(
                    () => (window as unknown as { __crownfallDraws: unknown }).__crownfallDraws
                );
                const graphics = await page.evaluate(() => {
                    const gl = document.querySelector('canvas')!.getContext('webgl2')!;
                    const info = gl.getExtension('WEBGL_debug_renderer_info');
                    return {
                        renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                        extensions: gl.getSupportedExtensions(),
                        hardwareGpuTime: 'UNAVAILABLE: SwiftShader software renderer'
                    };
                });
                console.log(name, warmth, 'readyMs', readyMs);
                // No verification fixture: fixtures can disable bots. Use the real
                // countdown and ordinary controls to bring the human into live combat.
                const setupStart = Date.now();
                await page.waitForFunction(
                    () => (window as unknown as { __crownfall: API }).__crownfall.snapshot().match.phase === 'active',
                    null,
                    { timeout: 90000 }
                );
                await page.keyboard.down('KeyW');
                try {
                    await page.waitForFunction(
                        () => (window as unknown as { __crownfall: API }).__crownfall.snapshot().position.z < 5,
                        null,
                        { timeout: 600000 }
                    );
                } finally {
                    await page.keyboard.up('KeyW');
                }
                await page.waitForFunction(
                    () =>
                        (window as unknown as { __crownfall: API }).__crownfall
                            .snapshot()
                            .match.actors.some((a) => !a.human && a.damage > 0),
                    null,
                    { timeout: 120000 }
                );
                await page.locator('.ability-ring').tap();
                const combatSetupMs = Date.now() - setupStart;
                console.log(name, warmth, 'liveCombatSetupMs', combatSetupMs);
                const steadyStartMetrics = (await cdp.send('Performance.getMetrics')).metrics;
                const steadyStartCounters = await page.evaluate(
                    () => (window as unknown as { __crownfallDraws: unknown }).__crownfallDraws
                );
                const samples = [];
                let excludedEndingPhase: string | null = null;
                // Equal wall windows for cold and warm; no accelerated ticks.
                const duration = Number(process.env.WINDOW_MS || 20000),
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
                            estimatedWebGLDrawsPerFrame:
                                (calls() - beforeCalls) / Math.max(1, state.frames - beforeFrames)
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
                        cpuMetrics: metrics.metrics,
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
                    round,
                    resumedWarmCache,
                    graphics,
                    readyCounters,
                    name,
                    url,
                    warmth,
                    readyMs,
                    navigationToMatchMs,
                    combatSetupMs,
                    requestedWallDuration: duration,
                    sampledActiveWallMs: times.reduce((a, b) => a + b, 0),
                    excludedEndingPhase,
                    medianFrameMs: times[Math.floor(times.length * 0.5)],
                    p95FrameMs: times[Math.floor(times.length * 0.95)],
                    meanFps: 1000 / (times.reduce((a, b) => a + b, 0) / times.length),
                    samples,
                    errors: [...errors],
                    steadyStartMetrics,
                    steadyStartCounters,
                    metrics: (await cdp.send('Performance.getMetrics')).metrics,
                    instrumentation: await page.evaluate(
                        () => (window as unknown as { __crownfallDraws: unknown }).__crownfallDraws
                    ),
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
                await writeFile(
                    `evidence/017a/${process.env.LABEL || 'benchmark'}-progress.json`,
                    JSON.stringify({ results }, null, 2) + '\n'
                );
            }
            await context.close();
        }
    }
} finally {
    await browser.close();
}
await writeFile(
    `evidence/017a/${process.env.LABEL || 'benchmark'}.json`,
    JSON.stringify(
        {
            renderer:
                'Chromium SwiftShader; wall time, low resolution; no hardware GPU; cold empty browser cache vs warm page reload',
            setup: 'Published GOAL 016 JS/CSS verified against gh-pages blobs, served locally on same machine as candidate; identical viewport/DPR, Low unless auditHigh=1 explicitly selects High, six full models. Real countdown, normal W movement from spawn to mid-lane, wait for bot damage, then Ring. No verification fixtures, bot removal, state relocation, or accelerated clocks.',
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
