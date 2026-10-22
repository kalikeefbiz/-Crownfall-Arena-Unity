# Goal 007D — Set animated 3D presentation

Use <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/?setPreview=1>,
select **Set**, and press **Start match**. For training and visible diagnostics use
`?debug=1&setPreview=1`. `?setPreview=1&rivenPreview=1` supports both presentations.
`&setPrimitive=1` keeps the primitive without downloading Set's model.

## Asset verification

The root `Set_Animated_GLB.zip` contained only `Set_Animated.glb`. ZIP CRC and exact
member/extracted-byte comparison passed before staging ZIP removal. The binary at
`public/assets/summoners/set/Set_Animated.glb` remains **10,000,416 bytes**, SHA-256
`dbee0fd906f786f4af04eb87f130a816c0f98aa04531874487b403f7ca23e154`.

The asset has 20,038 triangles, 20,951 vertices, one mesh/material/skin, 87 joints,
and three embedded 2048×2048 JPEGs. Running is 0.633333 s, Walking 1.033333 s,
Punch_Combo 2.466667 s, and RunFast 0.466667 s. Khronos glTF Validator reports
**zero errors**, two supplied-asset warnings (runtime-generated tangent space and
non-root skinned mesh), and 1,385 informational notices. The source is preserved.

A separate close front/side render confirms the black panther, amber eyes, bare
upper torso, navy garments, purple sash, claws and tail. The camera on +Z sees
his front. No geometry, material, texture, or animation was regenerated.

## Runtime presentation

Set reuses the existing lazy container import, separate visual pivot, animation
component and primitive fallback pattern. No request happens without the flag,
for another summoner, during prematch, or with the primitive opt-out. Pending,
network-error, empty mesh, wrong skeleton and missing-animation conditions retain
the primitive. The instance is reused through switching/rematches and unloaded
when the scene is destroyed.

`Running` is primary locomotion. The existing Kit copy-only helper pins Hips X/Z
to the bind reference (0.0059619518, 0.0508894734), preserving vertical gait and
other joint curves. GLB/container tracks remain untouched. `RunFast` is never
registered or selected. `Ready` is a constant one-second runtime track sampled
from **Punch_Combo at 0 seconds**, a guarded standing fighting pose. Only Ready
and Running are registered, blending over 0.12 seconds. Actual gameplay position
displacement chooses locomotion. No combat event drives animation or changes
combat timing; Punch_Combo is not assigned to an ability.

Authored bind height is approximately 1.700000018 m. Uniform visual scale is
**1.1176470469**, giving a 1.9 m initial target. A fixed local Y offset of
approximately **0.009313467 m** includes the **0.0093135 m** sampled-sole correction.
An independent inverse-bind skinning test verifies exact Ready vertices touch the
floor and samples 31 Running poses for usable grounding. Animated flight is
preserved. Runtime skinned culling bounds are conservative and are not sole-contact
measurements. Grounding never chases those changing bounds.

The gameplay root remains scale (1, 1, 1), position and collision remain simulation
owned, and only the Set visual pivot rotates with authoritative aim/commit/movement
facing. The existing root visibility handles death; animation stops for death and
results, resumes for respawn/restart, and resets for player-identity changes.

`window.__crownfall.snapshot().setModel` reports source, bytes, state/error/load ms,
clips, registered states, selected running clip/reason, sampled Ready source/time,
playback, visibility, primitive fallback, scale/offset, hips, position and facing.
Kit and Riven snapshots and their independent opt-in behavior are preserved.

## Verification

- Unit suite: **183 passed in 18 files**, including binary/metadata identity,
  immutable horizontal correction, constant sampled pose, mesh grounding and bounds.
- Focused production Chromium Set suite: **8/8 passed** for import, locomotion,
  facing/anchoring, fallback, opt-out, switching, death/respawn/results/restart and
  one-download reuse. Floating-point hip blending is compared within 1 micrometer.
- Full production Chromium browser suite: **85/85 passed** in 16.8 minutes,
  including **10 Set cases**, all existing Kit/Riven coverage, the natural 3v3
  battle, territory, touch combat and Wilderness. Set normal-start/touch and
  combined-preview cases pass. No known browser failure remains.
- Typecheck, lint and formatting: passed. Production build passed with the existing
  large-chunk advisory (approximately 1.29 MB raw JavaScript).
- First focused cloud Chromium/SwiftShader measurement: 1,420 ms import-to-instance,
  58.5 ms smoothed frame time near loading. These are software-renderer observations,
  not physical-device performance estimates.
- Ignored screenshots: `test-results/task007d-set-idle.png`,
  `test-results/task007d-set-running.png`, `test-results/task007d-set-touch.png`.

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

The existing preview workflow publishes pushes to `playcanvas-port`. No workflow,
combat, abilities, cooldowns, controls, territory, Wilderness, AI, camera, scoring,
Kit model/animation, or Riven model/animation implementation was changed.

## Physical mobile acceptance

No physical iPhone or Android device is attached. Check Safari/WebKit materials and
skinning, actual thumb reach and simultaneous touch behavior, safe areas and
orientation, cold cellular/Wi-Fi loading, memory pressure, sustained frame time and
thermal behavior. Three full-mip RGBA 2048-square textures alone would use about
64 MiB; actual mobile allocation has not been measured. Review Set's 1.9 m visual
height, front/back/side facing, sole contact through turns, Ready/Running blending,
fallback, death/respawn/restart and switching beside Kit/Riven. The temporary static
ready pose and any remaining stylistic gait issues are intentionally deferred.
