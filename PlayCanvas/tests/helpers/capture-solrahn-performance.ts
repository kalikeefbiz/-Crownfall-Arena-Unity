// Matched inspection cameras only; never used as performance samples.
import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    for (const width of [844, 390])
        for (const [name, port] of [
            ['before', 4176],
            ['after', 4173]
        ] as const) {
            const context = await browser.newContext({
                viewport: { width, height: width === 844 ? 390 : 844 },
                isMobile: true,
                hasTouch: true,
                deviceScaleFactor: 1
            });
            const page = await context.newPage();
            await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
            await page.goto(`http://127.0.0.1:${port}/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1`);
            await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
            await page.getByRole('button', { name: 'Enter Arena' }).tap();
            await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
            await page.evaluate(() =>
                (
                    window as unknown as { __crownfall: { verification: { pause(): void } } }
                ).__crownfall.verification.pause()
            );
            await page.locator('#v2-tools summary').tap();
            const cdp = await context.newCDPSession(page);
            for (const focus of [
                'blue-spawn',
                'red-spawn',
                'middle-lane',
                'north-mobility',
                'north-cooldown',
                'north-defense',
                'south-defense',
                'south-cooldown',
                'south-mobility',
                'major'
            ]) {
                await page.locator('#v2-tools [data-option=focus]').selectOption(focus);
                await page.waitForTimeout(700);
                const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
                await writeFile(`evidence/017a/${name}-${width}-${focus}.png`, Buffer.from(shot.data, 'base64'));
            }
            await page.locator('#v2-tools [data-option=camera]').check();
            for (const overlay of ['neutral', 'dirt', 'grass', 'forest', 'rock', 'zones']) {
                await page.locator('#v2-tools select:not([data-option])').selectOption(overlay);
                await page.waitForTimeout(700);
                const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
                await writeFile(`evidence/017a/${name}-${width}-top-${overlay}.png`, Buffer.from(shot.data, 'base64'));
            }
            await context.close();
        }
} finally {
    await browser.close();
}
