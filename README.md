# Crownfall Arena: production Unity M0

Unity **6000.3.10f1**, built-in render pipeline. Starting point: `main` at
`da70f7285e9bb6507a2f44e0426328b3ca83c999`. This is the production Unity codebase;
Web is a temporary device-validation build target. The browser reference is untouched.

Open **Assets/Scenes/M0.unity**. Its serialized composition root references the
Kit sprite set, Summoner tuning and materials. On play it creates the temporary
3D battlefield, Summoner and presentation fixtures. M0 is the sole enabled build
scene. The earlier PipelineTest scene is retained as a checkpoint and excluded
from the build.

## Implemented scope

- True X/Z world, 28 x 36 ground, four boundaries and three collision obstacles.
- CharacterController root: 1.8 height, 0.4 radius, 0.25 step offset, 45-degree slope
  limit, 0.04 skin width. Movement is 5 units/second with gravity; diagonal input
  is normalized. Actual collision-resolved horizontal displacement drives animation.
- Orthographic MOBA camera: 50-degree elevation, size 8.5, smooth follow.
- Device-independent `ISummonerInput` interface and read-only `ISummonerViewState`.
- Native Unity touch/mouse/keyboard adapter with independent pointer capture,
  movement dead zone, aim-drag threshold, safe-area control layout, cancellation
  on focus loss, pause, pointer loss, and display/safe-area changes.
- Gameplay-owned aim, explicit presentation-facing state, and selection state machine.
  Movement never sets aim. M0 facing follows horizontal aim, retains its last side
  for near-vertical aim, and can be replaced by future gameplay facing rules.
- Directional/radial previews only. No damage, attacks, ability execution or target hits.
- Approved Kit idle and four chronological side-facing run images, configurable looping playback,
  visual-only mirroring, and a collider-free primitive 3D proxy.
- A temporary Unity IMGUI diagnostic overlay, not a production HUD.

No other Summoners, combat, health, bots, territory, tickets, Wilderness, camps,
match rules, multiplayer, production map, final VFX or final lighting were added.

## Device controls

- Drag the **MOVE** pad with one finger. Drag direction is camera-relative on X/Z.
- With another finger, press **DIRECTION** or **RADIAL** and drag to aim independently.
- Quick tap: confirms the aim captured at press. Initial radial distance is half range.
- Hold: previews without confirming. Drag changes direction; radial drag also changes
  center distance, clamped to five units. Directional length stays five units.
- Release: records one non-damaging selection and displays it for 0.65 seconds.
- Drag the aiming finger onto **CANCEL**, or tap CANCEL with another finger: discard.
- **SWAP PRESENTATION** toggles Kit/proxy immediately, including while moving/aiming.
- Desktop: WASD/arrows move; mouse operates the same targeting pads; Escape cancels;
  Tab swaps presentation. No Input Manager axis configuration is needed.

The debug counter increases only on a valid release. Preview geometry does not
resolve line of sight, target eligibility or combat collision in M0.

## Tuning and presentation

`Assets/Crownfall/Configuration/M0SummonerTuning.asset`: speed, gravity, 0.22-second
hold threshold, five-unit range, confirmation duration.

`Assets/Crownfall/Configuration/KitSpriteSet.asset`: idle reference, ordered four-frame run
array, **12 FPS**, **0.12 units/second** run threshold, stop hysteresis ratio 0.65.
The temporary four-frame loop is 0.3333 seconds at 12 FPS. Animation time is independent of
movement authority. Time advances normally at the rendering rate; a slow frame
may skip displaying an intermediate animation sample.

All source images are copied byte-for-byte. Doubled archive extensions are normalized to .png without altering bytes. All five
use **500 pixels/unit**, full-rectangle sprite geometry, manual custom pivots,
2048 maximum import size, no NPOT resizing, uncompressed default import, mipmaps,
trilinear filtering, clamp wrapping, and CPU readback disabled. No platform quality
overrides or duplicate left-facing assets. Texture memory/quality tuning remains
revisable after profiling. Source file bytes and any supplied transparency are untouched.

Pivots use an estimated pelvis x-coordinate and the lowest boot contact y-coordinate
in each original 1254 x 1254 canvas. Values are recorded in
`Docs/KitSourceManifest.json`. There is no per-frame bounds rescaling or runtime
root offset. The sprite child aligns its plane to the camera and uses
`SpriteRenderer.flipX` for left-facing. The gameplay root never flips or rotates.
Visual foot stability, idle/run body scale and transparency still need actual rendering
and device review; no background correction has been attempted.

The primitive view reads the same root state, rotates its own child to aim, and has
no active collider. Switching only changes child activation. A later 3D model can
consume `ISummonerViewState` without changing `SummonerRoot`.

For the M0.1 PNG correction, use `Docs/M01_KIT_DELIVERY.md`; the original M0
delivery notes below are historical.

## Build and delivery

Keep the existing Unity Cloud target/editor/hosting configuration. The ordinary
pre-build hook selects M0 and runs `M0Validation`. Web compression/template settings
remain from the proven pipeline. Native targets are no longer rejected; iOS signing
and deployment setup are outside this milestone. The package manifest fix on main
is preserved unchanged. No new Unity packages are required.

For the phone-only ZIP import steps, see `Docs/M0_DELIVERY.md`. The updated GitHub
Action imports sources and runs static validation. It does not run Unity or rebuild
cloud infrastructure. After importing, trigger the existing Unity Cloud build using
its normal workflow. Check that the cloud job builds the imported commit.

Optional existing batch entry point:

    Unity -batchmode -quit -projectPath /path/to/project -buildTarget WebGL -executeMethod PipelineBuild.BuildWeb -logFile build.log

## Validation status

Local checks passed: all five original SHA-256 matches, unique/reachable GUIDs,
ordered sprite references, import/pivot data, scene/material/config links, C# syntax
parsing, architecture guards, package/editor pins and whitespace checks.

Reproduce static checks:

    python -m pip install -r Tools/requirements-static.txt
    python Tools/validate_m0.py

These are syntax/structure checks, not C# type checking or Unity compilation.
Unity Editor was **not executed** locally. The Editor gate contains tests against
the real TargetingSession for tap snapshot, hold, drag, cancellation, duplicate and
stray release, wrong channel, radial clamp and feedback timeout. Those tests are
pending until Unity runs the gate during the first cloud build or via
**Crownfall > Validate M0** in the Editor.

Cloud/device checklist: `Docs/M0_DELIVERY.md`. No visual or runtime acceptance is claimed.
