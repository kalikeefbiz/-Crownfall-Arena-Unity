# GOAL 016 — Sol’Rahn V2 terrain candidate

**Preview only. Physical iPhone Safari acceptance: NOT VERIFIED. No production integration authorized.**

Source branch: `goal-016-solrahn-v2`, based on `5eda5b34f34d05ece4fb3624fef5fd8bbefbc4e9`.
Direct preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-016/?mapPreview=solrahn-v2>.
Enter Crownfall → select Summoner → Enter Arena. Existing menu, readiness, controls,
combat, bots, Crownfall scoring, deaths, respawns, results and rematch remain in use.
The older `?mapPreview=solrahn` experiment has its own unchanged loader and assets.

## Source and conversion

The supplied ZIP is committed at `assets/solrahn-v2/source/crownfall_terrain_v2_review.zip`.
ZIP SHA-256: `17efa4455d942e565cdc35e1f0fe9c981d59c1a3bc759ff72e1d32d0dd8b6db8`.
Heightmap SHA-256: `d7d55c029cc3ba2822afdccc0ff4d730adbcbdd8868ed334d265fdba6acb8054`.
The supplied GOAL supersedes the ZIP README's former draft status. No V1, old GLB
or rejected high-resolution geometry is used to build V2.

From `PlayCanvas/`:

```sh
git lfs install --local
git lfs pull
python3 -m pip install -r scripts/requirements-solrahn-v2.txt
python3 scripts/solrahn-v2.py
npm ci
npm test
npm run typecheck
npx eslint src tests vite.config.ts
npm run build
npx playwright install chromium
npm run test:browser -- --workers=1 --retries=0 --global-timeout=3600000
```

The unchanged Goal 014 build guard still requires its canonical LFS payload locally; V2 never loads that GLB.

Pillow checks the original PNG's bit-depth/color header and dimensions, then reads
unsigned 16-bit data. No Canvas, preview PNG, auto-contrast, smoothing or terrain
flattening is used. Each original source sample maps to world
`x=(v/899−0.5)×120`, `z=(0.5−u/1199)×160`, Y up. Image north is −X,
east is −Z. This preserves the existing competitive territorial axis and camera
heading: Blue at +Z, Red at −Z. All masks use exactly the same mapping.

The field is **120 × 160 m**, with **8 × uint16/65535 m** elevation. The nominal
12 m scale disconnected three camp centers under the fixed 35° slope limit;
8 m connects them without changing layout or flattening features. The complete
calibration receipt is [calibration.json](evidence/016/calibration.json).
Six spawns use Z ±71 m, offsets X 0/−1.45/+1.45 m; scoring endpoints are ±75 m,
with 8 m wide scoring axis. These are preview-scoped spatial adaptations; rule
rates, tickets, CP, abilities, character radii and movement speed are unchanged.

145 × 193 vertices are shared logically across 48 equal-resolution chunks, plus
one outer skirt mesh. This is one continuous battlefield, with **55,296 top
triangles + 1,344 visible-edge triangles = 56,640 triangles**. No internal skirts,
LOD cracks, decorative textures or full-density source grid are loaded. The fixed
LOD has identical duplicated boundary positions and normals. The underside below
Y −1 is deliberately unrendered; visible outer edges are closed to that plane.

Terrain payloads total **238,677 bytes** before the small JSON manifest. Floor GPU buffers are **1,647,360 bytes (1.57 MiB)**; retained JavaScript geometry number payload is about 3.79 MiB before array capacity and object overhead. See [asset-budget.json](evidence/016/asset-budget.json). Runtime
uses explicit little-endian uint16 decoding and verifies SHA-256 for all three
payloads; corruption fails readiness visibly. It never claims V2 while falling
back to an older map. At every original source pixel, comparison to the simplified
triangle planes gives maximum **0.15610 m**, p95 **0.03136 m**, mean **0.00681 m**
error. Hashes, byte budgets and normalization are in
[terrain.json](public/assets/solrahn-v2/terrain.json).

## Traversal, camps and boundaries

Collision and grounding evaluate the exact two triangle planes used by rendering,
including the diagonal, rather than a different bilinear floor. A 0.5 m navigation
raster conservatively samples intersecting triangle gradients, limits slope to
35°, and erodes blocked cells, outer edges and mode boundaries by **0.80355 m**:
0.45 m character radius plus half the nav-cell diagonal. Continuous triangle
surfaces have no height discontinuities; at the existing movement substep limit
of 0.2025 m the slope limit bounds height change to under 0.142 m, below the
explicit 0.3 m step allowance. Ordinary moves and dashes retain their shared
substepped collision checks. Bot routing uses that same raster, supercover line
checks and reusable bounded BFS scratch storage (928,332 bytes).

The study mask's central stripe is interpreted as a 3v3 envelope, then slope-tested,
eroded and restricted to the middle-connected component. Upper/lower lanes are
visible and blocked in 3v3. A separately generated full-map navigation mask is
available to tests only; it connects all three future lanes. No 5v5 ruleset exists.

All six minor centers retain their blueprint-relative positions, three per
Wilderness. The major remains in its distinct northern clearing. Every center
has routes from both spawns and back, alternate entrances and at least **3.535 m**
of free actor-center clearance after erosion; the major has **6 m**. Automated
traversals use ordinary movement commands at 60 Hz through the same bot waypoint
function, with no teleporting. See [routes.json](evidence/016/routes.json) and
[routes-overlay.png](evidence/016/routes-overlay.png).

Only the **two existing Mobility mechanics** are retained, relocated to their
matching V2 clearings. The four other minor camps and major are neutral debug
footprints labeled **INACTIVE**. No new cooldown, defense or major bonus is
activated. Major route times are asymmetric: measured round trips about 18.63 s
from Blue versus 31.80 s from Red. This follows the approved layout and is a future
objective-balance question; moving or activating it is outside this candidate.

## Camera and inspection

V2 uses the existing competitive offset (Y 15.5, Z 18), 48° FOV and follow rate,
with shared terrain height and a 3 m floor clearance safeguard. Terrain raycasts
bracket the first intersection and bisect the actual triangle floor for touch aim
and drag projection. Automated sight-line checks sample navigable terrain and
verify that terrain does not occlude the player's head from that camera.

The top-left developer panel offers height, slope, walkability/collision erosion,
route, neutral footprint and mode-gate overlays, height readout, an aligned
full-map camera and inspection framing for every camp, major, spawn and lane.
Inspection changes only the preview camera. It does not move actors or activate
objectives. Close the panel for normal play.

## Validation and publication

Implementation commit: `93912bf4fdfd77475c8c4dbc9c7db0f7076a6a91`.

Final results are recorded below. Chromium touch emulation and SwiftShader are preliminary functionality
evidence. They establish neither physical iPhone Safari compatibility nor sustained
30 fps, thermal stability, GPU residency or device memory safety. **Physical iPhone
Safari: NOT VERIFIED.** Founder testing and approval remain mandatory.

Publication uses the locally invoked, controlled script below. A manual-only workflow definition restricted to the candidate branch is also committed. Run
`python3 scripts/publish-solrahn-v2.py COMMIT_SHA` after validation. It stages only
`solrahn-goal-016/`, checks all other Pages Git objects, and pushes a direct child
of the observed Pages revision with a lease. Source commits use `[skip ci]`; the
production workflow is never dispatched. Protected bundle SHA-256 values were
recorded before publication, along with the complete original Pages tree.

## Evidence index

- Approved [blueprint](evidence/016/approved-blueprint.png) and actual [top-down map](evidence/016/map-vs-blueprint.png).
- Engineering [height](evidence/016/height.png), [slope](evidence/016/slope.png), [walkability](evidence/016/walkability.png) and actual rendered [slope](evidence/016/actual-slope-overlay.png) / [routes and collision](evidence/016/actual-routes-overlay.png).
- Northern Wilderness: [Mobility](evidence/016/camera-north-mobility.png), [Cooldown](evidence/016/camera-north-cooldown.png), [Defense](evidence/016/camera-north-defense.png), distinct [major clearing](evidence/016/camera-major.png).
- Southern Wilderness: [Defense](evidence/016/camera-south-defense.png), [Cooldown](evidence/016/camera-south-cooldown.png), [Mobility](evidence/016/camera-south-mobility.png).
- Core/spawn approaches: [Blue](evidence/016/camera-blue-spawn.png), [Red](evidence/016/camera-red-spawn.png); [middle-lane competitive framing](evidence/016/camera-middle-lane.png).
- Real touch combat: [landscape](evidence/016/centre-combat-844.png), [portrait](evidence/016/centre-combat-390.png); real match [results](evidence/016/results-844.png).
- [Movement routes and timings](evidence/016/routes.json), [source isolation](evidence/016/source-isolation.json), [protected bundle hashes](evidence/016/protected-bundles-before.json), [initial public production hashes](evidence/016/live-production-before.json).

## Final results — CONDITIONAL / isolated preview only

- **249 unit tests pass** across 28 files: all 242 original tests plus seven V2 tests. The seven V2 tests also pass again with the stronger external-entrance proof.
- Typecheck, scoped ESLint, touched TypeScript formatting and production build pass. No original test expectations were edited.
- The complete browser run executed **131 cases: 129 passed, 2 failed**. One screenshot test lost its trace directory when a separate corruption check used the same output directory. The other reached 14.9556 m just before the unchanged 15-second movement poll expired at its >15 m assertion. **Both passed unchanged in separate runs.**
- The final-build isolated run passed **4/4**: the affected screenshot test plus both V2 mobile lifecycle checks and corrupt-data rejection. The affected Wilderness touch test then passed **1/1** separately. This covers **all 129 original browser cases plus all 3 V2 cases: 132 unique cases verified**, with the original full-run failures retained in the receipts.
- Public landscape and portrait checks pass **2/2**, exercising real remote assets, six animated characters, touch movement, damaging dash, ordinary bot combat, full results and cached rematch. The first public attempt failed **2/2** because the new test used an immediate `isVisible()` query before the asynchronous frontend rendered. It now waits for the same required menu with Playwright's visibility assertion. No game change or redeployment was needed.
- Positive V2 browser checks capture page errors, console errors, WebGL invalid/context-loss messages and HTTP failures; final local and public checks report none. The corrupt-data case deliberately verifies readiness failure and no older-map fetch.
- All seven clearings have external approach routes from both spawn groups even when the entire clearing footprint is removed from navigation. Opposed entrances reconnect to the clearing over walkable segments. Both core groups, lane round trip, all camps, major, retreats, radius erosion, dash-sized steps, outer-lane blocking, full-map future lane connectivity, fixed-step match completion and camera sight lines are covered.

Raw receipts: [full units](evidence/016/unit-all.txt), [V2 units](evidence/016/unit-v2.txt),
[full browsers including failures](evidence/016/browser-all.txt),
[final isolated checks](evidence/016/browser-final.txt),
[Wilderness rerun](evidence/016/wilderness-rerun.txt),
[first public attempt](evidence/016/live-browser-first-attempt.txt),
[passing public checks](evidence/016/live-browser.txt).

### Measured performance

Same public GitHub Pages host; Chromium/SwiftShader; 844×390, DPR 1, Low quality;
sequential contexts. Cold means empty browser cache; warm means a page reload in
the same context. Readiness measures Enter Crownfall → gameplay. The human stays
at spawn while five ordinary bots run; there is no tick acceleration. Cold runs
sample 120 wall seconds each, warm runs 20 seconds each. Every captured sample
remained in an active match. This is a startup-position comparison, not a worst-case
central combat or physical-device benchmark.

| Build / browser cache     |   Ready | Median frame | p95 frame | Mean wall FPS | Median estimated WebGL draws/frame |
| ------------------------- | ------: | -----------: | --------: | ------------: | ---------------------------------: |
| V2 cold                   | 5.647 s |     183.3 ms |  333.3 ms |          5.30 |                               40.0 |
| V2 warm                   | 5.907 s |     200.0 ms |  399.9 ms |          4.86 |                               40.0 |
| Unchanged production cold | 7.945 s |     500.0 ms | 1066.6 ms |          1.94 |                               60.3 |
| Unchanged production warm | 3.870 s |     483.3 ms |  966.7 ms |          2.07 |                               58.2 |

These are single-run comparisons; warm loading did not consistently improve.
V2's allocated textures are approximately **384.05 MiB**, compared with **440.06 MiB**
in the unchanged production scenario. Existing character textures dominate.
Observed V2 JS heap-used ranges were **22.6–36.6 MB cold / 35.9–49.4 MB warm**;
production ranges were **18.5–25.2 MB / 21.0–29.3 MB**. These are sampled used-heap
values, not allocation-rate, leak or process-RSS measurements. GPU numbers are
engine allocation accounting, not measured physical residency. Draw estimates
count WebGL draw API calls across all passes for both builds.

Full resources, frame samples, phases, heap and GPU accounting are in
[performance.json](evidence/016/performance.json); a smaller table is in
[performance-summary.json](evidence/016/performance-summary.json).
**Physical iPhone Safari crashes, sustained 30 fps, input responsiveness, thermal
and memory stability: NOT VERIFIED.** See [device acceptance](evidence/016/device-acceptance.json).

### Publication and protection

Published game source: `93912bf4fdfd77475c8c4dbc9c7db0f7076a6a91`.
Pages commit: `d08ea79e0865568821e7ba8fe8141b202236efd7`, built successfully.
The handoff's subsequent source commit adds validation and documentation; it does
not change the published runtime. The direct preview's
[preview-source.json](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-016/preview-source.json)
identifies the runtime revision.

Only `/solrahn-goal-016/` was added. **All 142 original hosted Git blobs are identical**,
including Unity root, Build, `/playcanvas/`, GOAL 014, headers and `.nojekyll`.
All **42 production HTML/JS/CSS SHA-256 values** also match before and after over
public HTTPS. Unity index, GOAL 014 index and GOAL 014 source receipt match over
HTTPS too. `playcanvas-port` remains at the original `5eda5b3…` revision.
No production publication workflow was dispatched; candidate source pushes used
`[skip ci]`. No default-branch change, merge, release mutation or production
integration occurred.

Proof: [publication](evidence/016/publication.json), [Pages build](evidence/016/pages-build.json),
[immutability](evidence/016/production-immutability.json),
[before](evidence/016/live-production-before.json) / [after](evidence/016/live-production-after.json)
public bundle hashes, [other public paths](evidence/016/other-live-paths-after.json),
[original Pages tree](evidence/016/pages-before.txt) / [new tree](evidence/016/pages-after.txt).

### Unresolved and recommendation

**CONDITIONAL: suitable for founder preview testing; no production integration.**
Physical iPhone Safari acceptance remains unverified. The 8 m calibration, world
scale, feel of gates, camera readability and actual-device performance need founder
testing. The inactive major's Blue/Red travel-time asymmetry needs review before
future activation. Combat remains the existing horizontal authority; this goal adds
no vertical projectile/terrain line-of-sight rules, multilevel floors or caves.
Developer overlays and placeholders are graybox diagnostics. No 5v5 gameplay,
new objectives, bonuses, finished scenery or production swap is included.

Stop here. Founder device testing and explicit approval are required before any
future production integration.

External-entry proof: [external-entrances.json](evidence/016/external-entrances.json).
Reproduce with `python3 scripts/solrahn-v2-entrances.py`; the new traversal unit test
runs it automatically. It removes each clearing disc, finds approach points reachable
from both bases without crossing the disc, then checks straight walkable entry
segments separated by at least 90°.
