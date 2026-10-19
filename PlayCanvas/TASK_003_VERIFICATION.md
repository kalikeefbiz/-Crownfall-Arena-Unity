# Task 003 — 3v3 lifecycle parity

## Reference and scope

Frozen reference: `kalikeefbiz/Crownfall-Browser-V21-Reference` at `35082348aef27ad4eaed436e369a290ce7bf6c57` (original Version 21 `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`). Inspected `src/match.js`, `src/crownfall-rules.js`, `src/match-data.js`, `src/combat.js`, `src/combat-core.js`, `src/summoners.js`, and `tests/match.test.js`.

`src/combat/match.js` adapts the six independent simulations, selected Blue roster, 1.3 health scaling, countdown, ticket reservation boundary, personal final respawns, eight-second assist window, protection/cast rules, alternating actor order, death cleanup and respawn stance/weapons from those sources. The combat engine retains the accepted Task 002A values and input semantics. Its existing match hooks supply damage, death and protection integration; ultimate damage gains remain in the combat engine and are not applied twice.

No Unity files are changed. No territory, CP, regulation victory, Wilderness, bots, networking, art or audio is added. The diagnostic arena supplies local authored team spawns instead of importing Version 21's larger arena. All five non-human participants are inert. Existing touch-combat training remains available separately, with its original diagnostic targets and geometry. Within 3v3 mode only the six real actors participate in combat and aura queries.

## Device walkthrough

Enable **3v3 lifecycle** at the top right, select Kit/Set/Riven (selection resets the match), then **Start countdown**. Blue always has one of each Summoner; the chosen Summoner is the human. Both teams begin with 15 tickets. Full-match HP is Kit 845, Set 1625, Riven 910; speed 6 and radius 0.45.

Select an inspected actor and use **Debug: damage** or **Debug: lethal**. Both call the combat authority, respect protection, and never assign health/tickets/lives directly. **Debug: advance 5.1s** executes 306 ordinary fixed steps with idle input. It changes neither clocks nor respawn state directly; time continues naturally otherwise. This allows exhausting all shared tickets and personal lives without waiting between every defeat.

Status shows phase/countdown, tickets, all six actors, human assignment, respawn timer, final availability, permanent elimination, protection, K/D/A, damage, short defeat feed and result. Protected targets also turn white. The death spending ticket 15 preserves the personal final respawn. At zero tickets, each actor reserves that final once; the subsequent death eliminates it. Results wait for all three opposing actors, and freeze progression. **Reset sandbox** creates an entirely fresh prematch including all combat state and records.

## Automated evidence

- `tests/match.test.js`: 13 lifecycle cases, including real repeated death/respawn cycles through ticket exhaustion, final lives, all-actor elimination and simultaneous draw. Death/life assertions use damage and fixed ticks rather than assigning health/tickets/lives.
- `tests/browser/match.spec.ts`: rendered countdown, all six actors, natural timed respawn and visible protection, debug controls through complete elimination/results, freeze/reset, plus actual CDP touch movement and Basic damage for all three selected humans in 3v3.
- All existing unit and production-browser suites are retained, including Task 002A touch DAMAGE, cancellation, Riven release and multitouch regressions.
- The obstruction browser test samples its horizontal approach every 16ms to avoid overshooting the wall column on slow software-rendered frames; its collision and position assertions are unchanged.

Validation on 2026-10-19:

- `npm test`: 109 passed, 10 files, zero failures.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: 26 passed, zero failures (3.0 minutes), including all 24 retained browser cases and both new lifecycle cases.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run fmt`: passed.
- `npm run build`: passed (existing bundle-size advisory only).

Changed files (all under `PlayCanvas/`): `src/combat/match.js`, `src/combat/match.d.ts`, `src/combat/combat.js`, `src/combat/command-stepper.js`, `src/gameplay/simulation.ts`, `src/main.ts`, `src/presentation/scene.ts`, `src/presentation/combat-overlay.ts`, `src/ui/hud.ts`, `src/style.css`, `tests/match.test.js`, `tests/browser/match.spec.ts`, `tests/browser/arena.spec.ts`, `README.md`, `COMBAT_PARITY.md`, this verification record, and formatting of `CODEX_TASK_003.md`.

## Physical iPhone acceptance still required

Safari touch feel and pointer-capture ordering, two-finger movement/combat, release-only Riven, protection readability, debug panel scrolling and safe areas at actual phone sizes, rotation, browser gestures, sustained frame pacing/thermal behavior and long-session memory use require a physical iPhone. Automated Chromium/CDP does not establish those results.

Preview: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/ . Pushing this implementation to `playcanvas-port` triggers the existing `publish-crownfall-playcanvas.yml` workflow.
