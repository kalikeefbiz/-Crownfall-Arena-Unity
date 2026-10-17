export const ARENA = { halfWidth: 9, halfLength: 16, radius: 0.4, speed: 5 };
export type Obstacle = { x: number; z: number; halfX: number; halfZ: number };
export const OBSTACLES: readonly Obstacle[] = [
    { x: -3, z: -3, halfX: 1.2, halfZ: 1 },
    { x: 3, z: 3, halfX: 1.2, halfZ: 1 },
    { x: -5, z: 7, halfX: 0.8, halfZ: 2 }
];
