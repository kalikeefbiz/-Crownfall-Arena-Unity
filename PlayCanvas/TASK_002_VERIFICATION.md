# Task 002 final verification

Completed combat-parity implementation on `playcanvas-port`. All changed paths are under `PlayCanvas/`; preserved Unity files and deployment workflow are unchanged.

## Results

Verified on 2026-10-17 with Node 24.19.0 and system Chromium 154.

| Required check                                                                    | Result                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Non-rendering tests (`npm test`)                                                  | **78 passed, 0 failed**, 6 files                                       |
| Production-browser tests (`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`) | **9 passed, 0 failed**, final production build, approximately 1 minute |
| Typecheck (`npm run typecheck`)                                                   | Passed                                                                 |
| Lint (`npm run lint`)                                                             | Passed                                                                 |
| Formatting (`npm run fmt`)                                                        | Passed                                                                 |
| Production build (`npm run build`)                                                | Passed                                                                 |
| Whitespace (`git diff --check`)                                                   | Passed                                                                 |

The build emits a non-failing bundle-size advisory: approximately 1.112 MB JavaScript / 293 KB gzip. Physical mobile performance remains an acceptance item.

The non-rendering suite includes 15 Kit/core reference scenarios, 12 Set scenarios, 16 Riven scenarios, 10 input scenarios, 12 additional foundation/cadence/interruption/deduplication scenarios and 13 retained Task 001 movement/presentation assertions.

Browser validation covers page exceptions and rendering; movement/aim/facing/mirroring; simultaneous captured mobile pointers and cancellation; rendered obstruction collision; selection and actual Basic damage for each character; aimed Ember Step and radial Solar Ring; committed ground-target Panther Fist; Riven stance/action replacement, slow, SCREAM stun, allied filtering, cooldown and ultimate diagnostics. Tests use the real HUD and command path rather than a test-only cast API. The exposed browser seam returns read-only snapshots.

## Sources and implementation

Read [MIGRATION_CONTRACT.md](MIGRATION_CONTRACT.md), [REFERENCE_SOURCES.md](REFERENCE_SOURCES.md) and [CODEX_TASK_002.md](CODEX_TASK_002.md) before implementation.

Frozen reference: `kalikeefbiz/Crownfall-Browser-V21-Reference` at `35082348aef27ad4eaed436e369a290ce7bf6c57`, preserving browser Version 21 source `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`. The sibling reference checkout remained read-only.

Inspected and adapted: `CROWNFALL_UNITY_HANDOFF_V21.md`; `src/combat-data.js`, `combat-core.js`, `combat.js`, `advanced-actions.js`, `returning-weapons.js`, `modifiers.js`, `summoners.js`, `riven-data.js`, `ability-input.js`, plus `simulation.js`, `config.js` and the ultimate economy in `match.js`. Reference tests used: `tests/combat.test.js`, `tests/set.test.js`, `tests/riven.test.js`, `tests/ability-input.test.js`.

[COMBAT_PARITY.md](COMBAT_PARITY.md) maps each source to the port and explains the bounded adaptations. Shared combat includes identity/targetability, health/damage/defeat, provenance, hit deduplication, cast gates, cooldown channels, fixed-step timelines, geometry, statuses, multiplicative modifiers and ultimate economy. All Kit, Set and Riven abilities and returning-weapon/stance state are connected to mobile controls. Input intentions and simulation are independent of PlayCanvas rendering; primitive presentation reads their state.

## Remaining Version 21 differences and device acceptance

No known remaining damage, range, cooldown, cadence, modifier, target-filtering or stance/weapon-lifecycle differences within this combat block's tested scope.

Intentional sandbox differences: final defeat rather than training respawn; reference kit/training health (650/1250/700) rather than the full match's 1.3 health multiplier; existing PlayCanvas arena/drag coordinate convention; stationary diagnostic targets; primitive presentation. No Wilderness zones are supplied, so Inner Flame is a future tagged-zone hook rather than a permanent speed bonus. Match systems, bots, networking, artwork and audio remain outside this task.

Physical iPhone Safari acceptance remains required for simultaneous touch feel, quick taps versus drag/hold, lost capture/browser gestures, safe areas/orientation, sustained GPU/frame pacing, thermal behavior and long-session memory. Automated Chromium mobile emulation does not establish those results.

Public preview: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/

The existing `Publish Crownfall PlayCanvas Preview` workflow publishes `PlayCanvas/dist` on pushes to this branch and preserves the Unity root through `destination_dir: playcanvas` and `keep_files: true`. The final commit SHA and resulting deployment run are reported in the completion message.

## Files changed

`CODEX_TASK_002.md` and `REFERENCE_SOURCES.md` changes are formatting only. The original Task 001 verification report remains preserved.

- `PlayCanvas/CODEX_TASK_002.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/README.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/TASK_002_VERIFICATION.md`
- `PlayCanvas/eslint.config.mjs`
- `PlayCanvas/playwright.config.ts`
- `PlayCanvas/src/combat/ability-commands.js`
- `PlayCanvas/src/combat/ability-input.d.ts`
- `PlayCanvas/src/combat/ability-input.js`
- `PlayCanvas/src/combat/advanced-actions.js`
- `PlayCanvas/src/combat/combat-core.js`
- `PlayCanvas/src/combat/combat-data.js`
- `PlayCanvas/src/combat/combat.d.ts`
- `PlayCanvas/src/combat/combat.js`
- `PlayCanvas/src/combat/config.js`
- `PlayCanvas/src/combat/modifiers.js`
- `PlayCanvas/src/combat/movement.js`
- `PlayCanvas/src/combat/returning-weapons.js`
- `PlayCanvas/src/combat/riven-data.js`
- `PlayCanvas/src/combat/sandbox.js`
- `PlayCanvas/src/combat/summoners.js`
- `PlayCanvas/src/gameplay/simulation.ts`
- `PlayCanvas/src/main.ts`
- `PlayCanvas/src/presentation/scene.ts`
- `PlayCanvas/src/style.css`
- `PlayCanvas/src/ui/hud.ts`
- `PlayCanvas/tests/ability-input.test.js`
- `PlayCanvas/tests/browser/arena.spec.ts`
- `PlayCanvas/tests/combat.test.js`
- `PlayCanvas/tests/foundation.test.js`
- `PlayCanvas/tests/riven.test.js`
- `PlayCanvas/tests/set.test.js`
- `PlayCanvas/tsconfig.json`
- `PlayCanvas/vitest.config.ts`
