import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { CrownfallMatch } from '../../src/combat/match';
type State = ReturnType<CrownfallMatch['snapshot']>;
type Inspection = {
    match: State;
    territory: { frontierZ: number; camera: { x: number; y: number; z: number }; follow: { x: number; z: number } };
};
type Harness = {
    snapshot(): Inspection;
    verification: { arrange(name: string): void; advance(seconds: number): void };
};
const snapshot = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const arrange = (page: Page, name: string) =>
    page.evaluate(
        (name) => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange(name),
        name
    );
const advance = (page: Page, seconds: number) =>
    page.evaluate(
        (seconds) => (window as unknown as { __crownfall: Harness }).__crownfall.verification.advance(seconds),
        seconds
    );

test('production positional territory, visual frontier, grace, retained CP and camera', async ({ page }) => {
    await page.goto('/?verify=1');
    await expect(page.locator('#scoreboard')).toContainText('50.0% / 50.0%');
    await expect(page.locator('#scoreboard')).toContainText('CP 0 / 0 of 1000');
    await arrange(page, 'pressure');
    await advance(page, 1.5);
    await expect(page.locator('#scoreboard')).toContainText('PRESSURE');
    let s = await snapshot(page);
    expect(s.match.control).toBeGreaterThan(0.5);
    expect(s.match.cp[1]).toBe(0);
    await expect.poll(async () => (await snapshot(page)).territory.frontierZ).toBe(-s.match.front);
    await advance(page, 0.75);
    s = await snapshot(page);
    expect(s.match.cp[1]).toBeCloseTo(3);
    await expect(page.locator('#scoreboard')).toContainText('BLUE SCORING');
    await arrange(page, 'neutral');
    await advance(page, 0.25);
    expect((await snapshot(page)).match.cp[1]).toBeCloseTo(3);
    await expect(page.locator('#scoreboard')).toContainText('NEUTRAL');
    await arrange(page, 'red-pressure');
    await advance(page, 1.5);
    expect((await snapshot(page)).match.cp[2]).toBe(0);
    await advance(page, 0.75);
    expect((await snapshot(page)).match.cp[2]).toBeCloseTo(3);
    await expect
        .poll(async () => (await snapshot(page)).territory.camera.z - (await snapshot(page)).territory.follow.z)
        .toBeCloseTo(12.5865, 3);
    expect((await snapshot(page)).territory.camera.y).toBe(15);
});
for (const reason of ['total-control', 'points'])
    test(`production ${reason} result has all participants, final metrics, freezes and restarts`, async ({ page }) => {
        await page.goto('/?verify=1');
        await arrange(page, reason);
        await advance(page, reason === 'points' ? 2.25 : 1 / 60);
        await expect(page.locator('#result-panel')).toBeVisible();
        let s = (await snapshot(page)).match;
        expect(s.result?.reason).toBe(reason);
        expect(s.results?.participants).toHaveLength(6);
        await expect(page.locator('#result-participants tbody tr')).toHaveCount(6);
        await expect(page.locator('#result-participants tbody .blue-team')).toHaveCount(3);
        await expect(page.locator('#result-participants tbody .red-team')).toHaveCount(3);
        for (const team of [1, 2])
            for (const slot of [0, 1, 2])
                await expect(page.locator(`[data-participant="${team}-${slot}"]`)).toContainText(
                    ['Kit', 'Set', 'Riven'][slot]
                );
        for (const label of ['Territory', 'CP', 'Tickets'])
            await expect(page.locator('#result-detail')).toContainText(label);
        if (reason === 'total-control') expect(s.cp[1]).toBe(0);
        else expect(s.cp[1]).toBe(1000);
        await page.screenshot({ path: `test-results/task005-${reason}-result.png` });
        await advance(page, 5);
        expect((await snapshot(page)).match).toEqual(s);
        await page.locator('#restart-match').click();
        await expect(page.locator('#result-panel')).toBeHidden();
        s = (await snapshot(page)).match;
        expect(s.result).toBe(null);
        expect(s.results).toBe(null);
        expect(s.control).toBe(0.5);
        expect(s.front).toBe(0);
        expect(s.cp).toEqual({ 1: 0, 2: 0 });
        expect(s.tickets).toEqual({ 1: 15, 2: 15 });
        expect(s.elapsed).toBe(0);
        expect(
            s.actors.every(
                (a) =>
                    !a.dead &&
                    !a.eliminated &&
                    a.finalRespawnAvailable &&
                    a.damage === 0 &&
                    a.kills === 0 &&
                    a.deaths === 0 &&
                    a.assists === 0 &&
                    a.pressureSeconds === 0
            )
        ).toBe(true);
        await page.screenshot({ path: `test-results/task005-${reason}-restart.png` });
    });
test('normal full-map iPhone landscape HUD avoids controls and real touch deals damage', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/?verify=1');
    await arrange(page, 'combat');
    await expect(page.locator('#scoreboard')).toContainText('CP');
    const boxes = await Promise.all(
        ['#scoreboard', '#team-status', '#move', '#ability-bar', '#summoner'].map((selector) =>
            page.locator(selector).boundingBox()
        )
    );
    for (const b of boxes) {
        expect(b).not.toBe(null);
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.y).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(845);
        expect(b!.y + b!.height).toBeLessThanOrEqual(391);
    }
    const intersects = (a: NonNullable<(typeof boxes)[number]>, b: NonNullable<(typeof boxes)[number]>) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    for (const hud of boxes.slice(0, 2))
        for (const control of boxes.slice(2)) expect(intersects(hud!, control!)).toBe(false);
    const before = (await snapshot(page)).match.actors[0].damage;
    await page.getByRole('button', { name: 'Solar Ring', exact: true }).tap();
    await expect.poll(async () => (await snapshot(page)).match.actors[0].damage).toBeGreaterThan(before);
    await page.screenshot({ path: 'test-results/task005-landscape-touch.png' });
    await context.close();
});
