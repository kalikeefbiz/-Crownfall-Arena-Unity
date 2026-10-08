# Crownfall Arena productionization report

## Revision and scope

- Required starting HEAD, fetched and verified before editing: `c7b681efd36fc0ad4ace7fe6f9d4e0d2a9133498`.
- Implementation checkpoint HEAD: `9ebead62c2f40c5351ec0ed98067d52804cfeeab`.
- Final HEAD: the report commit on `browser-parity-unity` containing this document. Resolve with `git rev-parse HEAD`; its exact SHA is recorded in the completion response. A tracked report cannot embed its own commit SHA without changing that SHA.
- Commits: `9ebead62c2f40c5351ec0ed98067d52804cfeeab` — **Productionize Crownfall roster, arena, HUD and presentation lifecycle**; final report commit — **Finalize production HUD hooks and validation report**.
- Target remains Unity **6000.3.10f1**, Built-in Render Pipeline, WebGL / iPhone Safari.
- Work is confined to `browser-parity-unity`. No Cloud Build, deployment, merge, source attachment import, or modification of the frozen browser reference was performed. `main` and `gh-pages` were not written.

## Asset inventory and byte preservation

The authoritative transfer manifest's **53/53 required files** pass size, SHA-256 and Git blob SHA-1 checks. The complete staged tree has **65 PNG inputs**, including existing-art overlaps and the menu/arena alias. There are **53 new unique runtime PNGs**, **11 staged Kit files reusing existing GUID-backed PNGs**, and **one menu alias reusing the arena image**. With the original 17 Unity PNGs, the runtime art tree has **70 unique PNGs** and no byte-identical runtime duplicates.

No source PNG was repainted, regenerated, cropped, recompressed, upscaled, alpha-flattened or matte-removed. Runtime PNGs are byte-identical copies or existing byte-identical assets. Only importer metadata changes texture resolution/mips for WebGL. Original GUIDs, pivots and source bytes remain intact. No production audio was imported or invented.

The complete per-file staging → runtime mapping, original dimensions, hashes, reuse flags and importer policy are in [PRODUCTION_ASSET_MAP.json](PRODUCTION_ASSET_MAP.json). Every catalog texture resolves through a checked GUID. The complete 70-texture residency inventory is in [PRODUCTION_RUNTIME_BUDGET.json](PRODUCTION_RUNTIME_BUDGET.json).

| Staging category | Files | Runtime integration |
| --- | ---: | --- |
| Kit / Idle | 1 | Authored idle in shared actor renderer |
| Kit / Run | 8 | Full numbered sequence at 12 fps; frames are animation, not directions |
| Kit / Side-Run | 4 | Existing `Assets/Art/Characters/Kit/Run/000..003.png`, GUIDs preserved |
| Kit / Side-Basic | 3 | Existing `Assets/Art/Characters/Kit/Basic/Side/000..002.PNG` |
| Kit / Back-Basic | 4 | Existing `Assets/Art/Characters/Kit/Basic/Back/000..003.PNG` |
| Kit / Abilities | 5 | Ember Step trail, Solar Ring graphic for Flame Burst, Last Flame graphic for Firestorm Ascent projectile, Expellant cast and blast graphics |
| Set / Basic | 4 | Authored basic sequence; first frame also serves idle because no separate idle was supplied |
| Set / Run | 8 | Native **437×431** images, unchanged; only visual-child world scale is normalized |
| Set / WarCry | 3 | Authored **000, 002, 003** order; no fabricated 001; cast pose plus authoritative buff marker |
| Set / PanthersFist | 2 | Impact VFX at actual Panther Fist resolution, separate from its committed telegraph |
| Riven / Idle | 1 | Authored idle |
| Riven / Run | 8 | Full numbered movement sequence |
| Riven / Scream | 2 | Actor cast pose and clearly separate ring effect for current Death Scream; filenames do not rename abilities |
| Riven / Scythes | 3 | Authored sequence on stable projectile visuals through orbit, outbound, parked and return phases |
| Environment | 7 | Arena/menu and Lane POV/select reference images; center-floor identity, Aether landmark, forest, waterfall and Saint Rose dressing |
| UI | 2 | Title branding; menu art aliases the byte-identical arena image |

Unique new runtime files live under `Assets/Art/Production/` with staging-relative names. The 11 already-present staged Kit images stay at their existing `Assets/Art/Characters/Kit/` paths. Kit front basic additionally uses the existing five GUID-backed front frames. The original idle/front and legacy configurations remain available for M0/M1 compatibility; they are not duplicated. `UI/Menus Art.PNG` is deliberately omitted from a second runtime location. The actual supplied waterfall filename is `Mountain - Waterfall.PNG`; its identity comes from the manifest, not a guessed alternate filename.

## Presentation architecture

`RosterPresentationCatalog` is serialized as `ProductionArt.asset` and explicitly bound in `CrownfallMatch.unity`. `ActorPresentationController` handles all three Summoners: authored frames, captured action direction, movement, mirroring, visual-child scale, foot placement, camera-aligned billboarding, depth sorting, contact shadow, team/status ring, hit flash, death hiding and respawn protection. Set's capsule and Riven's cylinder visuals are removed. Gameplay roots, controllers and radii are not rotated or scaled by presentation.

Animations use simulation time and accepted cast state. They stop with the simulation. They do not determine hit timing, cooldowns, movement or CC. Riven scream cast art and Set impact art are not mistaken for directional facings. Persistent Riven projectile references retain the same pooled visual across their actual blade lifecycle. Pulse projectiles use a small native energy ring rather than pretending they are released blades.

The typed `PresentationJournal` is a **256-entry output-only ring buffer**, with independent cursors for VFX, HUD and audio. Sequence/action metadata identifies accepted actions; projectile metadata retains the originating action/ability and hit events identify the target position. It emits casts, hits, death, respawn, blade phases, objectives, Surge and result events. Rejected casts emit nothing. Catch-up and repeated-reader tests protect order and deduplication. Simulation rules never consume the journal.

`ProductionVfx` preallocates **128 visual slots** with shared sprite/line materials. Projectile and committed telegraph objects retain their slot identity while alive. Cosmetic admission stops once 80 slots are occupied, leaving 48 available for projectiles/telegraphs; overflow drops presentation only. Trail samples are decimated. Releases clear keys, owner/action IDs, timers, sprite references, transforms, colors, mirroring, line positions/loop/width and active state. No transient Instantiate/Destroy cycle is used. No callbacks, trails, ParticleSystems or particle allocations are introduced.

`ArenaPresentation` composes three combined renderer-only structural mesh groups: monumental dark-stone colonnades/caps, warm Aether inlay/lane seams, and wilderness terraces. Shared procedural stone shading provides restrained weathering and two warm fixed daylight contributions without shadow-map costs. The supplied arena illustration is a menu/reference image, never a giant flat gameplay background. There are 21 bounded scenic billboard instances (forest, waterfall, red Saint Rose accents and Aether landmark), plus the center-floor logo. All decorative meshes/sprites are collider-free. Existing collision cubes, islands, spawn/camp/Major coordinates and map dimensions remain authoritative. Non-collision primitive helpers disable their generated collider immediately before destroying it.

Territory reads the existing front/control/Surge state: opaque subtle stone ownership tint, gold front/inlays, restrained simulation-timed Surge flow, and front-width reset after Surge. No second territory model exists. Camps and Canals use neutral medallion/vertical Aether-anchor meshes; the Major has its supplied Aether scenic landmark. No invented canon creatures are used. HUD feedback and team/status rings convey objectives, scoring pressure, buffs, CC, final life and protection.

## HUD, screen flow and mobile lifecycle

The player-facing UI is one retained, programmatic **UI Toolkit** tree. This fits the Built-in project without a third-party uGUI assembly; its engine dependencies are declared and compiler-checked. A programmatic theme, explicit styling and Unity 6000's built-in `LegacyRuntime.ttf` provide branding, menu, three portrait/select cards, match HUD, pause, results and replay/menu actions. Labels/positions update on a bounded 10 Hz cadence; touch-pad placement and knobs update per frame. Actor labels use camera-up offset to sit above billboard art.

The landscape layout targets a safe 960×540 logical surface: minimap/roster left, timer/tickets/CP/control/pressure center-top, pause right, movement lower-left, independent aim and labeled skills/basic/ultimate/special. Ability controls are display-only and provide five retained, noninteractive future icon slots that remain hidden without supplied art; no fabricated final icons or additional cast path exists. `MatchTouchInput` still creates every gameplay cast. Pointer pause toggles through one retained button callback; the legacy sampler cancels targeting on pause press without also toggling pause. Keyboard Escape remains supported.

Control editor move/resize/opacity/Save/Cancel/Reset and the `Crownfall.Controls.v1` saved format are preserved. Only this configuration tool retains IMGUI; the player-facing match/menu/results HUD uses retained UI. Save still rejects overlapping controls. Safe-area and local-status/default-control overlap tests cover multiple landscape/taller aspects.

CSS `env(safe-area-inset-*)` values are measured and sent as normalized insets. CSS never pads/shifts the canvas. Unity intersects them with `Screen.safeArea` and scales the logical UI inside that surface, preventing double insets. The template preserves all WebGL export tokens, removes prototype M0 labels, and shows a restrained portrait rotate hint. It handles blur, pagehide, visibility, resize, orientation and touch cancellation; missing finger-end states are canceled by a tested shared input-ownership state. Focus/pause/death/stun/resize resets clear queued casts, targeting, held basic and pending human second-blade input. Resuming requires deliberate input; no delayed release is replayed.

The existing 50° orthographic camera/projection is retained. Visible ground-frustum bounds clamp desired and interpolated position, including wide-aspect arena edges. Movement and targeting look-ahead are bounded to 0.6 world units each, targeting never rotates the camera, respawn reframe is smoothed, warp frames do not trigger false run animation, pause freezes following, and results reframe toward center.

`ClearWorld` resets input, VFX, generated meshes, material caches, audio cursors/voices and camera target, then destroys the inactive world. It clears stale territory/front/material/projectile references. The retained HUD and audio sources are reused across rematches and disposed on component destruction.

## Gameplay preservation

No combat/economy/bot rule or numerical value is redesigned. Additions to core are output journal/action metadata and a reusable input cancellation state. Input hardening addresses lost fingers and focus/viewport cancellation; it does not change targeting ranges, cooldowns, accepted ability timing or damage.

The following remain intact: 3v3/five bots, roster, X/Z simulation/native motor, collision topology and all objective/spawn positions; tickets, final returns, elimination, protected respawns; territory front, pressure grace, CP, one-time 70% Surge and Canals; camps/Major rewards; Kit combos, Ember streak and blast grant; Set War Cry/contact combo/committed Fist; Riven stance/shared cooldowns and outbound/parked/return lifecycle; bots' macro rotations; independent move/aim and menu → select → countdown → match → results → replay/menu.

`compare_gameplay_baseline.py` compiles and executes both actual source revisions, extracting the baseline read-only into a temporary directory. It hashes public authority state at **every tick** of three complete bot matches, excluding only the new `Presentation*` output metadata. Results match the starting commit exactly:

| Roster | Total stepped ticks (including countdown) | Authority SHA-256 |
| --- | ---: | --- |
| Kit | 9537 | `21d58305a65aeeca2d9f926676953ba0d0450e58f120dcb108663d984da50cc5` |
| Set | 2716 | `fbf2a2d5118d91fce125628bfe45c64bd294d78305190c1b1789961a3052394c` |
| Riven | 8900 | `1abe9d8e3df5d6ef35b671b54540dbe2a4258ef41fe7add78d7e9ab5dc7bd1a6` |

No bot/navigation rewrite was needed. Flood-fill checks of the actual preserved map reach all six spawns and seven objectives. Decorative dressing adds no collision routes or obstacles.

## Audio and module dependency audit

`MatchAudioDirector` provides a nullable clip bank, menu/match/results music states, gameplay/UI events, Master/Music/SFX/UI categories, **12 shared SFX/UI voices**, **one music source**, and **one listener** on the gameplay camera. It gates playback until interaction, relies on Unity's WebGL audio backend for browser unlock, drops excess voices, skips stale events and stops voices on focus/pause/rematch. Every bank clip is unassigned; the game is intentionally silent and zero-clip safe. Physical browser audio-unlock behavior needs device verification when production clips become available.

Added engine packages: `com.unity.modules.audio`, `com.unity.modules.ui`, `com.unity.modules.uielements`, each `1.0.0`. Existing IMGUI, Physics and JSON modules stay enabled. The compiler maps all manifest modules, including UIElements native and both TextCore engines, requires actual DLLs, rejects unmapped packages and missing API dependencies, and checks a versioned SHA-256 inventory of the reference assemblies. UI Toolkit explicitly requires its UI dependency. No particles, uGUI, networking, image-conversion, native plugins, URP, VFX Graph or platform-specific C# branch is introduced. Linker preservation covers runtime-created UI document/panel, audio source/listener and existing primitive components.

CI now runs production validation, whole-script Bash syntax, complete-match/presentation suites and real module API compilation. The pinned available reference bundle is **UnityEngine.Modules 2021.3.33**, not Unity 6000. Its binary fingerprints prevent quietly relabeling it. A different genuine Editor bundle needs its own verified inventory through `CROWNFALL_UNITY_REFERENCE_INVENTORY`. Exact 6000 UIDocument/PanelSettings APIs were also inspected read-only against Unity's `6000.3.10f1` source, but this is not native Editor execution.

## Runtime budget and placeholders

| Resource | Policy / estimate |
| --- | --- |
| Characters/basic/action/scythes | Max 512, no mipmaps, clamp, source alpha, non-readable, explicit uncompressed WebGL RGBA32 |
| Set run | Native 437×431 retained; max 512 is a ceiling, not an upscale request |
| Environment, arena/menu/select, title | Max 1024; same no-mip/non-readable RGBA32 policy |
| All 70 textures | Estimated **83.73 MiB** art texture residency; no retained readable CPU copy assumed. Dynamic font atlases/framebuffers/engine overhead are additional runtime measurements |
| Baseline texture estimate | Original 17 full-size RGBA32 textures with mips: approximately **135.97 MiB** |
| Estimated raw texture-content delta | Approximately **−52.24 MiB**, despite added art, through deliberate WebGL import limits |
| Actual compressed build-size delta | **Unmeasured**: gzip data, added UI/audio engine code and native import/export need Unity; PNG disk sizes are not used as residency estimates |
| Materials | Approximately 14 match-owned shared tint/flow/shadow materials plus shared sprite/overlay templates; no per-actor/effect material instances |
| Draw groups | 3 combined decorative structural meshes, existing opaque arena/territory/objectives, texture/sort-dependent sprite groups, shadows/status lines, bounded VFX, one retained UI panel; actual draw calls pending Frame Debugger |
| Generated geometry | 5 shared meshes, structural groups below 2048 vertices each; finite/index/bounds checks on actual pure geometry builders |
| Transparency | No giant transparent arena backgrounds; one floor logo, 21 scenic instances, six actor sprites/shadows/status lines, brief ability-local effects |
| VFX / particles | 128 slots; stop cosmetic admission at 80 occupied; **0 particles / ParticleSystems** |
| Audio | 12 SFX/UI voices + 1 music source; one listener; zero clips |
| WebGL heap | Existing **64 MiB initial / 256 MiB maximum** and growth policy unchanged |

Remaining intentional placeholders are labeled ability controls without final icon artwork, neutral camp/Canal structures without supplied creature art, Set idle using a supplied basic pose, and silent unassigned production audio. No missing roster body uses a primitive placeholder. Geometry/shader composition is a production candidate translation of the supplied direction; visual quality, layering and performance still require play-mode/device acceptance.

## Validation commands and results

Commands ran in the Codex environment; none invoked Unity Cloud Build or deployment.

```bash
export CROWNFALL_DOTNET=/workspace/scratch/dotnet/dotnet
export CROWNFALL_UNITY_REFERENCE_DIR=/workspace/scratch/unityengine/lib/netstandard2.0
export CROWNFALL_UNITY_REFERENCE_VERSION=2021.3.33
python3 Tools/compile_match_runtime.py
python3 Tools/validate_current_build.py
python3 Tools/validate_m0.py
python3 Tools/validate_m1.py
python3 Tools/run_complete_match_tests.py
python3 Tools/compare_gameplay_baseline.py
python3 Tools/validate_production.py
for file in ci/*.sh; do bash -n "$file"; done
git diff --check
node --check /workspace/scratch/productionization/template.js
```

The final Node command checks an extracted, byte-preserved script block from the WebGL template. Scratch files and SDK/reference downloads are outside the repository.

- Full runtime compile: **46 runtime C# files**, real manifest-enabled assemblies, netstandard2.1, warnings as errors: **0 warnings / 0 errors**. References are verified **2021.3.33**; no fake stubs and no claim of Unity 6000 Editor/player compilation.
- Current build, M0 and M1 static validation: pass, including syntax, serialized combat data, original PNG hashes/pivots, references, enabled scene/editor pin and WebGL template.
- Compiled suites: **M1 75**, **economy 13**, **roster 16**, **Surge 18**, **complete match 127,037**, **presentation 86,076** assertions pass.
- Complete match simulations conclude with Kit at 155.95 s, Set at 42.27 s and Riven at 145.33 s; aggregate 46 deaths, 33 rotations, 2 rewards and 3691 Major-attempt ticks.
- Baseline comparison: all three per-tick authority hashes match the starting source.
- Production tests exercise journal overflow/order/independent readers/rejected casts/catch-up, hit identity/position, all blade phases, frame order, 40 rematch/pool resets, caps/idempotent release, finite/index/bounds geometry, frustum/aspect math, safe area/default-layout overlaps, real shared input reset/multitouch/missing-end/focus cancellation and preserved-map reachability.
- Static production validation: 53 transfer size/SHA/blob proofs; all 65 staging mappings byte-identical; 70 unique runtime images; catalog frame order; source/import policies; module/reference/GUID checks; all JSON, Unity YAML and workflow YAML; all `ci/*.sh` Bash syntax; presentation authority/collider/pool reset/rematch/JS lifecycle guards pass. C# parser/unique GUID gate: **60 files / 211 GUIDs**.
- Fail-closed negative harness cases pass: remove Audio/UIElements/UI/JSON/Physics declaration; remove the UIElements DLL; relabel the old bundle as 6000.3.10f1. Each fails rather than silently compiling with an unrelated/all-module bundle.
- `git diff --check` and WebGL template JavaScript syntax pass.

`ProductionArtValidation.Validate()` is now a Unity prebuild gate and Editor menu action. It loads every required catalog sequence/effect/environment/brand binding, verifies native TextureImporter policy and runs the presentation tests. That native gate was **not executed here**, because no Unity Editor/runtime is installed.

## Remaining Unity-only risks and the next single-build acceptance checklist

Local source/API/core evidence cannot execute Unity importers, glyph/UIToolkit panel rendering, native physics, shader compilation, stripping, IL2CPP, WebGL decompression or Safari. No physical iPhone was available. There is no known remaining source-level gameplay blocker, but the production candidate is not a claim of visual/device acceptance. The actual compressed build delta, peak heap/GPU residency, frame rate and draw calls remain measurements to collect.

For the next user-authorized **single Unity 6000.3.10f1 build**, use this branch's final SHA and complete the following before requesting further builds:

1. Confirm exact Editor version and module resolution. Run M0, M1, Framework, Complete Match and Production Art validation in Unity. Verify all 70 imports, WebGL overrides, title/actor sprites, shader compilation and native GUID references. Then export once; inspect stripping/IL2CPP logs for all declared UI/TextCore/Audio/Physics/JSON modules.
2. Open on iPhone 12-class Safari in landscape. Verify loading/progress branding, decompression fallback, crisp title and all three select portraits; enter each roster and reach countdown → live 3v3 → results → replay → menu without exceptions.
3. Verify Set has no capsule body and Riven no cylinder body. Inspect Kit eight-frame/front/back/side presentation, Set's native low-resolution run, war cry and actual Fist impact, Riven stance and scream, and two stable blades through release → parked → recall → orbit. Confirm effects never change hit timing or cooldowns.
4. Inspect dark-stone enclosure, broad stone lane, gold inlays, center logo, forest/waterfall/rose/Aether framing and team control. Run around every old island/boundary and to all seven objectives. Decorative art must not create blockers; use the Editor hierarchy/physics inspector to confirm no scenic colliders.
5. Verify each camp/Major capture feedback/buff, Canal health/destruction, Surge activation/flow/end, scoring grace/CP, protection, hit/stun/buffs, ticket exhaustion, final return/final life and elimination. Compare displayed ranges/telegraphs with actual gameplay.
6. Test simultaneous move/aim/ability fingers, quick taps, held basics, directional/ground/self skill drags and cancel distance. Pause while targeting, open control editor and exercise move/resize/opacity, Save/Cancel/Reset and an existing v1 saved layout. No duplicated cast/pause or queued release may occur.
7. Test both landscape orientations/notch sides, Dynamic Island, browser chrome expansion/collapse, viewport resize, portrait rotate hint, task switch, background/foreground, screen lock and touch cancellation/lost end. Resume with a new gesture. Check safe insets only apply once, status/controls do not overlap and no delayed cast fires.
8. Move/aim at every arena edge/aspect, cancel targeting, die/respawn and reach results. Confirm bounded look-ahead, stable orthographic pitch, visible-ground clamp, pause freeze and smooth respawn/results framing.
9. Run at least five replay/menu cycles, including switching roster. Inspect hierarchy/material/mesh/VFX counts after disposal: no retained old world, projectile keys, callbacks, ghost blades, trails, UI trees, extra listeners or voices. VFX never exceeds 128 slots; particles remain zero; audio sources remain 12 + 1.
10. With zero production clips, confirm silent operation without audio warnings/exceptions, focus cleanup and UI flow. Once real clips are assigned in a later authorized art/audio pass, verify Safari interaction unlock and category volumes; do not synthesize clips for this acceptance.
11. Capture Unity Profiler/Frame Debugger and Safari memory/performance evidence during repeated fights and rematches. Record actual texture formats/sizes/residency versus 83.73 MiB estimate, import peak, heap/GPU totals, frame rate, transparent overdraw, material/draw counts and gzip build delta. Keep the existing 64/256 MiB heap policy unless measurements justify a separate decision.
