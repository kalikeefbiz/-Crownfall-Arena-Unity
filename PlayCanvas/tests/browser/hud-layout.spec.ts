import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { build } from 'vite';

import type { mountHudContractFixture } from '../helpers/hud-contract-fixture';
import { waitForInspection } from '../helpers/inspection-startup';

type FixtureWindow = Window & {
    hudFixture?: ReturnType<typeof mountHudContractFixture>;
    mountHudLayout?: typeof mountHudContractFixture;
};
let fixtureSource: string;
test.beforeAll(async () => {
    // The same real HUD/simulation component boundary used by hud-contracts.
    const result = await build({
        configFile: false,
        logLevel: 'silent',
        build: {
            write: false,
            minify: false,
            lib: {
                entry: fileURLToPath(new URL('../helpers/hud-contract-fixture.ts', import.meta.url)),
                formats: ['es']
            }
        }
    });
    const bundle = Array.isArray(result) ? result[0] : result;
    if (!bundle || !('output' in bundle)) throw new Error('Expected HUD fixture bundle');
    const entry = bundle.output.find((item) => item.type === 'chunk' && item.isEntry);
    if (!entry || entry.type !== 'chunk') throw new Error('Missing HUD fixture entry');
    fixtureSource = entry.code;
});

for (const [width, height, safe] of [
    [844, 390, 0],
    [844, 390, 44],
    [667, 375, 44],
    [640, 360, 44],
    [390, 844, 0],
    [1280, 720, 0]
]) {
    test(`HUD rows follow content across fonts and match phases at ${width}x${height}, safe ${safe}`, async ({
        browser
    }, testInfo) => {
        const context = await browser.newContext({
            viewport: { width, height },
            isMobile: true,
            hasTouch: true,
            deviceScaleFactor: 2
        });
        const page = await context.newPage();
        const measurements: object[] = [];
        try {
            await page.goto('/?verify=1&models=primitive');
            await waitForInspection(page);
            await page.waitForFunction(() => Object.hasOwn(window, '__crownfall'));
            await page.evaluate(
                async ({ source, safe }) => {
                    const canvas = document.querySelector('canvas') as HTMLCanvasElement &
                        Record<symbol, { destroy(): void }>;
                    canvas[Symbol.for('crownfall.application')].destroy();
                    const style = document.documentElement.style;
                    style.setProperty('--safe-left', `${safe}px`);
                    style.setProperty('--safe-right', `${safe}px`);
                    style.setProperty('--safe-bottom', `${safe ? 21 : 0}px`);
                    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
                    try {
                        // Retain the fixture factory only in this test page.
                        const module: { mountHudContractFixture: typeof mountHudContractFixture } = await import(url);
                        Object.assign(window, { mountHudLayout: module.mountHudContractFixture });
                    } finally {
                        URL.revokeObjectURL(url);
                    }
                },
                { source: fixtureSource, safe }
            );
            for (const font of ['system-ui, sans-serif', 'Arial, sans-serif', '"DejaVu Sans", sans-serif']) {
                await page.evaluate(async (font) => {
                    document.documentElement.style.fontFamily = font;
                    await document.fonts.ready;
                }, font);
                for (const [selected, summoner] of ['Kit', 'Set', 'Riven'].entries()) {
                    for (const phase of ['prematch', 'countdown', 'active', 'pressure-long', 'results', 'restart']) {
                        const observation = await page.evaluate(
                            ({ selected, phase }) => {
                                const w = window as FixtureWindow;
                                if (!w.mountHudLayout) throw new Error('Missing HUD fixture factory');
                                if (phase === 'prematch' || phase === 'restart') {
                                    w.hudFixture?.hud.destroy();
                                    w.hudFixture = w.mountHudLayout({}, selected);
                                    document.querySelector<HTMLSelectElement>('#summoner')!.selectedIndex = selected;
                                }
                                const f = w.hudFixture!;
                                const m = f.simulation.match!;
                                if (phase === 'countdown') m.start();
                                if (phase === 'active') m.step({}, 3);
                                if (phase === 'pressure-long') {
                                    // Legitimate wide scoreboard/participant strings, rendered
                                    // by the actual HUD without a real-time game or font race.
                                    Object.assign(m.rules, {
                                        elapsed: 123.4,
                                        control: 0.607,
                                        front: -28.02,
                                        pressureTeam: 1,
                                        pressureAge: 0.1,
                                        scoringTeam: 0
                                    });
                                    Object.assign(m.rules.cp, { 1: 999, 2: 876 });
                                    for (const a of m.actors) {
                                        Object.assign(a.record, { kills: 12, deaths: 2, assists: 12 });
                                        a.sim.player.protectedUntil = m.rules.elapsed + 2;
                                    }
                                }
                                if (phase === 'results') {
                                    m.rules.elapsed = m.rules.settings.timeLimitSeconds;
                                    m.step({}, 1 / 60);
                                }
                                f.render();
                                const rows = ['#scoreboard', '#team-status'].map((selector) => {
                                    const e = document.querySelector<HTMLElement>(selector)!;
                                    const { x, y, width, height, bottom } = e.getBoundingClientRect();
                                    return { selector, x, y, width, height, bottom, text: e.textContent };
                                });
                                return { phase: m.phase, rows };
                            },
                            { selected, phase }
                        );
                        measurements.push({ width, height, safe, font, summoner, scenario: phase, ...observation });
                        const [score, team] = observation.rows;
                        expect(team.y - score.bottom, `${font} / ${summoner} / ${phase}`).toBeGreaterThanOrEqual(4);
                        for (const row of observation.rows) {
                            expect(row.width).toBeGreaterThan(0);
                            expect(row.height).toBeGreaterThan(0);
                            expect(row.x).toBeGreaterThanOrEqual(safe);
                            expect(row.x + row.width).toBeLessThanOrEqual(width - safe);
                            expect(row.y).toBeGreaterThanOrEqual(0);
                            expect(row.bottom).toBeLessThanOrEqual(height - (safe ? 21 : 0));
                        }
                        await expect(page.locator('#scoreboard')).toBeVisible();
                        await expect(page.locator('#team-status > div')).toHaveCount(2);
                        for (const team of ['.blue-team', '.red-team'])
                            await expect(page.locator(`#team-status > ${team} > div`)).toHaveCount(3);
                        if (phase === 'pressure-long') {
                            await expect(page.locator('#scoreboard')).toContainText('BLUE PRESSURE · grace 1.9s');
                            await expect(page.locator('#team-status')).toContainText('12/2/12');
                            if (font.startsWith('"DejaVu'))
                                await page.screenshot({
                                    path: testInfo.outputPath(`hud-${summoner}-long.png`),
                                    scale: 'css'
                                });
                        }
                        if (phase === 'results') {
                            expect(observation.phase).toBe('results');
                            await expect(page.locator('#result-panel')).toBeVisible();
                            await expect(page.locator('#result-participants tbody tr')).toHaveCount(6);
                        }
                        if (phase === 'restart') {
                            expect(observation.phase).toBe('prematch');
                            await expect(page.locator('#play-match')).toBeVisible();
                        }
                    }
                }
            }
        } finally {
            await testInfo.attach('hud-rows', {
                body: JSON.stringify(measurements, null, 2),
                contentType: 'application/json'
            });
            await context.close();
        }
    });
}
