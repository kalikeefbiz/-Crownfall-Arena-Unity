# Goal 007F — carved lane environment

Baseline: verified Goal 007E, `4ac90d75f707418aa31f4eead166ac66258ecf36`.
Playable preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>.

## Structure and authority

The competitive arena uses a deterministic procedural road surface with staggered
stone courses, chipped bevels, individual cracks, missing paving, exposed dark
foundation and a winding, splayed edge profile. Broken stone fragments transition
into compacted dirt shoulders. The neutral earth surface uses continuous vertex
pigment and a repeating grain texture rather than coloured Wilderness rectangles.

Layered rock embankments and short retaining courses replace the ten original
obstacle boxes. They stay inside those exact collision rectangles. Low terrain
ridges beyond the existing map bounds finish the ground silhouette. The road
retains broad, visibly open dirt connections into both Wilderness regions,
including the central east/west crossings and all existing camp approaches.
There are no new colliders, trees, monuments, imported environmental assets or
lore. Stone shading uses the existing directional light and ambient illumination.

All traversable footing remains between Y=-0.018 and Y=0.027, keeping decorative
relief close to the unchanged Y=0 actor roots. Pronounced relief exists only in
already blocked footprints or strictly beyond the movement bounds. No terrain
height is sampled by gameplay. Camera follow, actor grounding, spawns, map bounds,
collision, movement, AI navigation, abilities, targeting, territory/scoring,
Wilderness regions, camp sites and match lifecycle code are unchanged.

The normal Blue/Red floor overlays are reduced to 0.065 opacity so the road's
structure carries its identity. The existing authoritative gold frontier and its
positioning logic are unchanged. Team discs, character materials and HUD remain.

## Comparison and recovery

- `?environment=legacy` restores the original Goal 007E presentation, including
  floor colour, lane guides, Wilderness overlays, obstacle boxes/caps and original
  territory opacity. Training/debug mode retains that original environment.
- `?territoryTint=0` removes both team floor overlays in either environment. The
  frontier and team indicators remain, allowing inspection of the physical road.
- Neither option changes the simulation, assets, controls or match setup.

Screenshots use the existing gameplay camera: FOV 48°, height 15.5, offset Z=18
and look-ahead 4. The same `verify=1` fixtures are paused immediately and advanced
2.1 seconds through normal fixed ticks. Each neutral before/after pair has an
identical authoritative match snapshot and matching camera position (within
0.00001 world units). Six 3D summoner models remain enabled in every capture.

| View                                | Before                                                      | After                                                       |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Gameplay overview, normal territory | [Legacy](evidence/007f/overview-legacy.png)                 | [Carved](evidence/007f/overview-carved.png)                 |
| Overview, territory tint disabled   | [Legacy neutral](evidence/007f/overview-legacy-neutral.png) | [Carved neutral](evidence/007f/overview-carved-neutral.png) |
| East Wilderness access              | [Before](evidence/007f/east-access-legacy-neutral.png)      | [After](evidence/007f/east-access-carved-neutral.png)       |
| West Wilderness access              | [Before](evidence/007f/west-access-legacy-neutral.png)      | [After](evidence/007f/west-access-carved-neutral.png)       |
| Mobile 844×390, tint disabled       | [Before](evidence/007f/mobile-legacy-neutral.png)           | [After](evidence/007f/mobile-carved-neutral.png)            |

The [capture metadata](evidence/007f/comparison.json) includes exact camera and
authoritative snapshots. [Baseline capture](evidence/007f/baseline-007e.png) was
also taken from the unmodified Goal 007E production build before implementation;
the legacy pairs above provide the strictly matched comparison.

Reproduce against a running production preview, or pass the live URL:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/capture-environment.ts
```

## Verification

The new mesh tests cast vertical rays against actual presentation triangles at
both Wilderness approaches, camp sites, spawns and cross-map samples. They assert
continuous footing within the supported height range. Every raised triangle must
fit completely inside one existing obstacle rectangle or outside the map bounds.
Mesh/UV validity, upward earth faces and a 28,000-triangle budget are checked.

The new production browser comparison loads legacy and carved modes with tint
disabled, verifies six independent model presenters are playing at Y=0, compares
the complete authoritative match snapshots and camera coordinates, captures both
views, and checks for browser exceptions. A separate case verifies normal carved
defaults, retained territory indicators and legacy/training recovery.

Existing suites retain real captured multi-touch, abilities and targeting,
six-model resource sharing and animation, death/respawn/rematch, natural bot
combat/results, both Wilderness crossings/return journeys, camp rewards,
territory/frontier and camera checks.

The normal match case passed without verification/presentation flags: all five
bots fought, the battle included deaths, an authoritative result ended play,
results froze correctly and restart restored a clean match. See
[natural combat](evidence/007f/natural-combat.png) and
[natural result](evidence/007f/natural-result.png).

- Unit suite: **189 passed in 20 files** ([log](evidence/007f/unit-tests.txt)).
- Full production browser suite: **94/94 passed** in 20.8 minutes, with no retries
  or remaining failures ([log](evidence/007f/browser-full.txt)).
- Typecheck, ESLint, Prettier and production build passed. The build retains the
  existing large JavaScript chunk advisory: 1,300.74 kB raw, 350.61 kB gzip.
  [Typecheck](evidence/007f/typecheck.txt), [lint](evidence/007f/lint.txt),
  [formatting](evidence/007f/format.txt), [build](evidence/007f/build.txt).

## Deployment verification

Implementation commit: `6fab6a47e82b4ea721df57f29344dd90f1b4d7d4`, pushed to
`playcanvas-port`. The [publishing workflow](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/39923537831)
passed install, unit tests, typecheck, production build and Pages publication.
The existing GitHub Pages site retains its Unity root and publishes this preview
under `/playcanvas/`.

Live verification on 2026-10-23 at 08:19 UTC fetched HTTP 200 for the page and
entry bundle and confirmed byte-for-byte equality with the tested local build:

- Entry: `assets/index-hb31ouZs.js`.
- SHA-256: `09796267cc441e56fc51d3e6383c7964a34d27ae47a6c5df860b184f5601087a`.
- Live carved and legacy modes both rendered six animated models at unchanged
  gameplay Y=0, with identical authoritative match state and matching camera.
- No browser exceptions. [Verification data](evidence/007f/deployment.json),
  [live before](evidence/007f/live-legacy-neutral.png),
  [live after](evidence/007f/live-carved-neutral.png).

Reproduce after a local production build:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/verify-environment-deployment.ts
```

## Mobile limitations

The terrain is five static render batches sharing one matte vertex-colour
material and one generated 128×128 repeating texture (~85.3 KiB with mipmaps).
It contains 496 road slabs plus edge fragments, with 78,272 vertices and 26,816
triangles across the complete arena and outside ridges.
Generation occurs once at scene creation. Rematches reuse the environment; scene
teardown releases its meshes, material and texture. Terrain adds no network asset
requests, shadow maps, dynamic lights, normal maps or per-frame deformation.

Matched six-model neutral captures report these whole-scene PlayCanvas allocations:

| Allocation     | Legacy bytes | Carved bytes |     Change |
| -------------- | -----------: | -----------: | ---------: |
| Textures       |  268,498,532 |  268,585,912 |    +87,380 |
| Vertex buffers |    4,002,860 |    7,759,916 | +3,757,056 |
| Index buffers  |      334,206 |      495,102 |   +160,896 |

The net texture/geometry increase is approximately 3.82 MiB. These are engine GPU
allocation counters, not OS residency or peak decode memory. Both modes make
exactly three character downloads and three bind-bound calculations.

The six original animated character assets are unchanged: 45.88 MiB transferred
before compression/caching and approximately 256 MiB of engine texture allocations
in the Goal 007E measurements. Their mobile loading, decode-memory and skinning
costs remain relevant. The production bundle retains Vite's >500 kB chunk advisory.

Performance measurements use cloud Chromium with ANGLE SwiftShader. They do not
measure iPhone GPU performance, Safari memory limits, thermal throttling or touch
feel. Physical iPhone Safari acceptance remains required for cold-cache loading,
full-match frame pacing/temperature, peak memory, orientation/safe areas,
simultaneous aimed touch actions, rematches and background/context recovery.

The [raw benchmark](evidence/007f/software-performance.json) uses Chromium
154.0.8037.57 on a two-core, 8 GiB Debian container. Each case warms 20 frames,
then measures 90 actual animation-frame intervals at 844×390. The same six-model
roster is paused in the authoritative simulation while skeletal animation and
rendering continue. No browser tests or captures run concurrently. This isolates
presentation cost; the natural full-match test separately verifies active AI and
combat. Pixel-ratio emulation does not reproduce iPhone hardware.

| Mode                        | Pixel ratio | Mean frame ms | Median frame ms | P95 frame ms |
| --------------------------- | ----------: | ------------: | --------------: | -----------: |
| Legacy, six animated models |           1 |         406.7 |           400.0 |        850.0 |
| Carved, six animated models |           1 |         413.9 |           416.6 |        833.4 |
| Legacy, six animated models |           2 |         918.3 |           900.0 |       1899.9 |
| Carved, six animated models |           2 |         803.1 |           800.0 |       1600.0 |

These noisy software-rendered results establish neither a mobile frame-rate target
nor a physical-device speedup. Both modes are slow on this host, especially at
pixel ratio 2. Terrain increases vertex/fill work while replacing many individual
legacy floor/guide/obstacle draws with five batches. The measurements do not
separate those costs. JS heap data in the raw file excludes GPU allocations and
is not total or peak process memory.

Reproduce independently against a running production preview:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/measure-environment.ts
```

`?environment=legacy` is available for direct environment comparison/recovery;
`?models=primitive` independently isolates the existing character cost.
