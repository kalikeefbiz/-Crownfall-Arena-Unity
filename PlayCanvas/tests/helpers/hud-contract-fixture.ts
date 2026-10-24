import type { MatchSettings } from '../../src/combat/match-data';
import { CrownfallMatch } from '../../src/combat/match.js';
import { Simulation } from '../../src/gameplay/simulation';
import { createHud } from '../../src/ui/hud';

// Browser component integration only: real simulation/rewards and the real HUD,
// with constructor settings unavailable through the normal player's controls.
export function mountHudContractFixture(settings: Partial<MatchSettings> = {}, selected = 0) {
    document.body.classList.add('playable', 'lifecycle');
    const simulation = new Simulation();
    simulation.lifecycle = true;
    simulation.match = new CrownfallMatch(selected, { settings });
    simulation.combat = simulation.match.human;
    const hud = createHud();
    return { simulation, hud, render: () => hud.update(simulation, 1 / 60, 1) };
}
