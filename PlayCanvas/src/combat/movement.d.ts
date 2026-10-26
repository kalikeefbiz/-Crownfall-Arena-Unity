import type { CombatCommand, Point } from './combat';
export type MovementMap = {
    width: number;
    depth: number;
    walls: (Point & { w: number; d: number; h?: number })[];
};
export type MovementConfig = {
    tickRate: number;
    summoner: { radius: number; speed: number; spawn: Point };
};
export class MovementSimulation {
    constructor(config?: MovementConfig, map?: MovementMap);
    config: MovementConfig;
    map: MovementMap;
    tick: number;
    collisions: number;
    player: Point & { previous: Point; angle: number; animation: string; distance: number };
    reset(): void;
    blocked(x: number, z: number): boolean;
    step(command: CombatCommand, dt?: number): void;
}
export function clamp(value: number, min: number, max: number): number;
export function unit(x: number, z: number): Point;
export function circleHitsWall(x: number, z: number, radius: number, wall: MovementMap['walls'][number]): boolean;
export class LocalCommandSource {
    constructor(input: { read(): CombatCommand });
    read(tick: number): CombatCommand & { tick: number };
}
