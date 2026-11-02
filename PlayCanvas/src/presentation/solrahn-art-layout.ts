// Authored group rhythm along the full causeway. Deliberate gaps align with
// Wilderness saddles; no navigation, collision or objective positions are edited.
export const SOLRAHN_GROUPS = [
    { x: -11.8, z: -65, scale: 1.5, yaw: 73 },
    { x: 13.2, z: -59, scale: 1.7, yaw: -82 },
    { x: -12.4, z: -43, scale: 1.8, yaw: 92 },
    { x: 11.8, z: -34, scale: 1.4, yaw: -67 },
    { x: -12.2, z: -23, scale: 1.65, yaw: 68 },
    { x: 13.6, z: -17, scale: 1.9, yaw: -90 },
    { x: -11.2, z: -4, scale: 1.8, yaw: 86 },
    { x: 13.0, z: 10, scale: 1.6, yaw: -74 },
    { x: -12.8, z: 31, scale: 1.7, yaw: 77 },
    { x: 11.4, z: 37, scale: 1.8, yaw: -93 },
    { x: -11.7, z: 49, scale: 1.5, yaw: 66 },
    { x: 12.5, z: 61, scale: 1.85, yaw: -78 }
] as const;
const laneRocks = SOLRAHN_GROUPS.flatMap((g, i) => [
    { variant: 'rock_face_02', ...g, embed: g.scale * 0.72 },
    {
        variant: 'rock_face_02',
        x: g.x + Math.sign(g.x) * 1.1,
        z: g.z + 3.1,
        yaw: g.yaw + 31,
        scale: g.scale * 0.72,
        embed: g.scale * 0.48
    },
    {
        variant: 'rock_moss_set_02_rock09',
        x: g.x - Math.sign(g.x) * 2.1,
        z: g.z + 2.4,
        yaw: i * 71,
        scale: 1.15 + (i % 3) * 0.15,
        embed: 0.35
    },
    {
        variant: i % 2 ? 'rock_moss_set_02_rock11' : 'rock_moss_set_02_rock13',
        x: g.x - Math.sign(g.x) * 0.9,
        z: g.z - 3.2,
        yaw: i * 113,
        scale: 0.9 + (i % 3) * 0.18,
        embed: 0.42
    }
]);
// Keep tall crowns away from the causeway. Pine is retained; saturated oak is
// replaced with maple and redwood from the same approved source library.
export const SOLRAHN_TREES = [
    [-19, -68, 7.8, 'pine'],
    [24, -64, 9.5, 'redwood'],
    [-26, -61, 7, 'maple'],
    [-18, -46, 8, 'redwood'],
    [-25, -41, 7.3, 'pine'],
    [23, -43, 8, 'maple'],
    [30, -38, 9, 'pine'],
    [18, -29, 8.5, 'redwood'],
    [-24, -28, 7.8, 'maple'],
    [-30, -23, 10, 'pine'],
    [-20, -5, 8.5, 'pine'],
    [-26, 1, 10, 'redwood'],
    [27, -9, 7, 'maple'],
    [31, -3, 8, 'pine'],
    [19, 18, 9.2, 'redwood'],
    [26, 23, 7.3, 'pine'],
    [-29, 16, 8.3, 'maple'],
    [-21, 34, 8.5, 'redwood'],
    [-27, 39, 7.2, 'pine'],
    [25, 35, 7.7, 'maple'],
    [30, 43, 10, 'pine'],
    [19, 48, 8, 'pine'],
    [26, 61, 9, 'redwood'],
    [-26, 60, 7.8, 'maple'],
    [-17, 65, 8, 'pine'],
    [-29, 72, 9, 'redwood'],
    [29, 73, 8, 'pine']
].map(([x, z, height, species], i) => ({
    x: Number(x),
    z: Number(z),
    height: Number(height),
    species: species as 'pine' | 'maple' | 'redwood',
    yaw: (i * 137.5) % 360
}));

// GOAL 020: the twelve lane-side rock groups are removed; the enclosure wall replaces them.
void laneRocks;
export const SOLRAHN_ROCKS = [
    ...[
        [-27, 23],
        [-26, 27],
        [-16, 27],
        [-25, -19],
        [-27, -59],
        [26, -59],
        [27, 5],
        [26, 59],
        [-25, 59]
    ].map(([x, z], i) => ({
        variant: i % 2 ? 'rock_moss_set_02_rock13' : 'rock_moss_set_02_rock11',
        x,
        z,
        yaw: i * 79,
        scale: 1.5 + (i % 3) * 0.25,
        embed: 0.48
    }))
];
