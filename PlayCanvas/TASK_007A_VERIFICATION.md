# Task 007A — local Kit static 3D slice

Only the local human Kit in the normal competitive match uses the supplied GLB.
Gameplay, collision, simulation, controls, combat timings, bots, Wilderness,
territory, lifecycle, results and the Task 005A camera are unchanged. Unity is
untouched. The imported embedded PBR material uses the existing scene lighting;
there is no rig, animation, deformation, LOD or replacement of other actors.

## Asset and transform

- Asset: `public/assets/summoners/kit/kit-10k-test.glb`.
- Original: `Kit_10K_PlayCanvas_Test_1K.glb`.
- Verified unchanged size: **5,317,848 bytes**.
- SHA-256: `11f0b6ad226eae565ddaa7e9104ca1aae2a85ecc954203a70fdce23b0adfb547`.
- 10,290 triangles, 20,888 vertices, one mesh instance, one material, 1K textures.
- Loaded bounds: min `(-0.434235990, -0.950195014, -0.228415027)`;
  max `(0.433949977, 0.947416008, 0.230126008)`.
- Raw height: `1.8976110219955444`.
- Computed uniform scale: **0.9222121813772375**, targeting **1.75** world units.
- Model local offset: **(0.00013188228465135915, 0.8762814170344034,
  -0.0007889438203729478)** beneath the separate facing pivot.
- Named authored-forward yaw correction: **0 degrees** (`KIT_AUTHORED_FORWARD_YAW`).
- Browser world bounds: lowest Y approximately `0.000000021`; highest Y
  `1.750000025`. Gameplay root scale remains `(1, 1, 1)`.

Facing reads the existing simulation owner: active aim, captured combat angle
while committed, movement otherwise, and retained yaw while idle. A new local
player resets the retained yaw. Only the 3D pivot rotates; the prototype's
material/mirroring logic continues to apply to the fallback subtree alone.

## Loading and diagnostics

Loading is lazy: the first Kit countdown/active match requests the GLB using the
Vite-relative public URL, including under `/playcanvas/`. Prematch selection does
not fetch it, so choosing Set or Riven avoids the download. The existing primitive
stays visible while loading or on error. A successful instance is reused for the
session; selection controls its visibility, and scene teardown releases it.

`?kitPrimitive=1` forces the original primitive and skips the request. There is no
new player-facing setting. Inspect `window.__crownfall.snapshot().kitModel` for
state, byte size, load duration, concise error, raw and world bounds, height,
scale, offset, mesh count, yaw, visibility and root scale. `frameMs` uses the
existing smoothed frame timing. Diagnostics do not change simulation authority.

The focused run measured approximately 319 ms from request to instantiated model;
the full-suite sample measured 872 ms under software WebGL with approximately
48.5 ms smoothed frame time at load. These are local automated observations, not
physical iPhone load or frame-rate claims. No new per-frame bounds traversal is
added: world bounds are gathered only when a diagnostic snapshot is requested.

## Verification

- Unit tests: **168 passed**, 15 files, including asset hash/size/static structure
  and asymmetric/invalid bounds normalization.
- Production browser suite: **63 passed** in 10.5 minutes: 57 retained checks
  plus six Kit checks. The new checks
  cover served bytes/hash, actual loaded rendering, world grounding/height,
  position/yaw, unchanged root/collision radius, combat damage, no-fetch Set/Riven,
  A/B primitive mode and delayed/failed loading with playable fallback.
- Typecheck, lint, formatting and `git diff --check`: passed.
- Production build: passed, with the existing large-chunk advisory.
- Goal Markdown formatting was normalized to satisfy the repository-wide check.

The completion message records the full-suite outcome, final commit and deployment.

## Physical iPhone acceptance still required

Under the unchanged camera: does Kit read as a real character, is his scale and
facing correct, does the 10K facial detail loss matter at gameplay distance, and
are the 1K textures acceptable? Is rigid movement acceptable for this evaluation
before rigging? Are cold load time, memory, sustained smoothness and thermal
behavior acceptable compared with `?kitPrimitive=1`? Verify simultaneous touch
movement/aim/combat, cancellation, notch/orientation/browser gestures, Wilderness
readability and results scrolling on the physical device. No device acceptance
is inferred from Chromium automation.
