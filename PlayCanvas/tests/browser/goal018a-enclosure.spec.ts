import { writeFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { MatchSnapshot } from '../../src/combat/match';

type State = {
    frames: number;
    position: { x: number; z: number };
    match: MatchSnapshot;
    summonerModels: { state: string }[];
    modelAssets: { downloads: number };
    combat: { journal: { latestAccepted?: { abilityId: string } } };
    environment: { mode: string; materials: { state: string; textures: number; shader: { detailNormals: boolean } } };
};
type W = Window & {
    __crownfall: {
        snapshot(): State;
        verification: { pause(): void; advance(t: number): void; arrange(s: string): void };
    };
};
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as W).__crownfall.snapshot());
async function enter(page: Page, verify = true) {
    await page.goto(verify ? './?verify=1' : './');
    await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
    await page.locator('[data-hero="0"]').tap();
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
}

for (const width of [844, 390]) {
    test(`enclosure lifecycle and controls ${width}`, async ({ page, browserName }, info) => {
        await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
        const errors: string[] = [];
        const requests: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
            if (m.type() === 'error') errors.push(m.text());
        });
        page.on('response', (r) => {
            if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
        });
        page.on('request', (r) => {
            if (r.url().includes('/solrahn-surface/')) requests.push(r.url());
        });
        await enter(page);
        const initial = await snapshot(page);
        expect(initial.environment.mode).toBe('solrahn-v2');
        expect(initial.environment.materials.textures).toBe(4);
        const enclosure = (
            initial.environment as unknown as {
                enclosure: {
                    state: string;
                    instances: { meshId: number; materialId: number }[];
                    resources: { downloads: number };
                };
            }
        ).enclosure;
        expect(enclosure.state).toBe('loaded');
        expect(enclosure.instances).toHaveLength(12);
        expect(new Set(enclosure.instances.map((p) => p.meshId)).size).toBe(6);
        expect(new Set(enclosure.instances.map((p) => p.materialId)).size).toBe(4);
        expect(enclosure.resources.downloads).toBe(4);
        expect(initial.summonerModels).toHaveLength(6);
        expect(initial.summonerModels.every((m) => m.state === 'loaded')).toBe(true);
        await expect(page.locator('.perf-timing')).toContainText(/FPS \d+\.\d/);
        await expect(page.locator('.perf-quality')).toContainText('Low');
        const bounds = (await page.locator('#performance-monitor').boundingBox())!;
        for (const selector of ['#move', '.ability'])
            for (const control of await page.locator(selector).all()) {
                const box = await control.boundingBox();
                if (box)
                    expect(
                        bounds.x + bounds.width <= box.x ||
                            box.x + box.width <= bounds.x ||
                            bounds.y + bounds.height <= box.y ||
                            box.y + box.height <= bounds.y
                    ).toBe(true);
            }
        await page.getByRole('button', { name: 'Hide performance' }).tap();
        await expect(page.locator('#performance-values')).toBeHidden();
        await page.getByRole('button', { name: 'Show performance' }).tap();
        await expect(page.locator('.perf-timing')).toContainText(/FPS \d+\.\d/);
        await page.locator('#performance-monitor [data-quality=high]').tap();
        await expect.poll(async () => (await snapshot(page)).environment.materials.shader.detailNormals).toBe(true);
        await expect(page.locator('.perf-quality')).toContainText('High');
        await page.locator('#performance-monitor [data-quality=low]').tap();
        await expect.poll(async () => (await snapshot(page)).environment.materials.shader.detailNormals).toBe(false);
        await expect(page.locator('.perf-quality')).toContainText('Low');
        expect(new Set(requests).size).toBe(10);
        expect(requests).toHaveLength(10);
        // Functional time advance only; monitor readings are never claimed as device performance.
        await page.evaluate(() => {
            const v = (window as unknown as W).__crownfall.verification;
            v.pause();
            v.advance(3.1);
            v.advance(50);
        });
        expect((await snapshot(page)).match.actors.filter((a) => !a.human).every((a) => a.damage > 0)).toBe(true);
        // Existing controlled hit arrangement, after normal AI has been verified.
        await page.evaluate(() => (window as unknown as W).__crownfall.verification.arrange('roster'));
        const move = (await page.locator('#move').boundingBox())!;
        const before = (await snapshot(page)).position.z;
        if (browserName === 'chromium') {
            const cdp = await page.context().newCDPSession(page);
            const touch = {
                id: 1,
                x: move.x + move.width / 2,
                y: move.y + move.height / 2,
                radiusX: 4,
                radiusY: 4,
                force: 1
            };
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
            await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ ...touch, y: touch.y - 30 }]
            });
            await expect.poll(async () => (await snapshot(page)).position.z).toBeLessThan(before - 0.5);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            // Playwright WebKit exposes native taps, but no public touch-drag API.
            await page.mouse.move(move.x + move.width / 2, move.y + move.height / 2);
            await page.mouse.down();
            await page.mouse.move(move.x + move.width / 2, move.y + move.height / 2 - 30);
            await expect.poll(async () => (await snapshot(page)).position.z).toBeLessThan(before - 0.5);
            await page.mouse.up();
        }
        await page.locator('.ability-step').tap();
        await expect.poll(async () => (await snapshot(page)).combat.journal.latestAccepted?.abilityId).toBe('step');
        await expect
            .poll(async () => (await snapshot(page)).match.actors.find((a) => a.human)!.damage)
            .toBeGreaterThan(0);
        await page.screenshot({
            path: `evidence/018a/${process.env.RECEIPT_PREFIX || 'local'}-${browserName}-${width}.png`
        });
        const stableEnvironment = (await snapshot(page)).environment as unknown as {
            allocations: { textures: number; vertexBuffers: number; indexBuffers: number };
            enclosure: typeof enclosure;
        };
        await page.evaluate(() => {
            const v = (window as unknown as W).__crownfall.verification;
            v.pause();
            v.advance(300);
            v.advance(40);
        });
        await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
        await page.getByRole('button', { name: 'Play Again' }).tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay');
        expect((await snapshot(page)).modelAssets.downloads).toBe(4);
        const rematchEnvironment = (await snapshot(page)).environment as unknown as {
            allocations: { textures: number; vertexBuffers: number; indexBuffers: number };
            enclosure: typeof enclosure;
        };
        expect(rematchEnvironment.enclosure.resources.downloads).toBe(4);
        expect(rematchEnvironment.enclosure.instances).toEqual(stableEnvironment.enclosure.instances);
        expect(rematchEnvironment.allocations.vertexBuffers).toBe(stableEnvironment.allocations.vertexBuffers);
        expect(rematchEnvironment.allocations.indexBuffers).toBe(stableEnvironment.allocations.indexBuffers);
        // Global texture accounting also includes lazily uploaded character bone
        // palettes. Retain that delta as evidence; enclosure identities stay exact.
        expect((await snapshot(page)).summonerModels.every((m) => m.state === 'loaded')).toBe(true);
        await expect(page.locator('.perf-timing')).toContainText(/FPS \d+\.\d/);
        expect(errors).toEqual([]);
        await writeFile(
            `evidence/018a/${process.env.RECEIPT_PREFIX || 'local'}-${browserName}-${width}.json`,
            JSON.stringify(
                {
                    project: info.project.name,
                    viewport: { width, height: width === 844 ? 390 : 844 },
                    initial,
                    stableEnvironment,
                    rematchEnvironment,
                    final: await snapshot(page),
                    monitor: await page.locator('#performance-monitor').innerText(),
                    requests,
                    errors,
                    input:
                        browserName === 'chromium'
                            ? 'native CDP touch movement and native ability taps'
                            : 'mobile WebKit mouse movement and native ability taps',
                    devicePerformance: 'NOT VERIFIED'
                },
                null,
                2
            )
        );
    });
}

// Cancelling while the optional stone container is in flight exercises the
// same owned abort/parser lifetime used by the approved tree loader.
test('cancel during enclosure download and re-enter', async ({ page, browserName }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let started = false;
    await page.route('**/stones/mobile/rock_face_02.glb', async (route) => {
        started = true;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue().catch(() => {
            // The owning load may have been deliberately aborted by cancellation.
        });
    });
    await page.goto('./?verify=1');
    await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await expect.poll(() => started).toBe(true);
    await page.getByRole('button', { name: 'Return to Selection' }).tap();
    await page.unroute('**/stones/mobile/rock_face_02.glb');
    await page.getByRole('button', { name: 'Enter Arena' }).tap();
    await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
    const state = await snapshot(page);
    expect((state.environment as unknown as { enclosure: { state: string } }).enclosure.state).toBe('loaded');
    expect(state.summonerModels.every((m) => m.state === 'loaded')).toBe(true);
    expect(errors).toEqual([]);
    await writeFile(`evidence/018a/cancel-${browserName}.json`, JSON.stringify({ errors, state }, null, 2));
});
