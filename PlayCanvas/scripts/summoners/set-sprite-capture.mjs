// Close-ups of the 2.5D Set sprite in a live match (headless SwiftShader: judge placement and art, not lighting).
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const url = process.env.CAPTURE_URL || 'http://127.0.0.1:4182/';
const out = 'evidence/summoners';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/assets/game-*.js', async (r) => {
    const response = await r.fetch();
    let body = await response.text();
    const id = body.match(/entities:(\w+)\.root\.find/)[1];
    body = body.replace('Object.defineProperty(window,"__crownfall",', `window.__reviewApp=${id};Object.defineProperty(window,"__crownfall",`);
    await r.fulfill({ response, body });
});
try {
    await page.goto(url + '?verify=1');
    await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    await page.waitForTimeout(9000); // let the bots run out of spawn
    await page.addStyleTag({ content: '* { visibility: hidden !important } canvas { visibility: visible !important }' });
    for (const [label, dist, ht] of [['close', 4.2, 2.6], ['game', 9.5, 8.2]]) {
        await page.evaluate(({ dist, ht }) => {
            const app = window.__reviewApp;
            const cam = app.root.findByName('MOBA-camera');
            if (window.__shot) app.off('prerender', window.__shot);
            window.__shot = () => {
                const s = app.root.find((e) => e.name === 'Set-sprite' && e.enabled)[0];
                if (!s) return;
                const p = s.getPosition();
                cam.setPosition(p.x, p.y + ht, p.z + dist);
                cam.lookAt(p.x, p.y + 0.9, p.z);
            };
            app.on('prerender', window.__shot);
        }, { dist, ht });
        for (let f = 0; f < 3; f++) {
            await page.waitForTimeout(350);
            await writeFile(`${out}/sprite-${label}-${f}.png`, Buffer.from(await page.screenshot({ type: 'png' })));
        }
    }
    console.log(JSON.stringify(await page.evaluate(() => window.__crownfall.snapshot().models?.set ?? null))?.slice(0, 300), errors);
} finally {
    await browser.close();
}
