import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

import { CrownfallMatch } from '../src/combat/match.js';
import { createSolrahnSurface } from '../src/maps/solrahn';

const bytes = readFileSync(new URL('../public/assets/solrahn/surface.bin', import.meta.url));
const surface = createSolrahnSurface(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

test('six Summoners spawn on real terrain; middle lane remains traversable and cliffs block', () => {
    const match = new CrownfallMatch(0, { bots: true, arena: surface });
    expect(match.entities).toHaveLength(6);
    for (const p of match.entities) {
        expect(surface.walkable(p.x, p.z)).toBe(true);
        expect(surface.height(p.x, p.z)).toBeGreaterThan(1);
    }
    for (let z = -50; z <= 50; z += 0.125) expect(surface.walkable(0, z)).toBe(true);
    expect(surface.walkable(15, 15)).toBe(false);
    expect(surface.walkable(40, 0)).toBe(false);
    match.start();
    match.debugAdvance(3);
    for (let tick = 0; tick < 600; tick++) match.step({ moveX: 1 });
    expect(surface.walkable(match.human.player.x, match.human.player.z)).toBe(true);
    expect(match.human.player.x).toBeLessThan(3);
});

test('both active camps can be reached from both spawns using the authoritative surface route', () => {
    for (const team of [1, 2])
        for (const camp of surface.camps) {
            const p = surface.spawn(team, 0);
            for (let i = 0; i < 2000 && Math.hypot(p.x - camp.x, p.z - camp.z) > 0.4; i++) {
                const goal = surface.navigate(p, camp);
                const d = Math.hypot(goal.x - p.x, goal.z - p.z);
                if (d < 0.001) break;
                const step = Math.min(0.2, d);
                p.x += ((goal.x - p.x) * step) / d;
                p.z += ((goal.z - p.z) * step) / d;
                expect(surface.walkable(p.x, p.z)).toBe(true);
            }
            expect(Math.hypot(p.x - camp.x, p.z - camp.z)).toBeLessThan(0.4);
        }
});

test('ordinary 3v3 rules finish a full battle with all AI participating and no terrain escapes', () => {
    const match = new CrownfallMatch(2, { bots: true, arena: surface });
    match.start();
    match.debugAdvance(3);
    let violations = 0;
    for (let i = 0; i < 18001 && !match.results; i++) {
        match.step();
        for (const p of match.entities) if (!p.dead && !surface.walkable(p.x, p.z)) violations++;
    }
    expect(violations).toBe(0);
    expect(match.results).not.toBe(null);
    expect(match.results?.participants).toHaveLength(6);
    expect(match.actors.filter((a) => a.bot).every((a) => a.record.damage > 0)).toBe(true);
    expect(match.entities.some((p) => p.dead) || match.actors.some((a) => a.record.deaths > 0)).toBe(true);
}, 120000);
