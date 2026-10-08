# Complete match integration map

Inspected Unity start `877fba7c5024f2c8ccb2a1ae3babc51f25646e64` and frozen reference `35082348aef27ad4eaed436e369a290ce7bf6c57` (browser `5a73918`). Reference checkout remains unmodified.

| Existing Unity | Complete match integration | Reference behavior |
|---|---|---|
| HealthState, CombatRecoveryState, ConeHitQuery | Shared match actors, damage transaction, native X/Z hit queries | combat-core, modifiers, combat |
| FirstRosterBalance + serialized KitBasicAttack | Current health/move/basic plus full revised ability budgets | Unity design docs override older tuning |
| TerritorySurgeState | Three destructible, non-attacking Canals and live front policy | Current Unity Surge doc overrides empty-lane collapse during Surge |
| CharacterController, MobaCamera, directional Kit sprite sets | Match actor view adapters, authored battlefield, follow camera | match-data geometry and collision |
| M0 targeting/input fixture | Independent touch movement/aim, ability release/cancel, held melee basics | ability-input, input |
| Training scene/build root | Menu, roster selection, countdown, full match, results/replay/menu | game-ux, match |
| No wilderness/match AI | Six minor sites, major, rewards/reset/leash; five bots | wilderness, match-bots |

Kit's current explicit Flame Burst/Firestorm Ascent tuning replaces Solar Ring/Last Flame names and damage. Firestorm retains the proven piercing Summoner-only projectile/multi-hit Expellant grant behavior; Flame Burst retains the self-centered radial behavior with the revised 4.2 footprint. Ult cooldowns are chosen within current documented target bands (Kit 60, Set/Riven 65). Pulse tuning is 76 basic + 120 Solo, leaving its two-basic-plus-skill rotation at 272 (299.2 with AMP), comparable to Reso's 296/325.6. These choices are explicit provisional Unity tuning, not stale V21 values. Recall retains hit-based scaling on the revised 50 base.

Available production artwork: Kit idle, four run frames and all front/back/side basic frames. The repository archives contain Kit only. Set/Riven and Kit ability artwork listed by BINARY_ASSET_REFERENCE.json are unavailable as bytes; use readable temporary presentation without inventing production art or modifying supplied PNGs.

M0/M1 fixtures remain available for their regression checks. The shipping build launches a separate scene in the existing Unity project, CrownfallMatch, with the full match composition root. No new Unity project, cloud build, networking or browser-renderer translation.
