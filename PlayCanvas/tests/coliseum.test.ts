import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { CrownfallMatch } from '../src/combat/match.js';
import { createSolrahnV2 } from '../src/maps/solrahn-v2';
import type { SolrahnMetadata } from '../src/maps/solrahn-v2';

const dir = 'public/assets/coliseum/';
const read = (name: string) => {
    const b = readFileSync(dir + name);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(dir + 'terrain.json', 'utf8')) as SolrahnMetadata & {
    files: Record<string, { bytes: number; sha256: string }>;
    checks: Record<string, boolean | number>;
};
const arena = createSolrahnV2(read('height.u16'), read('walk.bin'), read('lane.bin'), meta, read('colors.bin'));

test('Coliseum payloads match their recorded checksums', () => {
    for (const [name, spec] of Object.entries(meta.files)) {
        const bytes = readFileSync(dir + name);
        expect(bytes.byteLength, name).toBe(spec.bytes);
        expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(spec.sha256);
    }
});

test('generator checks all passed (connectivity, sealed bases, two ways to the major)', () => {
    for (const [name, value] of Object.entries(meta.checks)) expect(value, name).not.toBe(false);
});

test('spawns stand on walkable lane floor and every objective routes from both bases', () => {
    for (const team of [1, 2])
        for (let slot = 0; slot < 3; slot++) {
            const s = arena.spawn(team, slot);
            expect(arena.walkable(s.x, s.z), `${team}-${slot}`).toBe(true);
            expect(arena.height(s.x, s.z)).toBeCloseTo(2, 1);
        }
    for (const m of meta.landmarks)
        for (const team of [1, 2]) expect(arena.route(arena.spawn(team, 0), m).length, m.id).toBeGreaterThan(1);
    expect(arena.lane).toEqual({ goalA: -60, goalB: 60, halfWidth: 4 });
    expect(arena.camps.map((c) => c.id).sort()).toEqual(['west-mobility-blue', 'west-mobility-red']);
});

test('rivers and the lane walls block movement', () => {
    expect(arena.walkable(30, 0)).toBe(false); // east river
    expect(arena.walkable(-28, 0)).toBe(false); // west river
    expect(arena.walkable(7.5, 45)).toBe(false); // sealed corridor wall
    expect(arena.walkable(-7.5, 24)).toBe(true); // west wide ramp
});

test('a full bot match runs on the Coliseum without leaving walkable ground', () => {
    const match = new CrownfallMatch(0, { bots: true, arena });
    match.start();
    for (let i = 0; i < 60 * 40; i++) match.step();
    expect(match.phase).not.toBe('countdown');
    for (const p of match.entities) if (!p.dead) expect(arena.walkable(p.x, p.z), p.id).toBe(true);
});
