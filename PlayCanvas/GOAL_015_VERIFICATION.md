# Goal 015 — original full-quality Sol’Rahn preview

Preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-015/?mapPreview=solrahn>.
Choose **Enter Crownfall → Enter Arena**. Landscape is recommended.
Optional wall-clock FPS and frame-time display: append `&perf=1` (off by default).
Compare [Goal 014](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-014/?mapPreview=solrahn) independently.

## Source and full-quality export

The exact founder Release file `export_Meshy_AI_2026-10-26_4debfa.blend` was downloaded,
verified at **506,928,885 bytes**, SHA-256
`626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f`,
and made read-only. Its bytes and the original Release remain unchanged. Export opens
that file and never saves it. No decimation, geometry editing, texture resizing,
feature transforms, replacement terrain or material edits occurred.

Full-quality GLB: [immutable public LFS asset](https://media.githubusercontent.com/media/kalikeefbiz/-Crownfall-Arena-Unity/1d9777d93a7d1535203271b1a9735e90a62b989e/PlayCanvas/assets/solrahn-goal-015/runtime/solrahn-full-quality.glb).
**240,254,728 bytes**, SHA-256
`f1be971167f316e505c95fdff8145d2e500e53a574121f8a56ed6cb5e7600e79`.
The repository stores a 134-byte Git LFS pointer at
`assets/solrahn-goal-015/runtime/solrahn-full-quality.glb`, never the large binary in
ordinary Git. A fresh complete public download verified its size and checksum;
HTTP 200 and `Access-Control-Allow-Origin: *`. Local builds verify the full hash too.
No low-quality fallback is used. Map fetch/decode has a 240-second deadline and the
preview preparation screen a 300-second deadline, with the existing explicit retry
error on failure; ordinary character deadlines are unchanged.

- Source: **2,782,049 vertices / 5,568,924 triangles**, one continuous mesh,
  one PBR material, one UV layer, authored split normals.
- Export: **5,568,924 triangles**, one mesh/primitive/material; 3,037,882
  glTF vertices including required UV/normal/tangent splits. No geometry reduction.
- All 16,706,772 triangle corners compared in order: **zero position error,
  zero UV error**, maximum normal-component error `0.00006715` from Blender's
  standard four-decimal normal rounding then normalization (tolerance 0.0001).
  No manual normal edits. This is documented conversion precision, not a smoothing pass.
- Original embedded JPEG payloads retained: base color **4096² sRGB**, normal
  **4096² Non-Color**, metallic/roughness **2048² Non-Color**. Metallic blue and
  roughness green mapping and normal strength 1 survive. No external texture URIs.
- Khronos glTF Validator 2.0.0-dev.3.10: **0 errors, 0 warnings**.
- Clean Blender reimport: 5,568,924 triangles, one UV layer/material, all images.
  Matched source/reimport Cycles overview and close renders differ by only
  0.00195 / 0.00729 mean channel levels on the 0–255 scale. Actual images and
  camera configurations are in `assets/solrahn-goal-015/previews/`.
- Blender 4.3.2 / glTF exporter 4.3.47. Blender warns that the source was saved
  with 4.4; geometry, UV, normal, texture, reimport and matched-render checks above
  explicitly verify the data used. Draco library warning is irrelevant: no Draco
  compression was requested or used. Denoising is disabled because this Blender
  build lacks OpenImageDenoise; matched renders use identical settings.

Reproduction: use `assets/solrahn-goal-015/scripts/export.py` with Blender and the
verified source path plus an output path. `compare_attributes.py` checks loaded
source corners against the runtime GLB. `render_check.py -- source` runs with the
original loaded; `render_check.py -- export` imports the GLB in a fresh scene.
The source native file is preserved at the founder's existing GitHub Release.

## Integration, grounding and camera

Goal 014 gameplay is retained: six full animated Summoners, combat, abilities,
scoring, bots, camps, results and touch controls. Its visual map is replaced only
in the separately published Goal 015 subtree. Production and Goal 014 hosted
objects are protected and compared during publication.

Original transform retained exactly: scale `(80,80,80)`, translation `(0,8,0)`,
rotation `(0,0,0)` in glTF/PlayCanvas Y-up. Original world bounds:
`(-62.07552,-5.06448,-76.05896)` to `(62.10728,23.36040,76.06848)`.
Goal 014 differs only at its minimum Z by about **2.1 mm**, but individual surface
samples differ substantially more. Old walkable-cell height differences have mean
7.9 mm, p95 20 mm, **maximum 352 mm**. Old collision data is therefore not reused.

`python3 scripts/solrahn-surface-015.py` rasterizes the full-quality triangles,
retaining the existing 25cm sampling, 0.55m edge clearance, terrain ceiling,
local-span rules and connected middle-lane component. It produces 14,827 walkable
cells (529 removed / 35 added relative to Goal 014) without inventing routes.
The conservative mask changes at obstacle edges because the original surface differs.
Six spawns, uninterrupted centre road, both existing Mobility camps, AI participation
and no terrain escapes are checked against this rebuilt data. Heightfield bilinear
sampling is still approximate on sharp relief and unsupported under canopy/multiple floors.

Preview camera offset is now **12m up / 14m back**, looking at the player's ground
position, 48° vertical FOV. It is about **41° downward** through most of the lane,
compared with Goal 014's roughly 65° angle. It is substantially closer; character
model scales remain unchanged. Camera Z is capped at 52m to stay in front of the
south base arch, so spawn framing temporarily steepens. Terrain elevation remains
unchanged. No individual-tree transparency is implemented; the environment remains
one connected mesh. Forest/cliff occlusion and the opposite base arch can still
obstruct some viewpoints. Touch aiming keeps its existing local terrain-plane method.

## Verification and limits

All 242 unit tests pass, including a separate rerun of the three terrain tests
against the rebuilt data. Typecheck, scoped runtime/test ESLint and Prettier pass.
The existing unscoped lint includes the pre-existing CommonJS Goal 013 offline
validator incompatibility; no new dependency or runtime lint exception was added.
Nine existing production-arena browser checks pass. Preview browser receipts,
actual Summoner screenshots and final public verification are in `evidence/015/`.
Long-match checks use normal fixed 60Hz simulation ticks through the established
opt-in verification seam; the human touch/hit check uses a controlled centre roster.
Neither is presented as physical device performance.

Arena GLB geometry buffers: **212,645,424 bytes (202.79 MiB)**.
Arena texture budget as RGBA8 with full mip chains: **192 MiB** (encoded JPEGs
occupy 27.61 MB). The complete game's PlayCanvas accounting reports textures
604,031,804 bytes, vertex buffers 150,020,972 bytes, index buffers 67,179,552 bytes,
uniform buffers 2,736 bytes: **821,235,064 bytes / 783.19 MiB** total. These are
engine allocation counters, not measured process RSS or physical GPU residency.
CPU decoded mesh copies, temporary downloads, browser overhead and driver memory
can add substantially to this total.

Initial local landscape readiness was 40.0s with a 9.28s map fetch; software wall
throughput 0.23 FPS. This workspace uses Chromium SwiftShader software WebGL,
not an iPhone GPU. Physical iPhone Safari loading, memory reliability and frame rate
remain **UNVERIFIED** until the founder plays it. A successful desktop export/load
is not mobile performance acceptance. No further optimization was performed.

The Wilderness connectivity problem and full-map navigation remain unresolved.
Only the current centre lane and connected adjacent Wilderness paths are navigable;
all three authored lanes remain in the visual mesh. No 5v5, towers, future objectives,
combat redesign, procedural terrain or next milestone was introduced.
