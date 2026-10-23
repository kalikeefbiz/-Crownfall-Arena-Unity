import type { Asset, AppBase } from 'playcanvas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SummonerAssets } from '../src/presentation/summoner-assets';

function fixture() {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
    const registry = { add: vi.fn(), load: vi.fn(), remove: vi.fn() };
    const assets = new SummonerAssets({ assets: registry } as unknown as AppBase);
    return { registry, assets };
}

afterEach(() => vi.unstubAllGlobals());

describe('scene-owned summoner containers', () => {
    it('shares concurrent and settled requests, caches bind bounds and unloads once', async () => {
        const { registry, assets } = fixture();
        const first = assets.load('kit.glb');
        const second = assets.load('kit.glb');
        expect(first).toBe(second);
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
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
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        registry.load.mock.calls[0][0].fire('error', 'offline');
        await checks;
        await expect(assets.load('riven.glb')).rejects.toBe('offline');
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        assets.destroy();
    });

    it('unloads a container that finishes after its scene was abandoned', async () => {
        const { registry, assets } = fixture();
        const pending = assets.load('set.glb');
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        const asset = registry.load.mock.calls[0][0] as Asset;
        const unload = vi.spyOn(asset, 'unload');
        const cancelled = expect(pending).rejects.toThrow('disposed');
        assets.destroy();
        asset.fire('load');
        await cancelled;
        expect(unload).toHaveBeenCalledTimes(2);
    });
    it('aborts a pending download, settles callers and never starts a late engine parse', async () => {
        const { registry, assets } = fixture();
        let deliver!: (response: unknown) => void;
        const fetch = vi.fn().mockReturnValue(
            new Promise((resolve) => {
                deliver = resolve;
            })
        );
        vi.stubGlobal('fetch', fetch);
        const pending = assets.load('late.glb');
        const cancelled = expect(pending).rejects.toThrow('disposed');
        assets.destroy();
        assets.destroy();
        expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
        await cancelled;
        deliver({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
        await Promise.resolve();
        await Promise.resolve();
        expect(registry.load).not.toHaveBeenCalled();
        expect(registry.remove).toHaveBeenCalledTimes(1);
    });
});
