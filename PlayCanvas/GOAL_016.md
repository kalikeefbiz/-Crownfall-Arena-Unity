# CODEX GOAL 016 — SOL’RAHN PLAYABLE TERRAIN GRAYBOX

**Project:** BlackHouse / Crownfall Arena  
**Repository:** `kalikeefbiz/-Crownfall-Arena-Unity`  
**Source branch:** `playcanvas-port` (verified baseline `5eda5b34f34d05ece4fb3624fef5fd8bbefbc4e9`, recheck tip before branching)  
**Engine:** PlayCanvas / TypeScript / Vite  
**Source of truth:** APPROVED `crownfall_terrain_v2_review.zip` supplied with this GOAL, NOT the old Sol’Rahn GLB, GOAL 014 map, rejected GOAL 015, or `Solrahn_Graybox_Coordinates_V1.json`.

## Mission

Construct a **real, movable, collidable, camera-tested 3D terrain graybox** from the approved Terrain Foundation V2 raster package, with a separate opt-in 3v3 preview. Do not replace, redeploy, change, or regress the normal `/playcanvas/` production arena. The founder must approve the new preview after testing before any future production integration.

The V2 ZIP contains:
- `annotated_blueprint.png`: the authoritative top-down layout;
- `heightmap_16bit.png`: **1200×900, 16-bit single-channel** source; nominal 0–12 m elevation is **provisional**, not a final gameplay height scale;
- `lane_mask.png`: semantic lane footprints, NOT ready-made navigation/collision;
- `3v3_study_region_mask.png`: **conceptual** gameplay region, NOT final physical gates or collision;
- `terrain_3d_preview.png` and `heightmap_preview.png`: visual references only;
- `README.txt`: former draft status pre-dates founder approval. V2 layout is now APPROVED as the design baseline, while its scale, slopes and play boundaries still require engineering validation.

ZIP SHA-256: `17efa4455d942e565cdc35e1f0fe9c981d59c1a3bc759ff72e1d32d0dd8b6db8`. Heightmap SHA-256: `d7d55c029cc3ba2822afdccc0ff4d730adbcbdd8868ed334d265fdba6acb8054`.

## Non-negotiable geometry and gameplay layout

- One **continuous authored battlefield**, not a second disconnected 3v3 arena. Three lanes: upper, middle, lower. Blue/Red Crown Core endpoints at opposite ends of the middle axis; retain the Crownfall competitive system without inventing towers or minion lanes.
- Two Wilderness regions directly between lanes. Each has **three** accessible minor-camp clearings: one Mobility, one Cooldown, one Defense. **Six minor camps total**. The annotated V2 blueprint fixes their relative locations. Keep each clearing broad enough for actual combat, retreat and rotation.
- **One major objective** in a distinct **northern Wilderness clearing**, visibly separate from all lanes. It requires alternate entrances and battle/retreat space. Do NOT move it into the middle lane, merge it with a minor camp, add a monument, or make it an existing active rule/objective without authorization.
- Preserve readable lane-widths, branching Wilderness routes and meaningful elevation/embankments. Build no impassable continuous Wilderness wall or accidental isolated islands. Spawn/core approaches remain traversable.
- **3v3:** middle lane plus adjacent Wilderness is playable; upper/lower lanes and distant regions are out of bounds. Show the larger battlefield as appropriate, but enforce only validated 3v3 gates. The supplied 3v3 mask is a study input, not authoritative collision. **5v5:** full three-lane terrain remains topologically accessible for future mode testing, but do not build or activate a 5v5 ruleset in this GOAL.
- Preserve all existing combat, ticket/Crownfall Points, territory, respawn, controls, roster, animation, bot combat and character asset behavior. Make only the minimum preview-scoped terrain-specific spawn, grounding, movement/pathing, camera and objective-location adaptations needed to test a real match. Mark new camps/objective with simple neutral debug footprints/labels, not newly activated bonuses or mechanics.

## Implementation sequence

1. **Baseline and isolation:** inspect `PlayCanvas/GOAL_015_CLEANUP.md`, `GOAL_014_VERIFICATION.md`, `src/maps/solrahn.ts`, `src/presentation/solrahn-environment.ts`, `src/combat/match-space.js`, `src/presentation/scene.ts`, existing tests, and publication workflows. Create a dedicated GOAL 016 candidate branch from the current `playcanvas-port` tip. Record the exact base SHA and original production `/playcanvas/` bundle/Pages tree. The existing `?mapPreview=solrahn` GOAL 014 experiment must remain intact. Do not reintroduce GOAL 015's ~240 MB rejected high-resolution map.
2. **Build deterministic geometry offline:** convert the V2 **original 16-bit** heightmap to a compact chunked graybox heightfield. Never rely on HTML Canvas 8-bit PNG decoding or the 8-bit preview for elevation; never auto-contrast the raw data. Decode unsigned 16-bit consistently and document pixel-to-world X/Z mapping, vertical normalization, world dimensions, Y-up orientation, region-mask alignment and checksums. Generate a bounded-LOD visual mesh (initial target ~25–60k triangles across chunks, adjust only with measured evidence), with correct face winding/normals, closed visible edges, and no cracks/holes. Avoid loading a 1200×900 full-density render grid or megabyte-scale decorative textures at runtime. Apply neutral debug colors only.
3. **Shared authoritative terrain model:** derive collision and walkability/navigation from the same calibrated height data and validated boundaries. Include collision-radius erosion, slope and step limits, boundary treatment, spawn/camp clearings and edge safety. Movement, dashes, bot wayfinding, height grounding and aim/camera intersections must not disagree about the floor. Keep expensive terrain mesh conversion out of frame updates. Make all limits explicit/testable; do not flatten V2 wholesale to hide slope problems.
4. **Preview-scoped runtime:** add a distinct opt-in `?mapPreview=solrahn-v2` or similarly explicit GOAL 016 mode that loads the new graybox using existing menu/loading/lifecycle; leave default terrain and earlier previews unchanged. Author 3v3 mode bounds from a validated study-mask interpretation; outside remains non-traversable in this mode. Expose lightweight developer overlays/toggles for walkability, slopes, collisions, routes, spawns/camps/major center, mode bounds, height samples and camera framing. No codepath may silently fall back to GOAL 014 geometry while claiming V2 is running.
5. **Gameplay traversal:** place compatible Blue/Red spawns and the active middle lane/scoring axis within V2. Verify human + five bots can traverse lane and Wilderness, reach and exit all six neutral camp locations and the major clearing, retreat, dash, fight, die, respawn, complete a match and rematch, with no teleporting/falling/stuck actors or invisible barriers. Existing game rules remain unchanged; inactive planned objectives must be clearly identified as placeholders.
6. **Camera and iPhone:** evaluate real competitive camera at the actual elevations, not only top-down screenshots. No camera clipping into terrain, occlusion of the player/ability telegraphs, unreadable characters or broken mobile touch/aim. Keep imports and memory small. Compare warm/cold load, runtime allocations and frame timings against unchanged production. A browser mobile viewport and SwiftShader are preliminary tests only; **physical iPhone Safari validation is required for final acceptance**.
7. **Publish strictly isolated preview:** build/serve GOAL 016 on `/solrahn-goal-016/` or an equivalent unique preview path only, using a manually controlled deployment that cannot replace `/playcanvas/`, Unity root, GOAL 014, or any other working Pages path. Preserve snapshots/sha256 checks proving protected production assets and published paths are byte-identical before and after. Avoid automatic production workflow triggering during candidate source pushes (follow the audited GOAL 015 isolation precedent).

## Mandatory automated validation

- Re-run full existing unit, typecheck, scoped lint, build and Playwright browser suites without changing old expectations to force a pass.
- New geometry tests: source is precisely V2 16-bit data; correct checksum and raster orientation; vertex/index integrity; source-to-mesh elevation tolerances; finite normals; no open internal seams; bounded triangles/bytes/allocations; deterministic rebuild.
- New traversability tests: both core/spawn groups; middle-lane round trip; all six camps and major clearing reachable from both sides and out again; two or more usable entrances where intended; no unsupported slope/height steps; no cross-boundary escape into upper/lower lanes in 3v3; 5v5 lanes form a coherent future navigable map.
- New actual-match browser tests: player input, joystick + touch ability, dash, bot routing/combat, full lifecycle, results, restart; 3v3 menu-first load; no asset 404s, WebGL exceptions or phantom objective activation.
- Capture labeled: top-down map vs V2 blueprint, height/slope/walkability overlay, each Wilderness region, all six camp footprints, major clearing, middle-lane play, spawn/core approaches, collision edge cases, normal competitive camera, landscape + portrait mobile views.
- Profile cold/warm load, asset download sizes, GPU/JS allocation estimates, draw calls, median/p95 frame time under actual match load and prolonged play. **Acceptance target:** no physical iPhone Safari crashes or sustained thermal/memory failure; target at least 30 fps sustained with acceptable input responsiveness. If device metrics are unavailable, mark iPhone acceptance **NOT VERIFIED**, do not claim a pass, and do not integrate into production.

## Scope exclusions

No finished materials/textures, trees, plants, decorative architecture, VFX embellishments, model upgrades, new game modes, shop, 5v5 gameplay, fresh objective mechanics, tower/minion systems, territory math changes, camera redesign for production, or production swap. Do not revive the GOAL 015 GLB; do not overwrite approved GOAL 014 or production. Avoid superficial appearance work before spatial function is proved.

## Required handoff

Deliver (1) isolated source branch + commit SHA, (2) direct playable preview link, (3) reproducible asset conversion steps, hashes and measured geometry budget, (4) full test counts and failures, (5) route/fairness and camera evidence images, (6) actual device performance results **or NOT VERIFIED**, (7) production immutability evidence, (8) explicit unresolved problems and recommendation PASS / FAIL / CONDITIONAL. **Stop after preview and validation. Founder approval is mandatory before changing the production arena.**

If the V2 ZIP is not present in the Codex workspace, stop before generating geometry and request this exact supplied ZIP rather than silently using V1 or rejected assets. Do not substitute fabricated terrain data.
