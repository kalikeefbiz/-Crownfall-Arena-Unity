import { Texture, ADDRESS_REPEAT, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR } from 'playcanvas';
import type { AppBase } from 'playcanvas';

// Shared with the production dirt loader. Explicit lifecycle ownership prevents
// late image completion from allocating GPU resources after a scene is gone.
export function terrainTextures(app: AppBase, base: string) {
    const textures: Texture[] = [];
    const bitmaps: ImageBitmap[] = [];
    let destroyed = false;
    const loading = { state: 'loading', error: '', loadedMaps: 0 };
    return {
        textures,
        loading,
        load(
            name: string,
            srgb: boolean,
            options: { width?: number; height?: number; flipY?: boolean; clamp?: number; data?: boolean } = {}
        ) {
            const texture = new Texture(app.graphicsDevice, {
                name,
                width: options.width ?? 1024,
                height: options.height ?? 1024,
                srgb,
                flipY: options.flipY ?? true,
                mipmaps: true,
                addressU: options.clamp ?? ADDRESS_REPEAT,
                addressV: options.clamp ?? ADDRESS_REPEAT,
                minFilter: FILTER_LINEAR_MIPMAP_LINEAR,
                magFilter: FILTER_LINEAR,
                anisotropy: Math.min(4, app.graphicsDevice.maxAnisotropy)
            });
            textures.push(texture);
            const url = `${import.meta.env.BASE_URL}${base}/${name}`;
            if (options.data) {
                // Alpha is a fourth weight, not opacity. Explicitly disable image
                // premultiplication and color conversion, including at alpha=0.
                const ready = fetch(url).then(async (response) => {
                    if (!response.ok) throw new Error(`Terrain map unavailable: ${name}`);
                    const bitmap = await createImageBitmap(await response.blob(), {
                        premultiplyAlpha: 'none',
                        colorSpaceConversion: 'none',
                        imageOrientation: 'none'
                    });
                    if (destroyed) {
                        bitmap.close();
                        return;
                    }
                    bitmaps.push(bitmap);
                    // Engine _isBrowserInterface explicitly accepts ImageBitmap; its
                    // published setSource declaration omits that supported overload.
                    (texture.setSource as unknown as (source: ImageBitmap) => void)(bitmap);
                    loading.loadedMaps++;
                });
                return { texture, ready };
            }
            const image = new Image();
            const ready = new Promise<void>((resolve, reject) => {
                image.onload = () => {
                    if (!destroyed) {
                        texture.setSource(image);
                        loading.loadedMaps++;
                    }
                    resolve();
                };
                image.onerror = () => reject(new Error(`Terrain map unavailable: ${name}`));
            });
            image.src = url;
            return { texture, ready };
        },
        destroy() {
            destroyed = true;
            for (const texture of textures) texture.destroy();
            for (const bitmap of bitmaps) bitmap.close();
        }
    };
}
