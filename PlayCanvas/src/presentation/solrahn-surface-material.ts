import { ADDRESS_CLAMP_TO_EDGE, Color, StandardMaterial, isCompressedPixelFormat } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import atlas from '../../public/assets/solrahn-surface/low-atlas.json';
import manifest from '../../public/assets/solrahn-surface/materials.json';
import weights from '../../public/assets/solrahn-surface/weights.json';

import { terrainTextures } from './terrain-textures';

// One pass: baked color/roughness + tile detail on Low; four PBR families on High.
// sRGB is decoded by color textures' GPU format; all arithmetic below is linear.
export function createSolrahnSurfaceMaterial(app: AppBase) {
    const maps = terrainTextures(app, 'assets/solrahn-surface');
    let destroyed = false;
    let requestedLow = false;
    try {
        requestedLow = localStorage.getItem('crownfall.quality') === 'low';
    } catch {
        /* Optional storage. */
    }
    let appliedLow: boolean | undefined;
    let highPending: Promise<void> | undefined;
    let highLoaded = false;
    let materialUpdates = 0;
    const weight = maps.load('weights.png', false, {
        width: 1200,
        height: 900,
        flipY: false,
        clamp: ADDRESS_CLAMP_TO_EDGE,
        data: true,
        anisotropy: 1
    });
    const baked = maps.load('low_atlas.webp', true, {
        width: 1024,
        height: 768,
        flipY: false,
        clamp: ADDRESS_CLAMP_TO_EDGE,
        data: true,
        anisotropy: 1
    });
    // Low needs tiled dirt detail and the visible outer rock skirt. Other families
    // and all normal/AO maps are first requested by an explicit High demand.
    const dirt = maps.load(`${manifest.sources[0].asset}_color.webp`, true, { anisotropy: 1 });
    const rock = maps.load(`${manifest.sources[3].asset}_color.webp`, true, { anisotropy: 1 });
    const colors = [dirt.texture, dirt.texture, dirt.texture, rock.texture];
    const normals: typeof colors = [];
    const mat = new StandardMaterial();
    mat.name = 'GOAL-017-four-layer-PBR';
    mat.diffuse = new Color(1, 1, 1);
    mat.diffuseMap = colors[0]; // Enables UV and standard lit material generation.
    mat.normalMap = null;
    mat.aoMap = null;
    mat.useMetalness = true;
    mat.metalness = 0;
    mat.gloss = 1;
    mat.shaderChunksVersion = '2.23';
    const chunks = mat.getShaderChunks('glsl');
    const highDiffuse = `
        uniform sampler2D surfaceWeights;
        uniform sampler2D surfaceColor0, surfaceColor1, surfaceColor2, surfaceColor3;
        uniform float surfaceDebug;
        vec4 surfaceW;
        float surfaceRough;
        float surfaceAO;
        vec2 surfaceUV;
        void getAlbedo() {
            vec2 uv = vec2(.5-vPositionW.z/160.0, .5+vPositionW.x/120.0);
            uv = (uv*vec2(1199.0,899.0)+.5)/vec2(1200.0,900.0);
            surfaceW = max(texture2D(surfaceWeights, uv), vec4(0.0));
            surfaceW /= max(dot(surfaceW,vec4(1.0)), .00001);
            surfaceUV = vUv0;
            surfaceRough = .9;
            if (surfaceDebug > .5) {
                float layer = surfaceDebug < 1.5 ? surfaceW.r : surfaceDebug < 2.5 ? surfaceW.g : surfaceDebug < 3.5 ? surfaceW.b : surfaceW.a;
                dAlbedo = surfaceDebug < 4.5 ? vec3(layer) :
                    surfaceW.r*vec3(.62,.35,.17)+surfaceW.g*vec3(.32,.43,.16)+surfaceW.b*vec3(.10,.26,.17)+surfaceW.a*vec3(.5);
                return;
            }
            vec4 colorRough = texture2D(surfaceColor0,surfaceUV)*surfaceW.r
                +texture2D(surfaceColor1,surfaceUV)*surfaceW.g
                +texture2D(surfaceColor2,surfaceUV)*surfaceW.b
                +texture2D(surfaceColor3,surfaceUV)*surfaceW.a;
            dAlbedo = colorRough.rgb;
            surfaceRough = colorRough.a;
        }
    `;
    const lowDiffuse = `
        uniform sampler2D surfaceWeights, surfaceAtlas, surfaceColor0;
        uniform float surfaceDebug;
        vec4 surfaceW;
        float surfaceRough;
        float surfaceAO;
        vec2 surfaceUV;
        void getAlbedo() {
            vec2 uv=vec2(.5-vPositionW.z/160.0,.5+vPositionW.x/120.0);
            surfaceUV=vUv0;
            surfaceRough=.9;
            if(surfaceDebug>.5) {
                vec2 wuv=(uv*vec2(1199.0,899.0)+.5)/vec2(1200.0,900.0);
                surfaceW=max(texture2D(surfaceWeights,wuv),vec4(0.0));
                surfaceW/=max(dot(surfaceW,vec4(1.0)),.00001);
                float layer=surfaceDebug<1.5?surfaceW.r:surfaceDebug<2.5?surfaceW.g:surfaceDebug<3.5?surfaceW.b:surfaceW.a;
                dAlbedo=surfaceDebug<4.5?vec3(layer):surfaceW.r*vec3(.62,.35,.17)+surfaceW.g*vec3(.32,.43,.16)+surfaceW.b*vec3(.10,.26,.17)+surfaceW.a*vec3(.5);
                return;
            }
            vec2 auv=(uv*vec2(1023.0,767.0)+.5)/vec2(1024.0,768.0);
            vec4 colorRough=texture2D(surfaceAtlas,auv);
            vec3 detail=texture2D(surfaceColor0,surfaceUV).rgb;
            float luminance=dot(detail,vec3(.2126,.7152,.0722));
            float modulation=mix(1.0,clamp(luminance/${atlas.detailMeanLuminance},${atlas.detailClamp[0]},${atlas.detailClamp[1]}),${atlas.detailStrength});
            dAlbedo=colorRough.rgb*modulation;
            surfaceRough=colorRough.a;
        }
    `;
    chunks.set('diffusePS', highDiffuse);
    const highNormal = `
        uniform sampler2D surfaceNormal0, surfaceNormal1, surfaceNormal2, surfaceNormal3;
        void getNormal() {
            surfaceAO = 1.0;
            if (surfaceDebug > .5) { dNormalW = dVertexNormalW; return; }
            vec4 normalAO = texture2D(surfaceNormal0,surfaceUV)*surfaceW.r
                +texture2D(surfaceNormal1,surfaceUV)*surfaceW.g
                +texture2D(surfaceNormal2,surfaceUV)*surfaceW.b
                +texture2D(surfaceNormal3,surfaceUV)*surfaceW.a;
            dNormalW = normalize(dTBN * normalize(normalAO.rgb*2.0-1.0));
            surfaceAO = normalAO.a;
        }
    `;
    const lowNormal = 'void getNormal() { dNormalW = dVertexNormalW; surfaceAO = 1.0; }';
    chunks.set('normalMapPS', highNormal);
    chunks.set('glossPS', 'void getGlossiness() { dGlossiness = 1.0-clamp(surfaceRough,.64,.98)+.0000001; }');
    chunks.set('aoPS', 'void getAO() { dAo = surfaceDebug > .5 ? 1.0 : surfaceAO; }');
    mat.setParameter('surfaceWeights', weight.texture);
    mat.setParameter('surfaceAtlas', baked.texture);
    colors.forEach((t, i) => mat.setParameter(`surfaceColor${i}`, t));
    normals.forEach((t, i) => mat.setParameter(`surfaceNormal${i}`, t));
    mat.setParameter('surfaceDebug', 0);
    mat.update();
    // The existing vertical outer skirt uses rock with face-aligned UVs; no new mesh.
    const skirt = new StandardMaterial();
    skirt.name = 'GOAL-017-outer-cut-rock';
    skirt.diffuseMap = colors[3];
    skirt.normalMap = normals[3];
    skirt.glossMap = colors[3];
    skirt.glossMapChannel = 'a';
    skirt.glossInvert = true;
    skirt.gloss = 1;
    skirt.aoMap = normals[3];
    skirt.aoMapChannel = 'a';
    skirt.useMetalness = true;
    skirt.metalness = 0;
    skirt.update();
    const apply = (low: boolean) => {
        if (destroyed || appliedLow === low) return;
        appliedLow = low;
        materialUpdates++;
        // Keep trilinear mip filtering and both Low texture reads. SwiftShader
        // ablation isolated the additional anisotropic taps as a material cost.
        // Restore the original cap for High without rebuilding shader source.
        for (const texture of maps.textures)
            texture.anisotropy = Math.min(low ? 1 : 4, app.graphicsDevice.maxAnisotropy);
        chunks.set('diffusePS', low ? lowDiffuse : highDiffuse);
        chunks.set('normalMapPS', low ? lowNormal : highNormal);
        // Rough Low terrain uses diffuse lighting with geometry normals. Avoid
        // metallic F0/specular BRDF work; High retains its original roughness path.
        mat.useMetalness = !low;
        mat.normalMap = low ? null : normals[0];
        mat.aoMap = low ? null : normals[0];
        colors.forEach((t, i) => mat.setParameter(`surfaceColor${i}`, t));
        normals.forEach((t, i) => mat.setParameter(`surfaceNormal${i}`, t));
        mat.update();
        skirt.useMetalness = !low;
        skirt.normalMap = low ? null : normals[3];
        skirt.aoMap = low ? null : normals[3];
        skirt.update();
    };
    const demandHigh = () => {
        if (highPending) return highPending;
        maps.loading.state = 'loading';
        maps.loading.error = '';
        const colorMaps = manifest.sources.map((s) => maps.load(`${s.asset}_color.webp`, true));
        const normalMaps = manifest.sources.map((s) => maps.load(`${s.asset}_normal.webp`, false));
        highPending = Promise.all([...colorMaps, ...normalMaps].map((r) => r.ready))
            .then(() => {
                if (destroyed) return;
                colorMaps.forEach((r, i) => {
                    colors[i] = r.texture;
                });
                normalMaps.forEach((r, i) => {
                    normals[i] = r.texture;
                });
                highLoaded = true;
                maps.loading.state = 'loaded';
                if (!requestedLow) apply(false);
            })
            .catch((error: unknown) => {
                highPending = undefined;
                if (!destroyed) {
                    maps.loading.state = 'error';
                    maps.loading.error = String(error);
                }
                throw error;
            });
        void highPending.catch(() => {
            /* Diagnostics expose a deferred High failure; explicit High demand retries it. */
        });
        return highPending;
    };
    apply(true); // A valid Low material remains visible throughout an asynchronous High load.
    const lowReady = Promise.all([weight.ready, baked.ready, dirt.ready, rock.ready]);
    const ready = Promise.all([lowReady, requestedLow ? Promise.resolve() : demandHigh()]).then(
        () => {
            if (!destroyed) maps.loading.state = 'loaded';
        },
        (error: unknown) => {
            if (!destroyed) {
                maps.loading.state = 'error';
                maps.loading.error = String(error);
            }
            throw error;
        }
    );
    void ready.catch(() => {
        /* Scene readiness owns initial failure and the existing retry UI. */
    });
    return {
        mat,
        skirt,
        ready,
        quality(low: boolean) {
            requestedLow = low;
            if (destroyed) return;
            if (low) apply(true);
            else if (highLoaded) apply(false);
            else void demandHigh();
        },
        debug(mode: number) {
            mat.setParameter('surfaceDebug', mode);
        },
        get diagnostics() {
            return {
                ...maps.loading,
                ownership: maps.ownership,
                layerEncoding: weights.encoding,
                weightsSha256: weights.files['weights.png'].sha256,
                tileMetres: 6,
                textures: maps.textures.length,
                gpuBytes: maps.textures.reduce((n, t) => n + t.gpuSize, 0),
                shader: {
                    terrainPasses: 1,
                    maximumTextureReads: appliedLow ? 2 : 9,
                    samplers: appliedLow ? 3 : 9,
                    lowAtlasSha256: atlas.file.sha256,
                    detailNormals: !appliedLow,
                    requestedLow,
                    highLoaded,
                    materialUpdates,
                    displacement: false
                },
                formats: maps.textures.map((t) => ({
                    name: t.name,
                    width: t.width,
                    height: t.height,
                    format: t.format,
                    gpuBytes: t.gpuSize,
                    mipmaps: t.mipmaps,
                    levels: t.numLevels,
                    anisotropy: t.anisotropy,
                    compressed: isCompressedPixelFormat(t.format),
                    srgb: t.srgb
                }))
            };
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            mat.destroy();
            skirt.destroy();
            maps.destroy();
        }
    };
}
