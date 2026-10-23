// Run separately from browser tests/captures to avoid CPU contention.
// CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/measure-environment.ts [base URL]
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type Harness = {
    verification: { arrange(name: string): void; pause(): void; advance(t: number): void };
    snapshot(): {
        environment: unknown;
        entities: number;
        summonerModels: { visible: boolean }[];
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
        for (const environment of ['legacy', 'carved']) {
            const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor });
            const page = await context.newPage();
            await page.goto(new URL(`?verify=1&environment=${environment}`, base).href);
            await page.evaluate(() => {
                const h = (window as unknown as { __crownfall: Harness }).__crownfall;
                h.verification.arrange('roster');
                h.verification.pause();
                h.verification.advance(2.1);
            });
            await page.waitForFunction(
                () =>
                    (window as unknown as { __crownfall: Harness }).__crownfall
                        .snapshot()
                        .summonerModels.filter((m) => m.visible).length === 6
            );
            const metrics = await page.evaluate(async () => {
                for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame);
                let previous = await new Promise<number>(requestAnimationFrame);
                const intervals = [];
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
                        medianMs: sorted[45],
                        p95Ms: sorted[85]
                    },
                    sceneEnvironment: s.environment,
                    entities: s.entities,
                    modelAssets: s.modelAssets,
                    visibleModels: s.summonerModels.filter((m) => m.visible).length
                };
            });
            const cdp = await context.newCDPSession(page);
            await cdp.send('Performance.enable');
            const performance = await cdp.send('Performance.getMetrics');
            results.push({
                environment,
                deviceScaleFactor,
                ...metrics,
                jsHeapUsedBytes: performance.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value
            });
            console.log(environment, deviceScaleFactor, JSON.stringify(metrics.frameIntervals));
            await context.close();
        }
    }
} finally {
    await browser.close();
}
await mkdir('evidence/007f', { recursive: true });
await writeFile(
    'evidence/007f/software-performance.json',
    JSON.stringify(
        {
            renderer: 'Chromium ANGLE SwiftShader (software)',
            physicalDevice: false,
            base,
            measuredAt: new Date().toISOString(),
            viewport: { width: 844, height: 390 },
            results
        },
        null,
        4
    ) + '\n'
);
