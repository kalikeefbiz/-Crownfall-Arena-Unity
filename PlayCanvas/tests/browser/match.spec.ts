import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { CrownfallMatch } from '../../src/combat/match';
type MatchState = ReturnType<CrownfallMatch['snapshot']>;
const snapshot = (page: Page): Promise<MatchState> =>
    page.evaluate(
        () => (window as unknown as { __crownfall: { snapshot(): { match: MatchState } } }).__crownfall.snapshot().match
    );
async function start(page: Page) {
    await page.goto('/?debug=1');
    await expect(page.locator('#lifecycle-mode')).toBeVisible();
    await page.locator('#lifecycle-mode').check();
    await expect.poll(async () => (await snapshot(page))?.phase).toBe('prematch');
    await page.locator('#start-match').click();
    await expect(page.locator('#match-status')).toContainText('countdown');
    await expect.poll(async () => (await snapshot(page)).phase).toBe('active');
}
test('rendered lifecycle countdown, death, visible respawn/protection, all final lives, results and clean rematch', async ({
    page
}) => {
    await start(page);
    expect((await snapshot(page)).actors).toHaveLength(6);
    await page.locator('#inspect-actor').selectOption('2-0');
    await page.locator('#lethal-actor').click();
    await expect(page.locator('#match-status')).toContainText('Red 14 tickets');
    await expect(page.locator('#match-status')).toContainText('RESPAWN');
    await expect.poll(async () => (await snapshot(page)).actors.find((a) => a.id === '2-0')!.dead).toBe(false);
    await expect(page.locator('#match-status')).toContainText('PROTECTED');
    await page.locator('#advance-match').click();
    for (let i = 0; i < 14; i++) {
        await page.locator('#lethal-actor').click();
        await page.locator('#advance-match').click();
    }
    expect((await snapshot(page)).tickets[2]).toBe(0);
    expect((await snapshot(page)).actors.find((a) => a.id === '2-0')!.finalRespawnAvailable).toBe(true);
    for (const id of ['2-0', '2-1', '2-2']) {
        await page.locator('#inspect-actor').selectOption(id);
        await page.locator('#lethal-actor').click();
        await page.locator('#advance-match').click();
        await page.locator('#lethal-actor').click();
        await expect.poll(async () => (await snapshot(page)).actors.find((a) => a.id === id)!.eliminated).toBe(true);
    }
    await expect(page.locator('#match-status')).toContainText('RESULT BLUE');
    const frozen = await snapshot(page);
    await page.locator('#advance-match').click();
    await page.locator('#lethal-actor').click();
    expect(await snapshot(page)).toEqual(frozen);
    await page.locator('#reset-combat').click();
    await expect.poll(async () => (await snapshot(page)).phase).toBe('prematch');
    const reset = await snapshot(page);
    expect(reset.tickets).toEqual({ '1': 15, '2': 15 });
    expect(
        reset.actors.every((a) => !a.dead && a.finalRespawnAvailable && a.deaths === 0 && a.health === a.maxHealth)
    ).toBe(true);
});
test('3v3 selected Blue human takes real touch commands after countdown and reset', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await start(page);
    for (const name of ['Kit', 'Set', 'Riven']) {
        await page.getByLabel('Summoner', { exact: true }).selectOption({ label: name });
        await page.locator('#start-match').tap();
        await expect.poll(async () => (await snapshot(page)).phase).toBe('active');
        const state = await snapshot(page);
        expect(state.actors.filter((a) => a.human)).toHaveLength(1);
        expect(state.actors.find((a) => a.human)!.team).toBe(1);
        const before = state.actors.find((a) => a.human)!;
        const cdp = await context.newCDPSession(page);
        const basic = page.locator('#ability-bar button').first();
        await basic.tap();
        await expect
            .poll(async () =>
                page.evaluate(
                    () =>
                        (
                            window as unknown as {
                                __crownfall: { snapshot(): { combat: { transactions: unknown[] } } };
                            }
                        ).__crownfall.snapshot().combat.transactions.length
                )
            )
            .toBeGreaterThan(0);
        const box = (await page.locator('#move').boundingBox())!;
        const p = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, x: p.x + 30 }] });
        await expect
            .poll(async () => (await snapshot(page)).actors.find((a) => a.human)!.x)
            .toBeGreaterThan(before.x + 0.2);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        if (name === 'Riven') {
            await page.locator('.ability-stance').tap();
            await expect
                .poll(async () =>
                    page.evaluate(
                        () =>
                            (
                                window as unknown as { __crownfall: { snapshot(): { combat: { stance: string } } } }
                            ).__crownfall.snapshot().combat.stance
                    )
                )
                .toBe('pulse');
        }
        await cdp.detach();
    }
    await context.close();
});
