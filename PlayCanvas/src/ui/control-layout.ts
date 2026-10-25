export const controlIds = ['move', 'aim', 'basic', 'skill1', 'skill2', 'ultimate', 'special'] as const;
export type ControlId = (typeof controlIds)[number];
export type Placement = { x: number; y: number; scale: number; opacity: number };
export type Layout = Record<ControlId, Placement>;
export const layoutKey = 'crownfall.controls.v1';
export function defaultLayout(): Layout {
    return Object.fromEntries(
        controlIds.map((id, i) => [
            id,
            {
                x: [0.1, 0.29, 0.91, 0.57, 0.68, 0.79, 0.92][i],
                y: i === 6 ? 0.48 : 0.79,
                scale: 1,
                opacity: 0.85
            }
        ])
    ) as Layout;
}
export function parseLayout(raw: string | null): Layout {
    const defaults = defaultLayout();
    try {
        const value = JSON.parse(raw || 'null');
        if (!value || value.version !== 1) return defaults;
        for (const id of controlIds) {
            const v = value.controls?.[id];
            if (
                !v ||
                !['x', 'y', 'scale', 'opacity'].every((k) => Number.isFinite(v[k])) ||
                v.x < 0 ||
                v.x > 1 ||
                v.y < 0 ||
                v.y > 1 ||
                v.scale < 0.8 ||
                v.scale > 1.35 ||
                v.opacity < 0.35 ||
                v.opacity > 1
            )
                return defaults;
        }
        return structuredClone(value.controls);
    } catch {
        return defaults;
    }
}
export function readLayout() {
    try {
        return parseLayout(localStorage.getItem(layoutKey));
    } catch {
        return defaultLayout();
    }
}
export function safeRect() {
    const probe = document.createElement('div');
    probe.style.cssText =
        'position:fixed;padding:var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left)';
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const left = Math.max(12, parseFloat(s.paddingLeft) || 0),
        top = Math.max(105, parseFloat(s.paddingTop) || 0);
    const right = Math.max(12, parseFloat(s.paddingRight) || 0),
        bottom = Math.max(12, parseFloat(s.paddingBottom) || 0);
    probe.remove();
    return { left, top, width: innerWidth - left - right, height: Math.max(90, innerHeight - top - bottom) };
}
export function resolvedLayout(layout: Layout) {
    const rect = safeRect();
    const placed: { id: ControlId; x: number; y: number; size: number; opacity: number }[] = [];
    for (const id of controlIds) {
        const v = layout[id];
        const base = id === 'move' ? 80 : id === 'aim' ? 56 : id === 'basic' ? 68 : 54;
        const size = Math.max(44, Math.min(base * v.scale, rect.width / 7 - 4, rect.height / 2 - 4));
        const clampX = (x: number) => Math.max(rect.left + size / 2, Math.min(rect.left + rect.width - size / 2, x));
        const clampY = (y: number) => Math.max(rect.top + size / 2, Math.min(rect.top + rect.height - size / 2, y));
        let x = clampX(rect.left + v.x * rect.width),
            y = clampY(rect.top + v.y * rect.height);
        const free = (px: number, py: number) =>
            placed.every(
                (p) => Math.abs(p.x - px) >= (size + p.size) / 2 + 4 || Math.abs(p.y - py) >= (size + p.size) / 2 + 4
            );
        if (!free(x, y)) {
            const candidates = [];
            for (let cy = rect.top + size / 2; cy <= rect.top + rect.height - size / 2; cy += 8)
                for (let cx = rect.left + size / 2; cx <= rect.left + rect.width - size / 2; cx += 8)
                    if (free(cx, cy)) candidates.push({ x: cx, y: cy, distance: Math.hypot(cx - x, cy - y) });
            candidates.sort((a, b) => a.distance - b.distance);
            if (candidates[0]) ({ x, y } = candidates[0]);
        }
        placed.push({ id, x, y, size, opacity: v.opacity });
    }
    return placed;
}
export function place(element: HTMLElement, p: ReturnType<typeof resolvedLayout>[number]) {
    Object.assign(element.style, {
        position: 'fixed',
        left: `${p.x - p.size / 2}px`,
        top: `${p.y - p.size / 2}px`,
        right: 'auto',
        bottom: 'auto',
        width: `${p.size}px`,
        height: `${p.size}px`,
        opacity: String(p.opacity)
    });
}
export function applyControlLayout() {
    if (!document.body.classList.contains('official')) return;
    for (const p of resolvedLayout(readLayout())) {
        const selector =
            p.id === 'move' || p.id === 'aim' ? `#${p.id}` : `.ability[data-slot="${controlIds.indexOf(p.id) - 2}"]`;
        const el = document.querySelector<HTMLElement>(selector);
        if (el) {
            if (p.id === 'aim') el.hidden = false;
            place(el, p);
        }
    }
}
