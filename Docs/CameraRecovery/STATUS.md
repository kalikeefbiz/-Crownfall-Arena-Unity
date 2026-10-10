# Camera and Summoner recovery — native acceptance pending

Starting branch/HEAD: `browser-parity-unity`, `a8939536c6372d8744ab65d5c24180f86a276ad3`.
The remote matched the supplied baseline; the fresh checkout was clean. No work from a
later commit was overwritten. This is an implementation checkpoint, not visual acceptance.

## Camera: verified source cause and replacement

The former camera did follow the human transform, but applied a permanent +6.5 Z focus.
At pitch 34°, orthographic size 11, the ground half-depth was 19.671 m. At lane Z=0,
the visible ground interval was approximately [-13.171, 26.171], making the northern
wilderness occupy much more of the view. At 19.5:9, horizontal half-width was 23.833 m;
the padded ±38 clamp allowed the camera center only ±14.167 m. A human at X=-30
therefore remained near 16.8% viewport X; further movement near either end produced
no camera translation. At 16:9 the clamp allowed ±18.444 m. The Z-center clamp was
±20.329 m. This verifies asymmetric composition and constrained follow, not the exact
cause of an apparently stationary camera at an unknown device position. Screenshots
from different simulation times cannot verify following.

Implemented Cinemachine **3.1.7**, `CinemachineBrain`, `CinemachineCamera`, and
`CinemachinePositionComposer`. `MobaCamera` is now only a match-lifecycle adapter.
It does not calculate a camera position, clamp world coordinates, or interpolate a
camera transform. The human binding uses entity identity rather than list index.
Cinemachine supplies damping and screen hard limits. Aiming retains a small 0.6 m
lead. Pause and death hold the shot; respawn invalidates damping; results follow an
origin anchor; reset disables the shot and replay resets its state. The rig is not
parented to the camera it controls and is cleaned up with it.

The proposed fixed 40° orthographic view uses half-height 10 and distance 32, tracking
one metre above the human root at screen center. It has no permanent northward lead.
Character projected size is independent of map depth, suitable for the existing 2D
roster and independent ground aiming. A perspective view matched at distance 32 would
use about 34.7° vertical FOV; ground offsets ±12 m at this pitch change apparent size
to roughly 0.78–1.40 times the center scale. This is an analytical comparison using the
24 m lane, **not a visible-gameplay projection acceptance**. Orthographic remains
provisional until both shots can be assessed natively. Composition goals are the fixed
heading and local combat readability of League/Eternal Return, with mobile subject
readability as in Brawl Stars; no controls, rules or assets are copied.

No viewport confiner is installed: authoritative actor bounds already limit the follow
target, and the existing ±58 X/±54 Z decorative continuation covers the proposed flat
frustum at up to 21:9. A viewport-width clamp would reintroduce end-lane immobilization.
Raised scenery still needs native edge/cutaway checks. Historical `CameraFraming`
functions remain for existing offline environment estimates; they no longer drive the
shipping camera. Historical preview reports are not evidence for this new shot.

Official documentation consulted:
- https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachinePositionComposer.html
- Official 3.1.7 package from https://packages.unity.com/com.unity.cinemachine/-/com.unity.cinemachine-3.1.7.tgz
  (`CinemachineBrain`, `CinemachineCamera`, `LensSettings`, `ScreenComposerSettings`,
  `CinemachinePositionComposer` sources checked for the exact APIs).

## Summoners: unresolved; no speculative material/art changes

Inspected `MatchActorView`, `ActorPresentationController`, production catalog/material
bindings, terrain generation, `ArenaWildernessPresentation`, and its visibility shaders.
Source catalog/GUID/PNG checks pass. All 53 unique roster frames (Kit 25, Set 17, Riven 11) have nonempty source alpha. The three production idle frames use pivot (0.5, 0.04). Alive subjects enable their renderer and select
existing frames. Camera culling defaults include the sprite layer. The root stays at
Y=.04 and artwork uses imported pivots and established roster heights (2.8/2.5/2.8).
The shared sprite shader follows Unity's built-in premultiplied-alpha sprite path:
transparent queue, Cull Off, ZWrite Off, normal depth testing. Sorting order does not
bypass opaque depth. The inspected Unity 6000.3.10f1 UnitySprites include matches its
vertex/fragment entry points. This does not prove the imported WebGL shader works.

Raised decorative banks can occlude ground-authoritative actors away from the lane.
Existing cutaways run in Camera.onPreCull using the actual output camera vectors and
six subject centers; WorldSurface applies them only above Y=.35. Whether imported
geometry/materials and WebGL shader variants actually execute those cutaways is
unverified. Flat lane surfaces alone cannot explain complete loss of an upright sprite
above Y=.04. No evidence supports an arbitrary ZTest Always change, material swap,
global renderer override, or lift of the gameplay controller. Those changes were not made.

Added `SummonerVisibilityDiagnostic.CaptureLiveMatch`: in a running exact-version
Editor match, synchronously capture normal rendering and rendering with only opaque
renderers disabled. In each phase, disable one Summoner sprite at a time and count its
pixel contribution. Record all six sprite paths, shader support, enabled/active state,
culling inclusion, camera projection/pose, bounds and viewport positions. Every renderer
and camera target/aspect is restored in finally. PNGs and JSON go to ignored
`Logs/CameraRecovery/<timestamp>`. This is diagnostic code, **not executed evidence**.
Positive pixels only with opaque rendering disabled implicate depth occlusion. Zero in
both phases requires checking the recorded sprite/shader/culling data and source alpha;
offscreen/dead actors must be excluded from visibility-failure conclusions.

## Validation and remaining blockers

Passed locally:
- Pure C# suites: M1 75, economy 13, roster 16, Surge 18, complete match 127037,
  presentation 86645, historical camera/terrain 2152. Full Kit/Set/Riven simulations
  completed with 46 combined deaths and 33 rotations.
- Current build contract; M0/M1 source/import/GUID checks; production catalog/PNG
  preservation, UI dependencies and negative fixtures.
- Environment library, wilderness, M15/M15.1 scope gates; nine wilderness rejection fixtures.
- Editor preflight: syntax/scope checks; 34 protection fixtures, five protection mutants,
  eight lifecycle fixtures, 13 settings fixtures, four audit mutants, seven caller mutations.
- Protected path inventory (311 paths) and whitespace validation.

The initial tools setup hit read-only user-cache paths; rerunning with workspace-local Python/.NET caches succeeded.

Blocked, not passed:
- Unity 6000.3.10f1 is not installed; native compilation, package resolution, GPU scene
  tests, shader execution, WebGL build and gameplay screenshots were not run.
- The historical Unity 2021.3.33 reference compile cannot support Cinemachine 3.1.7
  (e.g. Camera.kMinAperture/kMaxAperture APIs are absent). The full-runtime gate now
  explicitly requires actual compiled package assemblies plus the exact Editor module
  inventory/hashes. It remains fail-closed. **The existing hosted CI reference-compile
  step will remain blocked until provided these exact native references.** No success
  status, stub assembly, skipped source or disabled validation substitutes for that check.
- Native camera tests are wired into the existing prebuild projection gate: actual Brain/
  Composer tracking at 100 positions across 4:3, 16:9, 19.5:9 and 21:9, monotonic boundary
  tracking, subject/opponent composition, ground rays, pause/death/respawn/results/reset.
  These tests are authored but not run. Play-mode input and physics remain separate checks.

Run with exact Unity and a graphics device:
1. Resolve Cinemachine 3.1.7; run existing preparation/build protection gates unchanged.
2. Run `Crownfall/Camera recovery/Validate native tracking` (also called by prebuild).
3. Start real matches for Kit, Set and Riven. Capture the live isolation at left/middle/right
   lane and north/south approaches while all six living subjects are in frame. Inspect
   normal and opaque-disabled images and fix the demonstrated cause before acceptance.
4. Compare orthographic/perspective native gameplay composition; check smooth continuous
   tracking and all four corners, six sprites/animations/status markers, independent aim,
   ground casts, movement, death/respawn, pause, results and replay. Preserve motor/collision.
5. Compile WebGL and validate on real iPhone Safari, including browser-bar/safe-area
   viewport changes. Final acceptance requires readable Summoners and a readable lane,
   not merely compilation or the static tests above.

No merge or deployment is part of this checkpoint. No production artwork, map,
collision, combat, scoring, camps, input implementation or match rules were changed.
