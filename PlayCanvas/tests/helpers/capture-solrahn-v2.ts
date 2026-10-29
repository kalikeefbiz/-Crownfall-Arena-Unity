// Inspection camera evidence; does not relocate actors or activate objectives.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
    await page.goto(process.argv[2] || 'http://127.0.0.1:4173/?mapPreview=solrahn-v2&frontend=1');
    await page.getByRole('button', { name: 'Enter Crownfall' }).click();
    await page.getByRole('button', { name: 'Enter Arena' }).click();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
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
        await page.screenshot({ path: `evidence/016/camera-${id}.png` });
    }
    await page.locator('#v2-tools [data-option=camera]').check();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'evidence/016/map-vs-blueprint.png' });
    await page.locator('#v2-tools select:not([data-option])').selectOption('slope');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'evidence/016/actual-slope-overlay.png' });
    await page.locator('#v2-tools select:not([data-option])').selectOption('walk');
    await page.locator('#v2-tools [data-option=routes]').check();
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'evidence/016/actual-routes-overlay.png' });
} finally {
    await browser.close();
}
