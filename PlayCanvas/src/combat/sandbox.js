// Version 21 simulation adapted to the existing PlayCanvas arena; no renderer dependencies.
import { ARENA, OBSTACLES } from '../config/arena';

import { CombatSimulation } from './combat.js';
import { CONFIG } from './config.js';
import { SUMMONERS } from './summoners.js';
export function createCombat(index = 0) {
    const { definition } = SUMMONERS[index];
    const training = {
        targetRespawn: Infinity,
        targetHealth: 5000,
        targetRadius: 0.45,
        zones: [],
        stations: [],
        targets: [
            { id: 'near-a', name: 'Near A', team: 2, kind: 'summoner', x: 0, z: 3.6 },
            { id: 'near-b', name: 'Near B', team: 2, kind: 'summoner', x: 1, z: 3.4 },
            { id: 'line-a', name: 'Line A', team: 2, kind: 'summoner', x: 0, z: 0 },
            { id: 'line-b', name: 'Line B', team: 2, kind: 'summoner', x: 0, z: -5 },
            { id: 'ally', name: 'Ally', team: 1, kind: 'summoner', x: -1, z: 4 },
            { id: 'object', name: 'Object', team: 2, kind: 'object', x: -2, z: 3 }
        ]
    };
    const config = {
        ...CONFIG,
        summoner: { ...CONFIG.summoner, speed: 6, radius: ARENA.radius, spawn: { x: 0, z: 5 } }
    };
    const map = {
        width: ARENA.halfWidth * 2,
        depth: ARENA.halfLength * 2,
        walls: OBSTACLES.map((o) => ({ x: o.x, z: o.z, w: o.halfX * 2, d: o.halfZ * 2 }))
    };
    const sim = new CombatSimulation(definition, training, config, map);
    sim.player.angle = Math.PI;
    return sim;
}
export { SUMMONERS };
