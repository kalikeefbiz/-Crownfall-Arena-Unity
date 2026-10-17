export type Vec = { x: number; z: number };
export const length = (v: Vec): number => Math.hypot(v.x, v.z);
export function clampVector(v: Vec): Vec {
    if (!Number.isFinite(v.x) || !Number.isFinite(v.z)) return { x: 0, z: 0 };
    const scale = Math.max(1, length(v));
    return { x: v.x / scale, z: v.z / scale };
}
export function direction(v: Vec): Vec {
    const size = length(v);
    return size > 0.0001 ? { x: v.x / size, z: v.z / size } : { x: 0, z: 0 };
}
