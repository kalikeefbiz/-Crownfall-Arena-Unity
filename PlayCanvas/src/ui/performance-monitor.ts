export type PerformanceView = {
    low: boolean;
    width: number;
    height: number;
    surfaceState: string;
    appliedLow: boolean;
};

// Bounded wall-time samples; no renderer queries, logging or extra animation loop.
export class FrameWindow {
    private times = new Float64Array(2048);
    private durations = new Float64Array(2048);
    private head = 0;
    private size = 0;
    private previous: number | undefined;
    private since = 0;
    private frames = 0;

    reset() {
        this.head = this.size = this.frames = 0;
        this.previous = undefined;
    }

    record(now: number) {
        if (this.previous === undefined) {
            this.previous = this.since = now;
            return null;
        }
        const ms = now - this.previous;
        this.previous = now;
        if (ms <= 0) return null;
        this.times[this.head] = now;
        this.durations[this.head] = ms;
        this.head = (this.head + 1) % this.times.length;
        this.size = Math.min(this.size + 1, this.times.length);
        this.frames++;
        const elapsed = now - this.since;
        if (elapsed < 1000) return null;
        const sorted: number[] = [];
        for (let n = 0; n < this.size; n++) {
            const i = (this.head - 1 - n + this.times.length) % this.times.length;
            if (now - this.times[i] > 10000) break;
            sorted.push(this.durations[i]);
        }
        sorted.sort((a, b) => a - b);
        const result = {
            fps: (this.frames * 1000) / elapsed,
            meanMs: elapsed / this.frames,
            p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)],
            samples: sorted.length
        };
        this.frames = 0;
        this.since = now;
        return result;
    }
}

export function createPerformanceMonitor(view: () => PerformanceView, quality: (low: boolean) => void) {
    const root = document.createElement('aside');
    root.id = 'performance-monitor';
    root.setAttribute('aria-label', 'Performance monitor');
    root.hidden = true;
    root.innerHTML = `<button class="perf-toggle" aria-expanded="true" aria-controls="performance-values">Hide performance ▴</button><div id="performance-values"><div class="perf-timing">FPS — · mean — ms<br>p95 — ms (10s)</div><div class="perf-quality"></div><div class="perf-heap" hidden></div><div class="perf-buttons"><button data-quality="low">Low</button><button data-quality="high">High</button></div><div class="perf-status" role="status"></div></div>`;
    document.body.append(root);
    const toggle = root.querySelector<HTMLButtonElement>('.perf-toggle')!;
    const values = root.querySelector<HTMLElement>('#performance-values')!;
    const timing = root.querySelector<HTMLElement>('.perf-timing')!;
    const label = root.querySelector<HTMLElement>('.perf-quality')!;
    const status = root.querySelector<HTMLElement>('.perf-status')!;
    const heap = root.querySelector<HTMLElement>('.perf-heap')!;
    const samples = new FrameWindow();
    const abort = new AbortController();
    let active = false;
    let expanded = true;
    const refresh = () => {
        const state = view();
        const requested = state.low ? 'Low' : 'High';
        const applied = state.appliedLow ? 'Low' : 'High';
        label.textContent = `${applied} · ${state.width} × ${state.height}`;
        status.textContent =
            state.surfaceState === 'error'
                ? `${requested} unavailable · tap to retry`
                : state.surfaceState === 'loading'
                  ? `Loading ${requested}…`
                  : '';
        for (const b of root.querySelectorAll<HTMLButtonElement>('[data-quality]'))
            b.setAttribute('aria-pressed', String((b.dataset.quality === 'low') === state.low));
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        heap.hidden = !Number.isFinite(memory?.usedJSHeapSize);
        if (!heap.hidden) heap.textContent = `JS heap ${(memory!.usedJSHeapSize / 1048576).toFixed(1)} MiB`;
    };
    const reset = () => {
        samples.reset();
        timing.innerHTML = 'FPS — · mean — ms<br>p95 — ms (10s)';
        if (active && expanded) refresh();
    };
    toggle.addEventListener(
        'click',
        () => {
            expanded = !expanded;
            values.hidden = !expanded;
            toggle.setAttribute('aria-expanded', String(expanded));
            toggle.textContent = expanded ? 'Hide performance ▴' : 'Show performance ▾';
            reset();
        },
        { signal: abort.signal }
    );
    root.addEventListener(
        'click',
        (event) => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-quality]');
            if (!button) return;
            quality(button.dataset.quality === 'low');
            reset();
        },
        { signal: abort.signal }
    );
    for (const name of ['pointerdown', 'pointerup', 'pointercancel', 'keydown'])
        root.addEventListener(name, (event) => event.stopPropagation(), { signal: abort.signal });
    document.addEventListener('visibilitychange', reset, { signal: abort.signal });
    return {
        frame(now: number) {
            if (!active || !expanded || document.hidden) return;
            const result = samples.record(now);
            if (!result) return;
            timing.innerHTML = `FPS ${result.fps.toFixed(1)} · mean ${result.meanMs.toFixed(1)} ms<br>p95 ${result.p95Ms.toFixed(1)} ms (10s)`;
            refresh();
        },
        active(value: boolean) {
            active = value;
            root.hidden = !value;
            reset();
        },
        reset,
        destroy() {
            abort.abort();
            root.remove();
        }
    };
}
