import { writeFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';

// Real controls and bot combat; fixed ticks are used only to finish results for
// resource-cycle coverage, never for performance timing or the natural hit check.
test('surface: five rematch/menu/quality cycles retain bounded resources and lazy High demand', async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
        if (r.url().includes('/solrahn-surface/')) requests.push(r.url());
    });
    await page.goto('/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1');
    const click = async (name: string) => page.locator(`#frontend [data-action="${name}"]`).last().click();
    const snapshot = () =>
        page.evaluate(() =>
            (
                window as unknown as {
                    __crownfall: {
                        snapshot(): {
                            environment: {
                                allocations: { textures: number };
                                materials: {
                                    state: string;
                                    loadedMaps: number;
                                    textures: number;
                                    shader: { detailNormals: boolean; materialUpdates: number };
                                };
                            };
                            modelAssets: { downloads: number };
                            match: { phase: string };
                        };
                    };
                }
            ).__crownfall.snapshot()
        );
    await click('select');
    await click('enter');
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    expect((await snapshot()).environment.materials.loadedMaps).toBe(4);
    expect(requests).toHaveLength(4);
    const cycles = [];
    for (let cycle = 0; cycle < 5; cycle++) {
        await page.locator('#pause-game').click();
        await click('settings');
        await click('standard');
        await expect
            .poll(async () => (await snapshot()).environment.materials.shader.detailNormals, { timeout: 30000 })
            .toBe(true);
        const updates = (await snapshot()).environment.materials.shader.materialUpdates;
        await click('standard');
        expect((await snapshot()).environment.materials.shader.materialUpdates).toBe(updates);
        await click('low');
        expect((await snapshot()).environment.materials.shader.detailNormals).toBe(false);
        await click('pause');
        await click('resume');
        await page.evaluate(() => {
            const v = (
                window as unknown as { __crownfall: { verification: { pause(): void; advance(s: number): void } } }
            ).__crownfall.verification;
            v.pause();
            v.advance(340);
        });
        await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible({ timeout: 30000 });
        await click('enter');
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay');
        await page.waitForTimeout(500);
        cycles.push(await snapshot());
        await page.locator('#pause-game').click();
        await click('main');
        await click('select');
        await click('enter');
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay');
    }
    expect(requests).toHaveLength(10);
    expect(new Set(requests).size).toBe(10);
    expect(cycles.every((s) => s.environment.materials.textures === 10 && s.modelAssets.downloads === 4)).toBe(true);
    const allocations = cycles.map((s) => s.environment.allocations.textures);
    expect(Math.max(...allocations) - Math.min(...allocations)).toBeLessThan(1024 * 1024);
    expect(errors).toEqual([]);
    await writeFile('evidence/017a/resource-cycles.json', JSON.stringify({ requests, cycles, errors }, null, 2));
});

test('surface: failed deferred High can retry without replacing the working Low material', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
    let fail = true;
    await page.route('**/grass_path_2_normal.webp', (route) => (fail ? route.abort() : route.continue()));
    await page.goto('/?mapPreview=solrahn-v2&surface=goal017&frontend=1');
    const click = async (name: string) => page.locator(`#frontend [data-action="${name}"]`).last().click();
    const material = () =>
        page.evaluate(
            () =>
                (
                    window as unknown as {
                        __crownfall: {
                            snapshot(): {
                                environment: { materials: { state: string; shader: { detailNormals: boolean } } };
                            };
                        };
                    }
                ).__crownfall.snapshot().environment.materials
        );
    await click('select');
    await click('enter');
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 90000 });
    await page.locator('#pause-game').click();
    await click('settings');
    await click('standard');
    await expect.poll(async () => (await material()).state).toBe('error');
    expect((await material()).shader.detailNormals).toBe(false);
    fail = false;
    await click('standard');
    await expect.poll(async () => (await material()).shader.detailNormals, { timeout: 30000 }).toBe(true);
});

test('surface: Low remains selected when a pending High load completes', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
    let release!: () => void;
    const gate = new Promise<void>((r) => {
        release = r;
    });
    let requests = 0;
    await page.route('**/grass_path_2_normal.webp', async (route) => {
        requests++;
        await gate;
        await route.continue();
    });
    await page.goto('/?mapPreview=solrahn-v2&surface=goal017&frontend=1');
    const click = async (name: string) => page.locator(`#frontend [data-action="${name}"]`).last().click();
    const material = () =>
        page.evaluate(
            () =>
                (
                    window as unknown as {
                        __crownfall: {
                            snapshot(): {
                                environment: { materials: { state: string; shader: { detailNormals: boolean } } };
                            };
                        };
                    }
                ).__crownfall.snapshot().environment.materials
        );
    await click('select');
    await click('enter');
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 90000 });
    await page.locator('#pause-game').click();
    await click('settings');
    await click('standard');
    await click('low');
    await click('standard');
    await click('low');
    release();
    await expect.poll(async () => (await material()).state).toBe('loaded');
    expect((await material()).shader.detailNormals).toBe(false);
    expect(requests).toBe(1);
});
