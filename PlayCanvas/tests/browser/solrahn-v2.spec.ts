import { writeFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';

import type { MatchSnapshot } from '../../src/combat/match';

type Inspection = {
    snapshot(): {
        match: MatchSnapshot;
        position: { x: number; z: number };
        environment: { mode: string; state: string };
        summonerModels: { state: string }[];
        modelAssets: { downloads: number; assets: { source: string }[] };
        combat: { journal: { latestAccepted?: { abilityId: string } } };
    };
    verification: { pause(): void; advance(seconds: number): void; arrange(name: string): void };
};
type W = Window & { __crownfall: Inspection };

// Actual production entry, existing readiness UI, six full character models and touch controls.
// Fixed ticks accelerate the long match only; never alter rules, damage, tickets or clocks.
for (const viewport of [
    { width: 844, height: 390 },
    { width: 390, height: 844 }
]) {
    test(`V2 graybox: readiness, combat, terrain, results and replay ${viewport.width}`, async ({ browser }) => {
        test.setTimeout(240000);
        const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('response', (r) => {
            if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
        });
        await page.addInitScript(() => localStorage.setItem('crownfall.quality', 'low'));
        const entry = process.env.SOLRAHN_V2_URL || '/?mapPreview=solrahn-v2&verify=1&frontend=1';
        await page.goto(entry);
        expect(await page.getByRole('button', { name: 'Enter Crownfall' }).isVisible()).toBe(true);
        expect(
            await page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('.glb')))
        ).toBe(false);
        const loadStarted = Date.now();
        await page.getByRole('button', { name: 'Enter Crownfall' }).tap();
        await page.getByRole('button', { name: 'Enter Arena' }).tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay', null, { timeout: 120000 });
        // Read-only snapshots and the established opt-in verification fixed-tick seam.
        const snapshot = () => page.evaluate(() => (window as unknown as W).__crownfall.snapshot());
        const readyMs = Date.now() - loadStarted;
        const initial = await snapshot();
        const perfStart = Date.now();
        const framesBefore = await page.evaluate(
            () => (window as unknown as W).__crownfall.snapshot() as unknown as { frames: number }
        );
        await page.waitForTimeout(5000);
        const framesAfter = await page.evaluate(
            () => (window as unknown as W).__crownfall.snapshot() as unknown as { frames: number }
        );
        await writeFile(
            `evidence/016/browser-${viewport.width}.json`,
            JSON.stringify(
                {
                    viewport,
                    readyMs,
                    wallFps: ((framesAfter.frames - framesBefore.frames) * 1000) / (Date.now() - perfStart),
                    initial,
                    resources: await page.evaluate(() =>
                        performance
                            .getEntriesByType('resource')
                            .filter((e) => e.name.includes('.glb'))
                            .map((e) => ({ url: e.name, durationMs: e.duration }))
                    )
                },
                null,
                2
            ) + '\n'
        );
        expect(initial.environment.mode).toBe('solrahn-v2');
        expect(initial.environment.state).toBe('loaded');
        expect(initial.summonerModels).toHaveLength(6);
        expect(initial.summonerModels.every((m) => m.state === 'loaded')).toBe(true);
        expect(initial.modelAssets.assets.filter((a) => a.source.includes('solrahn'))).toHaveLength(0);
        await page.locator('#v2-tools summary').tap();
        await page.locator('#v2-tools [data-option=camera]').check();
        await page.screenshot({ path: `evidence/016/top-down-${viewport.width}.png` });
        await page.locator('#v2-tools select:not([data-option])').selectOption('walk');
        await page.screenshot({ path: `evidence/016/collision-overlay-${viewport.width}.png` });
        await page.locator('#v2-tools select:not([data-option])').selectOption('neutral');
        await page.locator('#v2-tools [data-option=camera]').uncheck();
        await page.locator('#v2-tools summary').tap();
        await page.evaluate(() => {
            const v = (window as unknown as W).__crownfall.verification;
            v.pause();
            v.advance(3.1);
        });
        await expect.poll(async () => (await snapshot()).match.phase).toBe('active');
        // Run the ordinary bots on the authored collision to completion; retain natural outcome evidence.
        await page.evaluate(() => (window as unknown as W).__crownfall.verification.advance(50));
        const battle = await snapshot();
        expect(battle.match.actors.filter((a) => !a.human).every((a) => a.damage > 0)).toBe(true);
        await page.screenshot({ path: `evidence/016/natural-battle-${viewport.width}.png` });
        await page.evaluate(() => (window as unknown as W).__crownfall.verification.advance(280));
        await page.waitForFunction(() => ['announcement', 'results'].includes(document.body.dataset.screen || ''));
        await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible({ timeout: 30000 });
        await page.screenshot({ path: `evidence/016/results-${viewport.width}.png` });
        await page.getByRole('button', { name: 'Play Again' }).tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'gameplay');
        expect((await snapshot()).match.elapsed).toBeLessThan(1);
        expect((await snapshot()).modelAssets.downloads).toBe(4);
        // Controlled centre-ring fixture for visible human ability registration on real terrain.
        await page.evaluate(() => {
            const v = (window as unknown as W).__crownfall.verification;
            v.pause();
            v.advance(3.1);
            v.arrange('roster');
        });
        const move = (await page.locator('#move').boundingBox())!;
        const before = (await snapshot()).position;
        const cdp = await context.newCDPSession(page);
        const touch = {
            id: 1,
            x: move.x + move.width / 2,
            y: move.y + move.height / 2,
            radiusX: 4,
            radiusY: 4,
            force: 1
        };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, y: touch.y - 32 }] });
        await expect.poll(async () => (await snapshot()).position.z, { timeout: 90000 }).toBeLessThan(before.z - 0.5);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.locator('.ability-step').tap();
        await expect
            .poll(async () => (await snapshot()).combat.journal.latestAccepted?.abilityId, { timeout: 30000 })
            .toBe('step');
        await expect
            .poll(async () => (await snapshot()).match.actors.find((a) => a.human)!.damage, { timeout: 30000 })
            .toBeGreaterThan(0);
        await page.screenshot({ path: `evidence/016/centre-combat-${viewport.width}.png` });
        expect(errors).toEqual([]);
        await context.close();
    });
}

test('corrupt V2 height data fails visibly without loading the older map', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.route('**/assets/solrahn-v2/height.u16', (route) => route.fulfill({ body: Buffer.alloc(55970) }));
    await page.goto('/?mapPreview=solrahn-v2&frontend=1');
    await page.getByRole('button', { name: 'Enter Crownfall' }).click();
    await page.getByRole('button', { name: 'Enter Arena' }).click();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible({ timeout: 30000 });
    expect(requests.some((url) => url.includes('three-lane-visual.glb') || url.includes('/assets/solrahn/'))).toBe(
        false
    );
});
