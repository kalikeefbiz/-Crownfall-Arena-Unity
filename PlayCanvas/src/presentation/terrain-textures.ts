import { Texture, ADDRESS_REPEAT, FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR } from 'playcanvas';
import type { AppBase } from 'playcanvas';

// Sources stay alive for context restoration until their owning scene is destroyed.
// Each URL has one owned request, decode and texture, including concurrent demands.
export function terrainTextures(app: AppBase, base: string) {
    const textures: Texture[] = [];
    const resources = new Map<string, { texture: Texture; ready: Promise<void> }>();
    const releases = new Set<() => void>();
    let destroyed = false;
    const loading = { state: 'loading', error: '', loadedMaps: 0 };
    const ownership = { requests: 0, pending: 0, images: 0, bitmaps: 0, destroyed: false };
    return {
        textures,
        loading,
        ownership,
        load(
            name: string,
            srgb: boolean,
            options: {
                width?: number;
                height?: number;
                flipY?: boolean;
                clamp?: number;
                data?: boolean;
                anisotropy?: number;
            } = {}
        ) {
            if (destroyed) throw new Error('Terrain textures have been destroyed');
            const existing = resources.get(name);
            if (existing) return existing;
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
                anisotropy: Math.min(options.anisotropy ?? 4, app.graphicsDevice.maxAnisotropy)
            });
            textures.push(texture);
            ownership.requests++;
            ownership.pending++;
            const url = `${import.meta.env.BASE_URL}${base}/${name}`;
            let release = () => {
                /* Installed by the selected source loader below. */
            };
            const request = options.data
                ? (async () => {
                      const controller = new AbortController();
                      release = () => controller.abort();
                      releases.add(release);
                      const response = await fetch(url, { signal: controller.signal });
                      if (!response.ok) throw new Error(`Terrain map unavailable: ${name}`);
                      const blob = await response.blob();
                      if (destroyed) return;
                      const bitmap = await createImageBitmap(blob, {
                          premultiplyAlpha: 'none',
                          colorSpaceConversion: 'none',
                          imageOrientation: 'none'
                      });
                      releases.delete(release);
                      if (destroyed) {
                          bitmap.close();
                          return;
                      }
                      ownership.bitmaps++;
                      release = () => {
                          bitmap.close();
                          ownership.bitmaps--;
                      };
                      releases.add(release);
                      // Engine accepts ImageBitmap; the published overload omits it.
                      (texture.setSource as unknown as (source: ImageBitmap) => void)(bitmap);
                      loading.loadedMaps++;
                  })()
                : new Promise<void>((resolve, reject) => {
                      const image = new Image();
                      ownership.images++;
                      release = () => {
                          image.onload = image.onerror = null;
                          image.removeAttribute('src');
                          ownership.images--;
                          resolve();
                      };
                      releases.add(release);
                      image.onload = () => {
                          image.onload = image.onerror = null;
                          if (!destroyed) {
                              texture.setSource(image);
                              loading.loadedMaps++;
                          }
                          resolve();
                      };
                      image.onerror = () => reject(new Error(`Terrain map unavailable: ${name}`));
                      image.src = url;
                  });
            const ready = request
                .catch((error: unknown) => {
                    if (destroyed) return;
                    release();
                    releases.delete(release);
                    texture.destroy();
                    textures.splice(textures.indexOf(texture), 1);
                    resources.delete(name); // A later explicit demand may retry the failed URL.
                    throw error;
                })
                .finally(() => {
                    ownership.pending--;
                });
            void ready.catch(() => {
                /* The owning readiness promise presents failures. */
            }); // Callers own error presentation, even before awaiting readiness.
            const resource = { texture, ready };
            resources.set(name, resource);
            return resource;
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            ownership.destroyed = true;
            for (const release of releases) release();
            releases.clear();
            for (const texture of textures) texture.destroy();
            textures.length = 0;
            resources.clear();
        }
    };
}
