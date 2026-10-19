import type { Ability } from '../combat/combat';
import { clampGroundTarget } from '../combat/modifiers.js';
import type { Vec } from '../gameplay/vector';

export type AbilityPreview = {
    kind: string;
    range: number;
    width: number;
    radius: number;
    arc: number;
    origin: Vec;
    center: Vec;
    angle: number;
    outlines: Vec[][];
};
const point = (origin: Vec, angle: number, distance: number): Vec => ({
    x: origin.x + Math.sin(angle) * distance,
    z: origin.z + Math.cos(angle) * distance
});
const circle = (center: Vec, radius: number): Vec[] =>
    Array.from({ length: 49 }, (_, i) => point(center, (i / 48) * Math.PI * 2, radius));
export function abilityPreview(ability: Ability, origin: Vec, angle: number, targetOffset?: Vec): AbilityPreview {
    const range = ability.range || 0,
        width = ability.width || 0,
        arc = ability.angle || 0;
    const shape: AbilityPreview = {
        kind: ability.aim,
        range,
        width,
        arc,
        radius: 0,
        origin: { ...origin },
        center: { ...origin },
        angle,
        outlines: []
    };
    if (ability.aim === 'cone') {
        shape.outlines = [
            [
                origin,
                ...Array.from({ length: 33 }, (_, i) => point(origin, angle - arc / 2 + (i / 32) * arc, range)),
                origin
            ]
        ];
    } else if (ability.aim === 'radial') {
        shape.radius = range;
        shape.outlines = [circle(origin, range)];
    } else if (ability.aim === 'ground') {
        const requested = targetOffset
            ? { x: origin.x + targetOffset.x, z: origin.z + targetOffset.z }
            : point(origin, angle, range * 0.65);
        shape.center = clampGroundTarget(origin, requested, range);
        shape.radius = ability.radius || 0;
        shape.outlines = [circle(origin, range), circle(shape.center, shape.radius)];
    } else if (ability.aim === 'line') {
        const end = point(origin, angle, range),
            left = angle - Math.PI / 2,
            right = angle + Math.PI / 2;
        shape.outlines = [
            [
                point(origin, left, width),
                point(end, left, width),
                point(end, right, width),
                point(origin, right, width),
                point(origin, left, width)
            ],
            [origin, end],
            circle(origin, width),
            circle(end, width)
        ];
    } else {
        shape.kind = 'self';
        shape.outlines = [circle(origin, 0.65)];
    }
    return shape;
}
