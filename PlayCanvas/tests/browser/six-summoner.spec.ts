import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { createRivenWeapons } from '../../src/presentation/riven-weapons';
import { waitForInspection } from '../helpers/inspection-startup';

type Model = {
    id: string;
    summonerId: string;
    team: number;
    teamColor: string;
    indicatorVisible: boolean;
    indicatorColor: number[];
    state: string;
    visible: boolean;
    primitiveVisible: boolean;
    playing: boolean;
    instanceId: string;
    meshId: number;
    materialId: number;
    activeAnimation: string;
    position: { x: number; y: number; z: number };
    yaw: number;
    height: number;
    scale: number;
    offset: number[];
    bounds: { min: number[]; max: number[] };
    playbackTime: number;
};
type Snapshot = {
    environment: { wilderness?: { state: string } };
    rivenWeapons: ReturnType<ReturnType<typeof createRivenWeapons>['snapshot']>;
    summonerModels: Model[];
    modelAssets: { downloads: number; boundCalculations: number; gpu: Record<string, number> };
    match: {
        phase: string;
        actors: { id: string; summonerId: string; team: number; x: number; z: number; angle: number; dead: boolean }[];
    };
    entities: number;
    frameMs: number;
};
type Harness = {
    snapshot(): Snapshot;
    verification: { arrange(name: string): void; pause(): void; advance(seconds: number): void };
};
const snapshot = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const arrange = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('roster'));
function checkWeapons(s: Snapshot) {
    const weapons = s.rivenWeapons.instances;
    expect(weapons).toHaveLength(4);
    expect(new Set(weapons.map((w) => w.instanceId)).size).toBe(4);
    for (const m of s.summonerModels) {
        const owned = weapons.filter((w) => w.ownerId === m.id && w.kind === 'reso');
        expect(owned).toHaveLength(m.summonerId === 'riven' ? 2 : 0);
        expect(owned.every((w) => !w.fallback && w.phase === 'orbit')).toBe(true);
    }
}
const loaded = async (page: Page) => {
    await expect
        .poll(async () => {
            const s = await snapshot(page);
            return (
                s.summonerModels.length === 6 &&
                s.summonerModels.every(
                    (m) =>
                        m.visible &&
                        !m.primitiveVisible &&
                        m.summonerId === s.match.actors.find((actor) => actor.id === m.id)?.summonerId
                )
            );
        })
        .toBe(true);
    // The large optional weapon starts after the characters have settled.
    await expect.poll(async () => (await snapshot(page)).rivenWeapons.state).toBe('loaded');
    await expect.poll(async () => (await snapshot(page)).environment.wilderness?.state).toBe('loaded');
};

for (const [name, id, run, idle, height, floor] of [
    ['Kit', 'kit-asher', 'RunFast', 'Idle_5', 1.75, 0.05264644],
    ['Set', 'set', 'Running', 'Ready', 1.9, 0.0093135],
    ['Riven', 'riven', 'Running', 'Idle_6', 1.75, 0.035076]
] as const) {
    test(`${name} selection renders six identities with independent playback and shared resources`, async ({
        page
    }) => {
        await page.setViewportSize({ width: 844, height: 390 });
        const requests: string[] = [],
            errors: string[] = [];
        page.on('request', (r) => {
            if (r.url().endsWith('.glb') && r.url().includes('/summoners/')) requests.push(r.url());
        });
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('/?verify=1');
        await waitForInspection(page);
        await page.getByLabel('Summoner', { exact: true }).selectOption(name);
        expect(requests).toHaveLength(0);
        await arrange(page);
        await loaded(page);
        const s = await snapshot(page);
        expect(s.summonerModels).toHaveLength(6);
        expect(new Set(s.summonerModels.map((m) => m.instanceId)).size).toBe(6);
        expect(s.summonerModels.map((m) => m.summonerId).sort()).toEqual([
            'kit-asher',
            'kit-asher',
            'riven',
            'riven',
            'set',
            'set'
        ]);
        for (const m of s.summonerModels) {
            const actor = s.match.actors.find((a) => a.id === m.id)!;
            expect(m.summonerId).toBe(actor.summonerId);
            expect(m.team).toBe(actor.team);
            expect(m.teamColor).toBe(actor.team === 1 ? '#369bff' : '#ff425c');
            expect(m.indicatorVisible).toBe(true);
            const color = actor.team === 1 ? [54, 155, 255] : [255, 66, 92];
            for (let i = 0; i < 3; i++) expect(m.indicatorColor[i]).toBeCloseTo(color[i] / 255, 5);
            expect(m.primitiveVisible).toBe(false);
            expect(m.position.x).toBeCloseTo(actor.x, 5);
            expect(m.position.z).toBeCloseTo(actor.z, 5);
            expect(m.position.y).toBe(0);
            if (m.id !== '1-0') expect(m.yaw).toBeCloseTo((actor.angle * 180) / Math.PI, 4);
            const same = s.summonerModels.find((other) => other.summonerId === m.summonerId && other.id !== m.id)!;
            expect(m.meshId).toBe(same.meshId);
            expect(m.materialId).toBe(same.materialId);
        }
        const local = s.summonerModels.find((m) => m.id === '1-0')!;
        expect(local.summonerId).toBe(id);
        expect(local.height * local.scale).toBeCloseTo(height, 5);
        expect(local.bounds.min[1] * local.scale + local.offset[1]).toBeCloseTo(floor, 5);
        await expect
            .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
            .toBe(idle);
        await page.keyboard.down('d');
        await expect
            .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
            .toBe(run);
        const moving = await snapshot(page);
        expect(moving.summonerModels.find((m) => m.team === 2 && m.summonerId === id)!.activeAnimation).toBe(idle);
        expect(moving.summonerModels.find((m) => m.id === '1-0')!.yaw).toBeCloseTo(90, 4);
        await page.keyboard.up('d');
        await expect
            .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === '1-0')!.activeAnimation)
            .toBe(idle);
        expect(requests).toHaveLength(4);
        expect(new Set(requests).size).toBe(4);
        expect(s.modelAssets.downloads).toBe(4);
        expect(s.modelAssets.boundCalculations).toBe(4);
        await page.evaluate(() => {
            const h = (window as unknown as { __crownfall: Harness }).__crownfall;
            h.verification.pause();
            h.verification.advance(2.1);
        });
        await expect(page.locator('#battle-announcement')).toBeEmpty();
        await page.screenshot({ path: `test-results/007e-six-${name.toLowerCase()}.png` });
        if (name === 'Kit') {
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.screenshot({ path: 'test-results/007e-six-desktop.png' });
        }
        console.log(
            'Six summoner diagnostics',
            JSON.stringify({ selected: name, assets: s.modelAssets, frameMs: s.frameMs, entities: s.entities })
        );
        expect(errors).toEqual([]);
    });
}

test('all actors survive defeat, respawn, rematch and identity reorder without redownloads', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb') && r.url().includes('/summoners/')) requests.push(r.url());
    });
    await page.goto('/?verify=1');
    await waitForInspection(page);
    await arrange(page);
    await loaded(page);
    const initial = await snapshot(page);
    checkWeapons(initial);
    for (const actor of initial.match.actors) {
        await page.locator('#inspect-actor').selectOption(actor.id, { force: true });
        await page.locator('#lethal-actor').evaluate((e) => (e as HTMLButtonElement).click());
        await expect
            .poll(async () => (await snapshot(page)).summonerModels.find((m) => m.id === actor.id)!.visible)
            .toBe(false);
        expect((await snapshot(page)).summonerModels.find((m) => m.id === actor.id)!.playing).toBe(false);
        expect((await snapshot(page)).rivenWeapons.instances.filter((w) => w.ownerId === actor.id)).toHaveLength(0);
        await page.locator('#advance-match').evaluate((e) => (e as HTMLButtonElement).click());
        await loaded(page);
        checkWeapons(await snapshot(page));
    }
    await page.evaluate(() => {
        const h = (window as unknown as { __crownfall: Harness }).__crownfall;
        h.verification.arrange('points');
        h.verification.advance(2.25);
    });
    await expect.poll(async () => (await snapshot(page)).summonerModels.every((m) => !m.playing)).toBe(true);
    const frozenWeapons = (await snapshot(page)).rivenWeapons;
    await page.evaluate(async () => {
        for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
    });
    expect((await snapshot(page)).rivenWeapons).toEqual(frozenWeapons);
    await page.locator('#restart-match').click();
    await arrange(page);
    await loaded(page);
    const restarted = await snapshot(page);
    checkWeapons(restarted);
    expect(restarted.summonerModels.map((m) => m.instanceId)).toEqual(initial.summonerModels.map((m) => m.instanceId));
    expect(restarted.entities).toBe(initial.entities);
    let warmedEntities = 0;
    let warmedGpu: Record<string, number> = {};
    for (const [index, name] of ['Set', 'Riven', 'Kit', 'Set', 'Kit'].entries()) {
        await page.locator('#reset-combat').evaluate((e) => (e as HTMLButtonElement).click());
        await page.getByLabel('Summoner', { exact: true }).selectOption(name);
        await arrange(page);
        await loaded(page);
        const s = await snapshot(page);
        checkWeapons(s);
        if (index === 2) {
            warmedEntities = s.entities;
            warmedGpu = s.modelAssets.gpu;
        }
        for (const m of s.summonerModels)
            expect(m.summonerId).toBe(s.match.actors.find((a) => a.id === m.id)!.summonerId);
    }
    const final = await snapshot(page);
    expect(final.entities).toBe(warmedEntities);
    for (const resource of ['tex', 'vb', 'ib']) expect(final.modelAssets.gpu[resource]).toBe(warmedGpu[resource]);
    expect(requests).toHaveLength(4);
});

test('one failed shared asset falls back for both teams while the other four models render', async ({ page }) => {
    await page.route('**/Set_Animated.glb', (route) => route.abort());
    await page.goto('/?verify=1');
    await waitForInspection(page);
    await arrange(page);
    await expect
        .poll(async () => (await snapshot(page)).summonerModels.filter((m) => m.state === 'error').length)
        .toBe(2);
    await expect.poll(async () => (await snapshot(page)).summonerModels.filter((m) => m.visible).length).toBe(4);
    const s = await snapshot(page);
    expect(s.summonerModels.filter((m) => m.visible)).toHaveLength(4);
    for (const m of s.summonerModels.filter((m) => m.summonerId === 'set')) {
        expect(m.primitiveVisible).toBe(true);
        expect(m.visible).toBe(false);
    }
    expect(s.modelAssets.downloads).toBe(4);
});

test('global primitive diagnostic skips every GLB and keeps normal bots active', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await page.goto('/?verify=1&models=primitive');
    await waitForInspection(page);
    await page.locator('#play-match').click();
    await expect.poll(async () => (await snapshot(page)).match.phase).toBe('active');
    const initial = await snapshot(page);
    await expect
        .poll(async () =>
            (await snapshot(page)).match.actors
                .filter((a) => a.id !== '1-0')
                .some((a) => {
                    const before = initial.match.actors.find((p) => p.id === a.id)!;
                    return Math.hypot(a.x - before.x, a.z - before.z) > 0.5;
                })
        )
        .toBe(true);
    expect((await snapshot(page)).summonerModels.every((m) => m.primitiveVisible && !m.visible)).toBe(true);
    expect(requests).toHaveLength(0);
});

test('normal match enables all six skinned actors and normal AI without preview flags', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?verify=1');
    await waitForInspection(page);
    await page.locator('#play-match').click();
    await loaded(page);
    await expect.poll(async () => (await snapshot(page)).match.phase).toBe('active');
    await expect
        .poll(async () =>
            (await snapshot(page)).summonerModels
                .filter((m) => m.id !== '1-0')
                .some((m) => ['Running', 'RunFast'].includes(m.activeAnimation))
        )
        .toBe(true);
    await page.screenshot({ path: 'test-results/007e-normal-ai.png' });
});
