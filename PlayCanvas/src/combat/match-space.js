import { MATCH_MAP, ARENA_LAYOUT } from './match-data.js';
// Reference X is territorial; world -Z is forward for Blue. Camera stays behind Blue.
export const referenceToWorld = ({ x, z }) => ({ x: z, z: -x });
export const worldToReference = ({ x, z }) => ({ x: -z, z: x });
export const MATCH_WORLD = Object.freeze({
    width: MATCH_MAP.depth,
    depth: MATCH_MAP.width,
    walls: MATCH_MAP.walls.map((w) => ({ ...referenceToWorld(w), w: w.d, d: w.w, h: w.h }))
});
export const matchSpawn = (team, slot) =>
    referenceToWorld({ x: (team === 1 ? -1 : 1) * ARENA_LAYOUT.spawnX, z: ARENA_LAYOUT.spawnOffsets[slot] });
// Fixed Blue heading: positive Z is behind, look-ahead points toward world -Z.
// Competitive distance is 21.3% above Task 005; training keeps its diagnostic framing.
export const CAMERA_OFFSET = Object.freeze({ y: 15.5, z: 18 });
export const CAMERA_LOOK_AHEAD = 4;
export const CAMERA_FOLLOW_RATE = 9;
export const TRAINING_CAMERA_OFFSET = Object.freeze({ y: 15, z: 12.5865 });
