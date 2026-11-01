import { test, expect } from '@playwright/test';
for (const width of [844, 390])
    test(`idle instruction clears the Summoner ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
        await page.goto('./?verify=1');
        await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
        await page.getByRole('button', { name: 'Enter Arena' }).tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
        await expect(page.locator('#combat-feedback')).toHaveAttribute('data-outcome', 'READY');
        await expect(page.locator('#combat-feedback')).toBeHidden();
        // Only the idle state is hidden; actionable feedback remains visible.
        const visibility = await page.locator('#combat-feedback').evaluate((e) => {
            e.setAttribute('data-outcome', 'HIT');
            return getComputedStyle(e).visibility;
        });
        expect(visibility).toBe('visible');
    });
