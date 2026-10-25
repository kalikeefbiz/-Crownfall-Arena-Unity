// Art-only western showcase. Every solid silhouette remains outside the arena.
// The asymmetric groups leave the camps and the entire 64 x 68m arena open.
export const TREE_SPECIES = {
    maple: 'Meshy_AI_Maple_tree_1025062934_texture.glb',
    pine: 'Meshy_AI_Pine_tree_1025063153_texture.glb',
    oak: 'Meshy_AI_Red_oak_tree_1025063928_texture.glb',
    redwood: 'Meshy_AI_redwood_tree_1025061650_texture.glb'
} as const;
export const WILDERNESS_TREES = [
    { species: 'maple', x: -36.2, z: -6.4, height: 6.8, yaw: 24 },
    { species: 'maple', x: -36.1, z: 9.6, height: 6.1, yaw: 281 },
    { species: 'pine', x: -34.8, z: -12.5, height: 6.2, yaw: 82 },
    { species: 'pine', x: -35.1, z: 2.4, height: 5.4, yaw: 211 },
    { species: 'oak', x: -37.1, z: -0.8, height: 6.6, yaw: 52 },
    { species: 'redwood', x: -36.8, z: -10.1, height: 11.4, yaw: 137 }
] as const;

// Matches the existing Goal 009 outer bank, including its four-metre segments.
export function westernBankHeight(x: number, z: number) {
    const s = Math.floor((z + 34) / 4) * 4 - 34;
    const t = (z - s) / 4;
    const ridgeA = 1.5 + 0.6 * Math.sin(s * 0.51);
    const ridgeB = 1.5 + 0.6 * Math.sin((s + 4) * 0.51);
    const rings = [
        [0.01, -0.018, -0.018],
        [1.2, 0.65, 0.65],
        [3.4, ridgeA, ridgeB],
        [7, 0.3, 0.3]
    ];
    const out = -x - 32;
    for (let i = 1; i < rings.length; i++) {
        if (out <= rings[i][0]) {
            const a = rings[i - 1],
                b = rings[i];
            const u = (out - a[0]) / (b[0] - a[0]);
            // Goal 009's western bank uses the B-start / A-end diagonal.
            return u + t <= 1
                ? a[1] * (1 - u - t) + b[1] * u + a[2] * t
                : b[1] * (1 - t) + a[2] * (1 - u) + b[2] * (u + t - 1);
        }
    }
    return 0.3;
}
