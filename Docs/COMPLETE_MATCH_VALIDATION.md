# Complete match delivery and validation

Branch: `browser-parity-unity`. Starting HEAD: `877fba7c5024f2c8ccb2a1ae3babc51f25646e64`.
Frozen reference inspected at `35082348aef27ad4eaed436e369a290ce7bf6c57`, representing browser `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`. The reference working tree remains clean and unchanged. Unity main is untouched; this is the existing Unity project.

## Executable scope

`Assets/Scenes/CrownfallMatch.unity` is the sole enabled shipping scene, including the build hook's explicit scene list. It launches menu → Summoner selection → countdown → complete local human-plus-five-bot match → victory/defeat/draw → results → replay/menu. Kit, Set and Riven are all selectable on Blue. M0/M1 training fixtures remain separate regression scenes.

Implemented systems: native X/Z arena/CharacterControllers/camera; independent move and aim; directional/ground/self preview and release/cancel; held Kit/Set basics; Riven release snapshot, cadence-driven second blade, persistent weapons/recall and shared stance cooldowns; complete three-character combat kits; damage/health, CC and multiplicative buffs; meter plus cooldown ultimate gates; recovery; tickets/final respawns/elimination/protection; reversible territorial front/CP/ordered result rules; one-time Surges and three non-attacking destructible Canals; six minor camps plus Major, neutral combat/leash/reset/respawn/rewards; bots that fight, retreat, advance, probe obstacles and coordinate rotations; minimap/HUD/score/life/stance/buff information; pause and persisted per-slot control-layout editing.

## Behavioral precedence

Preserved V21 behaviors include crossed-player front clamping, lane-only presence, neutral/wipe collapse outside Surge, retained CP, two-second pressure grace, 12 CP/s, 1,000 CP threshold, 300-second regulation and territory/elimination/CP/regulation resolution order. A reserved respawn keeps its team viable. The last shared ticket does not consume the player's personal final respawn. Death transactions apply once. Respawns take three seconds, protection lasts two, offense breaks it and buff/stance actions do not. Accepted cooldowns persist across death, and committed ordinary projectiles survive caster death. Camp damage never charges ultimate meter. Major's fixed team-buff expiry also applies to returning teammates. Kit's multi-Summoner ultimate hit grants one timed lethal Expellant cast, bypassing mitigation. Set contact strikes recheck eligibility independently; ground impacts retain their committed position. Riven's shared channels, hit-based recall scaling, separate outbound/return hit sets, stance-retained weapons and input cancellation semantics remain.

Preserved deliberate Unity decisions: Kit/Set/Riven health 950/1300/900; movement 5.2/4.7/5.0; collision radius .40; serialized Kit 2.6 range, .85 interval, 85/105 chain, 117° cone; current three-character offensive budgets/access relationships; 4.5-second successful-damage recovery delay and 4.5% maximum-health recovery per second; one Surge per team at 70%, no attacks or secondary rewards, defender-only hold, unattended slow advance and immediate restoration of ordinary contest after the last Canal dies. Exact provisional full-kit tuning choices are recorded in `BROWSER_PARITY_MIGRATION_MAP.md`, including normalization of recall scaling to the documented single-target rotation budget.

## Art actually integrated

Production **Kit**: unchanged source bytes for one idle and four approved ordered run images; five front basic images plus idle as the sixth logical frame; four back and three side basic images, with runtime mirroring for left. Existing sprite sets/material and authored pivots are used directly, including feet grounding. All 17 imported PNGs retain their original bytes and import data. The `side-run-idle.zip` files hash-identically to these already imported idle/run assets.

Production **Set/Riven**: zero image bytes are available in this Unity checkout or its four checked-in archives. The reference explicitly omits those large binaries. Set uses a distinct purple capsule and Riven a green cylinder with visible persistent blade/projectile proxies. This is a presentation limitation, not an absent kit. Missing Set images are idle, eight run, four basic, three War Cry and two Panther Fist images. Missing Riven images are idle and eight run images; V21 itself has no dedicated Riven attack/ability art. Exact source paths/hashes remain in the reference's `BINARY_ASSET_REFERENCE.json`.

Other placeholders: native arena surfaces/obstacles/objective geometry, geometric telegraphs, shots, radial effects and dash trails. Kit's authored Ember trail, Solar Ring, Last Flame, Expellant cast and blast images are unavailable here. Menu background artwork is also unavailable. No PNG regeneration, conversion, cropping, repainting, matte removal, recompression or importer changes were performed. Territory/Surge and preview shaders are native gameplay overlays, not asset workarounds.

## Checks executed in Codex

| Command/check | Result |
|---|---|
| `CROWNFALL_DOTNET=/workspace/scratch/dotnet/dotnet python3 Tools/run_complete_match_tests.py` | Passed: M1 75, economy 13, roster 16, Surge 18, complete match 127,037 assertions. Actual production C#, .NET SDK 8.0.425, warnings treated as errors. The large complete-match count includes per-tick finite-state checks, not 127,037 separate scenarios. |
| `CROWNFALL_DOTNET=/workspace/scratch/dotnet/dotnet CROWNFALL_UNITY_REFERENCE_DIR=/workspace/scratch/unityengine/lib/netstandard2.0 python3 Tools/compile_match_runtime.py` | Passed: all 35 runtime C# files, C# 9 / .NET Standard 2.1, zero errors/warnings, actual UnityEngine.Modules 2021.3.33 reference assemblies (no mock engine types). CS0649 is suppressed for Unity-serialized fields only. This is a type-check, not Unity 6000 Editor/player execution. |
| `python3 Tools/validate_current_build.py` | Passed: full scene composition references, shipping build scene/hook, serialized balance, all GUIDs/import settings and build-template contracts. |
| `python3 Tools/validate_m0.py` | Passed: all 47 C# sources parsed, 111 unique GUIDs, source hashes, frame order, pivots, references and architecture/package/editor pins. |
| `python3 Tools/validate_m1.py` | Passed, including M0 and current-build validation; all source-image/alpha/frame integrity checks retained. |
| `git diff --check` | Passed. |
| Read-only reference `node --test tests/match.test.js tests/wilderness.test.js tests/combat.test.js tests/riven.test.js tests/set.test.js tests/movement.test.js tests/ability-input.test.js tests/input.test.js` | 98 passed, zero failures. These validate the frozen browser behavior, not the Unity runtime. |
| Attempt including reference `tests/control-layout.test.js` | The 98 gameplay tests passed; the control-layout suite could not load absent generated `dist/index.html` (ENOENT). No reference build/output was written. Historical/binary-dependent browser UI suites were not claimed as passing. |

Complete production C# bot-match results from the final tuned core:

| Selected roster (human slot driven by bot for this check) | Result | Active seconds | Deaths | Rotations | Camp rewards |
|---|---|---:|---:|---:|---:|
| Kit | Red CP victory | 155.95 | 26 | 17 | 1 |
| Set | Blue total-control victory | 42.27 | 5 | 2 | 0 |
| Riven | Blue CP victory | 145.33 | 15 | 14 | 1 |

Combined: 46 deaths, 33 rotations, two camp rewards, 3,691 ticks with a Major assignment. Every run exercised death and respawn and ended normally. Isolated checks cover elimination and simultaneous elimination draw, regulation draw/retained CP, CP capping/grace, Surge trigger/hold/advance/termination, death/protection, delayed/clamped impact, contact miss/escape, aura multiplication, pulse/slow, recall budget, successful-damage regeneration, camp expiry/respawn, Major team refresh, invalid/repeated/cancelled gestures, stun cancellation, committed projectile persistence and fresh rematch state.

The existing GitHub static validation workflow now also watches this branch and runs the compiled complete-match suite. It does not invoke Unity Cloud Build.

## Remaining engine/device verification

No Unity Editor executable or licensed player runtime is installed in this Codex environment. Full Unity **6000.3.10f1** Editor compilation/import, shader compilation, actual scene lifecycle, CharacterController/terrain reconciliation, touch/IMGUI routing, image grounding/sorting and performance therefore remain unexecuted. Reference-assembly type-checking cannot substitute for those checks.

Next verification: open `CrownfallMatch.unity`, select each Summoner and **play a complete match**, using simultaneous movement/aim and every ability, contesting camps/Major and Canals, dying through ticket/final-life transitions, then replaying and returning to menu. On iPhone, also check landscape safe areas, touch cancellation/focus loss, per-slot layout Save/Cancel/confirmed Reset/collapse, readability, texture memory and sustained frame rate. Unity Cloud may be used later if explicitly requested; **no Unity Cloud Build was started** in this task.

There is no identified remaining gameplay implementation blocker preventing the complete local 3v3 loop. Missing authored Set/Riven/ability binaries prevent production-art parity. The missing Unity runtime prevents asserting that the integrated scene has actually been played successfully here; runtime/device bugs remain possible until the complete-match play check.

## WebGL build #11 compiler correction

The supplied `20067657599128-crownfall-arena-default-webgl-11.log` reports four CS0103 errors in `MatchHud.cs`: `JsonUtility` was unavailable. Build/export failure followed the script compilation failure; prebuild gameplay assertions had not run. The project used `JsonUtility` for control preferences without declaring `com.unity.modules.jsonserialize`.

Added the built-in JSON serialization module at version `1.0.0`, and updated the exact package guards in local validation and CI. Runtime type-checking now selects reference assemblies from the declared modules instead of all available UnityEngine DLLs, so an undeclared module cannot silently satisfy compilation. `CROWNFALL_PACKAGE_MANIFEST` can select a separate manifest for a dependency regression check.

Verified in Codex: the old two-module manifest reproduces all four reported CS0103 errors; the corrected three-module manifest compiles all 35 runtime files with zero warnings/errors using the same real UnityEngine 2021.3.33 references. `validate_m1.py` (including M0/current-build checks), `validate_current_build.py`, the complete-match suite (127,037 plus 122 existing assertions), and `git diff --check` pass. Gameplay code and production assets are unchanged. The earlier unrestricted assembly type-check was insufficient to detect this missing module; the dependency-aware check supersedes it.

No new Unity Cloud Build was started. The corrected commit still needs an actual Unity 6000.3.10f1 build/runtime check; Codex's reference-assembly compilation does not claim that Cloud export has passed.
