// CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/verify-aim-deployment.ts [URL]
// Validates the exact published bundle and real touch retreat/fire with all six models.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type Snapshot = {
    combat: {
        player: { x: number; z: number };
        transactions: { sourceId: string; targetId: string; abilityId: string; amount: number }[];
        journal: { latestAccepted: { abilityId: string; angle: number } | null };
    };
    movement: { x: number; z: number };
    aimAssist: { enabled: boolean; state: string; targetId: string | null };
    summonerModels: { visible: boolean; playing: boolean; position: { y: number } }[];
};
type Harness = {
    snapshot(): Snapshot;
    verification: { arrange(name: string): void; pause(): void; advance(seconds: number): void };
};
const base = process.argv[2] || 'https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/';
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const requestContext = await browser.newContext();
    const html = await requestContext.request.get(base);
    assert.equal(html.status(), 200);
    const entry = (await html.text()).match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(entry);
    const response = await requestContext.request.get(new URL(entry, base).href);
    assert.equal(response.status(), 200);
    const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
    const bundleSha256 = hash(await response.body());
    assert.equal(bundleSha256, hash(await readFile(`dist/assets/${entry.split('/').at(-1)}`)));
    await requestContext.close();
    const comparisons = [],
        errors: string[] = [];
    for (const [label, abilityId] of [
        ['Kit', 'whip'],
        ['Set', 'claw']
    ]) {
        for (const enabled of [true, false]) {
            const context = await browser.newContext({
                viewport: { width: 844, height: 390 },
                hasTouch: true,
                isMobile: true
            });
            try {
                const page = await context.newPage();
                page.on('pageerror', (e) => errors.push(e.message));
                await page.goto(new URL(`?verify=1&aimAssist=${enabled ? 1 : 0}`, base).href);
                await page.waitForFunction(() => !!(window as unknown as { __crownfall?: Harness }).__crownfall);
                await page.getByLabel('Summoner', { exact: true }).selectOption(label);
                // Normal matches intentionally defer model downloads until match start.
                await page.evaluate(() =>
                    (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('aim-retreat')
                );
                await page.waitForFunction(
                    () => {
                        const s = (window as unknown as { __crownfall: Harness }).__crownfall.snapshot();
                        return (
                            s.summonerModels.length === 6 &&
                            s.summonerModels.every((m) => m.visible && m.playing && m.position.y === 0)
                        );
                    },
                    undefined,
                    { timeout: 90000 }
                );
                await page.evaluate(() => {
                    const h = (window as unknown as { __crownfall: Harness }).__crownfall;
                    h.verification.arrange('aim-retreat');
                    h.verification.pause();
                    h.verification.advance(2.1);
                    h.verification.arrange('aim-retreat');
                    const capture = () => {
                        if (h.snapshot().combat.journal.latestAccepted) h.verification.pause();
                        else requestAnimationFrame(capture);
                    };
                    requestAnimationFrame(capture);
                });
                const cdp = await context.newCDPSession(page);
                const box = (await page.locator('#move').boundingBox())!;
                const move = {
                    id: 1,
                    x: box.x + box.width / 2,
                    y: box.y + box.height / 2,
                    radiusX: 4,
                    radiusY: 4,
                    force: 1
                };
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [move] });
                move.y += 12;
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [move] });
                const before = await page.evaluate(() =>
                    (window as unknown as { __crownfall: Harness }).__crownfall.snapshot()
                );
                const attackBox = (await page.locator(`.ability-${abilityId}`).boundingBox())!;
                const attack = {
                    ...move,
                    id: 2,
                    x: attackBox.x + attackBox.width / 2,
                    y: attackBox.y + attackBox.height / 2
                };
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [move, attack] });
                await page.waitForFunction(
                    () =>
                        !!(window as unknown as { __crownfall: Harness }).__crownfall.snapshot().combat.journal
                            .latestAccepted
                );
                const after = await page.evaluate(() =>
                    (window as unknown as { __crownfall: Harness }).__crownfall.snapshot()
                );
                const hits = after.combat.transactions.filter((t) => t.sourceId === '1-0' && t.abilityId === abilityId);
                assert.equal(hits.length > 0, enabled);
                assert.equal(Math.abs(after.combat.journal.latestAccepted!.angle), enabled ? Math.PI : 0);
                assert.ok(after.combat.player.z > before.combat.player.z);
                assert.ok(after.movement.z > 0);
                assert.equal(after.movement.x, 0);
                assert.equal(after.summonerModels.length, 6);
                comparisons.push({ label, enabled, before, after, hits });
                await page.screenshot({ path: `evidence/007h/live-${abilityId}-${enabled ? 'on' : 'off'}.png` });
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            } finally {
                await context.close();
            }
        }
    }
    assert.deepEqual(errors, []);
    await writeFile(
        'evidence/007h/deployment.json',
        JSON.stringify(
            {
                base,
                verifiedAt: new Date().toISOString(),
                entry,
                bundleSha256,
                productionBundleMatches: true,
                errors,
                comparisons
            },
            null,
            4
        ) + '\n'
    );
    console.log(
        'Published bundle matches; Kit/Set touch retreat hits with assistance and misses without; six animated models preserved.'
    );
} finally {
    await browser.close();
}
