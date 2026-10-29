# GOAL 017 — Sol’Rahn V2 material candidate

**Isolated preview only. Physical iPhone Safari: NOT VERIFIED. No production merge or visual-design lock.**

Source branch: `goal-017-solrahn-surface`, parent `7e193f87b4821470b5697c00034036fe8ced0a6f`.
Final rendering implementation: `48b4172` (initial material pass: `f76899c`).
Preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017/?mapPreview=solrahn-v2&surface=goal017&frontend=1>.
Review board: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017/review/>.
Enter Crownfall → Enter Arena. The existing character selection, controls and live
3v3 match are retained. Remove `surface=goal017` to inspect the unchanged graybox
material path; use the existing GOAL 016 URL for the immutable prior publication.

## Scope and source protection

The approved source tip was rechecked before implementation. `playcanvas-port`
was `5eda5b34f34d05ece4fb3624fef5fd8bbefbc4e9`; Pages was
`d08ea79e0865568821e7ba8fe8141b202236efd7`. All source workflows were inspected:
production push triggers apply only to `main` or `playcanvas-port`, never this
candidate branch. Source pushes use `[skip ci]`; no production workflow is dispatched.
The publisher permits only `solrahn-goal-017/` changes and compares every other
Pages Git object before a lease-protected push.

No map, combat, input, camera, terrain generator, collision, navigation or rule
source changes. The original 120×160 m footprint, uint16/65535×8 m normalization,
all positions, 3v3 gates, 2 Mobility mechanics, 4 inactive minor camps and inactive
major remain intact. There are no scenic objects or geometry additions. All
49 terrain meshes, 55,296 top triangles and 1,344 outer-skirt triangles remain.
Existing positions, normals and indices are unchanged. Additional UV/tangent
attributes add 784,512 GPU buffer bytes (terrain buffers 1,647,360 → 2,431,872).
See `evidence/017/baseline.json`, `protection-before.json` and `protection-after.json`.

## Materials and deterministic weights

Four CC0 Poly Haven families: Dry Ground Rocks, Grass Path 2, Forrest Ground 01,
Mossy Rock. Source URLs, authoring and runtime SHA-256 hashes and conversions are
in [materials.json](public/assets/solrahn-surface/materials.json) and the
[asset README](assets/solrahn-surface/README.md). Only optimized runtime images
are requested: eight 1024×1024 WebP maps, a 1200×900 PNG weight texture, and a derived 1024×768 Low atlas.
No authoring-size maps, displacement or model assets are requested for this pass.

Color RGB is sRGB; alpha holds linear roughness. Normal RGB is linear OpenGL
XYZ, with AO in alpha. Normal XY strength is reduced to 0.38. Roughness is clamped
to [0.64,0.98]. Both quality tiers use 1K assets. Low uses geometry normals and omits texture AO; High uses the blended OpenGL normal/AO maps, following the existing production quality convention. Textures have full
mip chains, trilinear filtering and anisotropy capped at 4. UV scale is six metres
per repeat, shared across chunks; outer skirt UVs follow the existing vertical
faces. Analytic global tangents agree at duplicated boundaries. The existing
production dirt loader now shares its unchanged texture-loading settings with
the new loader; older map integration is not reactivated.

The production mask is regenerated from the approved lane raster, the exact
runtime triangle-plane height gradients, calibrated height, relative relief and
curvature, and the actual landmark coordinates/radii in `terrain.json`.
Slope weights are feathered over about 0.67 m to avoid exposing decimation steps
as sharp paint boundaries. Lane interiors and clearing centers are 95% dirt;
shoulders feather through Grass Path. Forest soil/moss occupies quieter rises,
with rock increasing on credible slopes. No study-region mask is used for materials
or collision. The package's illustrative weight image is never loaded.

Mask R/G/B/A = dirt/grass/forest/rock. Linear data; alpha is the fourth weight,
not opacity. Largest-remainder 8-bit quantization gives sum=255 at every pixel.
Shader filtering is followed by normalization. The PNG loads through ImageBitmap
with explicit **no premultiplication or color conversion**, including alpha=0.
Source image x→u and y→v use exactly worldX=(v−.5)×120, worldZ=(.5−u)×160.
Half-texel sampling preserves source endpoints; there is no flip, crop or stretch.
See [weights.json](public/assets/solrahn-surface/weights.json).

One standard lit PBR pass uses **two texture reads on Low** (baked color/roughness plus world-tiled detail; three sampler bindings including weight debug) and **nine on High** (also four normal/AO). Opaque blending;
no added terrain passes or shadow maps. The outer skirt reuses the rock maps.
The full ten-texture GPU capacity budget is **54,692,996 bytes (52.16 MiB)**, including mips,
as RGBA8 and SRGBA8. The eight family WebP downloads total **4,520,040 bytes**; weights add **746,804 bytes**, and the derived Low atlas adds **272,096 bytes**. These are transfer-file sizes, not GPU compression.
Per-run engine allocation totals are recorded in the measured table below. Texture capacity and engine accounting do not establish physical residency or GPU duration; normal images remain loaded for quality switching.
Decoded browser image/bitmap backing stores are outside the sampled JavaScript
heap metric; this report does not equate JS heap with total process memory.

## Reproduce

From `PlayCanvas/`:

```sh
python3 -m pip install -r scripts/requirements-solrahn-v2.txt
python3 scripts/solrahn-materials.py
python3 scripts/solrahn-weights.py
python3 scripts/solrahn-low-atlas.py
npm ci
npm test
npm run typecheck
npx eslint src tests vite.config.ts
npm run build
npx playwright install chromium
npm run test:browser -- --workers=1 --retries=0 --forbid-only --global-timeout=3600000 --reporter=line
```

The existing build guard still requires the canonical GOAL 014 LFS binary locally;
this candidate never uses it as terrain or requests it in the V2 browser path.
It was retrieved only to satisfy that unchanged integrity check.

Start `npm run start -- --host 127.0.0.1 --port 4173`, then run
`node tests/helpers/capture-solrahn-surface.ts` for camera/debug evidence.
`node tests/helpers/measure-solrahn-surface.ts [candidate URL] [baseline URL]`
compares identical mobile dimensions/quality, serially, after other browsers stop.
The baseline fixture uses the published GOAL 016 bundle, verified against its
Pages Git blobs, served on the same local machine at port 4175. Recreate it with
`python3 scripts/solrahn-surface-baseline.py`, then run
`python3 -m http.server 4175 --directory /tmp/crownfall-goal016-baseline`. Both comparisons
use six real models, real countdown, ordinary movement to mid-lane, normal bots
and a Ring effect. No verification fixture or accelerated clock is used.

Publish only after validation, from the exact committed source:
`python3 scripts/publish-solrahn-surface.py COMMIT_SHA`.
Then `python3 scripts/verify-solrahn-surface.py --after` verifies protected live
bundles and source branches. The publisher includes a static evidence board;
these review images are never requested by gameplay.

## Review evidence

The [review board](evidence/017/review.html) puts the unmodified approved blueprint
beside an actual top-down material render. Camera captures cover all seven
clearings, Blue/Red spawns, the middle lane and both Wilderness regions.
The real shader exposes four weight views and a colored boundary view in the
existing developer panel. Original height/slope/walkability/routes/gates remain
available. Mode lines and neutral objective footprints can be toggled for
inspection without changing behavior. The mobile browser checks capture both
844×390 landscape and 390×844 portrait, natural bot combat, real human touch
movement/ability damage, results and cached rematch.

## Validation and performance

- **251/251 unit tests pass** across 29 files, including all 249 inherited tests
  and deterministic weight/Low-atlas regeneration, every-pixel normalization, original
  gameplay/geometry hashes and dirt-dominant landmark centers.
- Typecheck, scoped ESLint (`src`, `tests`, Vite config), touched TypeScript
  formatting, Python compilation and production build pass.
- **5/5 final material browser cases pass**: High normal/AO rendering, full landscape and portrait lifecycle,
  six character imports, natural bot damage, real touch movement and ability
  damage, results, rematch, corrupt-height rejection and missing-texture rejection.
  The two deliberate asset-failure cases show the existing retry
  UI and never fetch an older map.
- Full `npm run lint` was also run: **FAIL, three inherited errors** in the
  unchanged `assets/solrahn-three-lane/scripts/validate_glb.cjs` CommonJS utility
  (`no-require-imports` and import ordering). Runtime/test lint is clean.
- Full `npm run fmt` was run: **FAIL, 42 files**, including baseline evidence,
  baseline terrain metadata and instruction documents, plus new generated JSON,
  instruction/evidence files and the review HTML. Raw provider manifests and
  source instructions were retained; touched runtime/test TypeScript formatting
  passes. No formatter gate was weakened.

The original 132-case sequential run was interrupted by a workspace process
restart during case 127, after cases 1–126 completed with no reported failure.
The raw interrupted log is retained as `browser-original-interrupted.txt`.
The complete final Wilderness file was rerun: 10/11 passed. One unchanged legacy
return-movement assertion reached |X|=11.18148 m when its 15-second poll required
|X|<11 m. It runs on the existing production map without the new surface flag;
that same case had passed as case 126 before the interruption. Its full failure
and context are retained. The unchanged isolated rerun **passed 1/1**. All 132 original browser cases therefore have passing coverage, alongside the five final material cases; the interrupted run and timing failure remain visible in the receipts.

Serial measured performance results follow in the completed handoff. Raw
receipts are in `evidence/017/`.
Physical iPhone Safari, sustained 30 fps, thermal stability and physical GPU
residency remain **NOT VERIFIED**. Founder device testing and explicit review
are required before production integration, foliage work or visual-design lock.


### Performance iteration and remaining acceptance

The first full-PBR implementation did not honor Low's cheaper normal/AO setting.
Its static six-model SwiftShader medians were 716.6/650.0 ms cold/warm, versus
316.6/316.7 ms for the verified GOAL 016 bundle. That substantial software
regression was retained in `performance-first-pass.json`. A five-sample Low path remained costly. The final Low path uses a separate
two-read shader: a 1K color/roughness bake of the same four families plus bounded
6 m tiled soil microdetail. It uses geometry normals; High retains full PBR.
The atlas is generated in linear color at the original raster/world endpoints
and uses the unchanged production weights. It trades close-up material detail
for speed, with no geometry or gameplay alteration.
A selective-sampling experiment did not improve SwiftShader and is not shipped.
An audit caught that the roster verification fixture removes bots: earlier
static six-model timings are therefore explicitly excluded from live-combat
acceptance. Their raw data remain available; live-combat timings below replace them.
The final comparison below remains a software-renderer measurement, not an
iPhone performance claim.

**Recommendation: CONDITIONAL — isolated founder preview only.** Geometry,
coordinate alignment, loading and gameplay regression evidence are complete.
Physical-device frame time, memory stability, thermal behavior and Safari
compatibility remain unverified. Software-relative material cost must be reviewed;
performance acceptance is not marked PASS. Existing repository-wide lint/style
failures also remain documented. No production integration, visual-design lock
or foliage work is approved by this handoff.


### Final live-combat measurements

Chromium/SwiftShader, 844×390, DPR 1, Low quality, sequential contexts on the same
executor. Cold uses an empty context cache; warm reloads the same context. Each
build uses its real countdown and normal keyboard movement to mid-lane. Sampling
starts after bot damage is observed and the human casts Ring. **No verification
fixture, bot removal, actor relocation or accelerated clock is used.** All samples
stayed in active matches with six full models loaded; bot damage increased during
every window. Normal deaths/respawns and changing combat positions are included.
Target windows are 60 wall seconds cold / 20 warm; actual sampled durations are
recorded. No page or HTTP errors occurred.

| Build/cache | Ready | Median frame | p95 frame | Mean FPS | Median WebGL draws | Engine textures |
|---|---:|---:|---:|---:|---:|---:|
| candidate cold | 3.595 s | 383.3 ms | 799.9 ms | 2.67 | 44.4 | 436.22 MiB |
| candidate warm | 3.457 s | 466.6 ms | 950.0 ms | 2.07 | 50.5 | 436.22 MiB |
| approved-goal-016 cold | 2.450 s | 166.7 ms | 366.7 ms | 5.11 | 35.3 | 384.05 MiB |
| approved-goal-016 warm | 2.385 s | 283.4 ms | 600.1 ms | 3.52 | 50.4 | 384.06 MiB |

Median frame times are **2.30× cold / 1.65× warm** the baseline.
The atlas reduced candidate cold median from 583.3 to 383.3 ms
compared with the prior five-sample live-combat run, but substantial software
overhead remains. **Software-relative performance gate: FAIL. Physical iPhone
Safari performance: NOT VERIFIED.** Both scenarios are far below 30 fps on this
software renderer. The result supports isolated visual/gameplay review; it does
not establish production performance acceptance or sustained device frame rate.

This is one run per condition, with normal combat state changing at different
frame rates. It has no confidence interval and is not a matched-frame GPU
microbenchmark. Engine texture totals are allocation accounting, not physical
residency. GPU duration is unavailable. Sampled JS heap ranges and bot damage
growth are in the summary; native decoded images/bitmaps and process memory are
outside that metric. These short runs do not establish leak or thermal stability.

Receipts: [raw live samples](evidence/017/performance.json),
[summary](evidence/017/performance-summary.json),
[prior five-sample live run](evidence/017/performance-five-sample-live.json),
[static six-model results, excluded from combat acceptance](evidence/017/performance-static-models.json),
[material browser checks](evidence/017/browser-materials-final.txt),
[interrupted original suite](evidence/017/browser-original-interrupted.txt),
[final Wilderness file including timing failure](evidence/017/browser-wilderness-resume.txt),
[unchanged isolated rerun](evidence/017/browser-legacy-isolated.txt),
[final camera capture](evidence/017/camera-verified-build.txt).


### Publication and protected content

The isolated publisher compares every pre-existing Pages Git object against the
initial 197-blob tree and refuses changes outside `solrahn-goal-017/`. Public
SHA-256 checks cover all 66 recorded HTML/JS/CSS/JSON objects across production,
GOAL 014, GOAL 016 and the Unity entry. The final post-publication proof and
hosted browser results are committed in `evidence/017/`. The exact hosted source
revision is recorded at
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017/preview-source.json>.
No production merge, default-branch change or production workflow dispatch is
authorized or performed by this goal. Founder device and visual review are
required before production integration.


### Final publication receipt

- Hosted source: `ba4af5dfad4105fb9924f712b9c8c779666c688a`; final rendering implementation: `48b4172`.
- Pages commit: `4521174ae290685b5a7e875640081e2a73066b5b`.
- Only `solrahn-goal-017/` changed: all **197 pre-existing Git blobs are identical**.
- All **66 protected public HTML/JS/CSS/JSON SHA-256 values match** after publication.
- **28 new hosted runtime/review files** match the publication manifest exactly.
- **2/2 hosted mobile lifecycle checks pass**, covering landscape and portrait,
  all six models, real touch movement and damaging ability, natural bot combat,
  full results and cached rematch. No page/console/WebGL/HTTP errors were recorded
  by the positive browser cases.
- `playcanvas-port` remains `5eda5b34f34d05ece4fb3624fef5fd8bbefbc4e9`;
  `goal-016-solrahn-v2` remains `7e193f87b4821470b5697c00034036fe8ced0a6f`.

Proof: [publication](evidence/017/publication.json),
[protected content](evidence/017/protection-after.json),
[hosted hashes](evidence/017/live-preview-hashes.json),
[hosted browser run](evidence/017/browser-live.txt).

**Final recommendation: CONDITIONAL — isolated review only.** Software performance
acceptance failed; physical iPhone Safari and sustained 30 fps are NOT VERIFIED.
The terrain/material implementation, source provenance and regression evidence
are delivered for founder review. No production merge or visual-design approval
is implied.
