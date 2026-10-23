import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

type Inspection = {
    environment: { mode: string; batches: number; territoryTint: boolean; triangles?: number };
    match: unknown;
    combat: { player: { x: number; z: number } };
    territory: { frontierZ: number; camera: { x: number; y: number; z: number }; follow: { x: number; z: number } };
    summonerModels: { visible: boolean; position: { y: number }; playing: boolean }[];
};
type Harness = {
    snapshot(): Inspection;
    verification: { arrange(name: string): void; pause(): void; advance(t: number): void };
};
const read = (page: Page) =>
    page.evaluate(() => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot());
async function arrange(page: Page) {
    await page.evaluate(() => {
        const h = (window as unknown as { __crownfall: Harness }).__crownfall;
        h.verification.arrange('roster');
        h.verification.pause();
        h.verification.advance(2.1);
    });
    await expect.poll(async () => (await read(page)).summonerModels.filter((m) => m.visible).length).toBe(6);
    await expect
        .poll(async () => {
            const s = await read(page);
            return Math.hypot(s.territory.follow.x - s.combat.player.x, s.territory.follow.z - s.combat.player.z);
        })
        .toBeLessThan(0.00001);
}

test('legacy recovery and tint-free carved rendering preserve the same authoritative fixture and camera', async ({
    page
}) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?verify=1&environment=legacy&territoryTint=0');
    await arrange(page);
    const before = await read(page);
    expect(before.environment).toMatchObject({ mode: 'legacy', batches: 0, territoryTint: false });
    await page.screenshot({ path: 'test-results/007f-legacy-neutral.png' });
    await page.goto('/?verify=1&territoryTint=0');
    await arrange(page);
    const after = await read(page);
    expect(after.environment).toMatchObject({ mode: 'carved', batches: 5, territoryTint: false });
    expect(after.environment.triangles).toBeLessThan(28000);
    expect(after.match).toEqual(before.match);
    expect(after.territory.frontierZ).toBe(before.territory.frontierZ);
    for (const axis of ['x', 'y', 'z'] as const)
        expect(after.territory.camera[axis]).toBeCloseTo(before.territory.camera[axis], 4);
    expect(after.summonerModels.every((m) => m.playing && m.position.y === 0)).toBe(true);
    await page.screenshot({ path: 'test-results/007f-carved-neutral.png' });
    expect(errors).toEqual([]);
});

test('normal match defaults to carved terrain with territory indicators retained', async ({ page }) => {
    await page.goto('/');
    expect((await read(page)).environment).toMatchObject({ mode: 'carved', territoryTint: true });
    await page.goto('/?environment=legacy');
    expect((await read(page)).environment).toMatchObject({ mode: 'legacy', territoryTint: true });
    await page.goto('/?debug=1');
    expect((await read(page)).environment.mode).toBe('legacy');
});
