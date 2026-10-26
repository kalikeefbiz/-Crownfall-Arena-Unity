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
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
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
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
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
    it('serializes unique containers through decode and releases the queue after failure', async () => {
        const { registry, assets } = fixture();
        const first = assets.load('first.glb');
        const second = assets.load('second.glb');
        const failure = expect(first).rejects.toBe('invalid first');
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        expect(fetch).toHaveBeenCalledTimes(1);
        registry.load.mock.calls[0][0].fire('error', 'invalid first');
        await failure;
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(2));
        const secondAsset = registry.load.mock.calls[1][0] as Asset;
        secondAsset.fire('load');
        expect(await second).toBe(secondAsset);
        assets.destroy();
    });

    it('cancels a queued container without starting another request after disposal', async () => {
        const { registry, assets } = fixture();
        const first = assets.load('first.glb');
        const second = assets.load('queued.glb');
        const cancelled = Promise.all([
            expect(first).rejects.toThrow('disposed'),
            expect(second).rejects.toThrow('disposed')
        ]);
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        assets.destroy();
        await cancelled;
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(registry.load).toHaveBeenCalledTimes(1);
    });
    it('tracks queued network and decode work, then releases the render budget on failure', async () => {
        const { registry, assets } = fixture();
        let deliver!: (response: Response) => void;
        vi.mocked(fetch).mockReturnValueOnce(
            new Promise((resolve) => {
                deliver = resolve;
            })
        );
        const pending = assets.load('decode.glb');
        const rejected = expect(pending).rejects.toBe('invalid container');
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
        expect(assets.loading).toBe(true);
        deliver({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response);
        await vi.waitFor(() => expect(registry.load).toHaveBeenCalledTimes(1));
        expect(assets.loading).toBe(true);
        registry.load.mock.calls[0][0].fire('error', 'invalid container');
        await rejected;
        await vi.waitFor(() => expect(assets.loading).toBe(false));
        assets.destroy();
    });
});
