# Goal 014 — authored Sol’Rahn playable preview

Preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-014/?mapPreview=solrahn>.
Choose **Enter Crownfall → Summoner → Enter Arena**. This is the existing local 3v3
match, with the official readiness, combat, pause, results and Play Again screens.
The live `/playcanvas/` game and Unity root are not replaced.

## Asset and rendering

The canonical visual GLB and the incomplete collision-candidate GLB were selectively
retrieved from `assets/solrahn-goal-013`, not merged wholesale. `git lfs fsck --objects`
passes. The visual is 48,825,928 bytes and SHA-256
`7faa8ecdc8e5b3f078d7ea0de09507a3572dccb2a63ac5eea30660e640a66a9d`.
The candidate is 587,724 bytes, SHA-256
`7046fbef7d83b48ce561c834e07f7c811f073f323358f1b0a7fb16efc75cba85`.
Source Git stores LFS pointers. No Blender source was needed or modified.

PlayCanvas instantiates the entire visual container as **one continuous render mesh**,
with its original PBR textures/material. No replacement terrain or procedural map is
rendered. The production bundle fetches the immutable, CORS-enabled GitHub LFS media
URL at asset commit `64019b48ec997d7b3873dc6628b7796c10498835`. The GLB is deliberately
not copied into `dist` or committed as an ordinary binary to `gh-pages`. Local Vite
development serves the verified canonical LFS file. Build checks its complete SHA-256.
All three lanes, forests, cliffs, stadium architecture and opposing bases remain present.

## Scale and camera

Uniform scale `(80,80,80)`, rotation `(0,0,0)`, translation `(0,8,0)` in glTF/PlayCanvas
Y-up coordinates; no features moved independently. Full bounds in metres:
`(-62.0755,-5.0645,-76.0611)` to `(62.1073,23.3604,76.0685)`;
about **124.18 × 152.13 metres in plan**. Blender Z-up exports to glTF Y-up; no extra
90-degree rotation is needed.

The middle road is approximately 6 metres wide, with a conservative 5.2-metre scoring
strip. Existing character bind heights remain Kit 1.75m, Set 1.9m, Riven 1.75m; collision
radius 0.45m and base movement speed 6m/s are unchanged. Kit Basic range remains 2.8m,
Ember Step 7m. Opposing spawn groups are 94m apart at Z ±47m, lateral offsets
0/−1.45/+1.45m; an uncontested trip to centre takes about 7.8s. This gives room for
three Summoners across a road while keeping the existing ability distances readable.
The existing Crown Point/ticket/rate/time/respawn rules operate on lane goals ±50m.

The preview camera follows terrain height, offset `(0,26,8)`, looking 4m ahead,
48° vertical FOV, near/far clips 0.1/260m. It starts at the selected spawn and clears
base architecture. The steeper angle was selected after an actual gameplay capture
showed the previous camera inside the base arch. Preview sun intensity is 1.0;
production remains 1.8. Indicators, labels, projectiles, ability overlays and Moonreapers
follow sampled surface elevation. Touch aim intersects the local player's terrain-height
plane; it is not a full mesh raycast for distant targets.

## Collision, navigation and objectives

`python3 scripts/solrahn-surface.py` reproduces the collision data directly from the
**verified visual triangles** (Python + NumPy/SciPy/Pillow). The fragmented Goal 013
candidate is retained for reference and never used as the finished collision authority.
See [surface plan](evidence/014/surface-plan.png) and
[walkable overlay](evidence/014/walkable-overlay.png); these are diagnostic rasters,
not gameplay screenshots or replacement visual surfaces.

The 25cm raster stores topmost visible triangle elevations to 1mm and a conservative
walk mask: median-filtered local span below 0.65m across 0.5m, terrain ceiling 4m,
0.55m obstacle/edge clearance, and only the component connected to the middle lane.
The filter prevents joining cliff faces, canopy and tall solid objects to the road.
The runtime grounds actors using bilinear triangle-height samples. Axis-separated,
substepped ordinary movement and dashes consult the same mask. AI routes through that
mask with bounded flood routing and supercover line checks, including retreats and
Wilderness approaches. It does not route using the rejected arena's walls.

There are **two active Mobility camps**, on the sampled accessible Wilderness paths
at `(−20,−6)` and `(20,−6)`, reachable from both spawns. The existing monsters,
rewards, buffs and respawns are retained. The four future Cooldown/Defense camps and
major objective are explicitly inactive and have no speculative coordinates. This is
not a claim that the full six-minor-camp layout is completed. No towers or 5v5 changes.

Outer lanes and distant Wilderness are visible but **not navigable in this test**.
The conservative mask excludes some potentially usable clearings and small steps;
it is not a finished full-map navmesh. Under-canopy floors, caves and multilevel travel
are not supported. Combat remains the existing horizontal authority; no new vertical
projectile/terrain line-of-sight rules were introduced. Terrain sampling can produce
small foot-height discrepancies on sharp surface relief.

## Verification and performance

- 242 unit tests pass, including all 239 prior tests and three meaningful terrain tests:
  six valid spawns/continuous road/blocked cliffs; both camps reachable from both bases;
  a complete ordinary 3v3 simulation with AI damage, deaths and no terrain escapes.
- Typecheck, runtime/test ESLint and repository Prettier pass; production build passes.
  The unscoped legacy `npm run lint` also scans Goal 013's pre-existing offline
  `assets/solrahn-three-lane/scripts/validate_glb.cjs`, which has two CommonJS/import
  lint errors. That asset-preparation script is unchanged; the preview workflow checks
  `src`, `tests` and `vite.config.ts` explicitly.
- Browser checks cover the existing production arena and the authored-map preview at
  844×390 and 390×844 touch viewports. The preview uses the real frontend, six full
  animated models, actual captured touch movement, an Ember Step damage hit, AI
  engagement, results and replay without redownloading models. Long matches are
  accelerated through the established `verify=1` seam using every normal 60Hz tick;
  no clocks, rules, health, tickets or CP are fabricated. Controlled roster fixtures
  are used only for human hit verification and the centre combat screenshots.
- Browser timing and complete snapshots are in `evidence/014/browser-*.json`.
  Readiness includes the full map and all character/weapon assets. GPU values are
  PlayCanvas allocation accounting, not measured process RSS or physical GPU residency.
  The arena alone has about 64MiB uncompressed mipmapped texture data and 28.3MiB
  source geometry buffers; the whole game also loads existing character textures.
- Measured local production-build readiness: **7.618s landscape / 6.408s portrait**;
  arena-container fetch/decode: **1.193s / 1.278s**. Five-second wall sampling measured
  **0.56 / 1.28 FPS** on SwiftShader (about 1773 / 779ms per frame). These poor software
  rendering results are not presented as acceptable mobile performance. Full-game
  allocated textures are **448.0MiB**, vertex/index buffers **32.7MiB**, total about
  **480.7MiB**; resource cache holds exactly five containers, including one map.
- The workspace has **software WebGL (SwiftShader), no hardware GPU**. Its wall FPS
  and engine frame-time readings are disclosed in the performance receipt; neither
  predicts physical iPhone performance. No further geometry optimization occurred.
- Physical iPhone Safari is **not verified** here. A Linux Playwright WebKit attempt
  was blocked by missing GTK4/Graphene/Harfbuzz-ICU/Manette/Hyphen/GLES libraries;
  system dependency installation requires unavailable root authentication. Chromium
  mobile emulation verifies touch/UI behavior, not Safari compatibility or iPhone GPU
  memory stability. Founder device validation remains necessary.

Actual PlayCanvas captures with Summoners:
[landscape combat](evidence/014/centre-combat-844.png),
[portrait combat](evidence/014/centre-combat-390.png),
[match results](evidence/014/results-844.png).

Publication is isolated to `/solrahn-goal-014/` on the existing `gh-pages` branch,
following the established Pages subtree publication pattern. The manual
`publish-crownfall-solrahn-preview.yml` workflow reproduces the preview validation
and publication without replacing `/playcanvas/`. Source pushes use `[skip ci]`
because the existing production workflow would otherwise automatically publish the
new source to the live game. The source workflow now retrieves LFS for future builds.

## Published-build verification

Implementation commit: `b3e8ee851583c568f3aa7fa7978e6a7c0e809a60`.
Pages commit: `05d16186569c5961dd71d8383d98408687dc4c30`.
GitHub Pages reports **built**, and the public preview returns HTTP 200 with the
matching `preview-source.json`. The terminal credential rejected Git push; source
objects and the isolated Pages subtree were published through the GitHub Git Data API.
No production publication workflow was dispatched.

All **11 local browser checks passed** (nine existing arena tests, two preview tests).
Both preview tests then **passed again against the public URL**, exercising real
remote asset loading, captured touch movement, ability damage, AI combat, match
completion and cached replay. See [live test output](evidence/014/live-browser-tests.txt).

Public readiness was **9.834s landscape / 6.663s portrait**. The same software WebGL
wall sampling gave **0.59 / 0.99 FPS** (approximately 1693 / 1015ms per frame), while
PlayCanvas's initial smoothed frame-time counter was 25ms and is not a reliable wall
throughput measure during startup. No mobile hardware performance claim is made.
The complete browser receipts include allocated GPU memory and container load times:
[landscape](evidence/014/live-browser-844.json), [portrait](evidence/014/live-browser-390.json).

The [publication receipt](evidence/014/publication.json) records all new hosted blobs;
none is a duplicate GLB. The [production protection receipt](evidence/014/production-protection.json)
verifies identical Git objects for `/playcanvas/`, Unity `index.html`, `Build/`,
`TemplateData/` and the existing recovery preview. All 51 changed Pages paths are
inside `/solrahn-goal-014/`.

Live game screenshots: [landscape combat](evidence/014/live-centre-combat-844.png),
[portrait combat](evidence/014/live-centre-combat-390.png),
[results](evidence/014/live-results-844.png). Landscape is recommended for playtesting.
Physical iPhone Safari validation and stable mobile FPS remain unverified.
