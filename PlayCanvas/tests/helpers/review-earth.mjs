/* global window, document, requestAnimationFrame */
// Run captures/measurements serially, independently of browser tests.
// node tests/helpers/review-earth.mjs before http://127.0.0.1:4175/ [capture|measure|all]
// node tests/helpers/review-earth.mjs after http://127.0.0.1:4173/ [capture|measure|all]
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const [label, base, mode = 'all'] = process.argv.slice(2);
assert.ok(['before', 'after'].includes(label) && base);
const out = 'evidence/009';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const results = {
    label,
    base,
    viewport: { width: 844, height: 390 },
    renderer: 'Chromium ANGLE SwiftShader',
    physicalDevice: false,
    errors: [],
    views: []
};
async function open(deviceScaleFactor) {
    const context = await browser.newContext({ viewport: results.viewport, deviceScaleFactor });
    // Inspection only: reference the existing app via its diagnostics closure.
    // This does not alter application state or the deployed bundle.
    await context.route('**/assets/index-*.js', async (route) => {
        const response = await route.fetch();
        const original = await response.text();
        const body = original.replace(/entities:(\w+)\.root\.find\(/, 'entities:(window.__artApp=$1,$1).root.find(');
        assert.notEqual(body, original);
        await route.fulfill({ response, body });
    });
    await context.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
    const page = await context.newPage();
    page.on('pageerror', (error) => results.errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error') results.errors.push(message.text());
    });
    await page.goto(`${base}?verify=1`);
    await page.waitForFunction(() => !!window.__crownfall);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await page.evaluate(() => {
        const h = window.__crownfall;
        h.verification.arrange('roster');
        h.verification.pause();
        h.verification.advance(2.1);
    });
    await page.waitForFunction(
        () => {
            const s = window.__crownfall.snapshot();
            return (
                s.summonerModels.filter((m) => m.visible).length === 6 &&
                s.rivenWeapons.state === 'loaded' &&
                (!s.environment.materials || s.environment.materials.state === 'loaded')
            );
        },
        undefined,
        { timeout: 120000 }
    );
    // Let the existing follow camera settle, independent of asset load time.
    await page.waitForFunction(() => {
        const s = window.__crownfall.snapshot();
        return Math.hypot(s.territory.follow.x - s.combat.player.x, s.territory.follow.z - s.combat.player.z) < 1e-6;
    });
    return { context, page };
}
async function capture(page, name) {
    const cdp = await page.context().newCDPSession(page);
    // CDP readback avoids Playwright UI/font stabilization changing capture time.
    const result = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${out}/${label}-${name}.png`, Buffer.from(result.data, 'base64'));
    await cdp.detach();
    console.log(label, name);
}
try {
    if (mode !== 'measure') {
        const { context, page } = await open(2);
        results.views.push({ name: 'match', snapshot: await page.evaluate(() => window.__crownfall.snapshot()) });
        await capture(page, 'match');
        await page.evaluate(() => {
            const app = window.__artApp,
                c = app.root.findByName('MOBA-camera');
            app.on('prerender', () => {
                c.setPosition(9, 6, 10);
                c.lookAt(11, 0, 0);
            });
            document.querySelectorAll('body > :not(canvas)').forEach((e) => (e.style.visibility = 'hidden'));
        });
        await page.evaluate(async () => {
            for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
        });
        await capture(page, 'terrain');
        results.views.push({ name: 'terrain', camera: { position: [9, 6, 10], lookAt: [11, 0, 0], fov: 48 } });
        await context.close();
    }
    if (mode !== 'capture') {
        for (const deviceScaleFactor of [1, 2]) {
            const { context, page } = await open(deviceScaleFactor);
            const metrics = await page.evaluate(async () => {
                for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame);
                let previous = await new Promise(requestAnimationFrame);
                const intervals = [],
                    draws = [],
                    renderMs = [];
                for (let i = 0; i < 60; i++) {
                    const now = await new Promise(requestAnimationFrame);
                    intervals.push(now - previous);
                    previous = now;
                    draws.push(window.__artApp.stats.drawCalls.total);
                    renderMs.push(window.__artApp.stats.frame.renderTime);
                }
                const sorted = [...intervals].sort((a, b) => a - b);
                return {
                    samples: intervals.length,
                    intervals,
                    draws,
                    renderMs,
                    meanMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
                    medianMs: sorted[30],
                    p95Ms: sorted[57],
                    snapshot: window.__crownfall.snapshot()
                };
            });
            results.views.push({ name: 'performance', deviceScaleFactor, ...metrics });
            console.log(label, deviceScaleFactor, metrics.meanMs, metrics.medianMs, metrics.p95Ms);
            await context.close();
        }
    }
    assert.deepEqual(results.errors, []);
} finally {
    await browser.close();
    await writeFile(`${out}/${label}-${mode}.json`, `${JSON.stringify(results, null, 4)}\n`);
}
