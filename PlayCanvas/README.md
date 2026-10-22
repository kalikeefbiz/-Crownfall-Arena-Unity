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

## Riven 3D developer preview (Goal 007C)

Open `http://localhost:5173/?rivenPreview=1`, choose **Riven**, and press
**Start match**. The same opt-in works with `npm run build` / `npm run start`
on port 4173. Published preview (after the branch's publish workflow succeeds):
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/?rivenPreview=1>.
For an isolated movement preview in the existing training scene, use
`?debug=1&rivenPreview=1`, then select **Riven**; no countdown is needed.

WASD/arrows or the existing left joystick move Riven; ability aiming retains the
existing facing priority. This previews the model's idle/run presentation only.
Existing Riven simulation/abilities are unchanged, and Kit's punch/combat animations
are not mapped to Riven. The normal default remains unchanged without the flag.

`Idle_6` blends into `Running` in 0.12 seconds. The preferred `run_fast_7` failed
loop validation after horizontal hip correction, so only `Running` is registered
as the running state. `Walking` remains available for future speed modes.
`?rivenPreview=1&rivenPrimitive=1` forces the original primitive without fetching
the model. Failed/pending imports also keep that primitive and the existing controls.
Kit's normal animated model and `kitModel` / `kitPrimitive` comparisons remain available.

Inspect `window.__crownfall.snapshot().rivenModel` for load state/timing, clip and
loop-selection evidence, active state/time, fixed transforms, hip position, and
fallback visibility. See [Goal 007C verification](TASK_007C_VERIFICATION.md) for
asset validation, regression checks and remaining physical mobile acceptance.

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
- `src/presentation/`: PlayCanvas arena/camera and replaceable primitive presenter. Animation and graphics never determine damage timing.

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
