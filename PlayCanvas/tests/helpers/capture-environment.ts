// Production preview must already be running. Optional URL verifies deployment:
// CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/capture-environment.ts [base URL] [output directory]
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

type Harness = {
    verification: { arrange(name: string): void; pause(): void; advance(t: number): void };
    snapshot(): {
        match: unknown;
        combat: { player: { x: number; z: number } };
        territory: { camera: { x: number; y: number; z: number }; follow: { x: number; z: number } };
        summonerModels: { visible: boolean; playing: boolean; position: { y: number } }[];
        environment: unknown;
        modelAssets: unknown;
    };
};
const base = process.argv[2] || 'http://127.0.0.1:4173/';
const output = process.argv[3] || 'evidence/007f';
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const results = [];
await mkdir(output, { recursive: true });
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [view, fixture] of [
        ['overview', 'roster'],
        ['east-access', 'wilderness-entry'],
        ['west-access', 'wilderness-left-entry'],
        ['mobile', 'roster']
    ]) {
        await page.setViewportSize(view === 'mobile' ? { width: 844, height: 390 } : { width: 1280, height: 720 });
        for (const mode of ['legacy', 'carved']) {
            const tints = view === 'overview' ? [true, false] : [false];
            for (const tinted of tints) {
                const url = new URL(`?verify=1&environment=${mode}&territoryTint=${tinted ? '1' : '0'}`, base).href;
                await page.goto(url);
                await page.evaluate(() => {
                    if (!(window as unknown as { __crownfall?: Harness }).__crownfall)
                        throw new Error('Arena did not start');
                });
                await page.evaluate((name) => {
                    const h = (window as unknown as { __crownfall: Harness }).__crownfall;
                    h.verification.arrange(name);
                    h.verification.pause();
                    h.verification.advance(2.1);
                }, fixture);
                await page.waitForFunction(
                    () => {
                        const s = (window as unknown as { __crownfall: Harness }).__crownfall.snapshot();
                        return (
                            s.summonerModels.filter((m) => m.visible).length === 6 &&
                            Math.hypot(
                                s.territory.follow.x - s.combat.player.x,
                                s.territory.follow.z - s.combat.player.z
                            ) < 1e-6
                        );
                    },
                    undefined,
                    { timeout: 60000 }
                );
                const filename = `${view}-${mode}${tinted ? '' : '-neutral'}.png`;
                await page.screenshot({ path: `${output}/${filename}` });
                const snapshot = await page.evaluate(() =>
                    (window as unknown as { __crownfall: Harness }).__crownfall.snapshot()
                );
                results.push({ filename, url, viewport: page.viewportSize(), ...snapshot });
                console.log(filename, JSON.stringify(snapshot.territory.camera), snapshot.environment);
            }
        }
    }
    if (errors.length) throw new Error(JSON.stringify(errors));
    // Neutral pairs must be the identical authoritative state and fixed camera.
    for (const view of ['overview', 'east-access', 'west-access', 'mobile']) {
        const pair = results.filter((r) => r.filename.startsWith(view) && r.filename.endsWith('-neutral.png'));
        if (JSON.stringify(pair[0].match) !== JSON.stringify(pair[1].match))
            throw new Error(`${view}: fixture mismatch`);
        for (const axis of ['x', 'y', 'z'] as const)
            if (Math.abs(pair[0].territory.camera[axis] - pair[1].territory.camera[axis]) > 0.00001)
                throw new Error(`${view}: camera mismatch`);
    }
    await writeFile(
        `${output}/comparison.json`,
        JSON.stringify({ base, capturedAt: new Date().toISOString(), errors, results }, null, 4) + '\n'
    );
} finally {
    await browser.close();
}
