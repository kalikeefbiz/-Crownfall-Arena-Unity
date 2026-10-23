// Run against an already-built preview server, separately from the browser suite:
// CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/measure-roster.ts [base URL]
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type Harness = {
    verification: { arrange(name: string): void; pause(): void; advance(seconds: number): void };
    snapshot(): {
        entities: number;
        summonerModels: { visible: boolean; instanceId: string }[];
        modelAssets: unknown;
    };
};
const base = process.argv[2] || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const results = [];
try {
    for (const deviceScaleFactor of [1, 2]) {
        for (const mode of ['3d', 'primitive']) {
            const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor });
            const page = await context.newPage();
            const requests: string[] = [];
            page.on('request', (request) => {
                if (request.url().endsWith('.glb')) requests.push(request.url());
            });
            const query = mode === 'primitive' ? '?verify=1&models=primitive' : '?verify=1';
            await page.goto(new URL(query, base).href);
            await page.waitForFunction(() => !!(window as unknown as { __crownfall?: Harness }).__crownfall);
            await page.evaluate(() =>
                (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('roster')
            );
            if (mode === '3d')
                await page.waitForFunction(
                    () =>
                        (window as unknown as { __crownfall: Harness }).__crownfall
                            .snapshot()
                            .summonerModels.filter((m) => m.visible).length === 6
                );
            await page.evaluate(() => {
                const h = (window as unknown as { __crownfall: Harness }).__crownfall;
                h.verification.pause();
                h.verification.advance(2.1);
            });
            const measured = await page.evaluate(async () => {
                for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame);
                const intervals: number[] = [];
                let previous = performance.now();
                for (let i = 0; i < 90; i++) {
                    const now = await new Promise<number>(requestAnimationFrame);
                    intervals.push(now - previous);
                    previous = now;
                }
                const sorted = [...intervals].sort((a, b) => a - b);
                const s = (window as unknown as { __crownfall: Harness }).__crownfall.snapshot();
                return {
                    frameIntervals: {
                        samples: intervals.length,
                        meanMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
                        medianMs: sorted[Math.floor(sorted.length / 2)],
                        p95Ms: sorted[Math.floor(sorted.length * 0.95)]
                    },
                    entities: s.entities,
                    visibleModels: s.summonerModels.filter((m) => m.visible).length,
                    modelAssets: s.modelAssets,
                    resources: performance
                        .getEntriesByType('resource')
                        .filter((r) => r.name.endsWith('.glb'))
                        .map((r) => {
                            const entry = r as PerformanceResourceTiming;
                            return {
                                name: entry.name,
                                durationMs: entry.duration,
                                decodedBodySize: entry.decodedBodySize,
                                transferSize: entry.transferSize
                            };
                        })
                };
            });
            const session = await context.newCDPSession(page);
            await session.send('Performance.enable');
            const metrics = await session.send('Performance.getMetrics');
            results.push({
                mode,
                viewport: { width: 844, height: 390 },
                deviceScaleFactor,
                requests,
                ...measured,
                jsHeapUsedBytes: metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value
            });
            await context.close();
        }
    }
} finally {
    await browser.close();
}
await mkdir('evidence/007e', { recursive: true });
await writeFile(
    'evidence/007e/software-performance.json',
    JSON.stringify(
        {
            renderer: 'Chromium ANGLE SwiftShader (software)',
            physicalDevice: false,
            base,
            measuredAt: new Date().toISOString(),
            results
        },
        null,
        2
    ) + '\n'
);
console.log(
    JSON.stringify(
        results.map(({ mode, deviceScaleFactor, frameIntervals, jsHeapUsedBytes, visibleModels }) => ({
            mode,
            deviceScaleFactor,
            frameIntervals,
            jsHeapUsedBytes,
            visibleModels
        })),
        null,
        2
    )
);
