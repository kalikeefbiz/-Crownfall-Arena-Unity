// One bounded matched workload per engine/build. Sequential contexts only.
// Fixed six-actor pose; real wall rendering. Not live combat or device acceptance.
import { chromium, webkit } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const rows = [];
for (const [engine, type] of [
    ['chromium', chromium],
    ['webkit', webkit]
]) {
    const browser = await type.launch(
        engine === 'chromium'
            ? { args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
            : { executablePath: process.env.DEVICE_WEBKIT_EXECUTABLE }
    );
    try {
        for (const [build, url] of [
            ['017b-equivalent', 'http://127.0.0.1:4181/?verify=1&enclosure=0'],
            ['018a', 'http://127.0.0.1:4181/?verify=1'],
            ['019', 'http://127.0.0.1:4182/?verify=1']
        ]) {
            const context = await browser.newContext({
                viewport: { width: 844, height: 390 },
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 1
            });
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', (e) => errors.push(e.message));
            await page.goto(url);
            await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
            await page.getByRole('button', { name: 'Enter Arena' }).tap();
            await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
            await page.evaluate(() => {
                window.__crownfall.verification.arrange('roster');
                window.__crownfall.verification.pause();
            });
            await page.waitForTimeout(3000);
            const sample = await page.evaluate(async () => {
                const api = window.__crownfall,
                    first = api.snapshot(),
                    start = performance.now(),
                    intervals = [];
                let previous = await new Promise(requestAnimationFrame);
                while (performance.now() - start < 12000) {
                    const t = await new Promise(requestAnimationFrame);
                    intervals.push(t - previous);
                    previous = t;
                }
                return {
                    first,
                    last: api.snapshot(),
                    intervals,
                    wallMs: performance.now() - start,
                    jsHeap: performance.memory?.usedJSHeapSize ?? null
                };
            });
            const sorted = [...sample.intervals].sort((a, b) => a - b);
            const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
            rows.push({
                engine,
                build,
                meanFrameMs: mean,
                meanFps: 1000 / mean,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
                errors,
                ...sample
            });
            await writeFile('evidence/019/performance.json', JSON.stringify(rows, null, 2));
            console.log(engine, build, mean.toFixed(1), sample.last.environment.drawCalls);
            await context.close();
        }
    } finally {
        await browser.close();
    }
}
