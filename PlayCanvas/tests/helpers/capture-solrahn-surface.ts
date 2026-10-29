// Inspection camera evidence; does not relocate actors or activate objectives.
import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
    await page.goto(process.argv[2] || 'http://127.0.0.1:4173/?mapPreview=solrahn-v2&surface=goal017&frontend=1');
    await page.getByRole('button', { name: 'Enter Crownfall' }).click();
    await page.getByRole('button', { name: 'Enter Arena' }).click();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    page.on('console', (m) => {
        if (m.type() === 'error') console.log(m.text());
    });
    page.on('pageerror', (e) => console.log(e.message));
    console.log(
        JSON.stringify(
            await page.evaluate(
                () =>
                    (
                        window as unknown as { __crownfall: { snapshot(): { environment: unknown } } }
                    ).__crownfall.snapshot().environment
            )
        )
    );
    const cdp = await page.context().newCDPSession(page);
    const capture = async (path: string) => {
        console.log('capture', path);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await writeFile(path, Buffer.from(shot.data, 'base64'));
    };
    await page.locator('#v2-tools summary').click();
    await page.addStyleTag({
        content:
            '#match-hud,#roster-hud,#match-status,#move,#aim,.ability-controls,.ready-prompt {opacity:.3!important}'
    });
    for (const id of [
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
        await page.locator('#v2-tools [data-option=focus]').selectOption(id);
        await page.waitForTimeout(700);
        await capture(`evidence/017/camera-${id}.png`);
    }
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.locator('#v2-tools [data-option=camera]').check();
    await page.waitForTimeout(700);
    await capture('evidence/017/map-with-landmarks.png');
    await page.locator('#v2-tools [data-option=markers]').uncheck();
    await page.waitForTimeout(700);
    await capture('evidence/017/map-vs-blueprint.png');
    for (const mode of ['dirt', 'grass', 'forest', 'rock', 'zones']) {
        await page.locator('#v2-tools select:not([data-option])').selectOption(mode);
        await page.waitForTimeout(700);
        await capture(`evidence/017/render-${mode}.png`);
    }
    await page.locator('#v2-tools select:not([data-option])').selectOption('slope');
    await page.waitForTimeout(700);
    await capture('evidence/017/actual-slope-overlay.png');
    await page.locator('#v2-tools select:not([data-option])').selectOption('walk');
    await page.locator('#v2-tools [data-option=routes]').check();
    await page.waitForTimeout(700);
    await capture('evidence/017/actual-routes-overlay.png');
} finally {
    await browser.close();
}
