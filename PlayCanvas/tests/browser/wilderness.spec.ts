import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { CrownfallMatch } from '../../src/combat/match';
type State = ReturnType<CrownfallMatch['snapshot']>;
type Harness = {
    snapshot(): {
        match: State;
        combat: { now: number; player: { x: number; z: number }; transactions: { targetId: string; amount: number }[] };
        territory: { camera: { y: number; z: number }; follow: { z: number } };
    };
    verification: { arrange(name: string): void; advance(t: number): void; pause(): void };
};
const read = (p: Page) => p.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const arrange = (p: Page, name: string) =>
    p.evaluate((name) => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange(name), name);
const advance = (p: Page, t: number) =>
    p.evaluate((t) => {
        const h = (window as unknown as { __crownfall: Harness }).__crownfall;
        h.verification.pause();
        h.verification.advance(t);
    }, t);
for (const type of ['mobility', 'cooldown', 'defense', 'damage'])
    test(`touch secures ${type}, visible camp and timed authoritative buff`, async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 844, height: 390 },
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();
        await page.goto('/?verify=1');
        await arrange(page, `camp-${type}`);
        const label = page.locator(`[data-camp="${type === 'damage' ? 'major' : type + '-a'}"]`);
        await expect(label).toBeVisible();
        await expect(label).toContainText(type === 'damage' ? 'DAMAGE OBJECTIVE' : type.toUpperCase() + ' CAMP');
        const hp = (await read(page)).match.actors[0].health;
        await expect.poll(async () => (await read(page)).match.actors[0].health).toBeLessThan(hp);
        await page.getByRole('button', { name: 'Solar Ring', exact: true }).tap();
        await expect(page.locator('#wilderness-buffs')).toContainText(
            type === 'damage' ? 'TEAM DAMAGE +25%' : type.toUpperCase()
        );
        let s = (await read(page)).match;
        expect(s.rewards).toBe(1);
        expect(s.actors[0].ultimateMeter).toBe(0);
        expect(s.actors[0].kills).toBe(0);
        expect(s.actors[0].damage).toBe(0);
        expect(s.actors.filter((a) => a.team === 2).every((a) => !a.modifiers['camp:damage'])).toBe(true);
        if (type === 'damage')
            expect(
                s.actors.filter((a) => a.team === 1).every((a) => a.modifiers['camp:damage']?.damageBonus === 0.25)
            ).toBe(true);
        await expect(label).toContainText('RESPAWN');
        await expect(page.locator('#kill-feed')).toContainText('secured');
        const camera = (await read(page)).territory;
        expect(camera.camera.y).toBe(15.5);
        expect(camera.camera.z - camera.follow.z).toBeCloseTo(18, 3);
        await page.screenshot({ path: `test-results/task006-${type}.png` });
        await advance(page, type === 'damage' ? 25.1 : 20.1);
        await expect(page.locator('#wilderness-buffs')).not.toContainText(
            type === 'damage' ? 'TEAM DAMAGE' : type.toUpperCase()
        );
        s = (await read(page)).match;
        expect(s.actors[0].modifiers['camp:' + type]).toBeUndefined();
        await context.close();
    });
for (const direction of [-1, 1])
    test(`real captured touch leaves lane into Wilderness ${direction} and returns`, async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 844, height: 390 },
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();
        await page.goto('/?verify=1');
        await arrange(page, direction === 1 ? 'wilderness-entry' : 'wilderness-left-entry');
        const cdp = await context.newCDPSession(page),
            box = (await page.locator('#move').boundingBox())!,
            point = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...point, x: point.x + direction * 40 }]
        });
        await expect.poll(async () => Math.abs((await read(page)).combat.player.x)).toBeGreaterThan(15);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect(page.locator('#wilderness-buffs')).toContainText('INNER FLAME +5%');
        const s = (await read(page)).match;
        expect(s.actors[0].pressureSeconds).toBe(0);
        expect(s.control).toBeCloseTo(0.5 + 6 / 56);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...point, x: point.x - direction * 40 }]
        });
        await expect.poll(async () => Math.abs((await read(page)).combat.player.x)).toBeLessThan(11);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect(page.locator('#wilderness-buffs')).toBeHidden();
        await context.close();
    });
test('bot rotation physically leaves lane toward real camp in production', async ({ page }) => {
    await page.goto('/?verify=1');
    await arrange(page, 'rotation');
    await advance(page, 1 / 60);
    let s = (await read(page)).match;
    expect(s.rotations).toBeGreaterThan(0);
    const assignment = s.assignments.find((a) => a.id.startsWith('1-'))!,
        start = s.actors.find((a) => a.id === assignment.id)!;
    await advance(page, 5);
    s = (await read(page)).match;
    const p = s.actors.find((a) => a.id === assignment.id)!;
    expect(Math.hypot(p.x - start.x, p.z - start.z)).toBeGreaterThan(5);
    expect(Math.abs(p.x)).toBeGreaterThan(12);
    expect(s.camps).toHaveLength(7);
    await page.screenshot({ path: 'test-results/task006-rotation.png' });
});
for (const [width, height, safe] of [
    [844, 390, 0],
    [844, 390, 44],
    [667, 375, 44],
    [640, 360, 44]
])
    test(`active reward HUD clear of controls ${width} safe ${safe}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true }),
            page = await context.newPage();
        await page.goto('/?verify=1');
        await arrange(page, 'all-buffs');
        await expect(page.locator('#wilderness-buffs')).toContainText('MOBILITY');
        await expect(page.locator('#wilderness-buffs')).toContainText('INNER FLAME');
        await page.evaluate((safe) => {
            document.documentElement.style.setProperty('--safe-left', `${safe}px`);
            document.documentElement.style.setProperty('--safe-right', `${safe}px`);
            document.documentElement.style.setProperty('--safe-bottom', `${safe ? 21 : 0}px`);
        }, safe);
        expect(await page.locator('#wilderness-buffs').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        const buff = (await page.locator('#wilderness-buffs').boundingBox())!;
        expect(buff.x).toBeGreaterThanOrEqual(safe);
        expect(buff.x + buff.width).toBeLessThanOrEqual(width - safe);
        for (const selector of [
            '#scoreboard',
            '#team-status',
            '#move',
            '#ability-bar',
            '#combat-feedback',
            '#kill-feed'
        ]) {
            const b = (await page.locator(selector).boundingBox())!;
            expect(
                buff.x + buff.width <= b.x ||
                    b.x + b.width <= buff.x ||
                    buff.y + buff.height <= b.y ||
                    b.y + b.height <= buff.y,
                selector
            ).toBe(true);
        }
        await page.screenshot({ path: `test-results/task006-all-buffs-${width}-${safe}.png` });
        await context.close();
    });
