/* global window, document, requestAnimationFrame */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await context.route('**/assets/index-*.js', async (route) => {
        const response = await route.fetch(),
            original = await response.text();
        const body = original.replace(/entities:(\w+)\.root\.find\(/, 'entities:(window.__artApp=$1,$1).root.find(');
        assert.notEqual(body, original);
        await route.fulfill({ response, body });
    });
    const page = await context.newPage(),
        errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/?verify=1');
    await page.evaluate(() => {
        const h = window.__crownfall;
        h.verification.arrange('roster');
        h.verification.pause();
        h.verification.advance(2.1);
    });
    await page.waitForFunction(
        () => window.__crownfall.snapshot().environment.wilderness.state === 'loaded',
        undefined,
        { timeout: 120000 }
    );
    await page.evaluate(() => {
        window.__crownfall.snapshot();
        const app = window.__artApp,
            c = app.root.findByName('MOBA-camera');
        app.on('prerender', () => {
            c.setPosition(-19, 18, 21);
            c.lookAt(-36, 4, -6);
        });
        document.querySelectorAll('body > :not(canvas)').forEach((e) => (e.style.visibility = 'hidden'));
    });
    await page.evaluate(async () => {
        for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
    });
    const cdp = await context.newCDPSession(page),
        result = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile('evidence/010/four-species-overview.png', Buffer.from(result.data, 'base64'));
    assert.deepEqual(errors, []);
    await writeFile(
        'evidence/010/overview.json',
        JSON.stringify(
            {
                viewport: { width: 1280, height: 720 },
                dpr: 1,
                camera: { position: [-19, 18, 21], lookAt: [-36, 4, -6], fov: 48 },
                inspectionOnly: true,
                errors,
                snapshot: await page.evaluate(() => window.__crownfall.snapshot())
            },
            null,
            4
        ) + '\n'
    );
} finally {
    await browser.close();
}
