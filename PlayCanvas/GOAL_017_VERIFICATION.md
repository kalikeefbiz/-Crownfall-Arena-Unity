# GOAL 017 — Sol’Rahn V2 material candidate

**Isolated preview only. Physical iPhone Safari: NOT VERIFIED. No production merge or visual-design lock.**

Source branch: `goal-017-solrahn-surface`, parent `7e193f87b4821470b5697c00034036fe8ced0a6f`.
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
are requested: eight 1024×1024 WebP maps plus a 1200×900 PNG weight texture.
No authoring-size maps, displacement or model assets are requested for this pass.

Color RGB is sRGB; alpha holds linear roughness. Normal RGB is linear OpenGL
XYZ, with AO in alpha. Normal XY strength is reduced to 0.38. Roughness is clamped
to [0.64,0.98]. Both low and high quality use this 1K budget. Textures have full
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

One standard lit PBR pass uses nine texture samples/samplers (one weight, four
color/roughness, four normal/AO) per top-surface fragment. Opaque blending;
no added terrain passes or shadow maps. The outer skirt reuses the rock maps.
Runtime texture allocation is **50,498,696 bytes (48.16 MiB)**, including mips,
as RGBA8 and SRGBA8. The eight WebP downloads total **4,520,040 bytes**; weights
add **746,804 bytes**. These are transfer-file sizes, not GPU compression.
The GPU allocation is engine accounting, not physical residency or GPU duration.

## Reproduce

From `PlayCanvas/`:

```sh
python3 -m pip install -r scripts/requirements-solrahn-v2.txt
python3 scripts/solrahn-materials.py
python3 scripts/solrahn-weights.py
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
Pages Git blobs, served on the same local machine at port 4175. Both comparisons
use six real models, the existing central roster fixture, ordinary bots and a
Ring effect. Only countdown is skipped before sampling; measured samples use
wall-clock frames without accelerated simulation.

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

- **250/250 unit tests pass** across 29 files, including all 249 inherited tests
  and deterministic weight regeneration, every-pixel normalization, original
  gameplay/geometry hashes and dirt-dominant landmark centers.
- Typecheck, scoped ESLint (`src`, `tests`, Vite config), touched TypeScript
  formatting, Python compilation and production build pass.
- **4/4 new material browser cases pass**: full landscape and portrait lifecycle,
  six character imports, natural bot damage, real touch movement and ability
  damage, results, rematch, corrupt-height rejection and missing-texture rejection.
  The two failures deliberately tested by the last cases show the existing retry
  UI and never fetch an older map.
- Full `npm run lint` was also run: **FAIL, three inherited errors** in the
  unchanged `assets/solrahn-three-lane/scripts/validate_glb.cjs` CommonJS utility
  (`no-require-imports` and import ordering). Runtime/test lint is clean.
- Full `npm run fmt` was run: **FAIL, 42 files**, including baseline evidence,
  baseline terrain metadata and instruction documents, plus new generated JSON,
  instruction/evidence files and the review HTML. Raw provider manifests and
  source instructions were retained; touched runtime/test TypeScript formatting
  passes. No formatter gate was weakened.

Full original browser regression and serial measured performance results follow
in the completed handoff. Raw receipts are in `evidence/017/`.
Physical iPhone Safari, sustained 30 fps, thermal stability and physical GPU
residency remain **NOT VERIFIED**. Founder device testing and explicit review
are required before production integration, foliage work or visual-design lock.
