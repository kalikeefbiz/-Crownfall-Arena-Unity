# CROWNFALL ARENA — GOAL 017A verification

**Decision: FAIL / BLOCKED.** Isolated work branch only. Physical iPhone Safari, sustained 30 FPS, hardware GPU timing/residency and thermal stability: **NOT VERIFIED**. All four software timing gates fail; GOAL 018 remains blocked.

Branch: `goal-017a-solrahn-performance`. Initial work tip: `97a0132d52476e9301e6b6df5491bcf826405920`, direct child of required GOAL 017 source `765041a87a857675b0e6411e5ad527aa527f3ea5`. First implementation: `03b67c95a294a33739b98832fd3791d035aa9f5b`. Final implementation: `9492c21d86b020e916f64404bad743da581ebc52`. The final evidence commit is identified in the handoff response.

## Repeated live-combat result

Chromium 156 / ANGLE SwiftShader, same two-CPU-quota executor, 844×390, DPR 1, Low. Cold means empty context HTTP cache; warm means reload in the same context. Three independent cold and warm samples per build/diagnostic; build order reverses each round. All benchmark windows follow normal countdown, ordinary W movement to mid-lane, bot damage and touch Ring use. No fixtures, bot removal, actor relocation, camera hiding or accelerated ticks occur in performance samples. Final new-build samples use the already completed approved-baseline comparison, honoring the request not to repeat completed steps.

| Build / cache | Runs | Median of run medians | Median of run p95s | Median ratio / p95 ratio to GOAL 016 | Median range / MAD | Frames |
|---|---:|---:|---:|---:|---:|---:|
| goal016 / cold | 3 | 300.0 ms | 550.0 ms | 1.000× / 1.000× | 300.0–316.6 / 0.0 ms | 202 |
| goal016 / warm | 3 | 316.7 ms | 616.7 ms | 1.000× / 1.000× | 300.1–366.8 / 16.6 ms | 183 |
| goal017 / cold | 3 | 500.0 ms | 999.9 ms | 1.667× / 1.818× | 483.3–533.3 / 16.7 ms | 123 |
| goal017 / warm | 3 | 499.9 ms | 983.3 ms | 1.578× / 1.594× | 499.9–516.6 / 0.0 ms | 124 |
| GOAL 017A iteration 1 / cold | 3 | 500.0 ms | 900.0 ms | 1.667× / 1.636× | 500.0–500.0 / 0.0 ms | 131 |
| GOAL 017A iteration 1 / warm | 3 | 450.0 ms | 833.2 ms | 1.500× / 1.316× | 449.9–466.7 / 0.1 ms | 139 |
| GOAL 017A final / cold | 3 | 383.3 ms | 750.0 ms | 1.278× / 1.364× | 383.3–399.9 / 0.0 ms | 161 |
| GOAL 017A final / warm | 3 | 383.4 ms | 783.4 ms | 1.211× / 1.270× | 366.7–416.6 / 16.7 ms | 159 |

Iteration-one ratios use its own interleaved GOAL 016 medians (300.0/300.1 ms cold/warm). Final ratios use the already completed initial GOAL 016 reference (300.0/316.7 ms); no baseline sample was repeated after the continuation request.

The median gate is ≤1.15× and p95 gate ≤1.20× for **both** caches. P95 or memory improvements alone cannot satisfy acceptance. Exact per-run medians/p95s, frame arrays, wall windows, resource timing, actor state, draw counts, CPU metrics and errors are retained in the JSON receipts. Three runs provide limited engineering confidence; ranges and median absolute deviation are reported, with no invented narrow population confidence interval. Normal positions, deaths and respawns differ across software speeds. `summary.json` reports living-actor and draw ranges, human-position ranges and bot-damage growth rather than claiming matched frames.

## Cause-backed implementation

Code paths: [surface material](src/presentation/solrahn-surface-material.ts), [texture ownership](src/presentation/terrain-textures.ts), and [developer readout](src/presentation/solrahn-v2-environment.ts).

1. **Eager High resources:** original Low construction requested all ten maps. Low now requests only its atlas, tiled soil color, outer rock color and weight debug texture. Six High-only maps are deferred to the first High demand; existing maps/promises are reused. A single requested/applied quality state prevents late High completion from overriding a later Low selection, and repeated same-tier calls avoid material updates.

2. **Filtered fragment cost:** constant-albedo diagnostics isolate rendering/sampling from unchanged actors, AI and geometry. Atlas-only, isotropic sampling, removal of the debug branch and asset-only deferral are measured separately. The final Low retains both original atlas/detail reads and the approved six-metre scale, with anisotropy one and trilinear mip filtering. High restores the original anisotropy cap of four and retains all four color/roughness/normal/AO families and byte-identical High shader chunks. Low uses diffuse lighting with geometry normals. Constant color and atlas-only diagnostics are not shipped as visual acceptance; texture detail is retained.

3. **Owned lifetimes:** one URL owns one promise/decode/Texture. Failed entries can retry; teardown aborts pending fetches, detaches/cancels Images, closes ImageBitmaps, destroys Textures and clears retained ownership. Late decode completion closes its bitmap without setting a destroyed texture source. Sources remain alive until teardown for context restoration. Initial errors reach existing readiness/retry; deferred High failure preserves the working Low surface and explicit High demand retries it.

4. **Debug readout:** the closed developer panel no longer recomputes and replaces an invisible per-frame readout. Visible labels, overlays, world coordinates and camera inspection remain unchanged.

The final changes are confined to surface material/texture ownership and the invisible readout guard. No actor, animation, bot, combat effect, score, control, menu, camera, collision, navigation or geometry changes were used to improve timing.

### Diagnostic matrix

| Profile / cache | Runs | Median | p95 | Median range |
|---|---:|---:|---:|---:|
| lazy-only / cold | 3 | 516.6 ms | 949.9 ms | 483.3–516.7 ms |
| lazy-only / warm | 3 | 483.4 ms | 1016.6 ms | 483.4–516.6 ms |
| constant / cold | 3 | 316.6 ms | 633.2 ms | 300.0–316.7 ms |
| constant / warm | 3 | 316.6 ms | 616.7 ms | 316.6–316.6 ms |
| atlas-only / cold | 3 | 400.0 ms | 750.0 ms | 366.7–433.3 ms |
| atlas-only / warm | 3 | 416.6 ms | 716.7 ms | 416.6–483.3 ms |
| isotropic / cold | 3 | 400.0 ms | 766.7 ms | 383.3–416.6 ms |
| isotropic / warm | 3 | 383.4 ms | 766.7 ms | 383.3–400.0 ms |
| no-debug / cold | 3 | 466.7 ms | 883.3 ms | 466.7–500.0 ms |
| no-debug / warm | 3 | 466.6 ms | 749.9 ms | 466.6–499.9 ms |
| high-pbr / cold | 3 | 783.3 ms | 1483.3 ms | 750.0–800.0 ms |
| high-pbr / warm | 3 | 866.6 ms | 1616.6 ms | 816.6–866.6 ms |

The matrix resumed after an interruption with 11 completed conditions preserved. No completed condition was repeated. The interrupted High warm context was primed through normal readiness before warm reload and is marked `resumedWarmCache`. `interruption.json` records this limitation. All other independent contexts follow the original schedule. The complete browser suite below is a separate uninterrupted run.

### Allocation, upload and compile evidence

Terrain texture capacity drops **54,692,996 → 21,138,572 bytes** (52.16 → 20.16 MiB), saving 32 MiB. Low transfer-file payload drops **5,538,940 → 2,477,418 bytes**, saving 3,061,522 bytes; this is file size, not a fabricated network-wire measurement. Six deferred 1024² RGBA sources represent 24 MiB of decoded pixel payload before native-browser overhead. Engine texture accounting also includes the unchanged large character textures.

Native image decode CPU is not isolated from fetch/onload or synchronous upload. Decode request counts and pixel-payload savings are quantified; API upload wall time and readiness/resource timing are retained in [allocation and phase receipts](evidence/017a/allocation-and-phases.json). No decoder-only CPU duration is claimed.

All surface textures remain RGBA8/SRGBA8 with full mip chains; WebP is download compression, **not GPU texture compression**. No new compressed-format or Safari support assumption is introduced. Raw snapshots include dimensions, formats, mip levels, bytes, anisotropy, requested/applied quality and pending/source counts. JS heap is not process memory or native image/GPU residency. CDP TaskDuration/ScriptDuration separate main-thread work from the large software-rendering delay; API upload/compile/link wall times do not establish hardware GPU duration. No hardware timer result is claimed. Steady-phase program links and resource counters are in the raw receipts; dynamic character uploads must not be mistaken for repeated terrain downloads.

## Visual and gameplay lock

All original map payloads, generator, heightfield, gameplay sources and public assets are protected by SHA-256 receipts. The footprint remains 120×160 m; elevation remains 8×uint16/65535; axes, positions, normals, indices, 49 terrain meshes, 55,296 top triangles and 1,344 outer-skirt triangles remain intact. There are 48 top chunks plus one skirt, two material roles and one opaque terrain pass; no additional terrain passes or shadow maps were introduced. The skirt keeps its original rock texture. Camps, major placeholders, spawns, territorial bounds, 3v3 gates, controls, abilities, bot behavior and match lifecycle remain unchanged.

Matched before/after captures cover landscape and portrait, both spawns, center/shoulder, northern and southern Wilderness/forest/rock areas, major, top-down surface and all weight overlays. See [review board](evidence/017a/review.html). Inspection captures pause simulation only for camera comparison and are never used as performance samples. Functional mobile receipts include six full models, natural bot damage, real touch movement/ability hits, results and rematch. There are **32 matched pairs / 64 unedited captures**, with dimensions checked as 844×390 or 390×844. Inspected landscape/portrait pairs preserve shape, zoning and material identity; Low is slightly softer at oblique angles with reduced anisotropy. See `visual-review.json`. These are engineering visual checks, not founder design approval.

## Validation

Final unit result: **256 passed across 31 files**. Complete uninterrupted Playwright run: **137 passed, 3 failed**. Exact commands/counts and any failures remain in the logs.

```text
python=0
unit=0
typecheck=0
lint=0
build=0
benchmark=0
browser=1
captures=0
```

Full-run failures are preserved: the unchanged legacy respawn poll (`match.spec.ts:34`) remained dead after 15 wall seconds; the unchanged six-summoner restart check (`six-summoner.spec.ts:209`) observed zero weapon instances while expecting four; and the new cycle harness initially called advance(340), exceeding the existing 300-second API bound. The two legacy cases were not rerun or weakened, and their cause is not established by a baseline replay. The new harness keeps all assertions and total simulated time, splitting the call into advance(300) plus advance(40). The corrected check **passed 1/1 in 59.3 seconds** (`browser-cycle-corrected.txt`, `cycle-status.txt`). This yields passing coverage for **138 of 140 unique cases**, with two unchanged legacy cases unresolved. It does not replace or relabel the failed full-run receipt.

Five menu/enter/rematch/Low↔High cycles, duplicate-load and stable texture-allocation checks are recorded in `resource-cycles.json`. Deferred High failure/retry and pending-High→Low race checks are included in the browser suite; loader units cover late teardown, deduplication, failure retry and Image cancellation. The five-cycle receipt records **10 total/10 unique surface requests**, texture accounting of **457,398,212 bytes in every cycle (zero growth)**, model downloads fixed at four, material update counts **3/5/7/9/11**, and **zero captured errors**. Repeated same-tier calls and rematches add no material updates. High textures stay cached after first demand and are released at scene teardown. These bounded tests do not claim indefinite native-memory or thermal stability.

Repository-wide lint retains the three inherited errors in `assets/solrahn-three-lane/scripts/validate_glb.cjs`. The initial full format check reports 76 instruction/evidence/generated files, including inherited issues (GOAL 017 already reported 42). Touched runtime/test formatting and scoped lint are checked separately. No assertions were weakened, tests disabled or unrelated evidence mass-formatted. Original evidence modified by inherited browser screenshot writers is restored after retaining this run’s full log.

## Protection and handoff

`protection-after.json`, `heads-before.txt`, `heads-after.txt`, workflow snapshots and the original Pages tree establish source and publication protection. No production merge, workflow dispatch or Pages publication occurs. All pre-existing Pages Git objects remain identical, including `/playcanvas/`, `/solrahn-goal-016/`, `/solrahn-goal-017/` and Unity assets. Source pushes use `[skip ci]` and target only the specified work branch.

Reproduce using [commands and methodology](evidence/017a/README.md), benchmark/helper scripts, immutable bundle hashes and raw/aggregated receipts under `evidence/017a/`. The new final build is tested after the sampler/readout changes; completed baseline/iteration-one work is reused rather than repeated.

The final timing gates fail. The remaining cause is the software cost of the required filtered color/detail shader relative to GOAL 016 vertex colors. Diagnostic constant color closes most of the gap but cannot preserve approved materials. Atlas-only and debug removal are quantified; the delivered candidate retains convincing detail rather than claiming success from a visually reduced diagnostic. Further reductions beyond the validated sampling change are not established safe within the visual lock. **Do not begin GOAL 018 or treat this as production performance approval.** Physical iPhone acceptance remains separate.
