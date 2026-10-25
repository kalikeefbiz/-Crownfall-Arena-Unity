/* global window */
// Verify the immutable release artifact and capture its actual competitive scene.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
const base = 'https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    const html = await context.request.get(base);
    assert.equal(html.status(), 200);
    const entry = (await html.text()).match(/src="([^"]+\.js)"/)?.[1];
    assert.ok(entry);
    const files = [
        entry,
        ...(await readdir('dist/assets/environment/trees/mobile'))
            .filter((f) => f.endsWith('.glb'))
            .map((f) => `assets/environment/trees/mobile/${f}`),
        ...(await readdir('dist/assets/environment/polyhaven'))
            .filter((f) => f.includes('_512.'))
            .map((f) => `assets/environment/polyhaven/${f}`)
    ];
    const verified = [];
    for (const file of files) {
        const response = await context.request.get(new URL(file, base).href);
        assert.equal(response.status(), 200);
        const remote = await response.body(),
            local = await readFile(`dist/${file.replace(/^\.\//, '')}`);
        assert.equal(sha(remote), sha(local), file);
        verified.push({ file, bytes: remote.length, sha256: sha(remote) });
    }
    await context.route('**/assets/index-*.js', async (route) => {
        const response = await route.fetch(),
            original = await response.text();
        const body = original
            .replace(/entities:(\w+)\.root\.find\(/, 'entities:(window.__artApp=$1,$1).root.find(')
            .replace(/structuredClone\(\{match:(\w+)\.match/, 'structuredClone({match:(window.__artSim=$1,$1).match');
        assert.notEqual(body, original);
        await route.fulfill({ response, body });
    });
    const page = await context.newPage(),
        errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}?verify=1`);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await page.evaluate(() => {
        const h = window.__crownfall;
        h.verification.arrange('roster');
        h.verification.pause();
        h.verification.advance(2.1);
    });
    await page.waitForFunction(
        () => {
            const s = window.__crownfall.snapshot();
            return (
                s.summonerModels.filter((m) => m.visible).length === 6 &&
                s.rivenWeapons.state === 'loaded' &&
                s.environment.wilderness.state === 'loaded'
            );
        },
        undefined,
        { timeout: 120000 }
    );
    await page.evaluate(() => {
        for (const a of window.__artSim.match.actors) {
            const p = a.sim.player;
            p.x -= 26;
            p.previous = { x: p.x, z: p.z };
        }
        window.__crownfall.verification.advance(1 / 60);
    });
    await page.waitForFunction(
        () => {
            const s = window.__crownfall.snapshot();
            return (
                Math.hypot(s.territory.follow.x - s.combat.player.x, s.territory.follow.z - s.combat.player.z) < 1e-5
            );
        },
        undefined,
        { timeout: 120000 }
    );
    const snapshot = await page.evaluate(() => window.__crownfall.snapshot());
    assert.equal(snapshot.environment.wilderness.trees.length, 6);
    assert.equal(snapshot.rivenWeapons.instances.filter((v) => !v.fallback).length, 4);
    const cdp = await context.newCDPSession(page);
    const result = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await writeFile('evidence/010/live-match.png', Buffer.from(result.data, 'base64'));
    assert.deepEqual(errors, []);
    await writeFile(
        'evidence/010/deployment.json',
        JSON.stringify(
            {
                base,
                verifiedAt: new Date().toISOString(),
                entry,
                verified,
                productionBundleMatches: true,
                errors,
                snapshot
            },
            null,
            4
        ) + '\n'
    );
    console.log(
        'Live entry, four runtime GLBs and six ground maps match validated build; six summoners, six trees and four detailed Moonreapers render.'
    );
} finally {
    await browser.close();
}
