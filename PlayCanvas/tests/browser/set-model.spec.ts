import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
    SET_ASSET_BYTES,
    SET_ASSET_PATH,
    SET_ASSET_SHA256,
    SET_IDLE_FLOOR_OFFSET
} from '../../src/presentation/set-model';

type Inspection = {
    setModel: {
        state: string;
        error: string;
        activeAnimation: string;
        playbackTime: number;
        playing: boolean;
        clips: { name: string; duration: number }[];
        registeredStates: string[];
        runningClip: string;
        locomotionReason: string;
        visible: boolean;
        primitiveVisible: boolean;
        selected: boolean;
        previewEnabled: boolean;
        presentationOnly: boolean;
        scale: number;
        offset: number[];
        height: number;
        meshInstances: number;
        jointCount: number;
        yaw: number;
        position: { x: number; y: number; z: number };
        rootScale: number[];
        hipLocalPosition: number[];
        bounds: { min: number[]; max: number[] };
        loadMs: number;
    };
    kitModel: { state: string; visible: boolean; activeAnimation: string };
    combat: {
        name: string;
        player: { x: number; z: number; radius: number };
        journal: { latestAccepted: { abilityId: string } | null };
    };
    territory: { camera: { x: number; y: number; z: number } };
    frameMs: number;
    facing: { owner: string };
    aim: { x: number; z: number };
};
type Harness = { snapshot(): Inspection; verification: { arrange(name: string): void; advance(t: number): void } };
const snapshot = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const arrange = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('combat'));
async function chooseSet(page: Page, url = '/?verify=1&setPreview=1') {
    await page.goto(url);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Set');
}

test('production serves the exact verified Set GLB', async ({ request }) => {
    const response = await request.get(`/${SET_ASSET_PATH}`);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.length).toBe(SET_ASSET_BYTES);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(SET_ASSET_SHA256);
});

test('opt-in Set loads lazily, grounds, runs, faces and idles at the locked mobile camera', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const errors: string[] = [],
        requests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseSet(page);
    expect((await snapshot(page)).setModel.state).toBe('idle');
    expect(requests).toEqual([]);
    const before = await snapshot(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('loaded');
    // Container completion can precede the next presentation frame. Wait for the
    // visible swap before asserting the settled render state.
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
    const loaded = await snapshot(page),
        m = loaded.setModel;
    expect(loaded.combat.name).toBe('set');
    expect(loaded.combat.player.radius).toBe(before.combat.player.radius);
    expect(m.visible).toBe(true);
    expect(m.primitiveVisible).toBe(false);
    expect(m.presentationOnly).toBe(true);
    expect(m.rootScale).toEqual([1, 1, 1]);
    expect(m.height * m.scale).toBeCloseTo(1.9, 5);
    expect(m.bounds.min[1] * m.scale + m.offset[1]).toBeCloseTo(SET_IDLE_FLOOR_OFFSET, 5);
    expect(m.meshInstances).toBe(1);
    expect(m.jointCount).toBe(87);
    expect(m.clips.map((c) => c.name).sort()).toEqual(['Punch_Combo', 'RunFast', 'Running', 'Walking']);
    expect(m.registeredStates).toEqual(['Ready', 'Running']);
    expect(m.runningClip).toBe('Running');
    expect(m.locomotionReason).toContain('RunFast intentionally excluded');
    expect(m.activeAnimation).toBe('Ready');
    expect(m.playing).toBe(true);
    expect(loaded.kitModel.state).toBe('idle');
    expect(loaded.kitModel.visible).toBe(false);
    await expect.poll(async () => (await snapshot(page)).setModel.playbackTime).toBeGreaterThan(m.playbackTime + 0.2);
    await page.screenshot({ path: 'test-results/task007d-set-idle.png' });
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).setModel.position.x).toBeGreaterThan(m.position.x + 0.5);
    await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Running');
    await expect.poll(async () => (await snapshot(page)).setModel.yaw).toBeCloseTo(90, 3);
    // Play across several complete running cycles, with stable horizontal hips.
    const samples = await page.evaluate(async () => {
        const result = [];
        for (let i = 0; i < 40; i++) {
            await new Promise(requestAnimationFrame);
            result.push((window as unknown as { __crownfall: Harness }).__crownfall.snapshot().setModel);
        }
        return result;
    });
    expect(
        samples.every(
            (s) =>
                s.activeAnimation === 'Running' &&
                Math.abs(s.hipLocalPosition[0] - m.hipLocalPosition[0]) < 0.000001 &&
                Math.abs(s.hipLocalPosition[2] - m.hipLocalPosition[2]) < 0.000001
        )
    ).toBe(true);
    expect(
        Math.max(...samples.map((s) => s.hipLocalPosition[1])) - Math.min(...samples.map((s) => s.hipLocalPosition[1]))
    ).toBeGreaterThan(0.01);
    expect(samples.at(-1)!.playbackTime).toBeGreaterThan(samples[0].playbackTime + 0.64);
    await page.screenshot({ path: 'test-results/task007d-set-running.png' });
    await page.keyboard.up('d');
    await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Ready');
    const moved = await snapshot(page);
    expect(moved.setModel.position.x).toBeCloseTo(moved.combat.player.x, 5);
    expect(moved.setModel.position.z).toBeCloseTo(moved.combat.player.z, 5);
    expect(moved.setModel.position.y).toBe(0);
    expect(moved.setModel.offset).toEqual(m.offset);
    expect(moved.setModel.scale).toBe(m.scale);
    expect(moved.setModel.yaw).toBeCloseTo(90, 3);
    await page.keyboard.down('a');
    await expect.poll(async () => (await snapshot(page)).setModel.yaw).toBeCloseTo(-90, 3);
    await page.keyboard.up('a');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('/summoners/set/');
    console.log('Set measured diagnostics', JSON.stringify({ ...m, frameMs: loaded.frameMs }));
    expect(errors).toEqual([]);
});

for (const suffix of ['', '&setPrimitive=1']) {
    test(`Set primitive skips the download with ${suffix || 'no developer opt-in'}`, async ({ page }) => {
        const requests: string[] = [];
        page.on('request', (r) => {
            if (r.url().endsWith('.glb')) requests.push(r.url());
        });
        await chooseSet(page, suffix ? `/?verify=1&setPreview=1${suffix}` : '/?verify=1');
        await arrange(page);
        const m = (await snapshot(page)).setModel;
        expect(m.state).toBe('idle');
        expect(m.visible).toBe(false);
        expect(m.primitiveVisible).toBe(true);
        expect(requests).toEqual([]);
    });
}

test('pending and failed Set loading retain a moving primitive', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/Set_Animated.glb', async (route) => {
        await gate;
        await route.abort();
    });
    await chooseSet(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('loading');
    expect((await snapshot(page)).setModel.primitiveVisible).toBe(true);
    release();
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('error');
    expect((await snapshot(page)).setModel.primitiveVisible).toBe(true);
    expect((await snapshot(page)).setModel.visible).toBe(false);
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).combat.player.x).toBeGreaterThan(0.5);
    await page.keyboard.up('d');
});

test('valid container missing a required Set clip safely falls back', async ({ page }) => {
    const body = readFileSync(`public/${SET_ASSET_PATH}`);
    const index = body.indexOf(Buffer.from('"Running"'));
    expect(index).toBeGreaterThan(0);
    body.write('"Missing"', index); // Same-length metadata edit preserves a valid GLB container.
    await page.route('**/Set_Animated.glb', (route) =>
        route.fulfill({ status: 200, contentType: 'model/gltf-binary', body })
    );
    await chooseSet(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('error');
    const m = (await snapshot(page)).setModel;
    expect(m.error).toContain('Missing Set skeleton/animation');
    expect(m.primitiveVisible).toBe(true);
    expect(m.visible).toBe(false);
});

test('training preview switches summoners and reuses one Set instance', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseSet(page, '/?debug=1&setPreview=1');
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('loaded');
    await expect(page.locator('header')).toContainText('DEV PRESENTATION ONLY');
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(false);
    expect((await snapshot(page)).setModel.playing).toBe(false);
    expect((await snapshot(page)).setModel.primitiveVisible).toBe(true);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Kit');
    expect((await snapshot(page)).setModel.visible).toBe(false);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Set');
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
    expect((await snapshot(page)).setModel.activeAnimation).toBe('Ready');
    expect(requests).toHaveLength(1);
});

test('Set preview survives defeat, respawn, results and rematch without another download', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseSet(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).setModel.state).toBe('loaded');
    await page.locator('#inspect-actor').selectOption('1-0', { force: true });
    await page.locator('#lethal-actor').evaluate((e) => (e as HTMLButtonElement).click());
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(false);
    expect((await snapshot(page)).setModel.playing).toBe(false);
    await page.locator('#advance-match').evaluate((e) => (e as HTMLButtonElement).click());
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
    await expect.poll(async () => (await snapshot(page)).setModel.playing).toBe(true);
    await page.evaluate(() => {
        const h = (window as unknown as { __crownfall: Harness }).__crownfall;
        h.verification.arrange('points');
        h.verification.advance(2.25);
    });
    await expect.poll(async () => (await snapshot(page)).setModel.playing).toBe(false);
    await page.locator('#restart-match').click();
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Ready');
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Running');
    await page.keyboard.up('d');
    expect(requests).toHaveLength(1);
});

test('normal Set preview starts a match and supports captured mobile movement and combat', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    try {
        const page = await context.newPage();
        await chooseSet(page, '/?setPreview=1&rivenPreview=1');
        await page.locator('#play-match').tap();
        await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
        await expect(page.locator('#scoreboard')).toContainText('ACTIVE MATCH');
        const before = await snapshot(page);
        const session = await context.newCDPSession(page);
        const box = (await page.locator('#move').boundingBox())!;
        const point = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...point, x: point.x + 35 }]
        });
        await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Running');
        await expect
            .poll(async () => (await snapshot(page)).combat.player.x)
            .toBeGreaterThan(before.combat.player.x + 0.3);
        const ability = (await page.getByRole('button', { name: 'Panther Claw', exact: true }).boundingBox())!;
        const attack = { id: 2, x: ability.x + ability.width / 2, y: ability.y + ability.height / 2 };
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ ...point, x: point.x + 35 }, attack]
        });
        await expect.poll(async () => (await snapshot(page)).combat.journal.latestAccepted?.abilityId).toBe('claw');
        expect((await snapshot(page)).setModel.registeredStates).toEqual(['Ready', 'Running']);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(async () => (await snapshot(page)).setModel.activeAnimation).toBe('Ready');
        await page.screenshot({ path: 'test-results/task007d-set-touch.png' });
    } finally {
        await context.close();
    }
});

test('combined preview flags preserve Riven while switching to and from Set', async ({ page }) => {
    await chooseSet(page, '/?debug=1&setPreview=1&rivenPreview=1');
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(false);
    await expect
        .poll(async () =>
            page.evaluate(
                () =>
                    (
                        window as unknown as { __crownfall: { snapshot(): { rivenModel: { visible: boolean } } } }
                    ).__crownfall.snapshot().rivenModel.visible
            )
        )
        .toBe(true);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Set');
    await expect.poll(async () => (await snapshot(page)).setModel.visible).toBe(true);
    expect((await snapshot(page)).setModel.primitiveVisible).toBe(false);
});
