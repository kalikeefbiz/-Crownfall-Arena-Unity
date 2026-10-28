import type { ContainerResource, Entity, RenderComponent } from 'playcanvas';

import type { SolrahnSurface } from '../maps/solrahn';
import { SOLRAHN_ASSET, SOLRAHN_TRANSFORM } from '../maps/solrahn';

import type { SummonerAssets } from './summoner-assets';

export function createSolrahnEnvironment(parent: Entity, assets: SummonerAssets, surface: SolrahnSurface) {
    let model: Entity | null = null;
    let destroyed = false;
    let state = 'loading';
    const ready = assets.load(SOLRAHN_ASSET, 240000).then((asset) => {
        if (destroyed) return;
        model = (asset.resource as ContainerResource).instantiateRenderEntity();
        model.name = 'Solrahn-authored-three-lane';
        model.setLocalScale(80, 80, 80);
        model.setLocalPosition(0, 8, 0);
        parent.addChild(model);
        for (const render of model.findComponents('render') as RenderComponent[])
            for (const mesh of render.meshInstances) mesh.castShadow = false;
        state = 'loaded';
    });
    // Keep the rejection observable by the existing readiness screen.
    void ready.catch(() => {
        state = 'error';
    });
    return {
        ready,
        get loading() {
            return state === 'loading';
        },
        get diagnostics() {
            return {
                mode: 'solrahn-authored',
                state,
                transform: SOLRAHN_TRANSFORM,
                triangles: 5568924,
                meshInstances: 1,
                surface: surface.metadata,
                activeObjectives: surface.camps,
                inactiveObjectives: surface.futureObjectives,
                navigation: 'middle lane and connected adjacent Wilderness only'
            };
        },
        quality(_low: boolean) {
            /* Authored material is preserved. Resolution is controlled by the game. */
        },
        groundActor(_parent: Entity) {
            /* Grounding uses the shared authoritative surface each frame. */
        },
        update(_active: boolean) {
            /* The continuous authored environment is static. */
        },
        destroy() {
            destroyed = true;
            model?.destroy();
        }
    };
}
