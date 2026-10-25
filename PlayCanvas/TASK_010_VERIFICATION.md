# Goal 010 — western Wilderness showcase

Baseline: `fe696195bd9042dd6bd94533526b64980a9d7a58` (Goal 009 terrain plus the
four founder-supplied trees). Runtime implementation: `bba4f4236f4f276614be3af515036388a4aee919`;
last full-suite candidate: `26d2d14efd91082aab01dde25739013f4da1381d`.

**Publication blocked. Goal 010 is implemented but has not passed the complete
release gate and is not deployed.**

## Asset preparation and composition

All four approved GLBs remain byte-for-byte intact in `public/assets/environment/trees/`.
The runtime variants preserve every non-image buffer view, mesh, UV, normal, node
transform, material definition and texture binding. Only the twelve 2048² JPEGs
are resized to 512², using Lanczos and quality 95 without chroma subsampling.
[Preparation receipt](public/assets/environment/trees/mobile/preparation.json)
records original/runtime SHA-256, bounds, triangles and file sizes.
[Reproduction helper](tests/helpers/prepare-wilderness.py) verifies Poly Haven's
source MD5 values before converting the approved CC0 scans.

Models are upright (+Y) with centered origins. Runtime bounds normalize relative
height and place min Y against the existing western bank, with a 6cm contact
inset. Six trees share one mesh/material set per species: two maples,
two pines, one red oak, one redwood. Heights vary from 5.4 to 11.4m;
asymmetric spacing, yaw and layered silhouettes establish a limited showcase.
The rotated canopy bounds, rocks and 240 grass-blade triangles stay outside the
western movement boundary. Four low ground patches extend into the outer
Wilderness shoulder without changing traversal or collision.

Poly Haven's `sparse_grass` and `forest_leaves_02` scans supply six shared 512² maps,
with sRGB albedo, linear OpenGL normals and packed AO/roughness. Irregular,
subdivided patches follow the existing bank, feather into rocky soil, and cover
selected rock facets. Sparse opaque blade fans remain below 0.23m. The original
packed-earth lane, terrain materials, sun and ambient lighting remain intact.
No new colliders, navigation, shadow-map passes, camera or gameplay systems.

The follow-up defers all Wilderness setup until after match start and character
imports settle. Static draws receive one completed render before readiness is
reported, warming their uniform buffers. Tree containers load once per species. Instances share resources and persist through rematches. Scene disposal
removes instances, aborts pending container fetches, unloads containers and destroys
the four ground meshes, three owned ground materials and six ground textures.
The existing primitive/local character diagnostics and legacy renderer remain.

Moonreapers normalize to **0.60m**, exactly 75% of Goal 009's 0.80m. The approved
weapon GLB and materials remain unchanged. Both detailed instances, fallback
proportions, orbit, throws, parking, recalls and all combat values remain intact.

## Visual review

Matched views use the existing six-summoner fixture, translated 26m west while
paused, then advanced one tick to reanchor the authoritative orbiting weapons.
The competitive camera retains its original offset (0,15.5,18), 4m look-ahead and
48-degree FOV. Viewport: 844×390 CSS pixels, DPR 2. The close art-inspection view
uses position (-27,8,4), target (-35.5,2,-5); it is never used in gameplay.

| View                    | Goal 009                                  | Goal 010                                |
| ----------------------- | ----------------------------------------- | --------------------------------------- |
| Competitive grove edge  | [Before](evidence/010/before-match.png)   | [After](evidence/010/after-match.png)   |
| Ability visibility      | [Before](evidence/010/before-ability.png) | [After](evidence/010/after-ability.png) |
| Species, bases and soil | [Before](evidence/010/before-terrain.png) | [After](evidence/010/after-terrain.png) |

[Four-species overview](evidence/010/four-species-overview.png) shows the complete
compact grove: broadleaf maple in the foreground, pine beside the red oak,
second maple/pine in the middle, and the tallest redwood at the rear. This
inspection view documents every species and grounded base; normal gameplay
retains its competitive camera.

[Unreduced 2K source comparison](evidence/010/source-match.png) uses the identical
final composition/camera, serving the original approved GLBs through an
inspection-only response override. Published code always loads the runtime variants.
The comparison and performance helper exposes the existing app/simulation only
inside its browser response override; production exposes only its established
read-only snapshots and opt-in verification fixtures. Animations continue while
authoritative simulation time and placements stay fixed.

## Performance

The four runtime tree GLBs total **2,159,288 bytes** (2.06 MiB), versus
**24,838,204 bytes** (23.69 MiB) for the originals: a **91.3%** download reduction.
The six ground maps add **1,524,487 bytes** (1.45 MiB), for **3.51 MiB** additional
browser-requested art. Original GLBs are retained for provenance but never
requested by normal gameplay.

The twelve 512² tree textures allocate 16 MiB with mipmaps, versus 256 MiB for
the unreduced twelve 2K maps. Ground textures add 8 MiB. Whole-scene texture
allocation increases **436,270,680 → 461,436,480 bytes** (**+24.0 MiB**).
Vertex buffers increase **4,844,988 → 6,104,300 bytes**; index buffers increase
**379,998 → 666,954 bytes**. These are engine allocation counters, not OS residency
or peak decode memory. Existing character/weapon allocations remain dominant.

Four shared ground batches and six shared-mesh tree instances add 32,004 tree
triangles and 240 low grass-blade triangles. No mesh simplification or new render
subsystem was needed. During the isolated capture, the four tree imports settled
in 367–452ms after the character gate; these local timings exclude prior character
loading and are not remote-device download estimates.

The initial eleven-tree composition measured **1,656.6ms / 3,911.5ms** mean
frame intervals at DPR 1 / 2 on this executor. It was reduced to six trees and
fewer overlapping scan patches, retaining every approved species and unmodified
geometry/materials. [Initial raw samples](evidence/010/initial-measure.json),
[initial competitive view](evidence/010/initial-match.png).

| DPR | Mean ms baseline → final | Median ms baseline → final | P95 ms baseline → final |
| --- | -----------------------: | -------------------------: | ----------------------: |
| 1   |          598.6 → 1,316.3 |            599.9 → 1,266.6 |       1,150.0 → 2,483.2 |
| 2   |        1,176.3 → 3,108.2 |          1,150.0 → 2,983.2 |       2,233.3 → 5,499.7 |

Draws/frame: **41 → 51** at both DPR settings. Reducing the grove improves
mean software frame intervals by **20.5% at DPR 1 / 20.5% at DPR 2** versus the
initial composition. The final art still costs **120% / 164%** over the fresh
bare-terrain baseline on SwiftShader; this is a substantial measured rendering
cost, not a speedup or a mobile FPS claim. No collision, gameplay, camera or
character presentation was changed to obtain the reduction.

[Baseline raw samples](evidence/010/before-all.json),
[final raw samples](evidence/010/after-all.json). Each revision runs separately:
20 warmup frames, 60 samples per DPR, Chromium 154 / ANGLE SwiftShader, 844×390,
paused authoritative roster with animations/rendering continuing. High variance
and CPU rasterization limit precise comparison and transfer to hardware GPUs.
These figures do not establish physical iPhone frame time, memory or thermals.

The 512² and original 2K versions retain the same silhouettes and readable bark
at the actual competitive distance. The static western-vegetation crop has a
mean absolute RGB difference of **0.35 / 255**, with a 95th-percentile channel
difference of **2 / 255**. This supports the visual review, without replacing it.
[Texture comparison receipt](evidence/010/texture-comparison.json).

## Verification and publication

- Local unit suite: **231 passed / 25 files**.
- Focused asset/terrain/weapon unit suite: **8 passed / 3 files**.
- Isolated environment browser cases: **2 passed**; focused grove sharing,
  weapon phases and pending-decode/queued-parse disposal checks pass.
- The first mixed local browser run passed 5/6 cases; the legacy model-load poll
  timed out while unit/lint work shared this two-core executor. Its unchanged
  environment tests pass when run separately.
- Initial release lint caught a type-import ordering error; a later density edit
  required its trailing comma to be reformatted. It was corrected
  before publication. The intermediate run was superseded by a correction to
  the inspection helper's translated weapon fixture; no gameplay code changed.
- Full production browser gate: **115/119 passed; 4 failed** in 41.1 minutes.
  Publication was skipped by the existing workflow. [Run](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40174975963),
  [complete log](evidence/010/first-release.log).
- Failures: delayed-GLB remount GPU uniform-buffer equality; landscape HUD case
  timeout; Kit load poll timeout; mobile countdown poll timeout.
- Follow-up: defer all scenery setup beyond countdown/character loading and warm
  static draw resources before readiness. Keep the GPU equality assertion and
  existing test timeouts. Typecheck, lint, formatting and build pass.
- The focused follow-up rerun passed **3/5** cases. Delayed-GLB remount model-load
  polling and mobile countdown polling still timed out on the local software
  renderer. [Log](evidence/010/regression-browser.txt).
- Matched captures and frame measurements describe candidate `26d2d14`; the
  follow-up changes startup/resource readiness only, retaining its composition,
  source geometry, materials and weapon scale. It is not release validated.
- The existing hosted build remains the previous validated release. No live
  Goal 010 verification or physical-device acceptance is claimed.

Physical iPhone Safari performance remains a separate founder acceptance test.
Software Chromium automation does not verify mobile FPS, thermals or memory limits.
