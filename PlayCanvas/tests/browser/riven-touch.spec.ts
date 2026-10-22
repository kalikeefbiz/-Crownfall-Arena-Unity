import { test, expect } from '@playwright/test';

// Exercise the 3D presenter with the actual mobile controls, including simultaneous
// captured movement and Riven's release-confirmed Basic. No test-only gameplay is added.
test('Riven 3D preview supports simultaneous touch movement, aim, release and cancellation', async ({ browser }) => {
    const context = await browser.newContext({
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
    });
    try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('/?debug=1&rivenPreview=1');
        await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
        type Snapshot = {
            position: { x: number; z: number };
            movement: { x: number; z: number };
            aim: { x: number; z: number };
            facing: { owner: string };
            combat: { journal: { latestAccepted: { abilityId: string } | null } };
            rivenModel: { state: string; activeAnimation: string; yaw: number; rootScale: number[]; visible: boolean };
        };
        const snapshot = () =>
            page.evaluate(() =>
                (window as unknown as { __crownfall: { snapshot(): Snapshot } }).__crownfall.snapshot()
            );
        await expect.poll(async () => (await snapshot()).rivenModel.state).toBe('loaded');
        const before = await snapshot();
        const move = (await page.locator('#move').boundingBox())!;
        const aim = (await page.getByRole('button', { name: 'Reso Blades', exact: true }).boundingBox())!;
        const session = await context.newCDPSession(page);
        const point = (id: number, x: number, y: number) => ({ id, x, y, radiusX: 5, radiusY: 5, force: 1 });
        const mp = point(1, move.x + move.width / 2, move.y + move.height / 2);
        const ap = point(2, aim.x + aim.width / 2, aim.y + aim.height / 2);
        const moving = { ...mp, x: mp.x + 42 };
        const aiming = { ...ap, x: ap.x - 42 };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp, ap] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving, aiming] });
        await expect.poll(async () => (await snapshot()).position.x).toBeGreaterThan(before.position.x + 0.3);
        await expect.poll(async () => (await snapshot()).rivenModel.activeAnimation).toBe('Running');
        await expect.poll(async () => (await snapshot()).facing.owner).toBe('aim');
        expect((await snapshot()).combat.journal.latestAccepted).toBeNull();
        await expect
            .poll(async () => {
                const s = await snapshot();
                return Math.abs(s.rivenModel.yaw - (Math.atan2(s.aim.x, s.aim.z) * 180) / Math.PI);
            })
            .toBeLessThan(0.001);
        expect((await snapshot()).rivenModel.rootScale).toEqual([1, 1, 1]);
        await page.screenshot({ path: 'test-results/task007c-riven-touch.png' });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(async () => (await snapshot()).combat.journal.latestAccepted?.abilityId).toBe('reso');
        await expect.poll(async () => (await snapshot()).rivenModel.activeAnimation).toBe('Idle_6');
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mp] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving] });
        await expect.poll(async () => (await snapshot()).movement.x).toBeGreaterThan(0);
        await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect.poll(async () => (await snapshot()).movement.x).toBe(0);
        await expect.poll(async () => (await snapshot()).rivenModel.activeAnimation).toBe('Idle_6');
        expect((await snapshot()).rivenModel.visible).toBe(true);
        expect(errors).toEqual([]);
    } finally {
        await context.close();
    }
});
