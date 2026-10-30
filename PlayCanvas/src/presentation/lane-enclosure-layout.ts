// GOAL 018A: only this 26m section. Metres, PlayCanvas Y-up; foot elevations
// are sampled from the unchanged rendered terrain, then lowered by embed.
export const ENCLOSURE_SECTION = { start: { x: 0, z: -12 }, end: { x: 0, z: 14 }, length: 26 } as const;
export const ENCLOSURE_ROCKS = [
    { variant: 'rock_face_02', x: -9.8, z: -9.3, yaw: 78, scale: 1.55, embed: 1.15 },
    { variant: 'rock_face_02', x: -9.8, z: 5.1, yaw: 83, scale: 1.7, embed: 1.35 },
    { variant: 'rock_face_02', x: 10.6, z: -8.0, yaw: -91, scale: 1.7, embed: 1.3 },
    { variant: 'rock_face_02', x: 10.8, z: 8.1, yaw: -72, scale: 1.85, embed: 1.45 },
    { variant: 'rock_moss_set_02_rock11', x: -8.6, z: -6.8, yaw: 34, scale: 1.15, embed: 0.43 },
    { variant: 'rock_moss_set_02_rock09', x: -8.4, z: 1.8, yaw: 128, scale: 1.3, embed: 0.28 },
    { variant: 'rock_moss_set_02_rock13', x: -9.0, z: 8.1, yaw: 202, scale: 0.95, embed: 0.37 },
    { variant: 'rock_moss_set_02_rock09', x: 8.8, z: -4.2, yaw: 24, scale: 1.35, embed: 0.3 },
    { variant: 'rock_moss_set_02_rock11', x: 9.2, z: 4.8, yaw: 86, scale: 1.15, embed: 0.45 }
] as const;
export const ENCLOSURE_TREES = [
    { species: 'pine', x: -12.3, z: -9.8, height: 6.4, yaw: 61 },
    { species: 'oak', x: -13.0, z: -2.7, height: 5.8, yaw: 212 },
    { species: 'pine', x: 13.4, z: 8.8, height: 7.4, yaw: 296 }
] as const;
