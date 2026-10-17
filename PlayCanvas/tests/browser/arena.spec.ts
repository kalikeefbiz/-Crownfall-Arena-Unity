import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
type Snapshot = {
    position: { x: number; z: number };
    movement: { x: number; z: number };
    aim: { x: number; z: number };
    facing: { facing: string; owner: string };
    targeting: boolean;
    committedFacing: string;
    collisions: number;
    frames: number;
    entities: number;
    visualScaleX: number;
    rootScaleX: number;
};
const snapshot = (page: Page): Promise<Snapshot> =>
    page.evaluate(() => (window as unknown as { __crownfall: { snapshot(): Snapshot } }).__crownfall.snapshot());
async function ready(page: Page) {
    await page.goto('/');
    await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(5);
    await expect(page.locator('#diagnostics')).toContainText('SAFE');
}

test('production arena renders, moves, aims independently, mirrors and preserves facing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await ready(page);
    expect((await snapshot(page)).entities).toBeGreaterThan(30);
    await page.screenshot({ path: 'test-results/arena-desktop.png' });
    await page.keyboard.down('KeyD');
    await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(0.3);
    await page.keyboard.up('KeyD');
    expect((await snapshot(page)).facing.facing).toBe('Right');
    await page.mouse.move(420, 290);
    await page.mouse.down();
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('aim');
    expect((await snapshot(page)).facing.facing).toBe('Left');
    expect((await snapshot(page)).visualScaleX).toBe(-1);
    expect((await snapshot(page)).rootScaleX).toBe(1);
    const before = await snapshot(page);
    await page.keyboard.down('KeyD');
    await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(before.position.x + 0.3);
    expect((await snapshot(page)).facing.facing).toBe('Left');
    expect((await snapshot(page)).visualScaleX).toBe(-1);
    expect((await snapshot(page)).rootScaleX).toBe(1);
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('commit');
    expect((await snapshot(page)).committedFacing).toBe('Left');
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('movement');
    expect((await snapshot(page)).facing.facing).toBe('Right');
    await page.keyboard.up('KeyD');
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('idle');
    expect((await snapshot(page)).facing.facing).toBe('Right');
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#diagnostics')).toContainText('844×390');
    expect(errors).toEqual([]);
});

test('landscape mobile supports two captured pointers and clears cancelled input', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await ready(page);
    const move = page.locator('#move'),
        aim = page.locator('#aim');
    const m = (await move.boundingBox())!,
        a = (await aim.boundingBox())!;
    const session = await context.newCDPSession(page);
    const point = (id: number, x: number, y: number) => ({ id, x, y, radiusX: 5, radiusY: 5, force: 1 });
    const mp = point(1, m.x + m.width / 2, m.y + m.height / 2);
    const ap = point(2, a.x + a.width / 2, a.y + a.height / 2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp, ap] });
    const moving = { ...mp, x: mp.x + 48 };
    const aiming = { ...ap, x: ap.x - 48 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving, aiming] });
    await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(0.3);
    expect((await snapshot(page)).facing).toEqual({ facing: 'Left', owner: 'aim' });
    await page.screenshot({ path: 'test-results/arena-mobile.png' });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('commit');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving] });
    await expect.poll(async () => (await snapshot(page)).movement.x).toBeGreaterThan(0);
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect.poll(async () => (await snapshot(page)).movement.x).toBe(0);
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('idle');
    expect((await snapshot(page)).facing.facing).toBe('Left');
    expect((await snapshot(page)).visualScaleX).toBe(-1);
    expect((await snapshot(page)).rootScaleX).toBe(1);
    for (const name of ['Skill 1', 'Skill 2', 'Ultimate']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible();
        await expect(button).toBeDisabled();
    }
    expect(errors).toEqual([]);
    await context.close();
});

test('obstruction blocks movement in the rendered app', async ({ page }) => {
    await ready(page);
    await page.keyboard.down('KeyD');
    await expect.poll(async () => (await snapshot(page)).position.x).toBeGreaterThan(2.8);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyW');
    await expect.poll(async () => (await snapshot(page)).collisions).toBeGreaterThan(0);
    await page.keyboard.up('KeyW');
    const state = await snapshot(page);
    expect(state.position.z).toBeGreaterThanOrEqual(4.4);
    expect(state.position.z).toBeLessThan(4.5);
});
