# Crownfall Arena — playable PlayCanvas 3v3

Task 004 makes the existing arena a playable Blue versus Red match: one human Blue Summoner and five independent bots. Choose Kit, Set or Riven, press **Start match**, and fight after the visible three-second countdown. Task 003 remains the only lifecycle authority. Unity files and existing kit balance remain preserved.

The normal HUD shows tickets, elapsed time, team health/respawn/final-life status, kills and match results. **Restart match** returns to a clean prematch. The **Debug** link (`?debug=1`) opens the retained Task 002A training sandbox and Task 003 lifecycle diagnostics. The diagnostic instructions below apply in that mode.

## Run

Requires Node 22.23.2+ (verified with Node 24.19.0).

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open http://localhost:5173 in landscape. Production preview: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/

## Packed-earth battleground (Goal 009)

Competitive matches use Poly Haven's CC0 `dirt` and `dry_ground_rocks` PBR scans.
The continuous flat lane feathers into rocky soil, sparse embedded gravel and
textured embankments, with no paving slabs. Five static batches share six 1K maps
(albedo, OpenGL normal, packed AO/roughness for each surface). Custom meshes have
normal/tangent streams; soft actor contact discs avoid full-scene shadow maps.
Raised relief stays within existing obstacle footprints or outside map bounds.
Riven's approved Azure Moonreapers now normalize to **0.60 m** (Goal 010).

- `?environment=legacy` restores the original floor and obstacle presentation.
- `?territoryTint=0` disables floor tint while retaining the authoritative gold
  frontier, team discs and HUD.
- `?verify=1` enables the established deterministic developer fixtures.

See [Goal 009 verification](TASK_009_VERIFICATION.md) for matched captures,
asset sources, measured allocation/frame costs and device limitations.

## Wilderness showcase (Goal 010)

The western boundary now frames play with all four approved Meshy tree species:
maple, pine, red oak and redwood. Eleven deliberately placed trees share geometry
and materials per species; their rotated canopy bounds remain outside movement
limits. Heights vary from 5.4 to 12.2m. CC0 sparse-grass and leaf-litter scans
feather across the bank and selected outer Wilderness ground; low blade fans and
rocks remain outside play. The original packed-earth lane is preserved.

Source GLBs stay unchanged. Runtime variants retain their geometry/materials and
reduce only embedded images to 512². Trees begin loading after the match starts
and character imports settle; rematches reuse them. The existing legacy renderer
and primitive/local character diagnostics remain available.

## Six-summoner 3D presentation (Goal 007E)

Normal matches display both teams' Kit, Set and Riven models without preview flags.
Every actor has its own skeleton, animation controller and facing transform; the
scene downloads each required GLB once and shares meshes, materials, textures and
corrected animation tracks. Actor identity comes from match combat data, including
Blue roster reordering after selection. Team discs, labels and health bars retain
Blue/Red visibility without recoloring the characters. Hit/protection/stun feedback
also appears on the discs. Wilderness creatures keep their existing presentation.

Kit retains Idle_5 / RunFast and its established punch response. Riven uses Idle_6 /
Running; run_fast_7 remains excluded. Set uses the temporary Ready pose / Running;
RunFast remains excluded. Horizontal hip corrections, fixed grounding and visual
scales are preserved. Animation never moves gameplay roots or controls damage.
Models remain cached through ordinary respawns and rematches. Abandoned actor views
are disposed; scene teardown unloads the shared containers. Pending or invalid
imports retain moving primitive fallbacks.

Developer URL options:

- `?models=primitive` skips all character downloads and uses the original primitives.
- `?kitPrimitive=1`, `?rivenPrimitive=1`, `?setPrimitive=1` force one identity's fallback.
- `?kitModel=10k` retains Kit's original static comparison.
- `?summonerModels=local` isolates the old local-only presentation for diagnostics;
  Riven/Set then require `rivenPreview=1` / `setPreview=1`.
- `?debug=1&rivenPreview=1` or `?debug=1&setPreview=1` preserves isolated training previews.

`window.__crownfall.snapshot().summonerModels` reports each actor's identity, team,
instance/resource IDs, animation state/time, position/facing and visibility.
`modelAssets` reports unique load counts/timings, cached bound calculations and
PlayCanvas GPU allocation counters. The existing `kitModel`, `rivenModel` and
`setModel` local inspection fields remain available. Detailed world bounds are
computed only for requested diagnostic snapshots, never during normal updates.
See [Goal 007E verification](TASK_007E_VERIFICATION.md) for evidence and remaining
physical iPhone Safari validation.

## Controls

- Select Kit, Set or Riven at the top. Reset sandbox restores the selected character and targets; defeat otherwise remains final.
- WASD/arrows or the left joystick move. Mouse aiming and the right ability controls remain independent of movement.
- Kit/Set Basic repeats while held. Hold/drag other abilities to aim and release to cast. Pointer cancellation, lost capture, blur and hidden pages clear input.
- Riven Basic casts only on release. A quick tap under 180 ms snapshots press facing; hold/drag confirms preview aim. The second Reso scythe follows at the existing 0.48-second cadence, using that confirmed angle. A subsequent Basic recalls both.
- Keyboard: Space Basic, Q Skill 1, E Skill 2, R Ultimate, F Riven stance / Kit's earned Expellant Blast. Keyboard skills cast directly; touch buttons provide directional/ground targeting.
- Ultimates start at zero and require 100 meter plus their cooldown. Damage to/from enemy Summoners earns meter. The explicitly labeled debug charge button supports isolated ultimate testing. Receive-damage debug supports checking mitigation, received meter and defeat.
- Set's ground ultimate locks its world target; Riven's stance control sits above Basic. Expellant appears only while its earned grant is available.

Primitives represent targets, health bars, projectiles and combat effects. Purple targets are stunned. Diagnostics list target IDs, health, active statuses and selected stance; buttons show cooldown or required ultimate charge. Target positions include nearby groups, a piercing line, an ally and a non-Summoner object. Targets do not attack or respawn.

## Architecture and parity

- `src/combat/`: adapted Version 21 definitions, geometry, transactions, cooldowns, modifiers, advanced timelines, returning weapons and a device-independent release-confirmed command controller. `ability-input.js` binds that controller to the existing HUD. Plain JavaScript modules retain the reference's data-driven rules; declaration files describe the TypeScript integration boundary.
- `src/combat/sandbox.js`: selected-character setup, existing PlayCanvas arena collision geometry and diagnostic targets. Tagged-Wilderness passive seam exists, but this arena supplies no Wilderness zones.
- `src/gameplay/`: presentation-facing state and original movement regression harness. Runtime movement comes exclusively from combat; presentation reads it.
- `src/input/`: independent movement/mouse intentions; `src/ui/`: mobile controls and diagnostics.
- `src/presentation/`: PlayCanvas arena/camera, shared character containers and independent actor presenters. Animation and graphics never determine damage timing.

See [COMBAT_PARITY.md](COMBAT_PARITY.md) for source provenance, adaptations and acceptance limits. Task 004 adds bot command generation and a normal match HUD on top of Task 003 tickets/respawns. Territory, networking, new artwork and audio remain outside scope.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run fmt
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Alternatively install Playwright Chromium with `npx playwright install chromium` and omit `CHROMIUM_PATH`. Production-browser tests serve `dist/` at port 4173 and exercise actual DOM controls, including CDP multi-touch. Screenshots and browser traces/results remain ignored under `test-results/`.

The existing `Publish Crownfall PlayCanvas Preview` workflow publishes this directory to `/playcanvas/` while preserving the Unity-hosted root. Physical iPhone Safari acceptance is still required for multi-touch feel, safe areas/orientation and sustained GPU performance.

## Task 002A mobile acceptance

Reset or select a Summoner, then face the gold **MOBILE TEST** enemy: its center is 1.11 m from reset spawn at `(0.65, 4.1)`. Other geometry targets stay in their original positions. No combat ranges or target health have been widened/reduced for this test.

- Kit/Set: press Basic or hold to repeat. Even a press/release entirely between ticks retains one initial attempt. Unbuffed first hits are 110 / 90 respectively.
- Riven: hold to preview, then **release**. Holding alone does not fire. Two outbound scythes deal 75 each to this target; another Basic recalls them. Pulse is also release-confirmed.
- Try Kit Solar Ring / Ember Step, Set Predatory Combo / Panther Fist, and Riven Elf Dance. The touch tests verify these through real PointerEvents and authoritative transactions.
- Target flash/pulse, floating damage numbers and the large HIT/MISS banner confirm actual results. ACCEPTED while travelling is distinct from HIT; MISS waits for the authoritative action/projectile to finish. Buff/stance actions report DONE rather than a false miss.
- The HUD reports cast acceptance/rejection reason, latest ability, distinct target count and latest damage transaction. World previews use the selected ability's cone, width/range, radial radius, clamped ground point or recall paths. Drag direction is derived from the actual PlayCanvas camera.
- The Version 21 150 px cancellation distance is unchanged; a cancelled preview turns red and explicitly says CANCELLED. Cancellation does not commit an action. An already accepted held-repeat attack cannot be undone retroactively.

See [TASK_002A_VERIFICATION.md](TASK_002A_VERIFICATION.md) for reproduction evidence, tests and remaining physical Safari checks.

## 3v3 lifecycle sandbox (Task 003)

Enable **3v3 lifecycle**, choose a Blue human Summoner, and press **Start countdown**. Both teams contain Kit, Set and Riven; the other five actors remain stationary. Use the inspected actor selector and debug damage/lethal buttons to test ticket and final-life exhaustion. **Debug: advance 5.1s** runs ordinary fixed ticks through respawn and protection; **Reset sandbox** creates a fresh prematch. The status panel shows all six actors, tickets, final respawns, protection, records and results. Disable the checkbox to return to the original touch-combat training layout.

See [Task 003 verification](TASK_003_VERIFICATION.md) for the frozen reference, lifecycle assertions and remaining physical iPhone acceptance.

## Playable match integration (Task 004)

`CrownfallMatch(selected, { bots: true })` supplies separated, collision-free team spawns and five command controllers. Its default diagnostic constructor remains unchanged for lifecycle regression tests. Bot commands pass through the existing simulation and cast/cooldown/target filters; they never assign health, tickets or life state. Bots sample enemies and aim every 220–380 ms, route around expanded obstacle corners, pursue, strafe or retreat at low health, and cast available skills/ultimates and Riven stance changes. Attack decisions are spaced independently of authored cooldowns.

Player controls and Riven release semantics are unchanged. The normal HUD supports landscape and portrait touch viewports. All six actors have labels, health and cast feedback; projectiles/effects from all six simulations are presented. Only the human owns input and camera follow. A dead human spectates from its last camera position while team status and results continue updating.

See [TASK_004_VERIFICATION.md](TASK_004_VERIFICATION.md) for validation and remaining limits.
