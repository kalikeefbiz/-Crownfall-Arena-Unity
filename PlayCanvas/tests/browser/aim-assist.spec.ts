import { test, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import { waitForInspection } from '../helpers/inspection-startup';

type State = {
    combat: {
        now: number;
        player: { x: number; z: number; angle: number; dead: boolean };
        transactions: { sourceId: string; targetId: string; abilityId: string; amount: number }[];
        journal: { latestAccepted: { id: number; abilityId: string; angle: number } | null };
        weapons: { phase: string }[];
    };
    match: { phase: string; actors: { id: string; damage: number; deaths: number }[] };
    movement: { x: number; z: number };
    aimAssist: { enabled: boolean; state: string; targetId: string | null };
};
type API = { snapshot(): State; verification: { arrange(name: string): void; pause(): void } };
const snapshot = (page: Page): Promise<State> =>
    page.evaluate(() => (window as unknown as { __crownfall: API }).__crownfall.snapshot());
async function mobile(browser: Browser, label = 'Kit', enabled = true, chase = false) {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?verify=1&models=primitive&aimAssist=${enabled ? 1 : 0}`);
    await waitForInspection(page);
    await expect(page.locator('#play-match')).toBeVisible();
    await page.getByLabel('Summoner', { exact: true }).selectOption(label);
    await page.evaluate(
        (name) => (window as unknown as { __crownfall: API }).__crownfall.verification.arrange(name),
        chase ? 'aim-chase' : 'aim-retreat'
    );
    const cdp = await context.newCDPSession(page);
    const points = new Map<
        number,
        { id: number; x: number; y: number; radiusX: number; radiusY: number; force: number }
    >();
    let serial = 0;
    const send = (type: 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel') =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...points.values()] });
    const start = async (selector: string) => {
        const box = (await page.locator(selector).boundingBox())!,
            id = ++serial;
        points.set(id, { id, x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1 });
        await send('touchStart');
        return id;
    };
    const move = async (id: number, dx: number, dy: number) => {
        const p = points.get(id)!;
        points.set(id, { ...p, x: p.x + dx, y: p.y + dy });
        await send('touchMove');
    };
    const end = async (id: number) => {
        points.delete(id);
        await send('touchEnd');
    };
    const cancel = async () => {
        points.clear();
        await send('touchCancel');
    };
    const arrange = () =>
        page.evaluate(() =>
            (window as unknown as { __crownfall: API }).__crownfall.verification.arrange('aim-retreat')
        );
    return { context, page, errors, cdp, start, move, end, cancel, arrange };
}
const humanHits = (s: State, id: string) =>
    s.combat.transactions.filter((t) => t.sourceId === '1-0' && t.abilityId === id);

for (const [label, id] of [
    ['Kit', 'whip'],
    ['Set', 'claw']
] as const) {
    test(`${label}: genuine simultaneous retreat and basic touch hits behind, disabled comparison misses`, async ({
        browser
    }) => {
        for (const enabled of [true, false]) {
            const h = await mobile(browser, label, enabled);
            try {
                const move = await h.start('#move');
                await h.move(move, 0, 20);
                await expect.poll(async () => (await snapshot(h.page)).movement.z).toBeGreaterThan(0.3);
                const before = await snapshot(h.page);
                // Capture the first real cast before the brief feedback expires or
                // continued retreat carries the target outside acquisition range.
                await h.page.evaluate(() => {
                    const api = (window as unknown as { __crownfall: API }).__crownfall;
                    const capture = () => {
                        if (api.snapshot().combat.journal.latestAccepted) api.verification.pause();
                        else requestAnimationFrame(capture);
                    };
                    requestAnimationFrame(capture);
                });
                const attack = await h.start('.ability-' + id);
                await expect
                    .poll(async () => (await snapshot(h.page)).combat.journal.latestAccepted?.abilityId)
                    .toBe(id);
                const after = await snapshot(h.page);
                expect(after.combat.player.z).toBeGreaterThan(before.combat.player.z);
                expect(after.movement).toEqual(before.movement);
                expect(humanHits(after, id).length > 0).toBe(enabled);
                expect(Math.abs(after.combat.journal.latestAccepted!.angle)).toBe(enabled ? Math.PI : 0);
                if (enabled) {
                    expect(after.aimAssist.targetId).toBe('2-1');
                    await expect(h.page.locator('.assisted-target')).toHaveAttribute('data-actor', '2-1');
                }
                await h.end(attack);
                await h.cancel();
                expect(h.errors).toEqual([]);
                await h.page.screenshot({ path: `test-results/007h-${id}-${enabled ? 'on' : 'off'}.png` });
            } finally {
                await h.context.close();
            }
        }
    });
}

test('Riven touch hold waits, release acquires scythes, confirmed second direction and recall survive retreat', async ({
    browser
}) => {
    const h = await mobile(browser, 'Riven');
    try {
        const attack = await h.start('.ability-reso');
        await h.move(attack, 0, 0);
        await h.page.waitForTimeout(350);
        expect((await snapshot(h.page)).combat.journal.latestAccepted).toBeNull();
        await h.end(attack);
        await expect
            .poll(async () => humanHits(await snapshot(h.page), 'reso').filter((t) => t.targetId === '2-1').length)
            .toBeGreaterThanOrEqual(2);
        const first = await snapshot(h.page);
        expect(first.combat.journal.latestAccepted!.angle).toBe(Math.PI);
        await expect(h.page.locator('.ability-reso')).not.toHaveClass(/unready/);
        const recall = await h.start('.ability-reso');
        await h.end(recall);
        await expect
            .poll(async () => (await snapshot(h.page)).combat.weapons.every((b) => b.phase === 'orbit'))
            .toBe(true);
        const move = await h.start('#move');
        await h.move(move, 0, 20);
        await expect.poll(async () => (await snapshot(h.page)).movement.z).toBeGreaterThan(0.3);
        const next = await h.start('.ability-reso');
        await h.end(next);
        await expect
            .poll(async () => (await snapshot(h.page)).combat.journal.latestAccepted!.id)
            .toBeGreaterThan(first.combat.journal.latestAccepted!.id);
        await h.cancel();
        expect(h.errors).toEqual([]);
    } finally {
        await h.context.close();
    }
});

test('manual drag chooses the opposite direction, cancel/blur/capture loss/orientation clear touch intentions', async ({
    browser
}) => {
    const h = await mobile(browser, 'Riven');
    try {
        const attack = await h.start('.ability-reso');
        await h.move(attack, 0, 50);
        await expect(h.page.locator('#aim-feedback')).toHaveText('Manual aim');
        await h.end(attack);
        await expect.poll(async () => (await snapshot(h.page)).combat.journal.latestAccepted?.abilityId).toBe('reso');
        expect((await snapshot(h.page)).combat.journal.latestAccepted!.angle).toBe(0);
        expect(humanHits(await snapshot(h.page), 'reso')).toEqual([]);
        for (const event of ['cancel', 'blur', 'capture', 'orientation']) {
            await h.arrange();
            const move = await h.start('#move');
            await h.move(move, 0, 20);
            const a = await h.start('.ability-reso');
            if (event === 'cancel') await h.cancel();
            else {
                await h.page.evaluate((kind) => {
                    if (kind === 'capture') {
                        for (const el of document.querySelectorAll('#move, .ability-reso'))
                            for (let id = 1; id < 100; id++) if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
                    } else window.dispatchEvent(new Event(kind === 'orientation' ? 'orientationchange' : 'blur'));
                }, event);
                // Physical touchCancel then exercises native release/capture cleanup as well.
                await h.cancel();
            }
            await expect.poll(async () => (await snapshot(h.page)).movement.z).toBe(0);
            expect((await snapshot(h.page)).aimAssist.targetId).toBeNull();
            void a;
        }
        await h.page.setViewportSize({ width: 390, height: 844 });
        expect((await snapshot(h.page)).movement).toEqual({ x: 0, z: 0 });
        expect(h.errors).toEqual([]);
    } finally {
        await h.context.close();
    }
});

test('rapid game-surface taps suppress default gestures; menu zoom and live setting remain available', async ({
    browser
}) => {
    const h = await mobile(browser);
    try {
        const scale = await h.page.evaluate(() => visualViewport!.scale);
        for (let i = 0; i < 12; i++) {
            const a = await h.start('.ability-whip');
            await h.end(a);
        }
        expect(await h.page.evaluate(() => visualViewport!.scale)).toBe(scale);
        expect(await h.page.evaluate(() => window.getSelection()!.toString())).toBe('');
        const guards = await h.page.evaluate(() => {
            const result: Record<string, boolean> = {};
            for (const selector of ['.ability-whip', '#move', '#application-canvas', '#aim-assist', '#summoner']) {
                const el = document.querySelector(selector)!;
                const event = new Event('touchend', { bubbles: true, cancelable: true });
                el.dispatchEvent(event);
                result[selector] = event.defaultPrevented;
            }
            return result;
        });
        expect(guards).toEqual({
            '.ability-whip': true,
            '#move': true,
            '#application-canvas': true,
            '#aim-assist': false,
            '#summoner': false
        });
        expect(await h.page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(
            /user-scalable|maximum-scale/
        );
        const before = await snapshot(h.page);
        await h.page.locator('#aim-assist').tap();
        await expect(h.page.locator('#aim-assist')).toHaveText('Aim Assist: Off');
        expect((await snapshot(h.page)).match.phase).toBe(before.match.phase);
        await h.page.keyboard.down('KeyS');
        await expect.poll(async () => (await snapshot(h.page)).movement.z).toBe(1);
        await h.page.keyboard.up('KeyS');
        expect((await snapshot(h.page)).combat.now).toBeGreaterThanOrEqual(before.combat.now);
        await h.page.locator('#reset-combat').evaluate((button) => (button as HTMLButtonElement).click());
        await h.page.getByLabel('Summoner', { exact: true }).selectOption('Set');
        await expect.poll(async () => (await snapshot(h.page)).aimAssist.targetId).toBeNull();
        expect((await snapshot(h.page)).match.phase).toBe('prematch');
        expect(h.errors).toEqual([]);
    } finally {
        await h.context.close();
    }
});

test('retreat and fire against three live pursuing bots records human damage through match authority', async ({
    browser
}) => {
    const h = await mobile(browser, 'Kit', true, true);
    try {
        const move = await h.start('#move');
        await h.move(move, 0, 20);
        const attack = await h.start('.ability-whip');
        await expect.poll(async () => humanHits(await snapshot(h.page), 'whip').length).toBeGreaterThan(0);
        expect((await snapshot(h.page)).combat.player.z).toBeGreaterThan(0);
        await h.end(attack);
        await h.cancel();
        await expect
            .poll(async () =>
                (await snapshot(h.page)).match.actors.filter((a) => a.id.startsWith('2-')).some((a) => a.damage > 0)
            )
            .toBe(true);
        await h.page.screenshot({ path: 'test-results/007h-live-pursuit.png' });
        expect(h.errors).toEqual([]);
    } finally {
        await h.context.close();
    }
});
