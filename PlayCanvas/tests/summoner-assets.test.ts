import type { Asset, AppBase } from 'playcanvas';
import { describe, expect, it, vi } from 'vitest';

import { SummonerAssets } from '../src/presentation/summoner-assets';

function fixture() {
    const registry = { add: vi.fn(), load: vi.fn(), remove: vi.fn() };
    const assets = new SummonerAssets({ assets: registry } as unknown as AppBase);
    return { registry, assets };
}

describe('scene-owned summoner containers', () => {
    it('shares concurrent and settled requests, caches bind bounds and unloads once', async () => {
        const { registry, assets } = fixture();
        const first = assets.load('kit.glb');
        const second = assets.load('kit.glb');
        expect(first).toBe(second);
        expect(registry.load).toHaveBeenCalledTimes(1);
        const asset = registry.load.mock.calls[0][0] as Asset;
        asset.fire('load');
        expect(await first).toBe(asset);
        expect(await assets.load('kit.glb')).toBe(asset);
        const calculate = vi.fn(() => ({
            height: 1,
            scale: 1,
            offset: [0, 0, 0],
            bounds: { min: [0, 0, 0], max: [1, 1, 1] }
        }));
        expect(assets.normalization('kit.glb', calculate)).toBe(assets.normalization('kit.glb', calculate));
        expect(calculate).toHaveBeenCalledTimes(1);
        const unload = vi.spyOn(asset, 'unload');
        assets.destroy();
        expect(unload).toHaveBeenCalledTimes(1);
        expect(registry.remove).toHaveBeenCalledWith(asset);
        await expect(assets.load('set.glb')).rejects.toThrow('disposed');
    });

    it('shares a failed request without repeated retries for both combatants', async () => {
        const { registry, assets } = fixture();
        const first = assets.load('riven.glb');
        const checks = Promise.all([
            expect(first).rejects.toBe('offline'),
            expect(assets.load('riven.glb')).rejects.toBe('offline')
        ]);
        registry.load.mock.calls[0][0].fire('error', 'offline');
        await checks;
        await expect(assets.load('riven.glb')).rejects.toBe('offline');
        expect(registry.load).toHaveBeenCalledTimes(1);
        assets.destroy();
    });

    it('unloads a container that finishes after its scene was abandoned', async () => {
        const { registry, assets } = fixture();
        const pending = assets.load('set.glb');
        const asset = registry.load.mock.calls[0][0] as Asset;
        const unload = vi.spyOn(asset, 'unload');
        assets.destroy();
        asset.fire('load');
        await pending;
        expect(unload).toHaveBeenCalledTimes(2);
    });
});
