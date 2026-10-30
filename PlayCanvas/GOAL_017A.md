# CROWNFALL ARENA — GOAL 017A
## Sol’Rahn V2 Surface — Performance Regression Audit and Full Remediation

**Priority:** BLOCKING GOAL 018.
**Type:** Implementation GOAL, not an audit-only recommendation.
**Repository:** https://github.com/kalikeefbiz/-Crownfall-Arena-Unity
**Work branch:** goal-017a-solrahn-performance
**Starting GOAL 017 source:** goal-017-solrahn-surface at 765041a87a857675b0e6411e5ad527aa527f3ea5
**GOAL 016 baseline:** goal-016-solrahn-v2 at 7e193f87b4821470b5697c00034036fe8ced0a6f
**Production protected:** playcanvas-port, main, and the already published /playcanvas/, /solrahn-goal-016/ and /solrahn-goal-017/ sites.

## 0. EXECUTION CONTRACT

Execute this entire GOAL autonomously. Read the source and prior verification receipts, reproduce the regression, instrument/profile it, implement cause-backed fixes, rerun full validations, and produce the final verification report. Do not stop at suggestions or hand the diagnosis back for another authorization. Keep changes narrow, preserve functional and visual parity, and fail honestly if hard performance gates are unattainable. Do not ask for a competitive/founder playtest as a substitute for engineering tests.

No change to accepted terrain geometry, map layout, collision, nav, score rules, 3v3 logic, actor abilities, animation, bots, controls or menus. GOAL 018 foliage, lane props, logs, camps and scenic objects are out of scope.

Use this branch for all work. Do not merge into production or modify the original GOAL 016/017 branches or previews. Inspect publication workflow triggers before pushing, use [skip ci] if needed to avoid unrelated deployment, and require byte-identical protection proof before any isolated review publication.

## 1. CONFIRMED REGRESSION

Prior GOAL 017 evidence lives in PlayCanvas/GOAL_017_VERIFICATION.md and PlayCanvas/evidence/017/performance-summary.json.

Chromium SwiftShader at 844×390, DPR 1, Low quality, real six-summoner combat:

| Metric | GOAL 016 | GOAL 017 |
|---|---:|---:|
| Cold median frame | 166.7 ms | 383.3 ms |
| Cold p95 | 366.7 ms | 799.9 ms |
| Warm median frame | 283.4 ms | 466.6 ms |
| Warm p95 | 600.1 ms | 950.0 ms |
| Cold mean FPS | 5.11 | 2.67 |
| Engine texture allocations | 384.05 MiB | 436.22 MiB |

Cold/warm median regression = 2.30× / 1.65×. These are SOFTWARE-renderer results with one run per condition, NOT physical iPhone Safari FPS, hardware GPU timing, GPU residency or proof of a memory leak. The existing static six-model fixture removed bots; do NOT use it for live-combat acceptance. Preserve the original receipts.

The existing GOAL 017 Low path already uses a baked 1K atlas plus tiled detail, while High uses four blended PBR color/normal families. Do not mistakenly revert to the original costly full PBR Low shader or flatten the terrain as a “fix.”

## 2. SOURCE PROTECTION AND REPRODUCTION

1. Verify the current work-branch parent and all source/Pages branch heads and workflow triggers; save protection receipts. Baseline from the exact approved GOAL 016 build, not the Unity branch or an outdated GOAL 014 map. GOAL 017 is the unchanged regression baseline.
2. Read at least:
   - PlayCanvas/src/presentation/solrahn-surface-material.ts
   - PlayCanvas/src/presentation/terrain-textures.ts
   - PlayCanvas/src/presentation/solrahn-v2-environment.ts
   - PlayCanvas/src/presentation/scene.ts
   - PlayCanvas/tests/helpers/measure-solrahn-surface.ts
   - PlayCanvas/GOAL_016_VERIFICATION.md
   - PlayCanvas/GOAL_017_VERIFICATION.md
   - PlayCanvas/evidence/017/performance-summary.json
3. Reproduce real six-model combat with normal countdown, AI attacks, Ring ability, damage and effects; no fixture that removes bots, no accelerated clock, no actor teleporting, no disabling AI or moving the camera to hide workload.
4. Benchmark serially to avoid CPU contention; run at least three independent cold and warm samples for each build/condition, alternate build order, and publish median of run medians plus variability. Same machine, viewport, DPR, quality, cache semantics, camera, match state and software renderer. Separate readiness/compile spikes from steady combat. Preserve raw data, sample counts and exact commands.
5. Make the benchmark robust to combat-position and death/respawn variance; log actor state and draw counts rather than treating dissimilar combat windows as perfectly matched frames.

## 3. INSTRUMENT AND ISOLATE REAL CAUSES

A/B matrix, with active real combat:

A. GOAL 016 graybox baseline.
B. Unmodified GOAL 017 Low surface.
C. GOAL 017 with shader/material complexity isolated temporarily for diagnostics.
D. Atlas only, atlas + tiled microdetail; High textures not requested in Low until needed.
E. High four-family PBR color/roughness/normal/AO, as a separate profile.
F. Outer skirt, terrain chunk counts, material variants and additional passes where meaningful.

Gather: startup-to-match time, shader compilation and program variants, CPU scripting vs rendering, main-thread long tasks, frame median/p95 and distribution, WebGL draws, transfers, texture decode/upload, JS heap and engine texture allocation, load/unload/quality-switch cleanup and rematch persistence. Use hardware GPU timer queries ONLY if supported and valid; otherwise explicitly mark hardware GPU time unavailable. JS heap is not total process/GPU memory.

**Known inspection lead, not pre-judged root cause:** In solrahn-surface-material.ts, createSolrahnSurfaceMaterial currently loads all four High colors and four High normals at initial construction even when Low only samples the atlas and tiled detail color. Quantify unnecessary network/decode/upload/allocation cost. StandardMaterial is used by both surface tiers and the skirt; isolate its shader variants and fragment cost. Examine terrainTextures ownership of Image, ImageBitmap, Texture, late fetch promises and onDestroy. Investigate whether material.update on Low↔High causes costly compile or parameter changes. Verify debug overlays do not incur unnecessary per-frame work.

## 4. IMPLEMENT FULL CAUSE-BACKED FIX

Implement the smallest measured combination that meaningfully closes the regression, not just an analysis memo.

- Quality-aware / deferred assets: Low startup must load only resources required by the Low runtime. High family maps should be loaded lazily on first High demand, with explicitly owned promises and stable quality state. Switching Low/High must remain functional. Handle image failures, rematches, destroy while pending, repeated toggles, retry and no late GPU allocation after teardown. Avoid duplicate downloads/decodes/Texture allocations.
- Shader/material simplification: Profile and simplify Low shader work, sampler binding, UV computations, material features/variants and texture lookup overhead while keeping the approved convincing dirt lane, grass shoulders, forest floor, rock slopes and blended zoning. Reuse the world-aligned atlas, weight mapping and 6 m texture scale. Use a cheaper lit approach only when paired with measured performance improvement and accepted visual-parity captures.
- High preservation: Maintain all four original material families, natural blends, slope and coordinate alignment, roughness and normal/AO path. Do not permanently remove High support or silently redefine High as Low.
- Texture discipline: Audit actual GPU formats and mip levels, ImageBitmap backing stores, compressed-texture support/compatibility and disposal. WebP download compression is NOT GPU texture compression. Do not make target Safari compatibility worse.
- Scene and runtime: Fix demonstrably expensive redundant updates, terrain draw calls, repeated shader rebuilds, memory leaks or duplicate state. Avoid changing six-character models, bot behavior, combat effects, physics, geometry or camera merely to improve a benchmark.
- Iterate: collect before/after results for each substantive fix, discard ineffective experiments, and preserve truthful evidence. Keep working if the first optimization does not close the measured regression.

## 5. NONNEGOTIABLE VISUAL AND GAMEPLAY LOCK

Retain the exact GOAL 016 120×160 m footprint, 8 m × uint16/65535 elevation normalization, source/world axes, heightfield positions/normals/indices, 49 terrain meshes, 55,296 top triangles and 1,344 outer-skirt triangles. Maintain camps and major placeholders, original spawns, navigation, collision, territorial/scoring bounds, player controls, abilities, damage, bots, match lifecycle, character selection and character model/animation imports. GOAL 017 materials must remain visually recognizable and correct in landscape/portrait; keep four-weight debug overlays and aligned world coordinates. No extra environment detailing or map remesh.

## 6. PERFORMANCE ACCEPTANCE GATES

Primary software-regression engineering gate: measured repeatedly under matched real live-combat conditions, GOAL 017A Low must be within **15% of GOAL 016 median frame time** for BOTH cold and warm, and p95 within **20%** of GOAL 016 for BOTH. These are intended PASS gates, not presumed attainable outcomes. If not met, give the best measured result, isolate remaining root cause, explain why further safe fixes are blocked, and mark performance FAIL/BLOCKED rather than claim success. Give actual absolute frame times and ratios.

Check no new startup crashes, unhandled rejections, visible terrain seams, missing textures, hanging readiness, expensive shader churn, repeated loads or persistent resource growth over **five** enter/exit/rematch and Low↔High cycles. Compare quality/visual snapshots from identical cameras at lane shoulder, center combat, Blue/Red spawn, forest, rock slope, northern and southern Wilderness and top-down overlay.

Run both **844×390 landscape** and **390×844 portrait**, with all six full character models, normal bot damage, actual touch movement/ability hits, results/rematch and error reporting. Run all relevant existing unit tests, typecheck, scoped ESLint, production build and complete Playwright suite **uninterrupted**; retain exact passing/failing counts and commands. Previous GOAL 017: 251 unit tests passed; its 132-case suite was interrupted and a timing-sensitive legacy test required an isolated rerun. Record inherited repository-wide format/lint issues independently. Never weaken assertions, disable tests or mass-format unrelated evidence/provider files to manufacture a green report.

**Device evidence:** Physical iPhone Safari, sustained 30 FPS, GPU residency and thermal stability are NOT VERIFIED unless directly tested on actual hardware. Chromium SwiftShader software metrics cannot substitute for hardware acceptance.

## 7. REQUIRED HANDOFF

Produce:
- PlayCanvas/GOAL_017A_VERIFICATION.md
- PlayCanvas/evidence/017a/ with reproducible benchmark scripts/commands, raw and aggregated cold/warm results, A/B diagnostic matrix, root causes with code paths, optimization deltas, GPU/JS allocation and cleanup evidence, visually matched before/after mobile screenshots, 390/844 browser receipts, full unit/typecheck/lint/build/Playwright logs and protected-branch/publication evidence.
- Implementation commit SHA, final branch SHA, exact benchmark confidence/variability, all test counts and a concrete PASS / CONDITIONAL / FAIL decision identifying unmet criteria. Never claim 30 FPS on an actual iPhone without a device test.

If measured gates pass and publication is proven isolated, a NEW review preview under /solrahn-goal-017a/ may be published, with exact immutable source provenance; ensure all pre-existing Pages assets are byte-for-byte unchanged. If isolation cannot be demonstrated, stop at validated branch/build and evidence; DO NOT risk the live site.

**STOP after GOAL 017A.** No production merge, no replacement of GOAL 016 or 017 previews, no GOAL 018 environment work, and no visual-design lock. Founder physical-device acceptance remains separate.
