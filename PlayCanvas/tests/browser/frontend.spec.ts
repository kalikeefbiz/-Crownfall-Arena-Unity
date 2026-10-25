import { writeFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type Front = {
    page: string;
    selected: string;
    low: boolean;
    measurements: { label: string; ms: number; done: number; total: number }[];
};
type State = {
    match: {
        phase: string;
        elapsed: number;
        results: {
            participants: {
                name: string;
                kills: number;
                deaths: number;
                assists: number;
                damage: number;
                pressureSeconds: number;
            }[];
        };
    };
    combat: { name: string };
    frames: number;
    environment: { normalMappedSurfaces: number; occlusionMappedSurfaces: number };
    modelAssets: { downloads: number; assets: { source: string; state: string }[]; gpu: object };
    summonerModels: { state: string; summonerId: string; materialId: number; meshId: number }[];
};
type W = Window & {
    __crownfallFrontend: { snapshot(): Front };
    __crownfall: { snapshot(): State; verification: { arrange(name: string): void; advance(seconds: number): void } };
};
const front = (page: Page) => page.evaluate(() => (window as unknown as W).__crownfallFrontend.snapshot());
const state = (page: Page) => page.evaluate(() => (window as unknown as W).__crownfall.snapshot());
const click = (page: Page, name: string) => page.locator(`#frontend [data-action="${name}"]`).last().click();

for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 640, height: 360 }
]) {
    test(`menu-first, roster, settings and saved editor ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const models: string[] = [];
        page.on('request', (r) => {
            if (/\.glb|game-.*\.js/.test(r.url())) models.push(r.url());
        });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        await expect(page.getByRole('button', { name: /Enter Crownfall/ })).toBeVisible();
        expect(await page.evaluate(() => '__crownfall' in window)).toBe(false);
        await page.screenshot({ path: `evidence/011/main-${viewport.width}.png` });
        await click(page, 'select');
        await page.locator('[data-hero="2"]').click();
        expect((await front(page)).selected).toBe('Riven');
        await expect(page.locator('.cf-hero.selected')).toContainText('Riven');
        await expect(page.locator('.cf-hero.selected img')).toHaveJSProperty('complete', true);
        await page.screenshot({ path: `evidence/011/select-${viewport.width}.png` });
        await click(page, 'main');
        await click(page, 'settings');
        await click(page, 'low');
        expect((await front(page)).low).toBe(true);
        await page.reload();
        await click(page, 'settings');
        expect((await front(page)).low).toBe(true);
        await page.screenshot({ path: `evidence/011/settings-${viewport.width}.png` });
        await click(page, 'fullscreen');
        if (await page.evaluate(() => document.fullscreenEnabled)) {
            await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
            await click(page, 'fullscreen');
            await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
        } else await expect(page.locator('.cf-notice')).toContainText('Home Screen');
        await click(page, 'controls');
        const move = page.locator('[data-control="move"]');
        const box = (await move.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(viewport.width * 0.2, viewport.height * 0.6);
        await page.mouse.up();
        await page.locator('#edit-size').fill('1.2');
        await page.locator('#edit-opacity').fill('0.55');
        await click(page, 'save-controls');
        const saved = await page.evaluate(() => localStorage.getItem('crownfall.controls.v1'));
        expect(saved).toContain('0.55');
        await click(page, 'controls');
        await click(page, 'reset-controls');
        expect(await page.evaluate(() => localStorage.getItem('crownfall.controls.v1'))).toBe(saved);
        await click(page, 'reset-controls');
        await click(page, 'cancel-controls');
        expect(await page.evaluate(() => localStorage.getItem('crownfall.controls.v1'))).toBe(saved);
        await click(page, 'controls');
        await page.screenshot({ path: `evidence/011/controls-${viewport.width}.png` });
        for (const target of await page.locator('[data-control]').all()) {
            const b = (await target.boundingBox())!;
            expect(b.width).toBeGreaterThanOrEqual(44);
            expect(b.x).toBeGreaterThanOrEqual(0);
            expect(b.y).toBeGreaterThanOrEqual(105);
            expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
            expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
        }
        await page.evaluate(() => localStorage.setItem('crownfall.controls.v1', '{bad'));
        await click(page, 'cancel-controls');
        await click(page, 'controls');
        await expect(move).toBeVisible();
        expect(models).toEqual([]);
    });
}

test('real sequential readiness, authoritative result, replay cache, pause and menu rendering suspension', async ({
    page
}) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 667, height: 375 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/Riven_Animated.glb', async (route) => {
        await gate;
        await route.continue();
    });
    await page.goto('/?verify=1&frontend=1');
    await click(page, 'select');
    await page.locator('[data-hero="2"]').click();
    await click(page, 'enter');
    await expect(page.locator('#resource-status')).toContainText('Preparing riven', { timeout: 15000 });
    expect((await state(page)).match.phase).toBe('prematch');
    expect((await state(page)).frames).toBe(0);
    await page.screenshot({ path: 'evidence/011/loading.png' });
    release();

    await expect.poll(async () => (await front(page)).page, { timeout: 125000 }).toBe('gameplay');
    const ready = await front(page);
    const loaded = await state(page);
    expect(loaded.combat.name).toBe('riven');
    expect(loaded.environment.normalMappedSurfaces).toBe(3);
    expect(loaded.environment.occlusionMappedSurfaces).toBe(3);
    for (const model of loaded.summonerModels) {
        const shared = loaded.summonerModels.filter((other) => other.summonerId === model.summonerId);
        expect(new Set(shared.map((other) => other.meshId)).size).toBe(1);
        expect(new Set(shared.map((other) => other.materialId)).size).toBe(1);
    }
    expect(loaded.summonerModels).toHaveLength(6);
    expect(loaded.summonerModels.every((m) => m.state === 'loaded')).toBe(true);
    expect(ready.measurements.at(-1)?.label).toBe('Arena ready');
    const labels = ready.measurements.filter((m) => m.label.startsWith('Preparing ')).map((m) => m.label);
    expect(labels[1]).toContain('riven');
    const essentials = requests.filter((r) => r.includes('/summoners/'));
    expect(essentials).toHaveLength(4);
    expect(new Set(essentials).size).toBe(4);
    await page.screenshot({ path: 'evidence/011/countdown.png', timeout: 60000 });
    await page.locator('#pause-game').click();
    const frozen = await state(page);
    await page.waitForTimeout(300);
    expect((await state(page)).frames).toBe(frozen.frames);
    await click(page, 'settings');
    await click(page, 'low');
    expect((await state(page)).environment.normalMappedSurfaces).toBe(0);
    expect((await state(page)).environment.occlusionMappedSurfaces).toBe(0);
    await click(page, 'pause');
    await click(page, 'resume');
    await expect.poll(async () => (await state(page)).match.phase, { timeout: 30000 }).toBe('active');
    // Existing fixture advances the real match rules; UI values must match its result.
    await page.evaluate(() => {
        const api = (window as unknown as W).__crownfall;
        api.verification.arrange('points');
        api.verification.advance(2.25);
    });
    await expect.poll(async () => (await front(page)).page).toMatch(/announcement|results/);
    if ((await front(page)).page === 'announcement') await click(page, 'results');
    const completed = await state(page);
    const rows = page.locator('.cf-result-table tbody tr');
    await expect(rows).toHaveCount(6);
    for (const [i, a] of completed.match.results.participants.entries()) {
        await expect(rows.nth(i)).toContainText(`${a.kills} / ${a.deaths} / ${a.assists}`);
        await expect(rows.nth(i)).toContainText(String(Math.round(a.damage)));
    }
    await page.screenshot({ path: 'evidence/011/results.png' });
    await click(page, 'enter');
    await expect.poll(async () => (await front(page)).page, { timeout: 30000 }).toBe('gameplay');
    expect((await state(page)).combat.name).toBe('riven');
    expect(requests.filter((r) => r.includes('/summoners/'))).toEqual(essentials);
    await page.locator('#pause-game').click();
    await click(page, 'main');
    const menuFrame = (await state(page)).frames;
    await page.waitForTimeout(300);
    expect((await state(page)).frames).toBe(menuFrame);
    await page.reload();
    expect(await page.evaluate(() => '__crownfall' in window)).toBe(false);
    expect(errors).toEqual([]);
    const receipt = {
        ...ready,
        renderer: 'Chromium / ANGLE SwiftShader',
        viewport: { width: 667, height: 375 },
        resourceCacheAtReadiness: loaded.modelAssets,
        essentialRequests: essentials.map((url) => new URL(url).pathname)
    };
    await writeFile('evidence/011/readiness.json', JSON.stringify(receipt, null, 4) + '\n');
    await test
        .info()
        .attach('readiness', { body: JSON.stringify(receipt, null, 4) + '\n', contentType: 'application/json' });
});

test('failed essential model offers real retry and return without a countdown', async ({ page }) => {
    test.setTimeout(180000);
    let fail = true;
    await page.route('**/Kit_20K_Animated.glb', (route) =>
        fail ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue()
    );
    await page.goto('/');
    await click(page, 'select');
    await click(page, 'enter');
    await expect(page.locator('#resource-status')).toContainText('Unable to prepare arena', { timeout: 30000 });
    expect(await page.evaluate(() => '__crownfall' in window)).toBe(false);
    fail = false;
    await click(page, 'enter');
    await expect.poll(async () => (await front(page)).page, { timeout: 125000 }).toBe('gameplay');
    await page.locator('#pause-game').click();
    await click(page, 'main');
});

test('Combat Practice uses the existing sandbox authority and can return to menu', async ({ page }) => {
    await page.goto('/');
    await click(page, 'practice');
    await page.locator('[data-hero="1"]').click();
    await click(page, 'enter');
    await expect.poll(async () => (await front(page)).page).toBe('gameplay');
    expect((await state(page)).combat.name).toBe('set');
    expect((await state(page)).match).toBe(null);
    await expect(page.locator('#reset-combat')).toBeVisible();
    await page.locator('#pause-game').click();
    await click(page, 'main');
});

test('saved control positions are the real captured touch targets across rotation', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
        await page.goto('/?models=primitive');
        await click(page, 'settings');
        await click(page, 'controls');
        const move = page.locator('[data-control="move"]');
        const box = (await move.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(170, 240);
        await page.mouse.up();
        await click(page, 'save-controls');
        await click(page, 'main');
        await click(page, 'select');
        await page.locator('[data-hero="2"]').click();
        await click(page, 'enter');
        await expect.poll(async () => (await front(page)).page).toBe('gameplay');
        await expect.poll(async () => (await state(page)).match.phase).toBe('active');
        await page.setViewportSize({ width: 667, height: 375 });
        const target = (await page.locator('#move').boundingBox())!;
        const basic = (await page.locator('.ability-reso').boundingBox())!;
        await page.locator('#move').evaluate((el) =>
            el.addEventListener('pointerdown', (e) => {
                (el as HTMLElement).dataset.captured = String((e as PointerEvent).pointerId);
            })
        );
        const cdp = await context.newCDPSession(page);
        const points = [target, basic].map((b, i) => ({
            id: i + 1,
            x: b.x + b.width / 2,
            y: b.y + b.height / 2,
            radiusX: 4,
            radiusY: 4,
            force: 1
        }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, 1) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
        points[0].x += 36;
        points[1].x += 1;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points });
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        (
                            window as unknown as { __crownfall: { snapshot(): { movement: { x: number } } } }
                        ).__crownfall.snapshot().movement.x
                )
            )
            .toBeGreaterThan(0.5);
        expect(
            await page
                .locator('#move')
                .evaluate((el) => el.hasPointerCapture(Number((el as HTMLElement).dataset.captured)))
        ).toBe(true);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.locator('#pause-game').click();
        await click(page, 'main');
    } finally {
        await context.close();
    }
});

test('preparation deadline prevents a late game module from starting behind the error screen', async ({ page }) => {
    await page.addInitScript(() => {
        const nativeTimeout = window.setTimeout.bind(window);
        let deadline = false;
        window.setTimeout = ((callback: TimerHandler, timeout?: number, ...args: unknown[]) => {
            if (timeout === 120000 && !deadline) {
                deadline = true;
                return nativeTimeout(callback, 100, ...args);
            }
            return nativeTimeout(callback, timeout, ...args);
        }) as typeof window.setTimeout;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let finished = false;
    page.on('requestfinished', (request) => {
        if (/\/game-[^/]+\.js$/.test(request.url())) finished = true;
    });
    await page.route('**/game-*.js', async (route) => {
        await gate;
        await route.continue();
    });
    await page.goto('/');
    await click(page, 'select');
    await click(page, 'enter');
    await expect(page.locator('#resource-status')).toContainText('Preparation exceeded 120 seconds');
    release();
    await expect.poll(() => finished).toBe(true);
    await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    });
    expect(
        await page
            .locator('canvas')
            .evaluate((canvas) =>
                Boolean((canvas as HTMLCanvasElement & Record<symbol, unknown>)[Symbol.for('crownfall.application')])
            )
    ).toBe(false);
    expect(await page.evaluate(() => '__crownfall' in window)).toBe(false);
    await expect(page.locator('#resource-status')).toContainText('Preparation exceeded 120 seconds');
    await expect(page.locator('#frontend [data-action="enter"]')).toHaveText(/Retry/);
    await click(page, 'cancel-load');
    expect((await front(page)).page).toBe('select');
});
