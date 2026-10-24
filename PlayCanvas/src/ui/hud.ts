import type { PreviewIntent } from '../combat/ability-input';
import type { Simulation } from '../gameplay/simulation';
export function createHud() {
    const abort = new AbortController();
    const percent = (value = 0) => Number((value * 100).toFixed(2));
    const setPreview = new URLSearchParams(location.search).get('setPreview') === '1';
    const rivenPreview = new URLSearchParams(location.search).get('rivenPreview') === '1';
    const hud = document.createElement('main');
    hud.innerHTML = `
      <header><strong>CROWNFALL</strong> <span>ARENA · TOUCH COMBAT 002A</span></header>
      <p class="help">WASD / arrows move · Space Basic · Q / E / R skills · F stance / Blast<br>Touch: left pad moves · drag abilities to aim · release casts</p>
      <div id="combat-feedback" role="status" aria-live="polite">READY · Face gold MOBILE TEST target</div>
      <pre id="diagnostics" aria-label="Runtime diagnostics"></pre>
      <div id="move" class="pad" aria-label="Movement joystick"><span>MOVE</span><i>✥</i></div>
      <select id="summoner" aria-label="Summoner"><option>Kit</option><option>Set</option><option>Riven</option></select><button id="reset-combat">Reset sandbox</button><button id="charge">Debug: charge ultimate</button><button id="damage-player">Debug: receive 100 damage</button><div id="ability-bar"></div><pre id="combat-diagnostics"></pre>
      <section id="lifecycle-controls"><label><input type="checkbox" id="lifecycle-mode">3v3 lifecycle</label>
      <button id="start-match">Start countdown</button><select id="inspect-actor" aria-label="Inspected actor"></select>
      <button id="lethal-actor">Debug: lethal</button><button id="damage-actor">Debug: damage</button>
      <button id="advance-match">Debug: advance 5.1s</button><pre id="match-status"></pre></section>
      <section id="scoreboard" aria-label="Match scoreboard"></section>
      <section id="team-status" aria-label="Team participants"></section>
      <div id="wilderness-buffs" aria-label="Wilderness buffs" hidden></div>
      <div id="battle-announcement" role="status" aria-live="polite"></div>
      <div id="kill-feed" aria-live="polite"></div>
      <button id="play-match">Start match</button>
      <section id="result-panel" hidden><h1 id="result-title"></h1><p id="result-detail"></p><table id="result-participants"><thead><tr><th>Team</th><th>Summoner</th><th>K</th><th>D</th><th>A</th><th>Damage</th><th>Pressure s</th></tr></thead><tbody></tbody></table><button id="restart-match">Restart match</button></section>
      <button id="aim-assist" aria-pressed="true">Aim Assist: On</button>
      <div id="aim-feedback" aria-live="off"></div>
      <a id="debug-link" href="?debug=1">Debug</a>
      <div id="aim" hidden></div>
      <div class="notice">RESET → gold MOBILE TEST · Kit/Set: press/hold · Riven: aim then RELEASE</div>
    `;
    document.body.append(hud);
    hud.querySelector('#summoner')!.addEventListener(
        'change',
        (e) => simSelect?.((e.target as HTMLSelectElement).selectedIndex),
        { signal: abort.signal }
    );
    let simSelect: ((index: number) => void) | undefined;
    const diagnostics = hud.querySelector<HTMLPreElement>('#diagnostics')!;
    return {
        destroy() {
            abort.abort();
            simSelect = undefined;
            hud.remove();
        },
        onSelect(callback: (index: number) => void) {
            simSelect = callback;
        },
        move: hud.querySelector<HTMLElement>('#move')!,
        aim: hud.querySelector<HTMLElement>('#aim')!,
        update(sim: Simulation, dt: number, frames: number, intent: PreviewIntent | null = null) {
            const c = sim.combat;
            const match = sim.match?.snapshot();
            hud.querySelector('header span')!.textContent =
                setPreview && c.definition.id === 'set'
                    ? 'SET 3D · DEV PRESENTATION ONLY'
                    : rivenPreview && c.definition.id === 'riven'
                      ? 'RIVEN 3D · DEV PRESENTATION ONLY'
                      : match
                        ? 'ARENA · 3v3'
                        : 'ARENA · TOUCH COMBAT 002A';
            hud.querySelector('.notice')!.textContent = match
                ? '3v3 · Start countdown · Debug actions respect protection · Reset creates a clean prematch'
                : 'RESET → gold MOBILE TEST · Kit/Set: press/hold · Riven: aim then RELEASE';
            hud.querySelector('#match-status')!.textContent = match
                ? [
                      `${match.phase} · countdown ${match.countdownRemaining.toFixed(1)} · Blue ${match.tickets[1]} tickets · Red ${match.tickets[2]} tickets`,
                      ...(match.result
                          ? [
                                `RESULT ${match.result.winner === 0 ? 'DRAW' : match.result.winner === 1 ? 'BLUE' : 'RED'} · ${match.result.reason}`
                            ]
                          : []),
                      ...match.actors.map(
                          (a) =>
                              `${a.id} ${a.name}${a.human ? ' HUMAN' : ''} · ${a.eliminated ? 'ELIMINATED' : a.respawnReserved ? `RESPAWN ${Math.max(0, a.respawnAt - match.elapsed).toFixed(1)}s` : 'alive'} · final ${a.finalRespawnAvailable ? 'available' : 'used'}${a.protected ? ' · PROTECTED' : ''} · ${a.kills}/${a.deaths}/${a.assists} · DMG ${a.damage.toFixed(0)}`
                      ),
                      ...match.feed
                  ].join('\n')
                : 'Touch combat sandbox · enable 3v3 to test lifecycle';
            if (match && document.body.classList.contains('playable')) {
                const time = Math.ceil(match.remaining);
                const pressure = !match.pressureTeam
                    ? 'NEUTRAL'
                    : `${match.pressureTeam === 1 ? 'BLUE' : 'RED'} ${match.scoringTeam ? 'SCORING' : `PRESSURE · grace ${Math.max(0, match.settings.graceSeconds - match.pressureAge).toFixed(1)}s`}`;
                hud.querySelector('#scoreboard')!.textContent =
                    `BLUE ${match.tickets[1]} tickets · ${match.phase === 'active' ? 'ACTIVE MATCH' : match.phase.toUpperCase()} · ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')} · RED ${match.tickets[2]} tickets\n` +
                    `Territory ${(match.control * 100).toFixed(1)}% / ${((1 - match.control) * 100).toFixed(1)}% · CP ${Math.floor(match.cp[1])} / ${Math.floor(match.cp[2])} of ${match.settings.cpTarget}\n` +
                    `Front ${match.front.toFixed(2)} · ${pressure}`;
                const status = hud.querySelector('#team-status')!;
                status.replaceChildren(
                    ...[1, 2].map((team) => {
                        const column = document.createElement('div');
                        column.className = team === 1 ? 'blue-team' : 'red-team';
                        for (const a of match.actors.filter((a) => a.team === team)) {
                            const row = document.createElement('div');
                            row.textContent = `${a.name}${a.human ? ' · YOU' : ' · AI'} · ${a.eliminated ? 'ELIMINATED' : a.dead ? `RESPAWN ${Math.max(0, a.respawnAt - match.elapsed).toFixed(1)}s` : `${Math.ceil(a.health)} HP`}${a.protected ? ' · SHIELD' : ''} · ${a.finalRespawnAvailable ? 'FINAL READY' : 'FINAL USED'} · ${a.kills}/${a.deaths}/${a.assists}`;
                            column.append(row);
                        }
                        return column;
                    })
                );
                const human = match.actors.find((a) => a.human)!;
                hud.querySelector('#battle-announcement')!.textContent =
                    match.phase === 'countdown'
                        ? String(Math.ceil(match.countdownRemaining))
                        : match.phase === 'prematch'
                          ? 'Choose your Summoner. Ready for 3v3?'
                          : match.phase === 'active' && match.elapsed < 2
                            ? 'MATCH START · FIGHT!'
                            : human.eliminated
                              ? 'Permanently eliminated · Watching your team'
                              : human.dead
                                ? `Respawning in ${Math.max(0, human.respawnAt - match.elapsed).toFixed(1)}s`
                                : '';
                const buffs = hud.querySelector('#wilderness-buffs') as HTMLElement;
                const labels: Record<string, string> = {
                    'camp:mobility': `MOBILITY +${percent(human.modifiers['camp:mobility']?.speedBonus)}%`,
                    'camp:cooldown': `COOLDOWN −${percent(human.modifiers['camp:cooldown']?.cooldownReduction)}%`,
                    'camp:defense': `DEFENSE +${percent(human.modifiers['camp:defense']?.mitigation)}%`,
                    'camp:damage': `TEAM DAMAGE +${percent(human.modifiers['camp:damage']?.damageBonus)}%`
                };
                const active = Object.entries(human.modifiers).filter(
                    ([id, v]) => id.startsWith('camp:') && v.expires > match.elapsed
                );
                const inner = sim.combat.inWilderness && !human.dead && sim.combat.definition.id === 'kit-asher';
                buffs.textContent = [
                    ...(inner ? [`INNER FLAME +${percent(c.definition.passive?.speedBonus)}%`] : []),
                    ...active.map(([id, v]) => `${labels[id]} ${Math.ceil(v.expires - match.elapsed)}s`)
                ].join(' · ');
                buffs.hidden = (!active.length && !inner) || match.phase !== 'active';
                hud.querySelector('#kill-feed')!.textContent = match.feed.join(' • ');
                (hud.querySelector('#play-match') as HTMLButtonElement).hidden = match.phase !== 'prematch';
                (hud.querySelector('#summoner') as HTMLSelectElement).disabled = match.phase !== 'prematch';
                (hud.querySelector('#result-panel') as HTMLElement).hidden = !match.result;
                if (match.result) {
                    hud.querySelector('#result-title')!.textContent =
                        match.result.winner === 0 ? 'DRAW' : match.result.winner === 1 ? 'VICTORY' : 'DEFEAT';
                    const final = match.results!;
                    const reason: Record<string, string> = {
                        'total-control': 'Total control',
                        points: 'Crownfall Points',
                        tickets: 'Elimination / tickets',
                        regulation: 'Regulation'
                    };
                    hud.querySelector('#result-detail')!.textContent =
                        `${final.winner === 0 ? 'Draw' : (final.winner === 1 ? 'Blue' : 'Red') + ' wins'} · ${reason[final.reason]} · ${final.duration.toFixed(1)}s · Territory ${(final.control * 100).toFixed(1)}% / ${((1 - final.control) * 100).toFixed(1)}% · CP ${Math.floor(final.cp[1])} / ${Math.floor(final.cp[2])} · Tickets ${final.tickets[1]} / ${final.tickets[2]}`;
                    hud.querySelector('#result-participants tbody')!.replaceChildren(
                        ...final.participants.map((a) => {
                            const row = document.createElement('tr');
                            row.dataset.participant = a.id;
                            row.className = a.team === 1 ? 'blue-team' : 'red-team';
                            for (const value of [
                                a.team === 1 ? 'Blue' : 'Red',
                                a.name,
                                a.kills,
                                a.deaths,
                                a.assists,
                                Math.round(a.damage),
                                a.pressureSeconds.toFixed(1)
                            ]) {
                                const cell = document.createElement('td');
                                cell.textContent = String(value);
                                row.append(cell);
                            }
                            return row;
                        })
                    );
                }
                hud.querySelector('.notice')!.textContent =
                    `${human.name} · ${Math.ceil(human.health)}/${human.maxHealth} HP · Ultimate ${Math.floor(human.ultimateMeter)}% · WASD move · Space Basic · Q/E/R skills · F stance`;
            }
            const journal = c.journal,
                attempt = journal.latestAttempt,
                accepted = journal.latestAccepted,
                result = journal.latestResolution;
            const hit = journal.hits.at(-1),
                transaction = c.transactions.at(-1);
            const banner = hud.querySelector<HTMLElement>('#combat-feedback')!;
            let outcome = 'READY',
                message = match ? 'Blue human · fight Red Summoners' : 'Face gold MOBILE TEST target';
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
