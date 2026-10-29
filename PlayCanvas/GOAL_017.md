# CODEX GOAL 017 — Sol’Rahn V2 Surface Mapping & PBR Material Foundation

**BlackHouse / Crownfall Arena**  
**Status:** implementation brief, **not** approval of an implemented build  
**Design authority:** approved Terrain Foundation V2 and playable GOAL 016 implementation  
**Source repository:** `kalikeefbiz/-Crownfall-Arena-Unity`  
**Source branch:** `goal-016-solrahn-v2` (verified review tip `7e193f87b4821470b5697c00034036fe8ced0a6f`, recheck on start)  
**Implementation branch suggestion:** `goal-017-solrahn-surface`

## 1. Mission

Deliver the **first real terrain-material pass**, not a new battlefield. Keep GOAL 016's validated terrain, fixed placement of all three lanes, both Wilderness bands, six minor camp clearings, separate major objective clearing, Blue and Red spawn/core geography, camera, collision, 3v3 restrictions, and combat behavior intact.

**The earlier decorative illustration for GOAL 017 is REJECTED and is not included.** Use the authentic source blueprint and the registered 1200×900 material-zoning reference in this package. The reference specifies **which surfaces receive materials**; it is not a replacement map and does not authorize adding objects.

## 2. Source-of-truth precedence

1. **GOAL 016's functioning PlayCanvas V2 runtime** and associated terrain generator, navigation and objective data determine final transforms, walkability and gameplay geometry.
2. **The approved `crownfall_terrain_v2_review.zip`** determines original terrain geography and approved design. Original README calls V2 a draft because it predates founder approval; its later approval and GOAL 016 verification supersede that status.
3. `CANONICAL_V2_Approved_Annotated_Blueprint.png` is an unchanged copy of `annotated_blueprint.png` from the V2 ZIP. It fixes the depicted *relationships*, not literal drawing of every path pixel.
4. `GOAL_017_Authentic_V2_Surface_Reference.png` and `GOAL_017_Material_Zoning_Aligned_1200x900.png` are material-art direction **over the real source raster**. They are not independent map redesigns.
5. `GOAL_017_Splat_Weights_REFERENCE_ONLY.png` is a reproducible, **candidate** weight map. Codex should derive and refine production weights using the actual terrain data. Do not blindly ship this reference as final/runtime-approved splat paint.

Do not consult the rejected 240 MB GOAL 015 visual mesh as implementation authority; do not replace V2 with GOAL 014/V1.

## 3. Approved geography — MUST MATCH

- **Map orientation in the reference:** BLUE LEFT; RED RIGHT. The main play direction runs **horizontally from Blue to Red**, with upper, middle and lower lanes also running left-to-right. Do not rotate the diagram or replace it with a vertically drawn battlefield.
- Original heightmap and lane mask: **1200×900** raster; current GOAL 016 world footprint: **120×160 metres**; current vertical normalization: `uint16/65535 × 8 m`.
- Source image normalized `u` increases left→right, `v` increases top→bottom. World mapping from GOAL 016: `worldX=(v−0.5)*120`, `worldZ=(0.5−u)*160`, Y-up. Blue is at positive world Z, Red at negative world Z.
- Three actual lane strips are defined by V2 `lane_mask.png`, not new hand-drawn parallel roads.
- Six approved camp positions (normalized raster u, v), per the GOAL 016 generator: northern Mobility `(0.16, 0.34)`, northern Cooldown `(0.59, 0.33)`, northern Defense `(0.85, 0.335)`, southern Defense `(0.16, 0.67)`, southern Cooldown `(0.50, 0.675)`, southern Mobility `(0.84, 0.67)`.
- Major objective: `(0.375, 0.315)` in its **own northern Wilderness clearing**, not on any lane or combined with another camp.
- Current 3v3 playable band is approximately world X `[-28.8, +28.8]` (about raster v `[0.26,0.74]`); this is supplied for orientation only. **Use actual GOAL 016 navigation/physical gates for behavior.** Other lanes remain visible and out of bounds in 3v3.
- Original two Mobility mechanics remain active only where GOAL 016 has them. Remaining four camp types and the major are clearly inactive placeholders. No mechanics, spawn, scoring, path width, collision or point relocation in GOAL 017.

**No new:** castles, bridges, waterways, ruins, monuments, cliffs, tree/foliage meshes, roadside barriers, or arbitrary extra trails. The visual guide is exclusively about material placement on the already-existing terrain geometry.

## 4. Four material families

Use the smallest reasonable PBR set. Current ground materials in Crownfall's established production already use CC0 Poly Haven dirt / dry rocks. Candidate additional CC0 Poly Haven assets:

| Layer | Candidate source | Intended placement |
|---|---|---|
| 0 — packed dirt | **Dry Ground Rocks**, existing approved dirt asset, https://polyhaven.com/a/dry_ground_rocks | Dominant lane cores, camps, major clearing, worn traffic points |
| 1 — worn grassy earth | **Grass Path 2**, https://polyhaven.com/a/grass_path_2 | Lane shoulders; low, navigable Wilderness transit corridors; light borders on camp clearings |
| 2 — forest soil / moss | **Forest Ground 01**, https://polyhaven.com/a/forrest_ground_01 | Less-traveled Wilderness rises and slopes, low-intensity moss/leaf-litter surface |
| 3 — exposed rock | **Mossy Rock**, https://polyhaven.com/a/mossy_rock — **candidate only**; choose a compatible low-noise rock if better after inspection | Slope-based rock exposure, terrain cut faces, outer embankments (texture only, no new geometry) |

Match scale/color temperature/roughness across sources rather than merely loading their default 8K exports. Avoid vivid/neon green, grassy carpet, heavy normal strengths, and repeating checkerboard patterns.

For mobile, begin with optimized runtime **1K textures** for base color/normal and optionally packed roughness/AO; increase only after a measured comparison. Use proper OpenGL tangent-space normals, mipmapping, consistent world-space tiling, linear blending and physically plausible roughness. Document all actual formats, dimensions, GPU allocations and shader cost. Full-resolution downloads from Poly Haven are authoring sources, **not** runtime targets.

## 5. Weight / splat distribution rules

- Derive material weights deterministically from **the existing source and runtime terrain**, not from artistic guesses about a different layout.
- Start from V2's **true lane_mask**: lane interiors should remain predominantly packed dirt; shoulders transition gradually into worn grass. The mask is a semantic lane footprint, **not** walkability or collision.
- Use terrain **slope, curvature/relative relief, and calibrated height** to expose rock on steep rises and reduce it on gentler walkable flats. Do not change the heightmap to force an aesthetic.
- Use **actual camp and major clearing positions** and existing clearing radii to create worn dirt clearing centers with feathered Grass Path borders. Do not paint the major in a lane.
- Wilderness bands: Forest Ground / Moss dominates less-traveled rise zones; worn grassy ground supports existing valleys/routes. Keep transitions subtle, coherent and physically plausible.
- Reconstruct the resulting weights from the same approved V2 raster→world mapping used by the real terrain. Never rotate, flip, transcribe, crop, or nonuniformly stretch the material mask into different game space.
- Weights must be finite, normalized at every pixel/vertex (sum = 1 within precision), with smooth blending and repeatable generation. Document layer encoding and color space. If packing four channels, note that the alpha channel is data, not texture transparency.
- Use texture tile density appropriate to metres (not per-world fractional UV stretching). Compare road/wilderness scale in real competitive camera.
- **Do not use the study-region mask as a collision source.** The true gate/nav mask remains unchanged, including blocked but visually rendered outer lanes.

Reference weight atlas in package: four 8-bit layers, **R dirt / G grass path / B forest-moss / A rock**, at 1200×900, each pixel summing to 255. This atlas is **illustrative placement guidance** only; it was computed from the V2 16-bit source, original lane mask, GOAL 016 camp fractions and slope. Codex must validate and may improve it where actual play surfaces, geometry decimation, material realism or readability require changes. Terrain collisions and any approved objective positions may not be changed to match artwork.

## 6. Engineering implementation order

1. **Read baseline & protect production.** Examine GOAL 016 source/test/evidence, old preview loaders and CI publication workflows. Record current branch tip, asset hashes, production branch/pages tree and protected URLs before touching runtime. Branch from approved GOAL 016 candidate; do not mutate `playcanvas-port` or publish to `/playcanvas/`.
2. **Audit existing material and renderer path.** Identify the smallest reusable PBR loader from previous dirt implementation. Avoid duplicating asset loaders or heavy fragment shaders; do not reactivate old GOAL 014 map integration.
3. **Fetch / prepare candidate PBR maps.** Use CC0 source licenses; save provenance and conversion scripts; pack and downsample for mobile. Handle textures as authoring assets vs runtime optimized assets. No unnecessary 4K/8K browser requests.
4. **Generate masks** using V2 geometry/masks and existing world mapping; derive slope/clearings/lane shoulders. Ensure chunk-boundary continuity with zero mask seams and no coordinate flip. Expose a development overlay to inspect the individual four layer weights and surface boundaries.
5. **Render materials** on the existing GOAL 016 terrain chunks without changing vertex positions, normals where not needed, collision, navigation, game rules or hit detection. Keep runtime loads staged and deterministic; retained geometry budgets should remain stable.
6. **Capture review evidence**: unaltered blueprint side-by-side with actual top-down material render; lane close view from gameplay camera; both Wilderness regions; all camp and major clearings; steep rocky slopes; 3v3 boundary and visible outer lanes; Blue and Red spawns; mobile landscape and portrait.
7. **Performance and regression:** baseline vs new build cold/warm load, texture allocation, JS and GPU accounting, draw count, median/p95 frame time; test six live actors and real effects (not only empty map). Run relevant existing GOAL 016 tests, full unit/typecheck/lint/build and Playwright browser regressions. No new geometry/path/gameplay changes should be needed. Record real device iPhone Safari testing if performed; otherwise clearly **NOT VERIFIED**.
8. **Publish isolated review preview**, e.g. `/solrahn-goal-017/` only. Verify all production and GOAL 014/016 published objects unchanged byte-for-byte. If any workflow can auto-deploy production on a push, block that path before pushing.

## 7. Acceptance gates

A review-ready implementation must demonstrate:

- Exact V2 geographic and coordinate alignment; all 3 lanes, 6 camps, separate northern major, and 3v3 restriction match prior accepted build.
- No changes to map length (160 m axis), height normalization (8 m), world footprint (120×160 m), spawns/cores/objectives, terrain collision, navigation, bot behavior or rules.
- The middle lane reads as **worn dirt**, not a green field; wilderness transitions through mixed grassy, mossy soil, with exposed rock only where credible.
- No obvious tile repetition, UV stretches, shader seams, sharp material borders, washed-out appearance or excessive texture noise from the actual camera.
- Terrain surface visuals are consistent in the mobile landscape and portrait layouts; controls, hit effects and team colors stay distinguishable.
- Performance data compared with GOAL 016, with no crashes or material-induced performance collapse. Aim for sustained 30 fps on physical iPhone, but don't claim achievement without measuring it.
- No imported scenic props, water, tree population, new objectives or unauthorized layout modifications.

**Deliver:** source branch, implementation commit, hosted preview URL, asset provenance/hashes, procedural mask generation instructions, true material layer/debug views, measured regression and performance reports, remaining issues, and explicit PASS / CONDITIONAL / FAIL recommendation. Stop at isolated preview. Founder review is required before any production merge, visual-design lock or later foliage work.

## 8. Delivery checklist / references

Package should contain:

- `GOAL_017.md` — this instruction document
- `GOAL_017_Authentic_V2_Surface_Reference.png` — **source-aligned visual guide**
- `GOAL_017_Material_Zoning_Aligned_1200x900.png` — annotated, exact-raster mock distribution
- `GOAL_017_Splat_Weights_REFERENCE_ONLY.png` — four-channel sample only, **not final game data**
- `CANONICAL_V2_Approved_Annotated_Blueprint.png` — unchanged source blueprint
- `crownfall_terrain_v2_review.zip` — unchanged original approved V2 source archive
- `build_reference.py` — reproducibility of reference layout/masks; not runtime shipping code
- `CHECKSUMS.txt` — identity of source vs reference outputs

**Explicit warning:** Do not use any previously generated GOAL 017 fantasy arena illustration. It is inaccurate and not part of this package.
