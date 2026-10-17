import type { Simulation } from '../gameplay/simulation';
export function createHud() {
    const hud = document.createElement('main');
    hud.innerHTML = `
      <header><strong>CROWNFALL</strong> <span>ARENA · TECHNICAL SLICE 001</span></header>
      <p class="help">WASD / arrows move · Hold mouse / Space to aim · Release locks facing briefly<br>Touch: left pad moves · drag Basic to aim · release commits facing</p>
      <pre id="diagnostics" aria-label="Runtime diagnostics"></pre>
      <div id="move" class="pad" aria-label="Movement joystick"><span>MOVE</span><i>✥</i></div>
      <div class="skills"><button disabled>Skill 1</button><button disabled>Skill 2</button><button disabled>Ultimate</button></div>
      <div id="aim" class="pad" aria-label="Basic aim joystick"><span>BASIC</span><i>◎</i></div>
      <div class="notice">PROTOTYPE · Ability slots reserved · No damage simulation</div>
    `;
    document.body.append(hud);
    const diagnostics = hud.querySelector<HTMLPreElement>('#diagnostics')!;
    return {
        move: hud.querySelector<HTMLElement>('#move')!,
        aim: hud.querySelector<HTMLElement>('#aim')!,
        update(sim: Simulation, dt: number, frames: number) {
            const style = getComputedStyle(document.documentElement);
            diagnostics.textContent = [
                `MOVE  ${sim.movement.x.toFixed(2)}, ${sim.movement.z.toFixed(2)}`,
                `AIM   ${sim.aim.x.toFixed(2)}, ${sim.aim.z.toFixed(2)} (continuous)`,
                `FACE  ${sim.facing.facing}${sim.facing.facing === 'Left' ? ' (mirrored Right)' : ''} / ${sim.facing.owner}`,
                `MODE  ${sim.targeting ? 'targeting / pre-cast' : 'locomotion'} · lock ${sim.commitRemaining.toFixed(2)}s`,
                `POS   ${sim.position.x.toFixed(2)}, ${sim.position.z.toFixed(2)} · collisions ${sim.collisions}`,
                `FRAME ${(dt * 1000).toFixed(1)}ms · ${(1 / dt).toFixed(0)} FPS · #${frames}`,
                `VIEW  ${innerWidth}×${innerHeight} · DPR ${devicePixelRatio}`,
                `SAFE  T${style.getPropertyValue('--safe-top').trim()} R${style.getPropertyValue('--safe-right').trim()} B${style.getPropertyValue('--safe-bottom').trim()} L${style.getPropertyValue('--safe-left').trim()}`
            ].join('\n');
        }
    };
}
