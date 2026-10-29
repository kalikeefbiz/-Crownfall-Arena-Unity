import { ADDRESS_CLAMP_TO_EDGE, Color, StandardMaterial } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import manifest from '../../public/assets/solrahn-surface/materials.json';
import weights from '../../public/assets/solrahn-surface/weights.json';

import { terrainTextures } from './terrain-textures';

// One pass, nine samplers/reads: weights + four color/rough + four normal/AO.
// sRGB is decoded by color textures' GPU format; all arithmetic below is linear.
export function createSolrahnSurfaceMaterial(app: AppBase) {
    const maps = terrainTextures(app, 'assets/solrahn-surface');
    const pending: Promise<void>[] = [];
    const load = (name: string, srgb: boolean, isWeight = false) => {
        const result = maps.load(
            name,
            srgb,
            isWeight ? { width: 1200, height: 900, flipY: false, clamp: ADDRESS_CLAMP_TO_EDGE, data: true } : {}
        );
        pending.push(result.ready);
        return result.texture;
    };
    const weight = load('weights.png', false, true);
    const colors = manifest.sources.map((s) => load(`${s.asset}_color.webp`, true));
    const normals = manifest.sources.map((s) => load(`${s.asset}_normal.webp`, false));
    const mat = new StandardMaterial();
    mat.name = 'GOAL-017-four-layer-PBR';
    mat.diffuse = new Color(1, 1, 1);
    mat.diffuseMap = colors[0]; // Enables UV and standard lit material generation.
    mat.normalMap = normals[0];
    mat.aoMap = normals[0];
    mat.useMetalness = true;
    mat.metalness = 0;
    mat.gloss = 1;
    mat.shaderChunksVersion = '2.23';
    const chunks = mat.getShaderChunks('glsl');
    chunks.set(
        'diffusePS',
        `
        uniform sampler2D surfaceWeights;
        uniform sampler2D surfaceColor0, surfaceColor1, surfaceColor2, surfaceColor3;
        uniform float surfaceDebug;
        vec4 surfaceW;
        float surfaceRough;
        float surfaceAO;
        vec2 surfaceUV;
        void getAlbedo() {
            // Both coordinates refer to the same source raster, including half texels.
            vec2 uv = vec2(.5-vPositionW.z/160.0, .5+vPositionW.x/120.0);
            uv = (uv*vec2(1199.0,899.0)+.5)/vec2(1200.0,900.0);
            surfaceW = max(texture2D(surfaceWeights, uv), vec4(0.0));
            surfaceW /= max(dot(surfaceW,vec4(1.0)), .00001);
            surfaceUV = vUv0;
            vec4 a = texture2D(surfaceColor0, surfaceUV);
            vec4 b = texture2D(surfaceColor1, surfaceUV);
            vec4 c = texture2D(surfaceColor2, surfaceUV);
            vec4 d = texture2D(surfaceColor3, surfaceUV);
            dAlbedo = a.rgb*surfaceW.r+b.rgb*surfaceW.g+c.rgb*surfaceW.b+d.rgb*surfaceW.a;
            surfaceRough = dot(vec4(a.a,b.a,c.a,d.a),surfaceW);
            if (surfaceDebug > .5) {
                float layer = surfaceDebug < 1.5 ? surfaceW.r : surfaceDebug < 2.5 ? surfaceW.g : surfaceDebug < 3.5 ? surfaceW.b : surfaceW.a;
                dAlbedo = surfaceDebug < 4.5 ? vec3(layer) :
                    surfaceW.r*vec3(.62,.35,.17)+surfaceW.g*vec3(.32,.43,.16)+surfaceW.b*vec3(.10,.26,.17)+surfaceW.a*vec3(.5);
            }
        }
    `
    );
    chunks.set(
        'normalMapPS',
        `
        uniform sampler2D surfaceNormal0, surfaceNormal1, surfaceNormal2, surfaceNormal3;
        void getNormal() {
            vec4 a=texture2D(surfaceNormal0,surfaceUV), b=texture2D(surfaceNormal1,surfaceUV);
            vec4 c=texture2D(surfaceNormal2,surfaceUV), d=texture2D(surfaceNormal3,surfaceUV);
            vec3 n=normalize((a.rgb*surfaceW.r+b.rgb*surfaceW.g+c.rgb*surfaceW.b+d.rgb*surfaceW.a)*2.0-1.0);
            dNormalW = surfaceDebug > .5 ? dVertexNormalW : normalize(dTBN*n);
            surfaceAO = dot(vec4(a.a,b.a,c.a,d.a),surfaceW);
        }
    `
    );
    chunks.set('glossPS', 'void getGlossiness() { dGlossiness = 1.0-clamp(surfaceRough,.64,.98)+.0000001; }');
    chunks.set('aoPS', 'void getAO() { dAo = surfaceDebug > .5 ? 1.0 : surfaceAO; }');
    mat.setParameter('surfaceWeights', weight);
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
    let destroyed = false;
    const ready = Promise.all(pending).then(
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
    // Environment readiness owns the rejection; attach now to avoid transient unhandled rejection.
    void ready.catch(() => {
        /* Readiness propagates this failure to the existing retry UI. */
    });
    return {
        mat,
        skirt,
        ready,
        debug(mode: number) {
            mat.setParameter('surfaceDebug', mode);
        },
        get diagnostics() {
            return {
                ...maps.loading,
                layerEncoding: weights.encoding,
                weightsSha256: weights.files['weights.png'].sha256,
                tileMetres: 6,
                textures: maps.textures.length,
                gpuBytes: maps.textures.reduce((n, t) => n + t.gpuSize, 0),
                shader: { terrainPasses: 1, textureReads: 9, samplers: 9, displacement: false },
                formats: maps.textures.map((t) => ({
                    name: t.name,
                    width: t.width,
                    height: t.height,
                    format: t.format,
                    gpuBytes: t.gpuSize,
                    mipmaps: t.mipmaps,
                    srgb: t.srgb
                }))
            };
        },
        destroy() {
            destroyed = true;
            mat.destroy();
            skirt.destroy();
            maps.destroy();
        }
    };
}
