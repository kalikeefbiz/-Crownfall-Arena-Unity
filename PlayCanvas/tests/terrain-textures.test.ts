import { describe, it, expect, vi, afterEach } from 'vitest';

import { terrainTextures } from '../src/presentation/terrain-textures';

const made = vi.hoisted(() => [] as { destroy: ReturnType<typeof vi.fn>; setSource: ReturnType<typeof vi.fn> }[]);
vi.mock('playcanvas', () => ({
    Texture: class {
        destroy = vi.fn();
        setSource = vi.fn();
        constructor() {
            made.push(this);
        }
    },
    ADDRESS_REPEAT: 0,
    FILTER_LINEAR: 1,
    FILTER_LINEAR_MIPMAP_LINEAR: 2
}));
const app = { graphicsDevice: { maxAnisotropy: 4 } } as Parameters<typeof terrainTextures>[0];
afterEach(() => {
    vi.unstubAllGlobals();
    made.length = 0;
});

describe('terrain request ownership', () => {
    it('deduplicates requests and closes a decode that finishes after teardown', async () => {
        let finish!: (bitmap: ImageBitmap) => void;
        const close = vi.fn();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob() }));
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(
                () =>
                    new Promise<ImageBitmap>((r) => {
                        finish = r;
                    })
            )
        );
        const maps = terrainTextures(app, 'terrain');
        const first = maps.load('weights', false, { data: true });
        expect(maps.load('weights', false, { data: true })).toBe(first);
        await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
        maps.destroy();
        finish({ close } as unknown as ImageBitmap);
        await first.ready;
        expect(close).toHaveBeenCalledOnce();
        expect(made[0].setSource).not.toHaveBeenCalled();
        expect(made[0].destroy).toHaveBeenCalledOnce();
        expect(maps.textures).toHaveLength(0);
        expect(() => maps.load('late', true)).toThrow('destroyed');
    });
    it('removes failed resources so an explicit retry can succeed', async () => {
        const close = vi.fn();
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockRejectedValueOnce(new Error('offline'))
                .mockResolvedValue({ ok: true, blob: async () => new Blob() })
        );
        vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close }));
        const maps = terrainTextures(app, 'terrain');
        await expect(maps.load('atlas', true, { data: true }).ready).rejects.toThrow('offline');
        expect(maps.textures).toHaveLength(0);
        await maps.load('atlas', true, { data: true }).ready;
        expect(maps.loading.loadedMaps).toBe(1);
        maps.destroy();
        maps.destroy();
        expect(close).toHaveBeenCalledOnce();
        expect(made.every((t) => t.destroy.mock.calls.length === 1)).toBe(true);
    });
    it('cancels an outstanding Image and settles readiness on destroy', async () => {
        const images: {
            onload: (() => void) | null;
            onerror: (() => void) | null;
            removeAttribute: ReturnType<typeof vi.fn>;
        }[] = [];
        vi.stubGlobal(
            'Image',
            class {
                onload = null;
                onerror = null;
                removeAttribute = vi.fn();
                constructor() {
                    images.push(this);
                }
            }
        );
        const maps = terrainTextures(app, 'terrain');
        const result = maps.load('color', true);
        maps.destroy();
        await result.ready;
        expect(images[0].removeAttribute).toHaveBeenCalledWith('src');
        expect(images[0].onload).toBeNull();
        expect(made[0].setSource).not.toHaveBeenCalled();
    });
});
