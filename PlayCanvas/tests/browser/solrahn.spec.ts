import { writeFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { blueprint, LANES } from '../../src/maps/solrahn';
import type { Point } from '../../src/maps/solrahn';

type State = {
    mode: string;
    view: string;
    position: Point;
    height: number;
    frames: number;
    performance: { drawCalls: number; medianMs: number; p95Ms: number; setupMs: number; documentReadyMs: number };
    geometry: { sourceModules: number; terrainTriangles: number; textureBytes: number };
};
type Preview = {
    snapshot(): State;
    place(p: Point): boolean;
    view(value: string): void;
    advance(command: { moveX: number; moveZ: number }, seconds: number): void;
    traverse(points: Point[]): { success: boolean; seconds: number };
};
type W = Window & { __solrahn: Preview };
const state = (page: Page) => page.evaluate(() => (window as unknown as W).__solrahn.snapshot());
const capture = async (page: Page, name: string) => {
    await page.waitForTimeout(100);
    await page.screenshot({ path: `evidence/012/${name}.png` });
};

test('complete master scene, actual lane traversal and inspection evidence', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?mapPreview=solrahn');
    await page.waitForFunction(() => '__solrahn' in window);
    await expect.poll(async () => (await state(page)).frames).toBeGreaterThan(10);
    expect((await state(page)).geometry).toMatchObject({ sourceModules: 60, textureBytes: 0 });
    await expect(page.getByText('BLUE CROWN CORE', { exact: true })).toBeVisible();
    await capture(page, 'full-map');
    const lanes = [];
    for (const lane of LANES) {
        const result = await page.evaluate(
            (points) => (window as unknown as W).__solrahn.traverse(points),
            lane.points
        );
        expect(result.success).toBe(true);
        lanes.push({ lane: lane.id, ...result });
        await page.selectOption('#solrahn-view', lane.id);
        await capture(page, `lane-${lane.id}`);
    }
    for (const view of ['wilderness', 'blue', 'red']) {
        await page.selectOption('#solrahn-view', view);
        await capture(page, view);
    }
    await page.selectOption('#solrahn-view', 'follow');
    for (const [name, point] of [
        ['middle', { x: 0, z: 0 }],
        ['upper', { x: 0, z: -51 }],
        ['lower', { x: 0, z: 51 }],
        ['wilderness', { x: 36, z: 28 }],
        ['major', blueprint.major_camp]
    ] as const) {
        expect(await page.evaluate((p) => (window as unknown as W).__solrahn.place(p), point)).toBe(true);
        await capture(page, `gameplay-${name}`);
    }
    await page.selectOption('#solrahn-view', 'overview');
    await page.selectOption('#solrahn-mode', '3v3');
    await capture(page, 'active-3v3');
    expect(errors).toEqual([]);
    await writeFile('evidence/012/browser-traversal.json', JSON.stringify({ lanes, errors }, null, 2) + '\n');
});

test('3v3 hard collision, real keyboard/stick input and unchanged gameplay camera', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?mapPreview=solrahn&mapMode=3v3');
    await page.waitForFunction(() => '__solrahn' in window);
    await expect.poll(async () => (await state(page)).frames).toBeGreaterThan(2);
    await page.selectOption('#solrahn-view', 'follow');
    await expect(page.locator('#solrahn-station option[value="upper"]')).toHaveJSProperty('disabled', true);
    await page.evaluate(() => {
        const p = (window as unknown as W).__solrahn;
        p.place({ x: 0, z: 34 });
        p.advance({ moveX: 1, moveZ: 0 }, 2);
    });
    expect((await state(page)).position.z).toBeCloseTo(34.5, 1);
    expect(await page.evaluate(() => (window as unknown as W).__solrahn.place({ x: 0, z: 40 }))).toBe(false);
    await page.evaluate(() => (window as unknown as W).__solrahn.place({ x: 0, z: 0 }));
    await page.keyboard.press('Tab'); // remove select focus before walking
    await page.locator('canvas').click({ position: { x: 400, y: 250 } });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1000);
    await page.keyboard.up('KeyW');
    expect((await state(page)).position.x).toBeGreaterThan(2);
    const before = (await state(page)).position.z;
    const stick = await page.locator('#solrahn-stick').boundingBox();
    expect(stick).not.toBeNull();
    await page.mouse.move(stick!.x + 30, stick!.y + 30);
    await page.mouse.down();
    await page.mouse.move(stick!.x + 84, stick!.y + 30);
    await page.waitForTimeout(600);
    await page.mouse.up();
    expect((await state(page)).position.z).toBeGreaterThan(before + 0.5);
    await capture(page, 'mobile-gameplay');
    await page.selectOption('#solrahn-view', 'overview');
    await capture(page, 'mobile-active-3v3');
});

test('preview allocations and frame timing sample without character/art downloads', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 844, height: 390 });
    const assets: string[] = [];
    page.on('request', (r) => {
        if (/\.glb|assets\/environment/.test(r.url())) assets.push(r.url());
    });
    await page.goto('/?mapPreview=solrahn');
    await page.waitForFunction(() => '__solrahn' in window);
    await expect.poll(async () => (await state(page)).frames, { timeout: 30000 }).toBeGreaterThan(35);
    const overview = await state(page);
    await page.selectOption('#solrahn-view', 'follow');
    const first = overview.frames;
    await expect.poll(async () => (await state(page)).frames, { timeout: 30000 }).toBeGreaterThan(first + 60);
    const gameplay = await state(page);
    expect(assets).toEqual([]);
    expect(overview.performance.drawCalls).toBeLessThan(30);
    expect(gameplay.performance.drawCalls).toBeLessThan(30);
    await writeFile(
        'evidence/012/performance.json',
        JSON.stringify(
            {
                renderer: 'Chromium / SwiftShader software WebGL2, not a physical iPhone',
                viewport: { width: 844, height: 390 },
                overview,
                gameplay,
                artRequests: assets
            },
            null,
            2
        ) + '\n'
    );
});

test('default menu does not import or initialize the preview', async ({ page }) => {
    const previewRequests: string[] = [];
    page.on('request', (r) => {
        if (/solrahn-preview/.test(r.url())) previewRequests.push(r.url());
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Enter Crownfall/ })).toBeVisible();
    expect(await page.evaluate(() => '__solrahn' in window)).toBe(false);
    expect(previewRequests).toEqual([]);
    await expect(page.locator('#solrahn-panel')).toHaveCount(0);
    await page.goto('/?mapPreview=unknown');
    await expect(page.getByRole('button', { name: /Enter Crownfall/ })).toBeVisible();
    expect(previewRequests).toEqual([]);
});
