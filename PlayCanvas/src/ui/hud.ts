import type { PreviewIntent } from '../combat/ability-input';
import type { Simulation } from '../gameplay/simulation';
export function createHud() {
    const hud = document.createElement('main');
    hud.innerHTML = `
      <header><strong>CROWNFALL</strong> <span>ARENA · TOUCH COMBAT 002A</span></header>
      <p class="help">WASD / arrows move · Space Basic · Q / E / R skills · F stance / Blast<br>Touch: left pad moves · drag abilities to aim · release casts</p>
      <div id="combat-feedback" role="status" aria-live="polite">READY · Face gold MOBILE TEST target</div>
      <pre id="diagnostics" aria-label="Runtime diagnostics"></pre>
      <div id="move" class="pad" aria-label="Movement joystick"><span>MOVE</span><i>✥</i></div>
      <select id="summoner" aria-label="Summoner"><option>Kit</option><option>Set</option><option>Riven</option></select><button id="reset-combat">Reset sandbox</button><button id="charge">Debug: charge ultimate</button><button id="damage-player">Debug: receive 100 damage</button><div id="ability-bar"></div><pre id="combat-diagnostics"></pre>
      <div id="aim" hidden></div>
      <div class="notice">RESET → gold MOBILE TEST · Kit/Set: press/hold · Riven: aim then RELEASE</div>
    `;
    document.body.append(hud);
    hud.querySelector('#summoner')!.addEventListener('change', (e) =>
        simSelect?.((e.target as HTMLSelectElement).selectedIndex)
    );
    let simSelect: ((index: number) => void) | undefined;
    const diagnostics = hud.querySelector<HTMLPreElement>('#diagnostics')!;
    return {
        onSelect(callback: (index: number) => void) {
            simSelect = callback;
        },
        move: hud.querySelector<HTMLElement>('#move')!,
        aim: hud.querySelector<HTMLElement>('#aim')!,
        update(sim: Simulation, dt: number, frames: number, intent: PreviewIntent | null = null) {
            const c = sim.combat;
            const journal = c.journal,
                attempt = journal.latestAttempt,
                accepted = journal.latestAccepted,
                result = journal.latestResolution;
            const hit = journal.hits.at(-1),
                transaction = c.transactions.at(-1);
            const banner = hud.querySelector<HTMLElement>('#combat-feedback')!;
            let outcome = 'READY',
                message = 'Face gold MOBILE TEST target';
            if (result && c.now - (result.finished ?? 0) < 1.8) {
                outcome = result.result;
                message = `${result.name} · ${result.targetIds.length} targets · ${Number(result.damage.toFixed(1))} damage`;
            }
            if (accepted && accepted.result === 'PENDING' && accepted.time > (result?.finished ?? -1)) {
                outcome = 'ACCEPTED';
                message = `${accepted.name} · awaiting hit`;
            }
            if (
                hit &&
                c.now - hit.time < 1.5 &&
                hit.time >= (accepted?.time ?? -1) &&
                hit.time >= (result?.finished ?? -1)
            ) {
                outcome = 'HIT';
                message = `${hit.name} · −${Number(hit.amount.toFixed(1))} · ${hit.targetId}`;
            }
            if (outcome === 'READY' && attempt && !attempt.accepted && c.now - attempt.time < 1.8) {
                outcome = 'REJECTED';
                message = `${attempt.name} · ${attempt.reason}`;
            }
            if (outcome === 'READY' && intent) {
                outcome = 'AIMING';
                message =
                    c.definition.id === 'riven' && intent.ability.basic
                        ? 'RELEASE to launch'
                        : 'Drag to aim · release to confirm';
            }
            if (intent?.cancel) {
                outcome = 'CANCELLED';
                message = 'Beyond 150px · return inside to aim';
            }
            banner.dataset.outcome = outcome;
            banner.textContent = `${outcome} · ${message}`;
            hud.querySelector('#combat-diagnostics')!.textContent = [
                `${c.definition.name || 'Kit'} · ${c.stance || ''} HP ${c.player.health.toFixed(0)}/${c.player.maxHealth} ULT ${c.player.ultimateMeter.toFixed(1)} · ${c.player.dead ? 'DEFEATED' : 'alive'}`,
                `CAST ${attempt ? `${attempt.accepted ? 'ACCEPTED' : 'REJECTED ' + attempt.reason} · ${attempt.abilityId}` : 'none'}`,
                `RESULT ${accepted ? `${accepted.abilityId} · ${accepted.result} · ${accepted.targetIds.length} targets` : 'none'}`,
                `TX ${transaction ? `${transaction.abilityId || 'environment'} → ${transaction.targetId} −${Number(transaction.amount.toFixed(1))}` : 'none'}`,
                c.lastEvent,
                'SELF ' +
                    [
                        ...Object.entries(c.player.statuses)
                            .filter(([, end]) => end > c.now)
                            .map(([id, end]) => `${id} ${(end - c.now).toFixed(1)}s`),
                        ...Object.entries(c.player.modifiers)
                            .filter(([, value]) => value.expires > c.now)
                            .map(
                                ([id, value]) =>
                                    `${id} ${Number.isFinite(value.expires) ? (value.expires - c.now).toFixed(1) + 's' : 'active'}`
                            )
                    ].join(' · '),
                ...c.targets.map(
                    (t) =>
                        `${t.id} HP ${t.health.toFixed(0)} ${t.dead ? 'DEFEATED' : ''} ${Object.entries(t.statuses)
                            .filter(([, end]) => Number(end) > c.now)
                            .map(([id]) => id)
                            .join(' ')}`
                )
            ].join('\n');
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
