# GOAL 019 — Sol’Rahn environment transformation

Isolated playable candidate for BlackHouse. No production merge. Physical iPhone
Safari frame rate, memory, thermal behavior and sustained 30 FPS remain unverified.

Play: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-019/
Visual review: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-019/review/

Base: `8ad97bbafe010036d88234776cf1fa399066bb7a`.
Branch: `goal-019-solrahn-environment-transformation`.
The immutable `preview-source.json` at the preview URL identifies the deployed source.
`evidence/019/publication.json` identifies both the source and Pages commits.

## Production decisions

The visual direction is a reclaimed ancient causeway through temperate uplands.
This replaces the former 26m experiment with a composed 150m treatment through
both spawn approaches, the central combat lane and accessible Wilderness edges.

- 680 broken, beveled flagstone and foundation pieces and interrupted shoulder masonry follow the
  exact original triangle surface. Earth remains visible through damaged sections.
  Shattered perimeter foundations distinguish existing clearings without reward
  glyphs or falsely activating the five inactive objectives.
- Twelve asymmetric bank groups combine embedded scanned cliff faces and smaller
  rocks; nine more boulders frame woodland clearings. Total: 57 rock placements.
  The open cliff backs remain embedded into banks, with varied yaw, scale and burial.
- Twenty-seven approved pine, maple and redwood trees establish woodland groups.
  The fragmented saturated oak is omitted from this candidate. Tree albedo
  derivatives reduce saturation; pine brightness is lifted. Original GLBs remain
  unchanged. All tree geometry, accessors and hierarchy are byte/structure verified.
- Six weathered waystones add recognizable constructed silhouettes. All 128
  navigation samples across each narrow base are already blocked by the original
  mask. No new colliders, gates, height changes or invisible walls are introduced.
- Low ground uses a 2048×1536 atlas derived from the same four CC0 material
  families, with warped texture coordinates, macro variation and concavity shade.
  It keeps its two normal-render texture reads. High retains four PBR families and
  geometry-aligned normals, with a matching macro palette. Stone uses a small
  512px luminance-derived map from the approved mossy-rock scan.
- Stronger warm directional light and reduced cool ambient fill give slopes,
  trunks and rocks more shape. Imported environment gloss maps are disabled in
  favor of a matte response; the original shiny boulders failed visual review.
- V2 previously disabled the legacy flat territory boxes whenever custom terrain
  existed. Ownership now uses the authoritative front directly in the terrain
  shader: restrained Blue/Red tint, shoulder accents and a thin frontier contour.
  There is no additional terrain pass, score calculation or scoring-rule change.
- Diagnostic camp discs, inactive labels, mode ribbons and the old flat endpoint
  slabs are hidden during normal play. Existing developer controls retain the
  camp footprints and mode gates. Broken endpoint masonry replaces the slabs.

## Visual iteration and critique

The baseline was built and captured before runtime changes. Initial camera
captures and source review found an undifferentiated dirt stripe, uniformly lit
banks, isolated props, saturated oak, visible diagnostics and missing ownership.

Iteration one established the full route and bank layout, but the stone read too
dark and grass as an even field of spikes. Iteration two lifted the stone palette,
softened its edges, and reduced/clumped grass. Wilderness review then exposed
shiny rocks and bright foliage. The final pass made rocks matte, prepared muted
tree derivatives, added waystones on blocked bank islands and broadened sparse
vegetation into Wilderness while retaining open clearings.

The final comparison contains ten matched pairs of unedited PlayCanvas frames.
All use the existing competitive 48° camera and 15.5m/18m offset, including the
three response-only fixed-focus inspection positions. No free cinematic view,
Blender render, composite or AI-generated image substitutes for gameplay evidence.
The camera hook exists only in the capture response, not the shipped game.
Actors are staged for matching; the combat views restore the original bot
controllers and advance normal combat from that arrangement. Functional tests
separately exercise unarranged AI, deaths, respawns and scoring.

The lane has a clear constructed identity across the full playable route; banks
and clearings now have authored silhouettes. Ground and lighting separate earth,
stone and woodland more clearly. These are substantial changes, but the existing
stylized tree crowns still differ from the scanned rocks. Some long views still
show smooth hills, decorative banks retain collision limitations, and the narrow
portrait view retains the inherited crowded HUD. This is a reviewable production
candidate, not a claim of founder visual acceptance or finished premium art.

## Assets and rights

No paid subscriptions, provider jobs or new third-party acquisitions were needed.

| Asset | Use and optimization | Rights / provenance |
|---|---|---|
| Poly Haven Rock Face 02 | Reused 2,999-triangle 1K/512 GLB; embedded cliff faces | CC0-1.0; Dario Barresi / Rico Cilliers; existing stones manifest and download receipts |
| Poly Haven Rock Moss Set 02 | Reused three ~1,000-triangle variants and shared 512 maps | CC0-1.0; Kless Gyzen; existing stones manifest |
| Maple / Pine / Redwood | Existing 8,199 / 2,559 / 3,723 triangle models; color-only GLB derivatives, shared geometry/materials | Founder-approved Meshy assets; not relicensed as CC0 |
| Red oak | Removed from this composition; original preserved | Existing founder-approved source |
| Ground | Same Dry Ground Rocks, Grass Path 2, Forrest Ground 01, Mossy Rock families; new Low atlas | CC0-1.0, original material/source manifests retained |
| Limestone detail | 512px color derivative of existing mossy-rock albedo | CC0-1.0; reproducible `stone-texture.py` |
| Causeway, grass, waystones | Original procedural presentation geometry, sampled onto V2 | Studio-authored for this project |

Runtime derivatives live in `public/assets/environment/trees/goal019/` and
`public/assets/solrahn-surface/goal019*`. Original source/runtime assets remain.
Inventory, sizes, triangle counts and hashes: `evidence/019/asset-inventory.json`.
Tree processing and byte-identical geometry proof are recorded beside it.
Reproduce using `scripts/goal019/prepare-trees.py`, `stone-texture.py` and
`bake-ground.py` (Python, Pillow, NumPy, SciPy). No external model decoder is added.

## Rendering and gameplay protection

Repeated props share imported geometry/materials and static matrix buffers,
partitioned by 24m sectors for frustum culling. Causeway and grass use eight
spatial sectors each. The stone texture is shared across all stone batches. Causeway, foundations,
waystones and vegetation total 23,349 new procedural triangles in 16 batches.
No realtime shadow maps or transparent vegetation cards are added.

A movement-thresholded visibility mask omits prop silhouettes along the player's
competitive camera sight line; buffers and instance counts are reused. Tall
waystones occupy existing blocked terrain. Other decorative bank rocks and tree
trunks have no new collision, as in GOAL 018A, and can intersect traversal where
the original mask permits. Camera culling prevents the local actor being buried
behind these decorations; it does not claim new physical cover or navigation.

All 43 authoritative combat, gameplay, map, input and original V2 source/payload
files are byte-identical to the verified base (`gameplay-protection.json`).
Camps, major, spawns, scoring, abilities, animation authority, AI and camera
behavior are retained. A separately scoped CSS fix hides only the idle READY prompt on V2 because it
covered the local Summoner; hit/aim/error feedback stays visible. No HUD layout or
ability controls are redesigned. Only V2 lighting and presentation are changed; legacy map
lighting remains unchanged. Low/High switching and the monitor remain available.

## Validation

- **259/259 unit tests pass** across 32 files, including terrain connectivity,
  external camp entrances, scoring, abilities, navigation and lifecycle rules.
- Typecheck, scoped ESLint (`src`, `tests`, Vite and the new browser config), and
  the production preview build pass. The inherited bundle-size advisory remains.
- **8/8 targeted Playwright cases pass** across Chromium and WebKit. Both
  844×390 and 390×844 exercise startup, character selection, six full models,
  native ability taps, movement, damage, ordinary AI, Low/High switching,
  exact texture-request budgets, cached results/rematch and stable geometry IDs.
- The separately scoped idle-banner fix is checked in both orientations and
  both engines; actionable feedback is still visible (`browser-layout.txt`).
- Separate natural-AI checks select alternative characters, sample 100 seconds of
  ordinary match rules, and require actual deaths, living actors after a death,
  and Crownfall scoring. Both engines pass. These use fixed ticks for elapsed
  simulation time, not artificially shortened respawn rules.
- Cancellation during a stone-container request and re-entry pass in both engines.
- Positive browser cases capture console/page errors and HTTP failures: none.
- Chromium movement uses native CDP touch drag. Playwright WebKit lacks a public
  touch-drag API, so it uses a trusted mouse drag in a mobile touch layout and
  native touch ability taps. Neither is a physical iPhone test.

Receipts: `unit-final.txt`, `typecheck.txt`, `lint.txt`, `build.txt`,
`browser-final.txt`, browser JSON snapshots and `natural-*.json` under
`evidence/019/`. The separate earlier single WebKit pass is retained too.

The first unit pass caught the new fifth Low texture against the old exact
four-resource assertion. The assertion now requires exactly five Low and eleven
High resources, retaining deduplication, late-load and teardown checks. No tests
were disabled. The original failed receipt is retained as `unit-initial.txt`.

The initial banner-layout run passed 3/4; its last WebKit case raced the normal
HUD update after setting a synthetic HIT state. The corrected CSS check reads
that state atomically before the HUD restores READY, retaining both visibility
assertions. The final four cases pass; no runtime change was needed for that
harness correction. The initial failed receipt remains.

The two outstanding GOAL 017A legacy failures remain separately unresolved:
`match.spec.ts:34` wall-time respawn polling and `six-summoner.spec.ts:209`
immediate post-restart weapon instances. They were neither weakened nor declared
fixed. The new candidate's fixed-tick natural-AI and frontend rematch checks are
separate evidence and do not rewrite that history.

## Comparative performance

One sequential 12-second sample per engine/build, 844×390 DPR1 Low, after a
three-second warmup. Fixed six-actor scene, real wall rendering. No other
browser jobs run during sampling. This is a diagnostic comparison, not a
repeated statistical study or live-combat benchmark.

`017b-equivalent` is the immutable GOAL 018A baseline with its enclosure disabled;
the underlying GOAL 017B terrain, actors and monitor are retained, with dormant
enclosure code present. It is not claimed to be a newly built exact-source 017B.

| Engine | Build | Frames | Mean FPS | Mean ms | p95 ms | Draws | Textures MiB | Geometry MiB |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| chromium | 017b-equivalent | 13 | 1.14 | 879.5 | 1366.7 | 45 | 404.22 | 6.73 |
| chromium | 018a | 13 | 1.06 | 946.1 | 1483.3 | 51 | 424.22 | 7.44 |
| chromium | 019 | 8 | 0.69 | 1454.1 | 1666.7 | 67 | 441.55 | 9.18 |
| webkit | 017b-equivalent | 87 | 7.25 | 137.9 | 169.0 | 45 | 404.22 | 6.73 |
| webkit | 018a | 59 | 4.92 | 203.2 | 239.0 | 51 | 424.22 | 7.44 |
| webkit | 019 | 57 | 4.79 | 208.9 | 238.0 | 67 | 441.55 | 9.18 |

Small sample counts make tails particularly uncertain. GPU figures are engine
allocation accounting, not native residency. JS heap is available only in
Chromium and is not an allocation-rate or native-memory measurement. Raw frame
intervals, snapshots and heap observations are retained in `performance.json`.

chromium: mean frame-time change versus 018A **+53.7%**; draws **51 → 67**. A one-run software result cannot establish device performance parity.
webkit: mean frame-time change versus 018A **+2.8%**; draws **51 → 67**. A one-run software result cannot establish device performance parity.

Physical iPhone acceptance remains open. Software-renderer samples and engine
allocation counters cannot establish native GPU time, memory residency, thermal
stability or sustainable Safari FPS. The candidate retains its visual identity
for physical-device review rather than claiming synthetic performance approval.

## Publication protection

The isolated publisher creates a direct child of the observed Pages commit,
checks exact equality of every Git object outside `solrahn-goal-019/`, and uses an
explicit push lease. It refuses an already-existing destination. Source commits
use `[skip ci]`; no production publication workflow is dispatched. The new folder
contains provenance, gameplay and the visual review. No earlier preview or
production path is replaced, and no production merge is authorized or performed.

The publisher generates `publication.json` with exact source, Pages parent/child,
file hashes and protected-object counts. Post-deployment HTTPS verification is
recorded in `public-after.json`; the final handoff identifies the confirmed SHAs.

Ordinary capacity was used. No reset was initiated; the prohibited November 30
banked reset was not selected or consumed by this task.
