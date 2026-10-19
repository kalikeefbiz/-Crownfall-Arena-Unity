export function referenceToWorld(p: { x: number; z: number }): { x: number; z: number };
export function worldToReference(p: { x: number; z: number }): { x: number; z: number };
export function matchSpawn(team: number, slot: number): { x: number; z: number };
export const MATCH_WORLD: {
    width: number;
    depth: number;
    walls: { x: number; z: number; w: number; d: number; h: number }[];
};
export const CAMERA_OFFSET: { y: number; z: number };
