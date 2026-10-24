import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { build } from 'vite';

import type { mountHudContractFixture } from '../helpers/hud-contract-fixture';

type FixtureWindow = Window & { hudFixture?: ReturnType<typeof mountHudContractFixture> };
let fixtureSource: string;
test.beforeAll(async () => {
    // Bundle the actual component and simulation in memory. No dependency,
    // production diagnostic API or checked-in build configuration is added.
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
    if (!bundle || !('output' in bundle)) throw new Error('Expected one fixture bundle');
    const entry = bundle.output.find((item) => item.type === 'chunk' && item.isEntry);
    if (!entry || entry.type !== 'chunk') throw new Error('Missing fixture entry');
    fixtureSource = entry.code;
});

for (const custom of [false, true])
    test(`HUD text follows ${custom ? 'nondefault' : 'exact default'} match settings and earned modifier values`, async ({
        page
    }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/?verify=1&models=primitive');
        await page.waitForFunction(() => Object.hasOwn(window, '__crownfall'));
        await page.evaluate(
            async ({ source, custom }) => {
                const canvas = document.querySelector('canvas') as HTMLCanvasElement &
                    Record<symbol, { destroy(): void }>;
                canvas[Symbol.for('crownfall.application')].destroy();
                const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
                try {
                    const module: { mountHudContractFixture: typeof mountHudContractFixture } = await import(url);
                    const f = module.mountHudContractFixture(custom ? { graceSeconds: 4.5, cpTarget: 4321 } : {});
                    (window as FixtureWindow).hudFixture = f;
                    const m = f.simulation.match;
                    if (!m) throw new Error('Missing fixture match');
                    m.start();
                    m.step({}, 3);
                    for (const p of m.entities)
                        Object.assign(p, { x: (Number(p.id.at(-1)) - 1) * 8, z: p.team === 1 ? -4 : -8 });
                    m.step({}, 0.5);
                    f.render();
                } finally {
                    URL.revokeObjectURL(url);
                }
            },
            { source: fixtureSource, custom }
        );
        await expect(page.locator('#scoreboard')).toHaveText(
            'BLUE 15 tickets · ACTIVE MATCH · 5:00 · RED 15 tickets\n' +
                `Territory 60.7% / 39.3% · CP 0 / 0 of ${custom ? 4321 : 1000}\n` +
                `Front 6.00 · BLUE PRESSURE · grace ${custom ? '4.0' : '1.5'}s`
        );
        const modifiers = await page.evaluate((custom) => {
            const f = (window as FixtureWindow).hudFixture;
            if (!f) throw new Error('Missing HUD fixture');
            const m = f.simulation.match;
            if (!m) throw new Error('Missing fixture match');
            const passive = m.human.definition.passive;
            if (!passive) throw new Error('Missing Kit passive');
            if (custom) {
                Object.assign(m.wilderness.config, {
                    mobilityBonus: 0.125,
                    cooldownReduction: 0.1,
                    defenseMitigation: 0.35,
                    majorDamageBonus: 0.375
                });
                passive.speedBonus = 0.075;
            }
            Object.assign(m.human.player, { x: 22, z: 0 });
            m.step({}, 0);
            for (const type of ['mobility', 'cooldown', 'defense', 'damage']) {
                const camp = m.wilderness.camps.find((c) => c.type === type);
                if (!camp) throw new Error('Missing camp: ' + type);
                m.human.damage(camp, camp.health, m.human.player, { lethal: true });
            }
            f.render();
            return m.human.player.modifiers;
        }, custom);
        expect(modifiers['camp:mobility'].speedBonus).toBe(custom ? 0.125 : 0.2);
        expect(modifiers['camp:cooldown'].cooldownReduction).toBe(custom ? 0.1 : 0.2);
        expect(modifiers['camp:defense'].mitigation).toBe(custom ? 0.35 : 0.2);
        expect(modifiers['camp:damage'].damageBonus).toBe(custom ? 0.375 : 0.25);
        await expect(page.locator('#wilderness-buffs')).toHaveText(
            custom
                ? 'INNER FLAME +7.5% · MOBILITY +12.5% 20s · COOLDOWN −10% 20s · DEFENSE +35% 20s · TEAM DAMAGE +37.5% 25s'
                : 'INNER FLAME +5% · MOBILITY +20% 20s · COOLDOWN −20% 20s · DEFENSE +20% 20s · TEAM DAMAGE +25% 25s'
        );
        await page.evaluate(() => {
            const w = window as FixtureWindow;
            if (!w.hudFixture) throw new Error('Missing HUD fixture');
            w.hudFixture.hud.destroy();
            delete w.hudFixture;
        });
        await expect(page.locator('main')).toHaveCount(0);
        expect(errors).toEqual([]);
    });
