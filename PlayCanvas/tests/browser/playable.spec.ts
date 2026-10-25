import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { CrownfallMatch } from '../../src/combat/match';
type MatchState = ReturnType<CrownfallMatch['snapshot']>;
const state = (page: Page): Promise<MatchState> =>
    page.evaluate(
        () => (window as unknown as { __crownfall: { snapshot(): { match: MatchState } } }).__crownfall.snapshot().match
    );

test('prematch inspection starts, fights a natural 3v3 battle, sees results, freeze and clean restart', async ({
    page
}) => {
    test.setTimeout(900000);
    // Keep the full normal match on software WebGL fast enough to exercise real time.
    // Canonical opposite spawns are 60 units apart; no clocks or actor state are edited.
    await page.setViewportSize({ width: 640, height: 360 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?verify=1');
    await expect(page.locator('#play-match')).toBeVisible();
    await expect(page.locator('#lifecycle-controls')).toBeHidden();
    await expect(page.locator('#scoreboard')).toContainText('BLUE 15');
    expect((await state(page)).actors).toHaveLength(6);
    const before = await state(page);
    await page.locator('#play-match').click();
    await expect(page.locator('#battle-announcement')).toHaveText('3');
    await page.keyboard.down('KeyW');
    await page.keyboard.down('Space');
    await page.waitForTimeout(700);
    expect((await state(page)).actors).toEqual(before.actors);
    await expect.poll(async () => (await state(page)).phase).toBe('active');
    await expect(page.locator('#battle-announcement')).toContainText('MATCH START');
    await expect(page.locator('#scoreboard')).toContainText('ACTIVE MATCH');
    await expect
        .poll(async () => (await state(page)).actors.find((a) => a.human)!.damage, { timeout: 90000 })
        .toBeGreaterThan(0);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');
    await page.screenshot({ path: 'test-results/task004-active-desktop.png' });
    await expect.poll(async () => (await state(page)).result, { timeout: 750000, intervals: [1000] }).not.toBe(null);
    const completed = await state(page);
    // Established territory wins can end a battle before every bot has died.
    // Still require all bots to fight and the natural battle to include deaths.
    expect(completed.actors.filter((a) => !a.human).every((a) => a.damage > 0)).toBe(true);
    expect(completed.actors.some((a) => a.deaths > 0)).toBe(true);
    if (completed.result?.reason === 'tickets') expect(completed.actors.some((a) => a.eliminated)).toBe(true);
    expect(completed.results?.participants).toHaveLength(6);
    await expect(page.locator('#result-panel')).toBeVisible();
    await expect(page.locator('#result-title')).toHaveText(/VICTORY|DEFEAT|DRAW/);
    await page.screenshot({ path: 'test-results/task004-result.png' });
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);
    expect(await state(page)).toEqual(completed);
    await page.locator('#restart-match').click();
    await expect(page.locator('#play-match')).toBeVisible();
    const reset = await state(page);
    expect(reset.phase).toBe('prematch');
    expect(reset.elapsed).toBe(0);
    expect(reset.tickets).toEqual({ 1: 15, 2: 15 });
    expect(
        reset.actors.every((a) => !a.dead && a.health === a.maxHealth && a.deaths === 0 && a.finalRespawnAvailable)
    ).toBe(true);
    await page.locator('#play-match').click();
    await expect.poll(async () => (await state(page)).phase).toBe('active');
    expect(errors).toEqual([]);
});

for (const viewport of [
    { width: 844, height: 390 },
    { width: 390, height: 844 }
]) {
    test(`normal mobile HUD and actual captured touch controls ${viewport.width}x${viewport.height}`, async ({
        browser
    }) => {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        await page.goto('/?verify=1');
        await expect(page.locator('#play-match')).toBeVisible();
        for (const locator of ['#play-match', '#summoner', '#move', '#ability-bar', '#scoreboard', '#team-status']) {
            const box = (await page.locator(locator).boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
        }
        await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
        await page.locator('#play-match').tap();
        await expect.poll(async () => (await state(page)).phase).toBe('active');
        const initial = (await state(page)).actors.find((a) => a.human)!;
        const cdp = await context.newCDPSession(page);
        const box = (await page.locator('#move').boundingBox())!;
        const point = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x + 30 }] });
        await expect
            .poll(async () => (await state(page)).actors.find((a) => a.human)!.x)
            .toBeGreaterThan(initial.x + 0.2);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.getByRole('button', { name: 'Reso Blades', exact: true }).tap();
        await expect
            .poll(async () =>
                page.evaluate(
                    () =>
                        (
                            window as unknown as {
                                __crownfall: { snapshot(): { combat: { journal: { latestAccepted: unknown } } } };
                            }
                        ).__crownfall.snapshot().combat.journal.latestAccepted
                )
            )
            .not.toBe(null);
        await page.screenshot({ path: `test-results/task004-mobile-${viewport.width}.png` });
        await cdp.detach();
        await context.close();
    });
}
