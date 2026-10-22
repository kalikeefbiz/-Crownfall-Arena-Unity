# Goal 007C — Riven 3D presentation integration

Riven is an opt-in animated presentation in the existing PlayCanvas scene.
Add `?rivenPreview=1`, choose **Riven**, and start the match. For training use
`?debug=1&rivenPreview=1`, then choose **Riven**. The latter also displays
**RIVEN 3D · DEV PRESENTATION ONLY** in the developer HUD. Existing Riven controls
and simulation remain authoritative; no Kit combat/attack animation is assigned
to Riven. No model download occurs without the flag, for other summoners, during
competitive prematch, or with `&rivenPrimitive=1`.

## Supplied asset

The branch supplied `Riven_Animated_GLB.zip` at the repository root, rather than
under `PlayCanvas/` as named in the task. Its sole member was extracted to
`public/assets/summoners/riven/Riven_Animated.glb`. ZIP CRC and exact member/binary
comparison passed before the staging ZIP was removed. Source bytes are unchanged:

- **11,170,312 bytes**, SHA-256
  `ba2cb5d72eb2bcfe272c59a50b06a594100a5ac3ceac8f6af457c243c6a5de61`.
- One mesh, material and skin; **68 joints**, 18,349 vertices, 14,200 triangles.
- All four clips target the same 68 joints with 136 channels each.
- `Idle_6` 7.366667 s, `Walking` 1.033333 s, `Running` 0.633333 s,
  `run_fast_7` 0.866667 s.
- Three embedded **2048×2048 JPEGs**, bound as base color, normal and
  metallic/roughness. Offline image decoding verifies each JPEG; browser loading
  and rendered screenshots verify the imported material. No external textures.
- Original texture fidelity is preserved. Three RGBA 2048-square textures with
  full mip chains would take about 64 MiB alone; actual mobile allocation is unmeasured.

## Loop selection and animation authority

`riven-animation.ts` reuses Kit's proven hip-track copying function without editing
`kit-animation.ts`. Only hip X/Z output samples in runtime copies are pinned to
the bind reference **(0.00332032796, -0.00996096246)**. Hip Y, rotations, other
joint curves and container/source data remain intact.

The preferred `run_fast_7` fails loop validation even after horizontal correction:
maximum endpoint joint rotation **12.87324°**, local translation **0.01896846 m**,
independently skinned mesh endpoint displacement **0.156444 m** at normalized scale.
The acceptance thresholds are 2° and 0.005 m at any joint. `Running` passes, with
about 0.000224° joint rotation and 0.000001 m mesh seam displacement. Runtime
selects it from the corrected tracks and reports the reason in diagnostics.

Only **Idle_6, Walking, Running** are registered as looping animation states;
the rejected running clip is not registered or blended. Current movement has no
walk/jog speed distinction, so actual position displacement selects Idle_6 versus
Running, blending over **0.12 s**, without restarting stable states. No gameplay
speed, damage, cooldown, animation callback or combat timing was introduced.

One lazy-loaded entity/Anim component is reused for summoner switching and rematches.
Player-identity changes reset playback. Death hides the existing gameplay root and
stops animation; results stop playback. Countdown loops idle; active movement runs;
respawn and rematch resume playback. Training without a match also supports movement.

## Scale, floor and facing

- Authored bind min **(-0.4415635467, 0.00000000205, -0.1608464569)**;
  max **(0.4415636063, 1.7000001669, 0.1608464271)**.
- Uniform scale **1.029411664887353**, normalized bind height **1.75**.
- Fixed local offset approximately **(-0.00000003068, 0.03507599789, 0.00000001534)**.
- Authored forward **+Z**, yaw correction **0°**. Facing follows existing aim,
  committed angle, movement and retained idle priority. Only the visual pivot rotates;
  gameplay root scale remains **(1, 1, 1)** and the primitive's mirroring is isolated.

Independent inverse-bind linear skinning sampled **443 poses per clip**. With the
fixed idle floor correction of **0.035076 m**, exact idle soles range approximately
**0.000001–0.002104 m** above the floor. Running soles range approximately
**0.059133–0.182114 m**, preserving authored flight; walking is approximately
**0.056485–0.089595 m**. The offset stays fixed through movement and turns. Runtime
worldBounds are conservative skinned culling AABBs, not sole contact measurements.
The committed unit test independently samples actual deformed idle/run vertices at
61 times per clip, rather than inferring grounding from a static or culling box.

## Fallback, diagnostics and preservation

Pending/failed requests, missing required clips, invalid bounds, or an invalid skin
leave the existing primitive visible. `&rivenPrimitive=1` avoids the request entirely.
The loader requires a 68-joint skin, attaches to a separate visual pivot, uses the
existing base-aware container URL and unloads on scene destruction. Normal rendering
does not traverse mesh bounds per frame; explicit snapshots provide bounds.

`window.__crownfall.snapshot().rivenModel` reports source/bytes, load state/error/ms,
all clip durations, registered states, preferred loop errors, selected running clip,
playback state/time, fixed scale/offset, hip local position, visibility and facing.
The top-level `frameMs`, simulation, camera and Kit snapshots remain available.

Kit's loader, animation module, both GLBs and combat implementation are unchanged.
All changes are Riven presentation, scene/snapshot wiring, an opt-in developer HUD
label, verification/docs, and the requested staging ZIP removal. No Set implementation,
ability redesign, Aether effects, gameplay balance, camera, controls, AI, territory,
Wilderness or match system changes are included.

## Verification

- Khronos glTF Validator **2.0.0-dev.3.10**: **0 errors**, two source warnings
  (runtime-generated tangent space and a non-root skinned mesh), plus 1,329 unused
  accessor notices. Source bytes are retained; desktop PlayCanvas import/render passes.
- Unit suite: **180 passed**, 17 files, including eight new Riven asset/presentation
  cases. Covers binary identity, skin/joints/weights, textures, clip durations,
  immutable in-place copies, preferred/fallback selection, invalid bounds, exact
  deformed grounding and state transitions.
- Focused production Chromium Riven suite: **10/10 passed**. Covers served binary,
  lazy import, transforms, repeated locomotion cycles and hip pinning, facing,
  release-confirmed existing Riven input, pending/network/invalid-clip fallback,
  primitive opt-out, training switching, defeat/respawn/results/rematch and one download.
  An emulated mobile CDP test also verifies simultaneous captured movement/aim,
  release-only Riven casting and touch cancellation while the animated model runs.
- Full production browser run: **72 passed / 2 fixture failures** in 10.5 minutes.
  The new fixture observed import completion before the next visible presentation
  frame; it now polls the visible swap. The older natural battle fixture required
  every bot to die, even though the existing total-control victory correctly ended
  that match at 20 simulation seconds. It now still requires every bot to deal damage
  and the battle to include deaths, without requiring every bot to die before a
  territory victory. No gameplay was changed for either correction.
- Final focused production rerun: **11/11 passed** in 5.0 minutes, covering the
  natural battle, all nine Riven model tests and the new Riven multi-touch test.
  **All 75 distinct browser cases have passing evidence; no known failure remains.**
- Typecheck, lint, formatting: passed. Production build: passed with the existing
  large-chunk advisory (approximately 1.29 MB raw JavaScript).
- First focused Chromium/SwiftShader measurement: **566 ms** request-to-instance;
  **49.9 ms** smoothed frame time near loading. These are cloud software-renderer
  measurements, not device performance estimates.
- Locked-camera idle/run screenshots: `test-results/task007c-riven-idle.png` and
  `test-results/task007c-riven-running.png`, and `test-results/task007c-riven-touch.png`
  (ignored test artifacts).

Reproduce from `PlayCanvas/`:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run fmt
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Pushes to `playcanvas-port` invoke the existing PlayCanvas preview workflow.
No workflow or hosting changes are required. Preview after successful publication:
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/?rivenPreview=1>.
Select Riven and start; default Kit behavior is retained without the opt-in.

## Physical mobile acceptance still required

No physical iPhone/Android device is attached. Desktop Chromium with a mobile-size
viewport cannot confirm Safari/WebKit skin/material rendering, actual touch feel,
safe-area/orientation behavior, memory pressure, cold cellular/Wi-Fi load, sustained
frame pacing or thermal behavior. On device check front/back/side facing, idle/run
loop seams, sole contact through turns, simultaneous movement and release-confirmed
aiming, fallback controls, death/respawn/rematch, and compare normal animated Kit.
