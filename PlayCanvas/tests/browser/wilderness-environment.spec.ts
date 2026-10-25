import { expect, test } from '@playwright/test';

import type { createWildernessEnvironment } from '../../src/presentation/wilderness-environment';

type Grove = ReturnType<typeof createWildernessEnvironment>['diagnostics'];
type Harness = {
    verification: { arrange(name: string): void };
    snapshot(): { environment: { wilderness?: Grove }; rivenWeapons: { height: number } };
};

test('western grove loads each approved species once and shares tree meshes and materials', async ({ page }) => {
    test.setTimeout(120000);
    const requests: string[] = [],
        errors: string[] = [];
    page.on('request', (r) => {
        if (r.url().includes('/trees/')) requests.push(r.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?verify=1');
    await page.evaluate(() =>
        (window as unknown as { __crownfall: Harness }).__crownfall.verification.arrange('roster')
    );
    const read = () =>
        page.evaluate(
            () => (window as unknown as { __crownfall: Harness }).__crownfall.snapshot().environment.wilderness
        );
    await expect.poll(async () => (await read())?.state, { timeout: 60000 }).toBe('loaded');
    const grove = (await read())!;
    expect(requests).toHaveLength(4);
    expect(requests.every((r) => r.includes('/mobile/'))).toBe(true);
    expect(grove.trees).toHaveLength(11);
    expect(new Set(grove.trees.map((t) => t.species)).size).toBe(4);
    for (const species of ['maple', 'pine', 'oak', 'redwood']) {
        const trees = grove.trees.filter((t) => t.species === species);
        expect(new Set(trees.map((t) => t.meshId)).size).toBe(1);
        expect(new Set(trees.map((t) => t.materialId)).size).toBe(1);
        expect(trees.every((t) => t.position[0] < -32 && t.position[1] > 0)).toBe(true);
    }
    expect(grove.groundMaps).toBe(6);
    expect(grove.grassTriangles).toBe(240);
    await page.goto('/?environment=legacy');
    expect(await read()).toBeUndefined();
    expect(requests).toHaveLength(4);
    expect(errors).toEqual([]);
});
