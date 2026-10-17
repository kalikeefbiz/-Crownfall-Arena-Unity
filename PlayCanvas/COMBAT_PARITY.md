# Task 002 combat parity evidence

Authoritative read-only reference: `kalikeefbiz/Crownfall-Browser-V21-Reference`, preservation commit `35082348aef27ad4eaed436e369a290ce7bf6c57`, original browser Version 21 commit `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`.

The reference was cloned as a sibling checkout, verified at the pinned commit, and not modified. The following modules were adapted as gameplay rules, without importing the browser renderer, DOM architecture, match orchestration or repository into the PlayCanvas application.

| Reference                                                                                         | Port / evidence                                                                                      |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `CROWNFALL_UNITY_HANDOFF_V21.md`                                                                  | Scope, numeric guardrails, input contract and acceptance limits                                      |
| `src/combat-data.js`, `src/summoners.js`, `src/riven-data.js`                                     | All three kit definitions and shared cooldown channel identifiers                                    |
| `src/combat-core.js`                                                                              | Hit geometry, health, status, cooldown/grant/pool primitives                                         |
| `src/combat.js`                                                                                   | Cast gates, cones/radials/dash/projectiles, Expellant and slow-zone updates                          |
| `src/advanced-actions.js`                                                                         | Set contact sequence and ground commitment; timed buffs and Elf Dance                                |
| `src/returning-weapons.js`                                                                        | Persistent outbound/parked/returning/orbit states, shared hit scaling and separate leg deduplication |
| `src/modifiers.js`                                                                                | Multiplicative modifiers and exact allied-aura eligibility                                           |
| `src/ability-input.js`                                                                            | Quick-tap/hold/drag/cancel, Kit/Set repeat and Riven release-confirmed follow-up                     |
| `src/simulation.js`, `src/config.js`                                                              | Independent movement, swept collision and reference regression geometry                              |
| `src/match.js`                                                                                    | Ultimate gating, consumption and enemy-Summoner dealt/received rates                                 |
| `tests/combat.test.js`, `tests/set.test.js`, `tests/riven.test.js`, `tests/ability-input.test.js` | Adapted executable assertions in same-named local test files                                         |

## Intentional bounded adaptations

- Defeat remains final. The reference's automatic training respawn is excluded; the corresponding assertions check final defeat and cleanup instead. The reset button explicitly recreates the sandbox.
- Runtime uses the existing PlayCanvas arena and its collision geometry. Tests also retain reference training geometry to verify original swept dash/leap edge cases.
- Selected character health uses reference kit/training base values (650/1250/700). The full-match 1.3 health multiplier belongs to match setup, which is outside this sandbox.
- Ultimate economy is available without match orchestration, starts empty and retains the reference's two independent gates. Tests precharge only scenarios that require a successful ultimate; separate tests cover empty/rejected/consumed/capped meter and provenance.
- Targetable state is explicit, and bounded damage transactions retain source, target, ability, amount, time and defeat. Presentation reads simulation state.
- Optional deterministic patrol remains a test seam for status/movement assertions. The runtime spawns stationary diagnostic targets and no bots.
- The future tagged-Wilderness hook is preserved; runtime zones are empty, so Kit receives no permanent speed bonus.
- Input state lives in a renderer/DOM-independent command controller; the PlayCanvas HUD adapter owns capture and labels. Drag vectors use the existing arena X/Z control convention rather than the reference renderer's screen-projection compensation. Interrupted or disabled Riven input clears pending follow-up before it can enqueue another launch.
- Existing directional presentation and mobile layout are retained with primitive health/status/projectile feedback. The browser renderer and art are not ported.

No intentional changes to the three kits' damage, ranges, cadence, cooldowns, hit filtering, stance weapon persistence, buff stacking, lethal Blast, or release-confirmed Riven combat semantics are introduced.

## Physical iPhone acceptance

Automated Chromium desktop and landscape touch tests cannot establish Safari touch feel, notched safe-area behavior, orientation transitions, browser gesture conflicts, sustained GPU/frame pacing, thermal behavior or long-session memory use. Those remain physical-device acceptance items. Diagnostic primitives are replaceable and are not a production art pass.
