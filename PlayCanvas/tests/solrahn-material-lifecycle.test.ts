import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSolrahnSurfaceMaterial } from '../src/presentation/solrahn-surface-material';

const state = vi.hoisted(() => ({
    resources: new Map<string, { texture: object; ready: Promise<void>; resolve(): void; reject(error: Error): void }>()
}));
vi.mock('../src/presentation/terrain-textures', () => ({
    terrainTextures: () => ({
        loading: { state: 'loading', error: '', loadedMaps: 0 },
        textures: [],
        destroy: vi.fn(),
        load(name: string) {
            if (state.resources.has(name)) return state.resources.get(name);
            let resolve!: () => void, reject!: (error: Error) => void;
            const ready = new Promise<void>((a, b) => {
                resolve = a;
                reject = b;
            });
            const result = { texture: {}, ready, resolve, reject };
            state.resources.set(name, result);
            return result;
        }
    })
}));
afterEach(() => {
    state.resources.clear();
    vi.unstubAllGlobals();
});
const app = {} as Parameters<typeof createSolrahnSurfaceMaterial>[0];
describe('surface quality demand', () => {
    it('loads only Low resources, deduplicates High demand, and honors the latest toggle', async () => {
        vi.stubGlobal('localStorage', { getItem: () => 'low' });
        const surface = createSolrahnSurfaceMaterial(app);
        expect(state.resources.size).toBe(4);
        state.resources.forEach((r) => r.resolve());
        await surface.ready;
        surface.quality(true);
        expect(surface.diagnostics.shader.materialUpdates).toBe(1);
        surface.quality(false);
        surface.quality(false);
        surface.quality(true);
        expect(state.resources.size).toBe(10);
        state.resources.forEach((r) => r.resolve());
        await vi.waitFor(() => expect(surface.diagnostics.shader.highLoaded).toBe(true));
        expect(surface.diagnostics.shader.detailNormals).toBe(false);
        surface.quality(false);
        expect(surface.diagnostics.shader.detailNormals).toBe(true);
        const updates = surface.diagnostics.shader.materialUpdates;
        surface.quality(false);
        expect(surface.diagnostics.shader.materialUpdates).toBe(updates);
        surface.destroy();
    });
    it('never applies a late High completion after destruction', async () => {
        vi.stubGlobal('localStorage', { getItem: () => 'low' });
        const surface = createSolrahnSurfaceMaterial(app);
        state.resources.forEach((r) => r.resolve());
        await surface.ready;
        surface.quality(false);
        surface.destroy();
        state.resources.forEach((r) => r.resolve());
        await Promise.resolve();
        await Promise.resolve();
        expect(surface.diagnostics.shader.materialUpdates).toBe(1);
    });
});
