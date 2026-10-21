import { createHash } from 'node:crypto';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { KIT_ASSET_BYTES, KIT_ASSET_PATH, KIT_ASSET_SHA256 } from '../../src/presentation/kit-model';

type Inspection = {
    kitModel: {
        state: string;
        visible: boolean;
        primitiveVisible: boolean;
        scale: number;
        offset: number[];
        height: number;
        meshInstances: number;
        yaw: number;
        position: { x: number; y: number; z: number };
        rootScale: number[];
        bounds: { min: number[]; max: number[] };
        worldBounds: { min: number[]; max: number[] };
        loadMs: number;
    };
    combat: { player: { x: number; z: number; radius: number }; transactions: { amount: number }[] };
    facing: { owner: string };
    frameMs: number;
    aim: { x: number; z: number };
};
type Harness = { snapshot(): Inspection; verification: { arrange(name: string): void } };
const snapshot = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const arrange = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('combat'));

test('production serves unchanged Kit GLB', async ({ request }) => {
    const response = await request.get(`/${KIT_ASSET_PATH}`);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.length).toBe(KIT_ASSET_BYTES);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(KIT_ASSET_SHA256);
});

test('local Kit loads, grounds, follows and rotates rigidly in the normal mobile match', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?verify=1');
    await expect.poll(async () => (await snapshot(page)).kitModel.state).toBe('idle');
    const before = await snapshot(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).kitModel.state).toBe('loaded');
    const loaded = await snapshot(page);
    const m = loaded.kitModel;
    expect(m.visible).toBe(true);
    expect(m.primitiveVisible).toBe(false);
    expect(m.rootScale).toEqual([1, 1, 1]);
    expect(loaded.combat.player.radius).toBe(before.combat.player.radius);
    expect(m.height * m.scale).toBeCloseTo(1.75, 5);
    expect(m.bounds.min[1] * m.scale + m.offset[1]).toBeCloseTo(0, 5);
    expect(m.meshInstances).toBe(1);
    expect(m.worldBounds.min[1]).toBeCloseTo(0, 5);
    expect(m.worldBounds.max[1]).toBeCloseTo(1.75, 5);
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).kitModel.position.x).toBeGreaterThan(m.position.x + 0.5);
    await expect.poll(async () => (await snapshot(page)).kitModel.yaw).toBeCloseTo(90, 3);
    await page.keyboard.up('d');
    const moved = await snapshot(page);
    expect(moved.kitModel.position.x).toBeCloseTo(moved.combat.player.x, 5);
    expect(moved.kitModel.position.z).toBeCloseTo(moved.combat.player.z, 5);
    expect(moved.kitModel.position.y).toBe(0);
    await arrange(page);
    const basic = page.locator('.ability-whip');
    const b = (await basic.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 42);
    await expect
        .poll(async () => (await snapshot(page)).combat.transactions.filter((t) => t.amount > 0).length)
        .toBeGreaterThan(0);
    await expect
        .poll(async () => {
            const s = await snapshot(page);
            return Math.abs(s.kitModel.yaw - (Math.atan2(s.aim.x, s.aim.z) * 180) / Math.PI);
        })
        .toBeLessThan(0.001);
    await page.mouse.up();
    await page.screenshot({ path: 'test-results/task007a-kit.png' });
    console.log('Kit measured diagnostics', JSON.stringify({ ...m, frameMs: loaded.frameMs }));
    expect(errors).toEqual([]);
});

for (const summoner of ['Set', 'Riven']) {
    test(`${summoner} retains primitives without fetching Kit`, async ({ page }) => {
        const requests: string[] = [];
        page.on('request', (r) => {
            if (r.url().endsWith('.glb')) requests.push(r.url());
        });
        await page.goto('/?verify=1');
        await page.getByLabel('Summoner', { exact: true }).selectOption(summoner);
        await arrange(page);
        await expect.poll(async () => (await snapshot(page)).combat.player.x).toBe(0);
        const s = await snapshot(page);
        expect(s.kitModel.state).toBe('idle');
        expect(s.kitModel.visible).toBe(false);
        expect(s.kitModel.primitiveVisible).toBe(true);
        expect(requests).toEqual([]);
    });
}

test('primitive comparison skips the GLB request', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await page.goto('/?verify=1&kitPrimitive=1');
    await arrange(page);
    const s = await snapshot(page);
    expect(s.kitModel.primitiveVisible).toBe(true);
    expect(s.kitModel.visible).toBe(false);
    expect(requests).toEqual([]);
});

test('pending and failed loading keep playable primitive fallback', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/*.glb', async (route) => {
        await gate;
        await route.abort();
    });
    await page.goto('/?verify=1');
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).kitModel.state).toBe('loading');
    expect((await snapshot(page)).kitModel.primitiveVisible).toBe(true);
    release();
    await expect.poll(async () => (await snapshot(page)).kitModel.state).toBe('error');
    expect((await snapshot(page)).kitModel.primitiveVisible).toBe(true);
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).combat.player.x).toBeGreaterThan(0.5);
    await page.keyboard.up('d');
});
