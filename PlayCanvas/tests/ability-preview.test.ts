import { expect, test } from 'vitest';

import { KIT } from '../src/combat/combat-data.js';
import { RIVEN } from '../src/combat/riven-data.js';
import { SET } from '../src/combat/summoners.js';
import { Simulation } from '../src/gameplay/simulation';
import { abilityPreview } from '../src/presentation/ability-preview';
const origin = { x: 0, z: 5 };
test('cone uses its actual range and arc, not the old generic 2.8 metre line', () => {
    for (const definition of [KIT, SET]) {
        const ability = definition.abilities[0];
        const p = abilityPreview(ability, origin, Math.PI);
        expect(p.range).toBe(ability.range);
        expect(p.arc).toBe(ability.angle);
        expect(p.outlines[0][17].z).toBeCloseTo(origin.z - ability.range!);
    }
});
test('line/dash width, radial radius and ground clamping read authoritative ability data', () => {
    const dash = abilityPreview(KIT.abilities[1], origin, Math.PI);
    expect(dash.range).toBe(7);
    expect(dash.width).toBe(0.65);
    const ring = abilityPreview(KIT.abilities[2], origin, 0);
    expect(ring.radius).toBe(3.5);
    expect(ring.center).toEqual(origin);
    const fist = abilityPreview(SET.abilities[3], origin, 0, { x: 30, z: 40 });
    expect(Math.hypot(fist.center.x - origin.x, fist.center.z - origin.z)).toBeCloseTo(14);
    expect(fist.radius).toBe(3);
    const blades = abilityPreview(RIVEN.abilities[0], origin, Math.PI);
    expect(blades.range).toBe(8);
    expect(blades.width).toBe(0.4);
});

test('reset and character selection align visible idle facing with cast facing and clear an old presentation lock', () => {
    const s = new Simulation();
    expect(s.facing.facing).toBe('Back');
    expect(s.combat.player.angle).toBe(Math.PI);
    s.committedFacing = 'Left';
    s.commitRemaining = 0.5;
    s.facing = { facing: 'Left', owner: 'commit' };
    s.select(2);
    expect(s.combat.player.angle).toBe(Math.PI);
    expect(s.facing).toEqual({ facing: 'Back', owner: 'idle' });
    expect(s.committedFacing).toBeNull();
    expect(s.commitRemaining).toBe(0);
});
