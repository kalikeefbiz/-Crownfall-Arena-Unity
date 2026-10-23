// After publishing, prove the live entry bundle matches this production build,
// then exercise both renderers with six animated models on the hosted site.
// CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/verify-environment-deployment.ts [live URL]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type Harness = {
    verification: { arrange(name: string): void; pause(): void; advance(t: number): void };
    snapshot(): {
        environment: { mode: string; territoryTint: boolean };
        match: unknown;
        combat: { player: { x: number; z: number } };
        territory: { camera: { x: number; y: number; z: number }; follow: { x: number; z: number } };
        summonerModels: { visible: boolean; playing: boolean; position: { y: number } }[];
    };
};
const base = process.argv[2] || 'https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/';
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const html = await context.request.get(base);
    assert.equal(html.status(), 200);
    const entry = (await html.text()).match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(entry, 'Live page has a JavaScript entry');
    const bundle = await context.request.get(new URL(entry, base).href);
    assert.equal(bundle.status(), 200);
    const remoteHash = createHash('sha256')
        .update(await bundle.body())
        .digest('hex');
    const localHash = createHash('sha256')
        .update(await readFile(`dist/assets/${entry.split('/').at(-1)}`))
        .digest('hex');
    assert.equal(remoteHash, localHash, 'Live bundle equals the checked production build');
    const errors: string[] = [],
        snapshots = [];
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    for (const mode of ['carved', 'legacy']) {
        const response = await page.goto(new URL(`?verify=1&environment=${mode}&territoryTint=0`, base).href);
        assert.equal(response?.status(), 200);
        await page.waitForFunction(() => !!(window as unknown as { __crownfall?: Harness }).__crownfall);
        await page.evaluate(() => {
            const h = (window as unknown as { __crownfall: Harness }).__crownfall;
            h.verification.arrange('roster');
            h.verification.pause();
            h.verification.advance(2.1);
        });
        await page.waitForFunction(
            () => {
                const s = (window as unknown as { __crownfall: Harness }).__crownfall.snapshot();
                return (
                    s.summonerModels.length === 6 &&
                    s.summonerModels.every((m) => m.visible && m.playing && m.position.y === 0) &&
                    Math.hypot(s.territory.follow.x - s.combat.player.x, s.territory.follow.z - s.combat.player.z) <
                        1e-6
                );
            },
            undefined,
            { timeout: 90000 }
        );
        const s = await page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
        assert.equal(s.environment.mode, mode);
        assert.equal(s.environment.territoryTint, false);
        snapshots.push(s);
        await page.screenshot({ path: `evidence/007f/live-${mode}-neutral.png` });
    }
    assert.deepEqual(snapshots[0].match, snapshots[1].match);
    for (const axis of ['x', 'y', 'z'] as const)
        assert.ok(Math.abs(snapshots[0].territory.camera[axis] - snapshots[1].territory.camera[axis]) < 0.00001);
    assert.deepEqual(errors, []);
    await writeFile(
        'evidence/007f/deployment.json',
        JSON.stringify(
            {
                base,
                verifiedAt: new Date().toISOString(),
                entry,
                bundleSha256: remoteHash,
                productionBundleMatches: true,
                errors,
                snapshots
            },
            null,
            4
        ) + '\n'
    );
    console.log(
        'Live bundle matches; carved and legacy modes render six animated summoners with identical match state/camera.'
    );
} finally {
    await browser.close();
}
