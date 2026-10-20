import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type Point = { x: number; y: number; z: number };
type Inspection = {
    frames: number;
    aim: { x: number; z: number };
    combat: {
        player: { x: number; z: number };
        now: number;
        transactions: { abilityId: string; amount: number }[];
    };
    territory: {
        camera: Point;
        cameraForward: Point;
        lookTarget: Point;
        follow: { x: number; z: number };
    };
};
type Harness = {
    snapshot(): Inspection;
    verification: { arrange(name: string): void };
};
const snapshot = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const followError = (s: Inspection) =>
    Math.hypot(s.territory.follow.x - s.combat.player.x, s.territory.follow.z - s.combat.player.z);

for (const summoner of ['Kit', 'Set', 'Riven']) {
    test(`competitive camera follows ${summoner} smoothly from behind with fixed forward focus`, async ({ page }) => {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.goto('/?verify=1');
        await page.getByLabel('Summoner', { exact: true }).selectOption(summoner);
        await expect.poll(async () => followError(await snapshot(page))).toBeLessThan(0.01);
        const samples = await page.evaluate(async () => {
            const harness = (window as unknown as { __crownfall: Harness }).__crownfall;
            harness.verification.arrange('pressure');
            const samples = [harness.snapshot()];
            for (let i = 0; i < 6; i++) {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                samples.push(harness.snapshot());
            }
            return samples;
        });
        const errors = samples.map(followError);
        expect(errors[0]).toBeGreaterThan(20);
        expect(errors.at(-1)!).toBeLessThan(errors[0] - 0.1);
        for (let i = 1; i < errors.length; i++) {
            // The existing exponential follow never snaps, reverses, or overshoots.
            expect(errors[i]).toBeLessThanOrEqual(errors[i - 1] + 1e-6);
            expect(errors[i]).toBeGreaterThanOrEqual(errors[i - 1] * Math.exp(-0.9) - 1e-5);
        }
        await expect.poll(async () => followError(await snapshot(page))).toBeLessThan(0.01);
        const s = await snapshot(page);
        const { camera, follow, lookTarget, cameraForward } = s.territory;
        expect(camera.x).toBeCloseTo(s.combat.player.x, 2);
        expect(camera.z).toBeGreaterThan(s.combat.player.z);
        expect(camera.x - follow.x).toBeCloseTo(0, 5);
        expect(camera.y).toBe(15.5);
        expect(camera.z - follow.z).toBeCloseTo(18, 4);
        expect(Math.hypot(camera.y, camera.z - follow.z) / Math.hypot(15, 12.5865)).toBeCloseTo(1.213, 3);
        expect(lookTarget.x).toBeCloseTo(follow.x, 5);
        expect(lookTarget.y).toBe(0);
        expect(lookTarget.z - follow.z).toBeCloseTo(-4, 4);
        expect(cameraForward.x).toBeCloseTo(0, 5);
        expect(cameraForward.z).toBeLessThan(0);
        const pitch = (Math.atan2(-cameraForward.y, -cameraForward.z) * 180) / Math.PI;
        expect(pitch).toBeCloseTo(35.17, 1);
        await page.screenshot({ path: `test-results/task005a-camera-${summoner}.png` });
    });
}

for (const [summoner, basicId] of [
    ['Kit', 'whip'],
    ['Set', 'claw'],
    ['Riven', 'reso']
]) {
    test(`competitive ${summoner} retains touch Basic timing with the farther camera`, async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 844, height: 390 },
            isMobile: true,
            hasTouch: true
        });
        const page = await context.newPage();
        await page.goto('/?verify=1');
        await page.getByLabel('Summoner', { exact: true }).selectOption(summoner);
        await page.evaluate(() =>
            (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('combat')
        );
        await expect.poll(async () => followError(await snapshot(page))).toBeLessThan(0.01);
        const cdp = await context.newCDPSession(page);
        const b = (await page.locator(`.ability-${basicId}`).boundingBox())!;
        const point = { id: 1, x: b.x + b.width / 2, y: b.y + b.height / 2, radiusX: 4, radiusY: 4, force: 1 };
        const hits = async () =>
            (await snapshot(page)).combat.transactions.filter((t) => t.abilityId === basicId && t.amount > 0).length;
        const start = (await snapshot(page)).combat.now;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y - 42 }] });
        if (summoner === 'Riven') {
            await expect.poll(async () => (await snapshot(page)).combat.now).toBeGreaterThan(start + 0.35);
            expect(await hits()).toBe(0);
        } else {
            await expect.poll(hits).toBeGreaterThanOrEqual(2);
            await expect(page.locator('#combat-feedback')).toContainText('HIT');
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, x: point.x + 42 }] });
        await expect.poll(async () => (await snapshot(page)).aim.x).toBeGreaterThan(0.5);
        const aiming = (await snapshot(page)).territory.cameraForward;
        expect(aiming.x).toBeCloseTo(0, 5);
        expect((Math.atan2(-aiming.y, -aiming.z) * 180) / Math.PI).toBeCloseTo(35.17, 1);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y - 42 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(hits).toBeGreaterThan(0);
        if (summoner === 'Riven') await expect(page.locator('#combat-feedback')).toContainText('HIT');
        await page.screenshot({ path: `test-results/task005a-touch-${summoner}.png` });
        await cdp.detach();
        await context.close();
    });
}

for (const [width, height, safe] of [
    [844, 390, 0],
    [844, 390, 44],
    [667, 375, 44],
    [640, 360, 44]
]) {
    test(`landscape targets and HUD stay clear at ${width}x${height}, safe inset ${safe}`, async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width, height },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: 2
        });
        const page = await context.newPage();
        await page.goto('/?verify=1');
        // Chromium has no physical notch: exercise the same CSS variables Safari fills from env().
        await page.evaluate((safe) => {
            const style = document.documentElement.style;
            style.setProperty('--safe-left', `${safe}px`);
            style.setProperty('--safe-right', `${safe}px`);
            style.setProperty('--safe-bottom', `${safe ? 21 : 0}px`);
        }, safe);
        const box = async (selector: string) => {
            const bounds = await page.locator(selector).boundingBox();
            expect(bounds, selector).not.toBe(null);
            return bounds!;
        };
        const clear = (a: Awaited<ReturnType<typeof box>>, b: Awaited<ReturnType<typeof box>>) =>
            a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        for (const summoner of ['Kit', 'Set', 'Riven']) {
            if (summoner !== 'Kit')
                await page.locator('#restart-match').evaluate((e) => (e as HTMLButtonElement).click());
            await page.getByLabel('Summoner', { exact: true }).selectOption(summoner);
            await expect(page.locator('#combat-feedback')).toBeHidden();
            const start = await box('#play-match');
            for (const selector of ['#ability-bar', '#move', '#scoreboard', '#team-status', '#battle-announcement'])
                expect(clear(start, await box(selector)), `Start match / ${selector}`).toBe(true);
            await page.evaluate(() =>
                (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('pressure')
            );
            await expect(page.locator('#play-match')).toBeHidden();
            await expect(page.locator('#combat-feedback')).toBeVisible();
            // Layout-only fixture: include Kit's normally earned fifth action at its widest footprint.
            if (summoner === 'Kit')
                await page.locator('.ability-blast').evaluate((e) => {
                    (e as HTMLElement).style.display = 'block';
                });
            const abilities = page.locator('.ability:visible:not(.ability-stance)');
            await expect(abilities).toHaveCount(summoner === 'Kit' ? 5 : 4);
            const basic = await box('.ability[data-slot="0"]');
            expect(basic.width).toBe(88);
            expect(basic.height).toBe(88);
            for (const ability of await abilities.all()) {
                const b = (await ability.boundingBox())!;
                expect(await ability.evaluate((e) => getComputedStyle(e).touchAction)).toBe('none');
                expect(b.width).toBeGreaterThanOrEqual(72);
                expect(b.height).toBeGreaterThanOrEqual(72);
                if ((await ability.getAttribute('data-slot')) !== '0') {
                    expect(b.width).toBeLessThan(basic.width);
                    expect(b.height).toBeLessThan(basic.height);
                    expect(clear(b, basic)).toBe(true);
                }
            }
            // Stress the banner with a long production-shaped HIT message as well as READY.
            for (const message of [
                'READY · Blue human · fight Red Summoners',
                'HIT · Predatory Combo · 3 targets · 210 damage'
            ]) {
                await page.locator('#combat-feedback').evaluate((e, text) => {
                    e.textContent = text;
                }, message);
                const selectors = [
                    '#ability-bar',
                    '#move',
                    '#scoreboard',
                    '#team-status',
                    '#combat-feedback',
                    '.notice'
                ];
                if (summoner === 'Riven') selectors.push('.ability-stance');
                const boxes = await Promise.all(selectors.map(box));
                const [bar, move] = boxes;
                const controls = [bar, move];
                if (summoner === 'Riven') {
                    const stance = boxes.at(-1)!;
                    expect(stance.width).toBe(72);
                    expect(stance.height).toBe(52);
                    controls.push(stance);
                }
                for (const b of boxes) {
                    expect(b.x).toBeGreaterThanOrEqual(0);
                    expect(b.y).toBeGreaterThanOrEqual(0);
                    expect(b.x + b.width).toBeLessThanOrEqual(width);
                    expect(b.y + b.height).toBeLessThanOrEqual(height);
                }
                for (const control of controls) {
                    expect(control.x).toBeGreaterThanOrEqual(safe);
                    expect(control.x + control.width).toBeLessThanOrEqual(width - safe);
                    expect(control.y + control.height).toBeLessThanOrEqual(height - (safe ? 21 : 0));
                }
                for (let i = 0; i < boxes.length; i++)
                    for (let j = i + 1; j < boxes.length; j++)
                        expect(clear(boxes[i], boxes[j]), `${selectors[i]} / ${selectors[j]}`).toBe(true);
            }
            await page.screenshot({ path: `test-results/task005a-${width}-${safe}-${summoner}.png` });
        }
        await context.close();
    });
}
