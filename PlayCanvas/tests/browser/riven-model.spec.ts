import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
    RIVEN_ASSET_BYTES,
    RIVEN_ASSET_PATH,
    RIVEN_ASSET_SHA256,
    RIVEN_IDLE_FLOOR_OFFSET
} from '../../src/presentation/riven-model';

type Inspection = {
    rivenModel: {
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
async function chooseRiven(page: Page, url = '/?summonerModels=local&verify=1&rivenPreview=1') {
    await page.goto(url);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
}

test('production serves the exact verified Riven GLB', async ({ request }) => {
    const response = await request.get(`/${RIVEN_ASSET_PATH}`);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.length).toBe(RIVEN_ASSET_BYTES);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(RIVEN_ASSET_SHA256);
});

test('opt-in Riven loads lazily, grounds, runs, faces and idles at the locked mobile camera', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const errors: string[] = [],
        requests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseRiven(page);
    expect((await snapshot(page)).rivenModel.state).toBe('idle');
    expect(requests).toEqual([]);
    const before = await snapshot(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('loaded');
    // Container completion can precede the next presentation frame. Wait for the
    // visible swap before asserting the settled render state.
    await expect.poll(async () => (await snapshot(page)).rivenModel.visible).toBe(true);
    const loaded = await snapshot(page),
        m = loaded.rivenModel;
    expect(loaded.combat.name).toBe('riven');
    expect(loaded.combat.player.radius).toBe(before.combat.player.radius);
    expect(m.visible).toBe(true);
    expect(m.primitiveVisible).toBe(false);
    expect(m.presentationOnly).toBe(true);
    expect(m.rootScale).toEqual([1, 1, 1]);
    expect(m.height * m.scale).toBeCloseTo(1.75, 5);
    expect(m.bounds.min[1] * m.scale + m.offset[1]).toBeCloseTo(RIVEN_IDLE_FLOOR_OFFSET, 5);
    expect(m.meshInstances).toBe(1);
    expect(m.jointCount).toBe(68);
    expect(m.clips.map((c) => c.name).sort()).toEqual(['Idle_6', 'Running', 'Walking', 'run_fast_7']);
    expect(m.registeredStates).toEqual(['Idle_6', 'Walking', 'Running']);
    expect(m.runningClip).toBe('Running');
    expect(m.locomotionReason).toContain('failed loop validation');
    expect(m.activeAnimation).toBe('Idle_6');
    expect(m.playing).toBe(true);
    expect(loaded.kitModel.state).toBe('idle');
    expect(loaded.kitModel.visible).toBe(false);
    await expect.poll(async () => (await snapshot(page)).rivenModel.playbackTime).toBeGreaterThan(m.playbackTime + 0.2);
    await page.screenshot({ path: 'test-results/task007c-riven-idle.png' });
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).rivenModel.position.x).toBeGreaterThan(m.position.x + 0.5);
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Running');
    await expect.poll(async () => (await snapshot(page)).rivenModel.yaw).toBeCloseTo(90, 3);
    // Play across several complete running cycles, with stable horizontal hips.
    const samples = await page.evaluate(async () => {
        const result = [];
        for (let i = 0; i < 40; i++) {
            await new Promise(requestAnimationFrame);
            result.push((window as unknown as { __crownfall: Harness }).__crownfall.snapshot().rivenModel);
        }
        return result;
    });
    expect(
        samples.every(
            (s) =>
                s.activeAnimation === 'Running' &&
                s.hipLocalPosition[0] === m.hipLocalPosition[0] &&
                s.hipLocalPosition[2] === m.hipLocalPosition[2]
        )
    ).toBe(true);
    expect(
        Math.max(...samples.map((s) => s.hipLocalPosition[1])) - Math.min(...samples.map((s) => s.hipLocalPosition[1]))
    ).toBeGreaterThan(0.01);
    expect(samples.at(-1)!.playbackTime).toBeGreaterThan(samples[0].playbackTime + 0.64);
    await page.screenshot({ path: 'test-results/task007c-riven-running.png' });
    await page.keyboard.up('d');
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Idle_6');
    const moved = await snapshot(page);
    expect(moved.rivenModel.position.x).toBeCloseTo(moved.combat.player.x, 5);
    expect(moved.rivenModel.position.z).toBeCloseTo(moved.combat.player.z, 5);
    expect(moved.rivenModel.position.y).toBe(0);
    expect(moved.rivenModel.offset).toEqual(m.offset);
    expect(moved.rivenModel.scale).toBe(m.scale);
    expect(moved.rivenModel.yaw).toBeCloseTo(90, 3);
    await page.keyboard.down('a');
    await expect.poll(async () => (await snapshot(page)).rivenModel.yaw).toBeCloseTo(-90, 3);
    await page.keyboard.up('a');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('/summoners/riven/');
    console.log('Riven measured diagnostics', JSON.stringify({ ...m, frameMs: loaded.frameMs }));
    expect(errors).toEqual([]);
});

test('Riven aim/commit facing uses Riven controls without Kit punch animations', async ({ page }) => {
    await chooseRiven(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('loaded');
    const button = page.getByRole('button', { name: 'Reso Blades', exact: true });
    const b = (await button.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2 - 20);
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('aim');
    expect((await snapshot(page)).combat.journal.latestAccepted).toBeNull();
    await expect
        .poll(async () => {
            const s = await snapshot(page);
            return Math.abs(s.rivenModel.yaw - (Math.atan2(s.aim.x, s.aim.z) * 180) / Math.PI);
        })
        .toBeLessThan(0.001);
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Running');
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).facing.owner).toBe('commit');
    await expect.poll(async () => (await snapshot(page)).combat.journal.latestAccepted?.abilityId).toBe('reso');
    await page.keyboard.up('d');
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Idle_6');
    expect((await snapshot(page)).rivenModel.registeredStates).not.toContain('Punch_Combo_1');
});

for (const suffix of ['', '&rivenPrimitive=1']) {
    test(`Riven primitive skips the download with ${suffix || 'no developer opt-in'}`, async ({ page }) => {
        const requests: string[] = [];
        page.on('request', (r) => {
            if (r.url().endsWith('.glb')) requests.push(r.url());
        });
        await chooseRiven(
            page,
            suffix ? `/?summonerModels=local&verify=1&rivenPreview=1${suffix}` : '/?summonerModels=local&verify=1'
        );
        await arrange(page);
        const m = (await snapshot(page)).rivenModel;
        expect(m.state).toBe('idle');
        expect(m.visible).toBe(false);
        expect(m.primitiveVisible).toBe(true);
        expect(requests).toEqual([]);
    });
}

test('pending and failed Riven loading retain a moving primitive', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route('**/Riven_Animated.glb', async (route) => {
        await gate;
        await route.abort();
    });
    await chooseRiven(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('loading');
    expect((await snapshot(page)).rivenModel.primitiveVisible).toBe(true);
    release();
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('error');
    expect((await snapshot(page)).rivenModel.primitiveVisible).toBe(true);
    expect((await snapshot(page)).rivenModel.visible).toBe(false);
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).combat.player.x).toBeGreaterThan(0.5);
    await page.keyboard.up('d');
});

test('valid container missing a required Riven clip safely falls back', async ({ page }) => {
    const body = readFileSync(`public/${RIVEN_ASSET_PATH}`);
    const index = body.indexOf(Buffer.from('"Idle_6"'));
    expect(index).toBeGreaterThan(0);
    body.write('"Absent"', index); // Same-length metadata edit preserves a valid GLB container.
    await page.route('**/Riven_Animated.glb', (route) =>
        route.fulfill({ status: 200, contentType: 'model/gltf-binary', body })
    );
    await chooseRiven(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('error');
    const m = (await snapshot(page)).rivenModel;
    expect(m.error).toContain('Missing Riven skeleton/animation');
    expect(m.primitiveVisible).toBe(true);
    expect(m.visible).toBe(false);
});

test('training preview switches summoners and reuses one Riven instance', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseRiven(page, '/?summonerModels=local&debug=1&rivenPreview=1');
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('loaded');
    await expect(page.locator('header')).toContainText('DEV PRESENTATION ONLY');
    await page.getByLabel('Summoner', { exact: true }).selectOption('Set');
    await expect.poll(async () => (await snapshot(page)).rivenModel.visible).toBe(false);
    expect((await snapshot(page)).rivenModel.playing).toBe(false);
    expect((await snapshot(page)).rivenModel.primitiveVisible).toBe(true);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Kit');
    expect((await snapshot(page)).rivenModel.visible).toBe(false);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await expect.poll(async () => (await snapshot(page)).rivenModel.visible).toBe(true);
    expect((await snapshot(page)).rivenModel.activeAnimation).toBe('Idle_6');
    expect(requests).toHaveLength(1);
});

test('Riven preview survives defeat, respawn, results and rematch without another download', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
        if (r.url().endsWith('.glb')) requests.push(r.url());
    });
    await chooseRiven(page);
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.state).toBe('loaded');
    await page.locator('#inspect-actor').selectOption('1-0', { force: true });
    await page.locator('#lethal-actor').evaluate((e) => (e as HTMLButtonElement).click());
    await expect.poll(async () => (await snapshot(page)).rivenModel.visible).toBe(false);
    expect((await snapshot(page)).rivenModel.playing).toBe(false);
    await page.locator('#advance-match').evaluate((e) => (e as HTMLButtonElement).click());
    await expect.poll(async () => (await snapshot(page)).rivenModel.visible).toBe(true);
    await expect.poll(async () => (await snapshot(page)).rivenModel.playing).toBe(true);
    await page.evaluate(() => {
        const h = (window as unknown as { __crownfall: Harness }).__crownfall;
        h.verification.arrange('points');
        h.verification.advance(2.25);
    });
    await expect.poll(async () => (await snapshot(page)).rivenModel.playing).toBe(false);
    await page.locator('#restart-match').click();
    await arrange(page);
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Idle_6');
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).rivenModel.activeAnimation).toBe('Running');
    await page.keyboard.up('d');
    expect(requests).toHaveLength(1);
});
