import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { createRivenWeapons } from '../../src/presentation/riven-weapons';
import { waitForInspection } from '../helpers/inspection-startup';

type Weapons = ReturnType<ReturnType<typeof createRivenWeapons>['snapshot']>;
type State = {
    rivenWeapons: Weapons;
    combat: { stance: string; now: number; journal: { latestAccepted: { id: number; abilityId: string } | null } };
    match: { phase: string; actors: { id: string; summonerId: string; dead: boolean }[] };
    modelAssets: { assets: { source: string; state: string }[] };
};
type Harness = {
    snapshot(): State;
    verification: { arrange(s: string): void; advance(n: number): void; pause(): void };
};
const read = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
const local = (s: State) => s.rivenWeapons.instances.filter((v) => v.ownerId === '1-0');
const frames = (page: Page) =>
    page.evaluate(async () => {
        for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
    });
async function advance(page: Page, seconds: number) {
    await page.evaluate(
        (n) => (window as unknown as { __crownfall: Harness }).__crownfall.verification.advance(n),
        seconds
    );
    await frames(page);
}
async function choose(page: Page, suffix = '') {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(`/?verify=1${suffix}`);
    await waitForInspection(page);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await page.evaluate(() =>
        (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('roster')
    );
}
// Send real keyboard events through the production input adapter. Pause after its
// accepted cast so outgoing/returning and all five barrage shots can be inspected.
async function cast(page: Page, code: string, drag = 0, aimHold = 0) {
    if (drag) {
        const box = (await page.locator('.ability-reso').boundingBox())!;
        const x = box.x + box.width / 2,
            y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + drag, y - 35);
        if (aimHold) {
            // Aim the independent second throw before the existing buffered
            // follow-up becomes due; keep that established input rule intact.
            await advance(page, aimHold);
            expect(local(await read(page)).map((v) => v.phase)).toEqual(['parked', 'orbit']);
        }
        await page.mouse.up();
    }
    await page.evaluate(
        async ({ code, drag }) => {
            const h = (window as unknown as { __crownfall: Harness }).__crownfall;
            h.verification.arrange('roster');
            const before = h.snapshot().combat.journal.latestAccepted?.id;
            if (!drag) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
                window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
            }
            for (let i = 0; i < 120; i++) {
                await new Promise(requestAnimationFrame);
                if (h.snapshot().combat.journal.latestAccepted?.id !== before) {
                    h.verification.pause();
                    return;
                }
            }
            throw new Error(`No accepted input: ${code}`);
        },
        { code, drag }
    );
    await frames(page);
}
function ownership(s: State) {
    const views = s.rivenWeapons.instances;
    const owners = s.match.actors.filter((a) => a.summonerId === 'riven' && !a.dead);
    for (const owner of owners)
        expect(views.filter((v) => v.kind === 'reso' && v.ownerId === owner.id)).toHaveLength(2);
    expect(new Set(views.map((v) => v.instanceId)).size).toBe(views.length);
    for (const v of views) {
        expect(v.position[0]).toBeCloseTo(v.authoritative.x, 5);
        expect(v.position[2]).toBeCloseTo(v.authoritative.z, 5);
    }
}

test('two shared Moonreapers follow every Reso phase, stance and Elf Dance', async ({ page }) => {
    test.setTimeout(180000);
    const requests: string[] = [],
        errors: string[] = [];
    page.on('request', (r) => {
        if (r.url().includes('Meshy_AI_Azure')) requests.push(r.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await choose(page);
    await expect.poll(async () => (await read(page)).rivenWeapons.state, { timeout: 45000 }).toBe('loaded');
    await expect.poll(async () => (await read(page)).rivenWeapons.instances.filter((v) => !v.fallback).length).toBe(4);
    await page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.pause());
    const initial = await read(page);
    ownership(initial);
    expect(new Set(initial.rivenWeapons.instances.map((v) => v.meshId)).size).toBe(1);
    expect(new Set(initial.rivenWeapons.instances.map((v) => v.materialId)).size).toBe(1);
    expect(initial.rivenWeapons.instances.every((v) => v.phase === 'orbit')).toBe(true);
    const ids = local(initial).map((v) => v.instanceId);
    await page.screenshot({ path: 'test-results/008-moonreapers-orbit.png' });
    await cast(page, 'Space', -40);
    let s = await read(page);
    expect(local(s).map((v) => v.phase)).toEqual(['outgoing', 'orbit']);
    ownership(s);
    await cast(page, 'Space', 40, 0.7);
    expect(local(await read(page)).map((v) => v.phase)).toEqual(['parked', 'outgoing']);
    await advance(page, 0.7);
    s = await read(page);
    expect(local(s).map((v) => v.phase)).toEqual(['parked', 'parked']);
    const parked = local(s).map((v) => v.position);
    expect(Math.abs(parked[0][0] - parked[1][0])).toBeGreaterThan(2);
    await page.screenshot({ path: 'test-results/008-moonreapers-deployed.png' });
    await cast(page, 'KeyF');
    expect((await read(page)).combat.stance).toBe('pulse');
    expect(local(await read(page)).map((v) => v.position)).toEqual(parked);
    await advance(page, 3.1);
    await cast(page, 'KeyF');
    await cast(page, 'Space');
    expect(local(await read(page)).map((v) => v.phase)).toEqual(['returning', 'returning']);
    await advance(page, 0.2);
    s = await read(page);
    ownership(s);
    expect(local(s).every((v) => v.phase === 'returning')).toBe(true);
    expect(local(s).some((v, i) => v.position[2] !== parked[i][2])).toBe(true);
    await page.screenshot({ path: 'test-results/008-moonreapers-returning.png' });
    await advance(page, 0.6);
    s = await read(page);
    expect(local(s).map((v) => v.phase)).toEqual(['orbit', 'orbit']);
    expect(local(s).map((v) => v.instanceId)).toEqual(ids);
    await cast(page, 'KeyQ');
    await advance(page, 0.35);
    s = await read(page);
    const dance = s.rivenWeapons.instances.filter((v) => v.kind === 'elf-dance');
    expect(dance).toHaveLength(5);
    expect(dance.every((v) => v.ownerId === '1-0' && !v.fallback && v.meshId === local(s)[0].meshId)).toBe(true);
    expect(
        local(s)
            .filter((v) => v.kind === 'reso')
            .map((v) => v.instanceId)
    ).toEqual(ids);
    ownership(s);
    await advance(page, 1);
    expect((await read(page)).rivenWeapons.instances.filter((v) => v.kind === 'elf-dance')).toHaveLength(0);
    expect(requests).toHaveLength(1);
    expect(errors).toEqual([]);
});

for (const mode of ['failed asset', 'primitive']) {
    test(`${mode} keeps two functional fallback scythes per Riven`, async ({ page }) => {
        let requests = 0;
        await page.route('**/Meshy_AI_Azure*.glb', (route) => {
            requests++;
            return route.abort();
        });
        await choose(page, mode === 'primitive' ? '&models=primitive' : '');
        if (mode === 'failed asset') await expect.poll(async () => (await read(page)).rivenWeapons.state).toBe('error');
        await expect.poll(async () => (await read(page)).rivenWeapons.instances.length).toBe(4);
        ownership(await read(page));
        expect((await read(page)).rivenWeapons.instances.every((v) => v.fallback)).toBe(true);
        await cast(page, 'Space');
        expect(local(await read(page)).map((v) => v.phase)).toEqual(['outgoing', 'orbit']);
        expect(requests).toBe(mode === 'primitive' ? 0 : 1);
    });
}

test('ordinary 3v3 selects Riven and renders independent player and AI scythes without preview flags', async ({
    page
}) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?verify=1');
    await waitForInspection(page);
    await page.getByLabel('Summoner', { exact: true }).selectOption('Riven');
    await page.locator('#play-match').click();
    await expect.poll(async () => (await read(page)).rivenWeapons.state, { timeout: 45000 }).toBe('loaded');
    await expect.poll(async () => (await read(page)).rivenWeapons.instances.filter((v) => !v.fallback).length).toBe(4);
    ownership(await read(page));
    // No arrangement fixture: retain the ordinary roster, spawns and live bots.
    // Advance fixed match ticks to observe AI deployment without depending on
    // software WebGL's wall-clock frame rate or altering any combat rules.
    await page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.verification.pause());
    let deployed = false;
    for (let i = 0; i < 30 && !deployed; i++) {
        await advance(page, 2);
        deployed = (await read(page)).rivenWeapons.instances.some(
            (v) => v.ownerId !== '1-0' && v.kind === 'reso' && v.phase !== 'orbit'
        );
    }
    expect(deployed).toBe(true);
    ownership(await read(page));
});
