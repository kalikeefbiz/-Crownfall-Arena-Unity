# Goal 007B — animated local Kit

The normal competitive local Kit uses the supplied 20K Meshy GLB through the
existing container loader. Primitive loading/error fallback and `?kitPrimitive=1`
remain. `?kitModel=10k` loads the unchanged 007A asset for developer comparison.
No gameplay, collision, combat data, camera, HUD, bot, Wilderness, territory,
results, Set/Riven or Unity implementation was changed.

## Asset identity

- `public/assets/summoners/kit/Kit_20K_Animated.glb`
- Extracted from the branch's committed staging ZIP, then the ZIP was removed.
- Exact size: **26,939,896 bytes**.
- SHA-256: `b111e1f774b0483b78f45e43413515adb02e501941c5c99a995d09a43f96212f`.
- One skinned mesh/material, 20,733 triangles, 37,309 exported vertices, 66 joints.
- All five animations target the same 66 joints. The original binary is unchanged.
- Embedded normal/base-color PNGs are 2048×2048; metallic/roughness is 4096×4096.
  Original fidelity is preserved. These sizes can imply approximately 128 MiB for
  RGBA textures with full mip chains alone; actual device allocation is unmeasured.

## Playback and authority

`AnimComponentSystem` is registered in the existing lightweight app. One Anim
component is attached to the lazily loaded, session-reused local Kit instance.

| State                | Embedded clip                            | Behavior                                                            |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Stationary           | Idle_5, 1.833333 s                       | Loop                                                                |
| Moving               | RunFast, 0.466667 s                      | Loop, selected from actual position displacement                    |
| Accepted basic       | Punch_Combo_1, 2.200000 s                | Non-looping, retimed to 0.5 s                                       |
| Available locomotion | Walking, 1.033333 s; Running, 0.633333 s | Registered looping states, reserved for future distinct speed modes |

Current movement normalizes input and has no walk/jog mode. No gameplay speeds
were invented. Idle/movement blends take 0.12 s; attack entry blends take 0.05 s.
Stable states are not restarted each frame. Each new accepted `whip` journal
record may restart the punch; rejected attempts and magical abilities do not.
The bounded journal is scanned backward so a newer rejected attempt or spell
cannot hide an accepted basic in the same presentation frame. Stale basics are
ignored. The original 0.55 s base cooldown, cooldown modifiers, held-input repeat,
damage and ability VFX remain simulation-owned. No animation callback affects them.

Death clears the attack window and the existing root hides the model. A new
player identity resets journal tracking and animation state. Playback stops while defeated or on the results screen; idle also loops during
countdown. Respawn and rematch reuse the asset. The authoritative aim/committed/
movement/retained facing hierarchy remains unchanged.

## Transform and grounding

- Stable authored bind mesh bounds: min `(-0.3886734843, -0.000000002587, -0.2075819373)`;
  max `(0.3886734843, 1.7000000477, 0.2075819373)`.
- Uniform visual scale: **1.0294117342650992** (standing bind height **1.75**).
- Local model offset: **(0, 0.05264644266315462, 0)**.
- Authored-forward yaw correction: **0 degrees**, source forward +Z.
- Gameplay root scale remains `(1, 1, 1)`.

Offline linear-blend skinning sampled 61 times per supplied clip using inverse-bind
matrices and the runtime horizontal-hip correction. Idle soles measured Y
`-0.05264644` to `-0.04608967` before the fixed idle-reference offset; after it they
sit approximately at `0`–`0.00656`. Punch soles are approximately `0.0111`–`0.0218`.
RunFast has a natural airborne phase (lowest vertex approximately `0.0165`–`0.2249`).
The crouched idle/run poses are shorter than standing bind height by design.

Only horizontal hip outputs in runtime AnimTrack copies are pinned to the bind
reference `(0.0033203182, 0.0166015532)` in X/Z. Vertical gait, rotations and all
other joint curves remain. No root motion reaches gameplay. Scale/offset never
follow changing per-frame bounds. Debug `worldBounds` are PlayCanvas conservative
skinned culling bounds, not exact sole-contact measurements.

## Diagnostics and performance

`window.__crownfall.snapshot().kitModel` exposes source, bytes, load state/error,
request-to-instance load milliseconds, all clip names/durations, active animation,
playback time/status, lifetime punch count, processed journal serial, transform,
visibility and bounds. The existing top-level `frameMs` remains available.

Loading is lazy after Kit enters countdown/active play. No download occurs for
Set/Riven or forced primitives. No repeated load or second controller on rematch.
Bounds traversal occurs only on load or explicit diagnostic snapshots.

Initial focused desktop Chromium/SwiftShader run: **1,681 ms** request-to-instance,
**53.6 ms** smoothed frame time near load. This is software rendering in the cloud,
not physical iPhone performance. The full-suite sample measured **2,214.9 ms**
load and **58.1 ms** near-load frame time. No mobile performance conclusion is
inferred. Deployed measurements are recorded in the completion report.

## Verification and deployment evidence

- Unit tests: **172 passed**, 16 files. Asset hash/size/structure, five durations,
  shared skeleton, state transitions, accepted/rejected/spell events, repeat attacks,
  lifecycle reset and in-place track-copy behavior are covered.
- Full production browser suite: **64 passed / one new fixture failed** in 12.4 min.
  The fixture attempted to use a hidden diagnostic select. It was corrected to
  access that control explicitly and use the existing fixed-tick respawn seam
  rather than assuming software-rendered simulation advances at wall-clock speed.
- Final rebuilt production Kit suite: **8/8 passed**, including the corrected
  death/respawn/results/restart test and single-download assertion. All 65 distinct
  browser cases have passing evidence; no known failing test remains.
- Typecheck, lint, formatting and `git diff --check`: passed. Production build:
  passed, with the existing large-chunk advisory (JS approximately 1.28 MB raw).
- Screenshots captured for idle and punch under the locked mobile gameplay camera.
- Final change is restricted to `PlayCanvas/`. The staging ZIP is absent and the
  old static GLB remains unchanged.

Pushing the completed commit to `playcanvas-port` invokes the existing
`publish-crownfall-playcanvas.yml` workflow, which publishes only the `playcanvas`
subdirectory on `gh-pages`. No workflow/settings or Unity changes are needed.
Final commit, workflow status, deployed GLB hash and live-browser results are
reported in the completion message. Preview:
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>.

## Physical iPhone acceptance

Open the deployed normal match and compare the two developer URLs. Confirm full
body/PBR appearance at the locked gameplay camera, idle loop seams, run/punch
readability, feet contact through turns, correct aim-facing, no skeletal distortion,
and respawn/rematch playback. Verify simultaneous touch movement/aim/held attacks,
magical effects, landscape safe areas and browser gestures. Measure cold cellular/
Wi-Fi loading, memory pressure, sustained frame pacing and thermal behavior on the
actual device. If poor, schedule a separate texture/asset optimization pass; no
silent fidelity reduction is included here. Desktop automation is not physical
iPhone acceptance.
