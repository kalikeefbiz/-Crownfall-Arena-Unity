import { Asset } from 'playcanvas';
import type { AppBase } from 'playcanvas';

import type { Simulation } from '../gameplay/simulation';

// Both the local input adapter and AI combat authority can supply this read-only view.
export type ModelFrame = Pick<Simulation, 'combat' | 'match' | 'aim' | 'movement' | 'facing'>;
type Normalization = {
    height: number;
    scale: number;
    offset: number[];
    bounds: { min: number[]; max: number[] };
};

// One owner for container lifetimes. Instances own their skeletons/controllers;
// the container retains shared meshes, textures, materials and source tracks.
export class SummonerAssets {
    private entries = new Map<string, { asset: Asset; promise: Promise<Asset>; state: string; loadMs: number }>();
    private bounds = new Map<string, Normalization>();
    private destroyed = false;
    constructor(privateApp: AppBase) {
        this.app = privateApp;
    }
    private app: AppBase;

    load(source: string): Promise<Asset> {
        const cached = this.entries.get(source);
        if (cached) return cached.promise;
        if (this.destroyed) return Promise.reject(new Error('Summoner assets disposed'));
        const asset = new Asset(source, 'container', { url: `${import.meta.env.BASE_URL}${source}` });
        const started = performance.now();
        const entry = { asset, promise: null as unknown as Promise<Asset>, state: 'loading', loadMs: 0 };
        entry.promise = new Promise<Asset>((resolve, reject) => {
            asset.once('load', () => {
                entry.state = 'loaded';
                entry.loadMs = performance.now() - started;
                resolve(asset);
            });
            asset.once('error', (error: unknown) => {
                entry.state = 'error';
                entry.loadMs = performance.now() - started;
                reject(error);
            });
        });
        this.entries.set(source, entry);
        this.app.assets.add(asset);
        this.app.assets.load(asset);
        return entry.promise;
    }

    normalization(source: string, calculate: () => Normalization) {
        let value = this.bounds.get(source);
        if (!value) {
            value = calculate();
            this.bounds.set(source, value);
        }
        return value;
    }

    snapshot() {
        return {
            downloads: this.entries.size,
            boundCalculations: this.bounds.size,
            assets: [...this.entries].map(([source, entry]) => ({ source, state: entry.state, loadMs: entry.loadMs })),
            gpu: { ...this.app.graphicsDevice._vram }
        };
    }

    destroy() {
        this.destroyed = true;
        for (const { asset } of this.entries.values()) {
            // Detach callbacks before unloading an in-flight request. The loader can
            // finish later; remove/unload that late resource as well.
            if (!asset.loaded) asset.once('load', () => asset.unload());
            this.app.assets.remove(asset);
            asset.unload();
        }
        this.entries.clear();
        this.bounds.clear();
    }
}
