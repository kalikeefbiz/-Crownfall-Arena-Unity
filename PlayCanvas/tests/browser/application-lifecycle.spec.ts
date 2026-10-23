import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type State = {
    frames: number;
    movement: { x: number; z: number };
    match: { phase: string; elapsed: number; actors: { id: string; x: number; z: number }[] };
    combat: {
        now: number;
        player: { x: number; z: number };
        transactions: { abilityId: string; targetId: string; amount: number }[];
        journal: { latestAttempt: { id: number } | null; latestAccepted: { id: number; abilityId: string } | null };
    };
    modelAssets: { downloads: number; gpu: { tex: number; vb: number; ib: number } };
    summonerModels: { id: string; visible: boolean; instanceId: string; activeAnimation: string; playing: boolean }[];
};
type API = {
    snapshot(): State;
    verification: { arrange(name: string): void; pause(): void; advance(s: number): void };
};
type Owner = { destroy(): void };
type HarnessWindow = Window & {
    __crownfall?: API;
    oldApi?: API;
    oldOwner?: Owner;
    oldControls?: HTMLElement[];
    pointerEvidence?: { target: HTMLElement; pointer: number }[];
};
const read = (page: Page) => page.evaluate(() => (window as HarnessWindow).__crownfall!.snapshot());
async function ready(page: Page) {
    await expect.poll(() => page.evaluate(() => !!(window as HarnessWindow).__crownfall)).toBe(true);
    await expect(page.locator('main')).toHaveCount(1);
}
async function remount(page: Page, tag: string) {
    // Re-evaluate the actual production entry in the same document/canvas. No reload
    // or frame replacement can hide stale DOM, listeners or engine callbacks.
    await page.evaluate(async (tag) => {
        const entry = document.querySelector<HTMLScriptElement>('script[type="module"]')!.src;
        await import(`${entry}?lifecycle=${tag}`);
    }, tag);
    await ready(page);
}
async function rememberAndDestroy(page: Page) {
    await page.evaluate(() => {
        const w = window as HarnessWindow;
        w.oldApi = w.__crownfall;
        w.oldControls = [...document.querySelectorAll<HTMLElement>('main button, main select, main input')];
        const canvas = document.querySelector('canvas') as HTMLCanvasElement & Record<symbol, Owner>;
        w.oldOwner = canvas[Symbol.for('crownfall.application')];
        w.oldOwner.destroy(); // Calls the real PlayCanvas application destroy path.
        w.oldOwner.destroy(); // Full disposal is idempotent.
    });
}
async function nativeListeners(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    try {
        const scripts = new Map<string, string>();
        cdp.on('Debugger.scriptParsed', ({ scriptId, url }) => scripts.set(scriptId, url));
        await cdp.send('Debugger.enable');
        const entry = await page.locator('script[type="module"]').getAttribute('src');
        const entryUrl = new URL(entry!, page.url()).href;
        const counts: Record<string, number> = {};
        for (const expression of [
            'window',
            'document',
            ...Array.from({ length: 3 }, (_, i) => `window.oldControls[${i}]`)
        ]) {
            const { result } = await cdp.send('Runtime.evaluate', { expression });
            if (!result.objectId) {
                counts[expression] = 0;
                continue;
            }
            const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId! });
            // Playwright installs its own action/hit-target listeners. Inspect
            // native listeners belonging to every evaluation of the app bundle.
            counts[expression] = listeners.filter(
                (listener) => scripts.get(listener.scriptId)?.split('?')[0] === entryUrl
            ).length;
        }
        return counts;
    } finally {
        await cdp.detach();
    }
}
async function disposed(page: Page) {
    await expect(page.locator('main, #actor-labels, #combat-world, #combat-labels')).toHaveCount(0);
    expect(await page.evaluate(() => Object.hasOwn(window, '__crownfall'))).toBe(false);
    expect(
        await page.evaluate(() => {
            const api = (window as HarnessWindow).oldApi!;
            return [
                () => api.snapshot(),
                () => api.verification.arrange('roster'),
                () => api.verification.pause(),
                () => api.verification.advance(1)
            ].map((call) => {
                try {
                    call();
                    return 'unexpected success';
                } catch (error) {
                    return (error as Error).message;
                }
            });
        })
    ).toEqual(Array(4).fill('Crownfall application disposed'));
    expect(await nativeListeners(page)).toEqual({
        window: 0,
        document: 0,
        'window.oldControls[0]': 0,
        'window.oldControls[1]': 0,
        'window.oldControls[2]': 0
    });
    // Retained detached controls and lifecycle events cannot run old startup/input callbacks.
    await page.evaluate(() => {
        const w = window as HarnessWindow;
        for (const control of w.oldControls!) {
            control.click();
            control.dispatchEvent(new Event('change'));
        }
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('blur'));
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    });
}
async function uniqueHud(page: Page) {
    expect(
        await page.evaluate(() => {
            const counts = new Map<string, number>();
            for (const element of document.querySelectorAll('[id]'))
                counts.set(element.id, (counts.get(element.id) || 0) + 1);
            return [...counts].filter(([, count]) => count !== 1);
        })
    ).toEqual([]);
}

test('real destroy/remount removes HUD, native listeners and saved diagnostic access; each key submits one command', async ({
    page
}) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?verify=1&models=primitive&aimAssist=0');
    await ready(page);
    for (let cycle = 0; cycle < 3; cycle++) {
        await uniqueHud(page);
        expect((await nativeListeners(page)).window).toBeGreaterThan(0);
        await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('combat'));
        expect((await read(page)).combat.journal.latestAccepted).toBeNull();
        await page.keyboard.press('KeyE');
        await expect.poll(async () => (await read(page)).combat.journal.latestAccepted?.abilityId).toBe('ring');
        const after = await read(page);
        // One radial cast hits one arranged enemy. Duplicate input adapters would
        // enqueue a second attempt and increment the journal serial (even on rejection).
        expect(after.combat.journal.latestAccepted?.id).toBe(1);
        expect(after.combat.journal.latestAttempt?.id).toBe(1);
        expect(after.combat.transactions.filter((t) => t.abilityId === 'ring')).toHaveLength(1);
        await rememberAndDestroy(page);
        await disposed(page);
        await remount(page, `cycle-${cycle}`);
        expect((await read(page)).match.phase).toBe('prematch');
        expect((await read(page)).combat.journal.latestAccepted).toBeNull();
        // An old owner must not tear down the replacement application/API.
        await page.evaluate(() => (window as HarnessWindow).oldOwner!.destroy());
        await ready(page);
    }
    expect(errors).toEqual([]);
});

test('re-evaluating startup while mounted replaces its owner instead of duplicating UI or handlers', async ({
    page
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?verify=1&models=primitive');
    await ready(page);
    await page.evaluate(() => ((window as HarnessWindow).oldApi = (window as HarnessWindow).__crownfall));
    await remount(page, 'replace-live-owner');
    await uniqueHud(page);
    expect(
        await page.evaluate(() => {
            try {
                (window as HarnessWindow).oldApi!.snapshot();
                return false;
            } catch (error) {
                return (error as Error).message === 'Crownfall application disposed';
            }
        })
    ).toBe(true);
    // A toggle with two startup handlers would immediately toggle back.
    const before = await page.locator('#aim-assist').getAttribute('aria-pressed');
    await page.locator('#aim-assist').click();
    await expect(page.locator('#aim-assist')).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
    await rememberAndDestroy(page);
    await disposed(page);
    expect(errors).toEqual([]);
});

test('destroy releases genuine simultaneous touch captures without committing the held ability after remount', async ({
    browser
}) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/?verify=1&models=primitive');
        await ready(page);
        await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
        await page.evaluate(() => {
            (window as HarnessWindow).__crownfall!.verification.arrange('combat');
            (window as HarnessWindow).pointerEvidence = [];
            for (const selector of ['#move', '.ability-reso']) {
                const element = document.querySelector<HTMLElement>(selector)!;
                element.addEventListener(
                    'gotpointercapture',
                    (e) => (window as HarnessWindow).pointerEvidence!.push({ target: element, pointer: e.pointerId }),
                    { once: true }
                );
            }
        });
        const cdp = await context.newCDPSession(page);
        const move = (await page.locator('#move').boundingBox())!;
        const basic = (await page.locator('.ability-reso').boundingBox())!;
        const points = [move, basic].map((box, i) => ({
            id: i + 1,
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
            radiusX: 4,
            radiusY: 4,
            force: 1
        }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, 1) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
        points[0].x += 24;
        points[1].x += 1;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points });
        await expect.poll(async () => (await read(page)).movement.x).toBeGreaterThan(0);
        expect((await read(page)).combat.journal.latestAccepted).toBeNull();
        expect(
            await page.evaluate(() =>
                (window as HarnessWindow).pointerEvidence!.every(({ target, pointer }) =>
                    target.hasPointerCapture(pointer)
                )
            )
        ).toBe(true);
        await expect.poll(() => page.evaluate(() => (window as HarnessWindow).pointerEvidence!.length)).toBe(2);
        await rememberAndDestroy(page);
        await disposed(page);
        expect(
            await page.evaluate(() =>
                (window as HarnessWindow).pointerEvidence!.every(
                    ({ target, pointer }) => !target.hasPointerCapture(pointer) && !target.classList.contains('active')
                )
            )
        ).toBe(true);
        await remount(page, 'held-touch');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('combat'));
        await expect.poll(async () => (await read(page)).combat.now).toBeGreaterThan(0.6);
        expect((await read(page)).movement).toEqual({ x: 0, z: 0 });
        expect((await read(page)).combat.journal.latestAccepted).toBeNull();
        await cdp.detach();
        expect(errors).toEqual([]);
    } finally {
        await context.close();
    }
});

test('destroy during actual delayed GLB requests tolerates their late responses and remounts six working models', async ({
    page
}) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let pending = 0;
    await page.route('**/*.glb', async (route) => {
        pending++;
        await gate;
        await route.continue();
    });
    await page.goto('/?verify=1');
    await ready(page);
    await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('roster'));
    await expect.poll(() => pending).toBe(3);
    expect((await read(page)).summonerModels.every((model) => !model.visible)).toBe(true);
    const finished: string[] = [];
    const settle = (request: { url(): string }) => {
        if (request.url().endsWith('.glb')) finished.push(request.url());
    };
    page.on('requestfailed', settle);
    page.on('requestfinished', (request) => {
        if (request.url().endsWith('.glb')) finished.push(request.url());
    });
    await rememberAndDestroy(page);
    await disposed(page);
    release();
    await expect.poll(() => finished.length).toBe(3);
    // Let late loader/decode callbacks run, without relying on a sleep to assert success.
    await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    });
    expect(errors).toEqual([]);
    await expect(page.locator('main, #actor-labels, #combat-world, #combat-labels')).toHaveCount(0);
    await remount(page, 'after-glb');
    await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('roster'));
    await expect
        .poll(async () => (await read(page)).summonerModels.filter((model) => model.visible && model.playing).length)
        .toBe(6);
    const before = await read(page);
    // Ordinary rematch is a reset inside this same owner, not application disposal.
    await page.locator('#restart-match').evaluate((element) => (element as HTMLButtonElement).click());
    await expect(page.locator('#play-match')).toBeVisible();
    await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('roster'));
    await expect
        .poll(async () => (await read(page)).summonerModels.filter((model) => model.visible && model.playing).length)
        .toBe(6);
    const after = await read(page);
    expect(after.summonerModels.map((model) => model.instanceId)).toEqual(
        before.summonerModels.map((model) => model.instanceId)
    );
    expect(after.modelAssets.downloads).toBe(3);
    expect(after.modelAssets.gpu).toEqual(before.modelAssets.gpu);
    await page.keyboard.down('KeyD');
    await expect
        .poll(async () => (await read(page)).summonerModels.find((model) => model.id === '1-0')!.activeAnimation)
        .toBe('RunFast');
    await page.keyboard.up('KeyD');
    await rememberAndDestroy(page);
    await disposed(page);
    expect(errors).toEqual([]);
});

test('destroy after GLB download while embedded texture decoding is pending leaves no late engine work', async ({
    page
}) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
        const nativeDecode = window.createImageBitmap.bind(window);
        const releases: (() => void)[] = [];
        const state = {
            pending: 0,
            delivered: 0,
            release() {
                for (const release of releases) release();
            }
        };
        Object.assign(window, { delayedDecode: state });
        window.createImageBitmap = (async (...args: Parameters<typeof window.createImageBitmap>) => {
            const bitmap = await nativeDecode(...args);
            state.pending++;
            await new Promise<void>((resolve) => releases.push(resolve));
            state.delivered++;
            return bitmap;
        }) as typeof window.createImageBitmap;
    });
    await page.goto('/?verify=1');
    await ready(page);
    await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('roster'));
    const decode = () =>
        page.evaluate(() => (window as unknown as { delayedDecode: { pending: number } }).delayedDecode.pending);
    // All nine real embedded source textures have decoded, but their engine callbacks are held.
    await expect.poll(decode).toBe(9);
    expect((await read(page)).summonerModels.every((model) => !model.visible)).toBe(true);
    await rememberAndDestroy(page);
    await disposed(page);
    await page.evaluate(() => (window as unknown as { delayedDecode: { release(): void } }).delayedDecode.release());
    await expect
        .poll(() =>
            page.evaluate(() => (window as unknown as { delayedDecode: { delivered: number } }).delayedDecode.delivered)
        )
        .toBe(9);
    await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    });
    expect(errors).toEqual([]);
    await expect(page.locator('main, #actor-labels, #combat-world, #combat-labels')).toHaveCount(0);
});

test('destroy between download completion and the queued engine contents handoff cancels parsing safely', async ({
    page
}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
        const nativeTimeout = window.setTimeout.bind(window);
        const callbacks: (() => void)[] = [];
        Object.assign(window, { queuedContents: callbacks });
        // Hold PlayCanvas Asset.fetchArrayBuffer's zero-delay contents callback,
        // after real HTTP completion but before its GLB parser can touch the registry.
        window.setTimeout = ((callback: TimerHandler, timeout?: number, ...args: unknown[]) => {
            if (typeof callback === 'function' && callback.toString().includes('.file.contents')) {
                callbacks.push(callback as () => void);
                return 0;
            }
            return nativeTimeout(callback, timeout, ...args);
        }) as typeof window.setTimeout;
    });
    await page.goto('/?verify=1');
    await ready(page);
    await page.evaluate(() => (window as HarnessWindow).__crownfall!.verification.arrange('roster'));
    await expect
        .poll(() => page.evaluate(() => (window as unknown as { queuedContents: unknown[] }).queuedContents.length))
        .toBe(3);
    await rememberAndDestroy(page);
    await disposed(page);
    await page.evaluate(() => {
        for (const callback of (window as unknown as { queuedContents: (() => void)[] }).queuedContents) callback();
    });
    await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame);
    });
    expect(errors).toEqual([]);
    await expect(page.locator('main, #actor-labels, #combat-world, #combat-labels')).toHaveCount(0);
    await remount(page, 'queued-parse');
    expect((await read(page)).match.phase).toBe('prematch');
});
