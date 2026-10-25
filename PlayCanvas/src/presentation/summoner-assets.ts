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
    private entries = new Map<
        string,
        { asset: Asset; promise: Promise<Asset>; state: string; loadMs: number; cancel(): void }
    >();
    private bounds = new Map<string, Normalization>();
    private destroyed = false;
    private abort = new AbortController();
    constructor(privateApp: AppBase) {
        this.app = privateApp;
    }
    private app: AppBase;

    load(source: string): Promise<Asset> {
        const cached = this.entries.get(source);
        if (cached) return cached.promise;
        if (this.destroyed) return Promise.reject(new Error('Summoner assets disposed'));
        const parsing = {
            skipMeshes: false,
            image: {
                processAsync: (_image: unknown, done: (error: Error | null, texture: Asset | null) => void) => {
                    // The engine defers its contents handoff. Disposal can happen
                    // after fetch completes but before that queued parse starts.
                    done(this.destroyed ? new Error('Summoner assets disposed') : null, null);
                }
            }
        };
        const asset = new Asset(source, 'container', { url: `${import.meta.env.BASE_URL}${source}` });
        asset.options = parsing;
        const file = asset.file as { url: string; contents: ArrayBuffer | null };
        const started = performance.now();
        const entry = {
            asset,
            promise: null as unknown as Promise<Asset>,
            state: 'loading',
            loadMs: 0,
            cancel: () => {
                // Replaced synchronously by the promise constructor below.
            }
        };
        entry.promise = new Promise<Asset>((resolve, reject) => {
            entry.cancel = () => {
                parsing.skipMeshes = true;
                reject(new Error('Summoner assets disposed'));
            };
            asset.once('load', () => {
                file.contents = null;
                entry.state = 'loaded';
                entry.loadMs = performance.now() - started;
                resolve(asset);
            });
            asset.once('error', (error: unknown) => {
                file.contents = null;
                entry.state = 'error';
                entry.loadMs = performance.now() - started;
                reject(error);
            });
        });
        this.entries.set(source, entry);
        this.app.assets.add(asset);
        // Own the network lifetime. The engine's container request cannot be
        // cancelled by asset.unload(): a late response would parse against an
        // already-destroyed registry. Feed the same bytes to its normal parser.
        void fetch(file.url, { signal: this.abort.signal })
            .then((response) => {
                if (!response.ok) throw new Error(`Asset request failed: ${response.status}`);
                return response.arrayBuffer();
            })
            .then((contents) => {
                if (this.destroyed) return;
                file.contents = contents;
                this.app.assets.load(asset);
            })
            .catch((error: unknown) => {
                if (!this.destroyed) asset.fire('error', error);
            });
        return entry.promise;
    }

    // Large optional props can wait for the current character loads without
    // competing with their decode/upload work. Failures still release the queue.
    settled() {
        return Promise.allSettled([...this.entries.values()].map((entry) => entry.promise));
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
        if (this.destroyed) return;
        this.destroyed = true;
        this.abort.abort();
        for (const { asset, cancel } of this.entries.values()) {
            cancel();
            // Parsing may already have started. Presenters are disposed first;
            // unload any container that completes after scene-only disposal.
            if (!asset.loaded) asset.once('load', () => asset.unload());
            this.app.assets.remove(asset);
            asset.unload();
        }
        this.entries.clear();
        this.bounds.clear();
    }
}
