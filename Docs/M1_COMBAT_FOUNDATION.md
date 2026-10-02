# Crownfall M1 — combat foundation and Kit Solar Whip

Baseline: `af88eaed1cb0408873dbe1e692ae6a9254510bef` on `main`.
Unity remains `6000.3.10f1`. No package, build-target or cloud pipeline changes.

## Authoritative V21 behavior

Inspected the supplied frozen browser reference (`5a73918`), specifically
`src/combat-data.js`, `src/combat.js`, `src/combat-core.js`,
`src/character-visuals.js`, and `tests/combat.test.js`.

**The browser's two-hit combo means two successive casts, not two timed hits per cast.**
The first accepted cast deals 110 immediately. A second accepted cast within
1.25 seconds of the previous accepted cast deals 150 immediately. Further timely
casts alternate 110/150; a gap greater than 1.25 seconds resets to 110.
Misses still advance the combo and consume cooldown, as in V21.

| Rule | V21 value carried into M1 |
| --- | --- |
| Basic | Solar Whip |
| Range | 2.8 world units |
| Full cone arc | `Math.PI * .65` = 117 degrees |
| Damage | 110, then 150 on the next timely cast |
| Hit schedule | One event at time zero per accepted cast |
| Cooldown | 0.55 seconds from accepted cast |
| Combo window | 1.25 seconds, inclusive |
| Movement | No basic-attack movement lock or speed reduction |
| Aim | Confirmed direction captured for the attack; movement does not change it |
| Targets | All living enemy combatants in footprint; no summoner-only filter |
| Footprint | Range expanded by target radius; cone angular test plus edge-segment distance tests |
| Terrain | No line-of-sight/obstacle blocking test, matching browser cone query |
| Basic artwork | Six logical frames, 12 FPS, non-looping |
| Kit maximum health | 650 |
| Training dummy health/radius | 1800 / 0.52, from browser TRAINING data; configurable fixture values |

Browser cast rejection also covers dash/stun/other casting locks and match rules.
Those systems do not exist in M1 and have not been invented here. M1 rejects
dead/inactive owners, invalid aim and attacks during cooldown. Cancelling an
unconfirmed targeting gesture causes no cast. An already delivered immediate hit
is not undone. The reusable timeline has an explicit interruption seam, retains
cooldown, and can suppress future scheduled events; there are no M1 status effects.

The browser also supports a held-basic repeat command. Per this milestone's
explicit input requirement, M1 connects the existing M0 directional **confirmation**
to one cast. Holding the pad continues to aim; release confirms. There is no new
auto-repeat input policy or rewritten mobile adapter. Radial remains non-damaging.

V21 declares a 0.26-second whip VFX lifetime. M1 imports no VFX. Its orange wire
cone is diagnostic and remains visible through selection/recovery, not final VFX.

## Architecture

- `Combat/Core` is pure C#: bounded health state, damage request/result, explicit
  enemy filter, immutable authored-data snapshot, mutable attack timeline,
  combatant registry and radius-aware X/Z cone query. No Unity/rendering/input
  dependency. Results retain source/target/attack/hit provenance for later feedback
  or modifiers; no shields/buffs/mitigation systems are implemented.
- `BasicAttackDefinition` is a ScriptableObject. Range, angle, cooldown, combo
  damage/window and hit schedule belong to authored data, not the sprite code.
- `Combatant` owns health on gameplay roots. It publishes completed damage
  transactions; observer exceptions cannot interrupt damage delivery to targets.
  Defeated/disabled combatants cannot be targeted or damaged.
- `BasicAttackExecutor` is a separate component on the existing Summoner root.
  It runs after M0 movement/input, consumes each new directional confirmation,
  snapshots origin/direction, and executes the time-zero query immediately.
  It tracks elapsed simulation time, combo, phase, event execution, recovery and
  completion. Elapsed time is independent of sprite playback. App focus/pause
  suspends its clock; the existing M0 input reset is untouched.
- Queries enumerate registered gameplay combatants in stable ID order. A visited
  ID set prevents repeated candidate/collider-derived entries from multiplying a
  scheduled hit. No rigidbody impacts, collider callbacks, forces or sprite bounds.
  Defining multiple hit times later is supported and tested, but Kit has only `[0]`.
- `KitSpritePresentation` reads only `IAttackViewState` for basic priority and
  captured facing. It does not start attacks or apply damage. Swapping to the
  primitive child leaves the executor/health/query on the root active.
- `M1CombatFixture` is added to the existing scene composition object. Its Start
  attaches combat to the M0-created root and creates one red primitive enemy at
  `(2, 0.05, -4)`. The target visual has no collision authority. The target is
  stationary, has no AI and turns gray on defeat. A diagnostic-only health reset
  allows repeated testing; there is no automatic respawn/match lifecycle.
- Diagnostics show accepted/rejected cast, combo step, scheduled-hit count,
  number of targets hit, cooldown, health, last damage and defeat. An orange
  2.8-range/117-degree cone supplements the unchanged M0 aim arrow/radial preview.
  The old M0 label's `No damage` text was corrected; no HUD redesign.

Recovery lasts 0.55 seconds. Basic presentation takes priority throughout it.
Frames advance at the source 12 FPS; final reused idle starts at 5/12 seconds and
holds through completion (including the final 0.05 seconds after the six-frame
0.5-second clip). Then current idle/run resumes. Rendering may skip frames under
load, but cannot skip or duplicate simulation hits. A later 3D presentation reads
the same state without changing combat. There is no animation-event authority.

## Exact artwork mapping

| Original ZIP entry | Unity asset / logical frame |
| --- | --- |
| `kit-asher/basic/000.png.PNG` | `Assets/Art/Characters/Kit/Basic/000.png` — Basic 0 |
| `kit-asher/basic/001.png.PNG` | `Assets/Art/Characters/Kit/Basic/001.png` — Basic 1 |
| `kit-asher/basic/002.png.PNG` | `Assets/Art/Characters/Kit/Basic/002.png` — Basic 2 |
| `kit-asher/basic/003.png.PNG` | `Assets/Art/Characters/Kit/Basic/003.png` — Basic 3 |
| `kit-asher/basic/004.png.PNG` | `Assets/Art/Characters/Kit/Basic/004.png` — Basic 4 |
| `kit-asher/basic/005.png.PNG` | Reuses `Assets/Art/Characters/Kit/Idle/idle.png` — Basic 5 |

Only five textures are added. All match the supplied SHA-256 hashes; their bytes
were extracted unchanged. All are 1254 × 1254 RGBA PNG with actual alpha range
0–255. No drawing, resampling, matte processing, re-export or duplicate 005.
`Docs/KitBasicSourceManifest.json` records exact hashes, source entries and GUIDs.
No run/ability/other ZIP assets were imported. Existing approved four-frame run
and idle bytes, references, GUIDs, pivots and settings are unchanged.

New basic frames inherit the approved idle importer: Sprite/Single, source alpha,
alpha transparency enabled, Clamp, trilinear/mipmaps, uncompressed, max 2048,
no NPOT resize, 500 pixels/unit, no readback or generated sprite physics shape.
They use the existing idle normalized pivot `(0.510366826, 0.051036683)`.
No root/collider/visual scale or offset was changed. This deliberately avoids
guessing per-frame art corrections; foot alignment still needs device inspection.
The five new textures and all new Unity files have unique new GUIDs. Every
pre-existing `.meta` file remains byte-identical.

## Validation and delivery

Local validation executes 71 assertions against the actual C# core using Mono,
with compiler warnings treated as errors. The suite covers cone/radius boundaries,
self/friendly/disabled/dead rejection, enemy hits, deduplication, damage bounds,
defeat, timing, cooldown, combo cycling/expiry, immutable direction/data,
repeated/re-entrant ticks, skipped render intervals, interruption and registry IDs.
Synthetic multi-event tests validate the generic scheduler without adding extra
hits to Kit. `M1Validation` runs the same suite and real Unity importer/frame/data
checks before a Unity build. Existing M0 build-time targeting checks remain intact.

Python gates check all ten Kit textures, exact hashes/order/alpha, reused idle,
all Unity GUIDs and serialized references, C# syntax, importer settings, data,
scene attachment scope, and byte equality of 90 preserved baseline project files.
No Unity Editor, cloud build, or iPhone runtime was executed locally.

Delivery contains `Crownfall-Unity-M1-Kit-Basic.zip` and `import-unity-m1.yml`.
Upload the ZIP unchanged to repository root and add the workflow at
`.github/workflows/import-unity-m1.yml` on `main`. Run **Import Crownfall M1 Kit Basic**.
Do not unzip manually and do not run the old M0/M0.1 import actions for this patch.
The workflow validates baseline, exact ZIP SHA-256, exact members and per-file
hashes, paths/types/sizes/CRC, runs Python checks and compiled core tests, then
stages only the explicit patch files and commits. No files are deleted.
All referenced delivery archives are supplied; the importer does not need
`kit-asher.zip`, `side-run-idle.zip` or earlier patch archives.

After import, use the existing Unity Cloud Web build configuration, then test:

1. Cloud C# compilation, asset imports, prebuild M0/M1 gates and scene startup.
2. At initial position, right-facing directional tap hits the red dummy: 1800→1690.
   A second confirmation after 0.55 seconds but within 1.25 seconds gives 1690→1540.
   Earlier confirmations are rejected; a longer gap returns to 110 damage.
3. Aim/move independently; move while attacking without lock. Attack aim stays
   captured even if a new aiming gesture begins. Check cone edges, range plus
   0.52 target radius, misses, behind-target rejection, and radial no-damage.
4. Hold/drag/release, cancel, focus loss, pause and landscape rotation must retain
   M0 behavior with no duplicate or accidental confirmation.
5. Repeat to zero; gray defeated target must stop receiving hits; diagnostic reset
   restores the fixture. Check health/hit readout and reset button on touch.
6. Swap sprite/proxy during an attack and repeat all combat tests: identical damage
   and cooldown, unchanged movement/collision/camera.
7. Check new PNG alpha, grounding, right/left flip, six-frame cadence and return to
   existing idle/run. Accepted run-art/fixture-occlusion debt remains untouched.

M1 stops here. No abilities, passive, combat VFX, respawns, match systems, other
Summoners, bots, networking or M2 work.
