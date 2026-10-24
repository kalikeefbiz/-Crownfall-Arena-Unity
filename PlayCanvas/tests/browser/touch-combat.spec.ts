import { test, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

type Evidence = { abilityId: string; targetId: string; amount: number };
type Cast = {
    accepted: boolean;
    result: string;
    reason: string;
    abilityId: string;
    targetIds: string[];
    damage: number;
};
type State = {
    combat: {
        name: string;
        now: number;
        targets: { id: string; health: number }[];
        transactions: Evidence[];
        journal: {
            latestAccepted: Cast | null;
            latestAttempt: Cast | null;
            latestResolution: Cast | null;
            hits: { abilityId: string; amount: number }[];
        };
    };
    frames: number;
    position: { x: number; z: number };
    movement: { x: number; z: number };
    preview: {
        kind: string;
        range: number;
        width: number;
        radius: number;
        origin: { x: number; z: number };
        center: { x: number; z: number };
    } | null;
};
const snapshot = (page: Page): Promise<State> =>
    page.evaluate(() => (window as unknown as { __crownfall: { snapshot(): State } }).__crownfall.snapshot());
const hp = (s: State) => s.combat.targets.find((t) => t.id === 'mobile-test')!.health;
const damage = (s: State, id: string) =>
    s.combat.transactions
        .filter((t) => t.targetId === 'mobile-test' && t.abilityId === id)
        .reduce((sum, t) => sum + t.amount, 0);
type TouchPoint = { id: number; x: number; y: number; radiusX: number; radiusY: number; force: number };
async function mobile(browser: Browser, label = 'Kit') {
    const context = await browser.newContext({
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
    });
    const page = await context.newPage(),
        errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?debug=1');
    await expect
        .poll(async () => (await snapshot(page)).frames, {
            timeout: 30000,
            message: 'WebGL warmup must render six frames before combat begins'
        })
        .toBeGreaterThan(5);
    await page.getByLabel('Summoner', { exact: true }).selectOption({ label });
    await page.evaluate(() => {
        const events: { type: string; pointerType: string; trusted: boolean; id: number; target: string }[] = [];
        (window as unknown as { touchEvidence: typeof events }).touchEvidence = events;
        for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture'])
            document.addEventListener(
                type,
                (e) => {
                    const p = e as PointerEvent;
                    const target = p.target instanceof Element ? p.target.closest('#move, .ability') : null;
                    events.push({
                        type,
                        pointerType: p.pointerType,
                        trusted: e.isTrusted,
                        id: p.pointerId,
                        target: target?.id || target?.className || ''
                    });
                },
                true
            );
    });
    const cdp = await context.newCDPSession(page),
        points = new Map<number, TouchPoint>();
    let next = 1;
    const send = (type: 'touchStart' | 'touchMove' | 'touchCancel') =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...points.values()] });
    const start = async (selector: string) => {
        const r = (await page.locator(selector).boundingBox())!,
            id = next++;
        points.set(id, { id, x: r.x + r.width / 2, y: r.y + r.height / 2, radiusX: 4, radiusY: 4, force: 1 });
        await send('touchStart');
        return id;
    };
    const move = async (id: number, dx: number, dy: number) => {
        const p = points.get(id)!;
        points.set(id, { ...p, x: p.x + dx, y: p.y + dy });
        await send('touchMove');
    };
    const end = async (id: number) => {
        const released = points.get(id);
        if (!released) throw new Error(`Touch ${id} is not active`);
        points.delete(id);
        // CDP touchEnd lists the changed (released) point, not the fingers
        // still held. Passing the remaining move finger releases the wrong one.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [released] });
    };
    const tap = async (selector: string) => {
        const id = await start(selector);
        await end(id);
    };
    const cancel = async () => {
        points.clear();
        await send('touchCancel');
    };
    const finish = async () => {
        const events = await page.evaluate(
            () => (window as unknown as { touchEvidence: { pointerType: string; trusted: boolean }[] }).touchEvidence
        );
        expect(events.length).toBeGreaterThan(0);
        expect(events.every((e) => e.pointerType === 'touch' && e.trusted)).toBe(true);
        expect(errors).toEqual([]);
        await context.close();
    };
    return { page, cdp, start, move, end, tap, cancel, finish };
}

for (const [label, id, amount] of [
    ['Kit', 'whip', 110],
    ['Set', 'claw', 90]
] as const) {
    test(`${label}: back-to-back genuine touch press/release damages the known in-range target`, async ({
        browser
    }) => {
        const h = await mobile(browser, label);
        await h.tap('.ability-' + id);
        await expect.poll(async () => damage(await snapshot(h.page), id)).toBe(amount);
        expect(hp(await snapshot(h.page))).toBe(5000 - amount);
        expect((await snapshot(h.page)).combat.journal.latestAccepted?.result).toBe('HIT');
        await expect(h.page.locator('#combat-feedback')).toContainText('HIT');
        await expect(h.page.locator('.damage-number[data-target="mobile-test"]')).toContainText('−' + amount);
        await expect(h.page.locator('#combat-diagnostics')).toContainText('TX ' + id);
        await h.page.screenshot({ path: `test-results/touch-${id}-hit.png` });
        await h.finish();
    });
}

test('Riven: genuine touch hold never fires; release survives normal lost capture and launches both scythes', async ({
    browser
}) => {
    const h = await mobile(browser, 'Riven'),
        id = await h.start('.ability-reso');
    const start = (await snapshot(h.page)).combat.now;
    await expect.poll(async () => (await snapshot(h.page)).combat.now).toBeGreaterThan(start + 0.3);
    expect((await snapshot(h.page)).combat.transactions).toEqual([]);
    expect((await snapshot(h.page)).combat.journal.latestAccepted).toBeNull();
    await h.end(id);
    await expect.poll(async () => damage(await snapshot(h.page), 'reso')).toBe(150);
    expect(hp(await snapshot(h.page))).toBe(4850);
    const order = await h.page.evaluate(() =>
        (window as unknown as { touchEvidence: { type: string }[] }).touchEvidence.map((e) => e.type)
    );
    expect(order).toContain('pointerup');
    expect(order.indexOf('lostpointercapture')).toBeGreaterThan(order.indexOf('pointerup'));
    await expect(h.page.locator('#combat-feedback')).toContainText('HIT');
    await h.finish();
});

test('Riven quick touch tap commits on release and Pulse retains release-only semantics after stance switch', async ({
    browser
}) => {
    const h = await mobile(browser, 'Riven');
    await h.tap('.ability-reso');
    await expect.poll(async () => damage(await snapshot(h.page), 'reso')).toBe(150);
    await h.tap('#reset-combat');
    await h.tap('.ability-stance');
    const id = await h.start('.ability-pulse');
    const start = (await snapshot(h.page)).combat.now;
    await expect.poll(async () => (await snapshot(h.page)).combat.now).toBeGreaterThan(start + 0.25);
    expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
    await expect.poll(async () => (await snapshot(h.page)).preview?.width).toBe(0.7);
    await h.end(id);
    await expect.poll(async () => damage(await snapshot(h.page), 'pulse')).toBe(100);
    await h.finish();
});

test('simultaneous movement and Basic touch fingers retain independent capture while actual damage resolves', async ({
    browser
}) => {
    const h = await mobile(browser),
        m = await h.start('#move'),
        a = await h.start('.ability-whip');
    await h.move(m, 8, 0);
    await h.move(a, 0, -40);
    await expect.poll(async () => damage(await snapshot(h.page), 'whip')).toBeGreaterThan(0);
    await expect.poll(async () => (await snapshot(h.page)).position.x).toBeGreaterThan(0.12);
    await h.end(a);
    const released = await h.page.evaluate(() =>
        (window as unknown as { touchEvidence: { type: string; target: string }[] }).touchEvidence
            .filter((event) => event.type === 'pointerup')
            .map((event) => event.target)
    );
    expect(released).toHaveLength(1);
    expect(released[0]).toContain('ability-whip');
    expect(released).not.toContain('move');
    expect((await snapshot(h.page)).movement.x).toBeGreaterThan(0);
    await h.end(m);
    await expect.poll(async () => (await snapshot(h.page)).movement.x).toBe(0);
    await h.finish();
});

for (const [label, ability] of [
    ['Kit', 'step'],
    ['Set', 'predatory'],
    ['Riven', 'reso']
])
    test(`${label}: touchcancel while aiming never commits damage`, async ({ browser }) => {
        const h = await mobile(browser, label);
        await h.start('.ability-' + ability);
        await h.cancel();
        const start = (await snapshot(h.page)).combat.now;
        await expect.poll(async () => (await snapshot(h.page)).combat.now).toBeGreaterThan(start + 0.6);
        expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
        expect((await snapshot(h.page)).combat.journal.latestAccepted).toBeNull();
        await h.finish();
    });

test('Riven: actual capture loss before release cancels without enqueuing a Basic', async ({ browser }) => {
    const h = await mobile(browser, 'Riven'),
        id = await h.start('.ability-reso');
    await h.move(id, 0, -1);
    await expect
        .poll(async () =>
            h.page.evaluate(() =>
                (window as unknown as { touchEvidence: { type: string }[] }).touchEvidence.some(
                    (e) => e.type === 'gotpointercapture'
                )
            )
        )
        .toBe(true);
    await h.page.evaluate(() => {
        const e = (window as unknown as { touchEvidence: { type: string; id: number }[] }).touchEvidence
            .filter((e) => e.type === 'pointerdown')
            .at(-1)!;
        document.querySelector('.ability-reso')!.releasePointerCapture(e.id);
    });
    await h.move(id, 0, -30);
    await expect
        .poll(async () =>
            h.page.evaluate(() =>
                (window as unknown as { touchEvidence: { type: string }[] }).touchEvidence.some(
                    (e) => e.type === 'lostpointercapture'
                )
            )
        )
        .toBe(true);
    await h.end(id);
    const start = (await snapshot(h.page)).combat.now;
    await expect.poll(async () => (await snapshot(h.page)).combat.now).toBeGreaterThan(start + 0.6);
    expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
    expect((await snapshot(h.page)).combat.journal.latestAccepted).toBeNull();
    await h.finish();
});

for (const [label, ability, minDamage] of [
    ['Kit', 'step', 100],
    ['Set', 'predatory', 70],
    ['Riven', 'elf-dance', 240]
] as const)
    test(`${label}: aimed non-Basic touch action produces authoritative damage`, async ({ browser }) => {
        const h = await mobile(browser, label),
            id = await h.start('.ability-' + ability);
        await h.move(id, 0, -42);
        await expect(h.page.locator('#ability-preview')).not.toHaveAttribute('d', '');
        expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
        await h.end(id);
        await expect.poll(async () => damage(await snapshot(h.page), ability)).toBeGreaterThanOrEqual(minDamage);
        await h.finish();
    });

test('touch Solar Ring uses its radial radius and creates authoritative HIT feedback', async ({ browser }) => {
    const h = await mobile(browser),
        id = await h.start('.ability-ring');
    await expect.poll(async () => (await snapshot(h.page)).preview?.kind).toBe('radial');
    expect((await snapshot(h.page)).preview?.radius).toBe(3.5);
    await h.end(id);
    await expect.poll(async () => damage(await snapshot(h.page), 'ring')).toBe(190);
    await expect(h.page.locator('#combat-feedback')).toContainText('HIT');
    await h.finish();
});

test('Set: touch ground marker clamps to 14m and touch ground ultimate damages the original line target', async ({
    browser
}) => {
    const h = await mobile(browser, 'Set');
    await h.tap('#charge');
    const id = await h.start('.ability-fist');
    await h.move(id, 120, 0);
    await expect.poll(async () => (await snapshot(h.page)).preview?.kind).toBe('ground');
    const p = (await snapshot(h.page)).preview!;
    expect(p.kind).toBe('ground');
    expect(p.radius).toBe(3);
    expect(Math.hypot(p.center.x - p.origin.x, p.center.z - p.origin.z)).toBeCloseTo(14);
    await h.cancel();
    const north = await h.start('.ability-fist');
    await h.move(north, 0, -60);
    await h.end(north);
    await expect
        .poll(async () =>
            (await snapshot(h.page)).combat.transactions
                .filter((t) => t.targetId === 'line-b' && t.abilityId === 'fist')
                .reduce((s, t) => s + t.amount, 0)
        )
        .toBe(460);
    await h.finish();
});

test('Set preview uses 1.65m cone, 150px cancellation is visible; Riven empty-path release visibly resolves MISS', async ({
    browser
}) => {
    const h = await mobile(browser, 'Set'),
        id = await h.start('.ability-claw');
    await expect.poll(async () => (await snapshot(h.page)).preview?.kind).toBe('cone');
    expect((await snapshot(h.page)).preview?.range).toBe(1.65);
    await h.end(id);
    await h.tap('#reset-combat');
    const aimed = await h.start('.ability-predatory');
    await h.move(aimed, -160, 0);
    await expect(h.page.locator('#preview-hint')).toContainText('CANCELLED');
    await expect(h.page.locator('#ability-preview')).toHaveClass(/cancelled/);
    await h.end(aimed);
    expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
    await h.page.getByLabel('Summoner', { exact: true }).selectOption({ label: 'Riven' });
    const r = await h.start('.ability-reso');
    await h.move(r, 0, 40);
    await h.end(r);
    await expect.poll(async () => (await snapshot(h.page)).combat.journal.latestResolution?.result).toBe('MISS');
    expect((await snapshot(h.page)).combat.transactions.length).toBe(0);
    await expect(h.page.locator('#combat-feedback')).toContainText('MISS');
    await expect(h.page.locator('#combat-diagnostics')).toContainText('0 targets');
    await h.page.screenshot({ path: 'test-results/touch-miss.png' });
    await h.finish();
});
