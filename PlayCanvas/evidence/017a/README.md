# GOAL 017A evidence and reproduction

Run commands from `PlayCanvas/`. Benchmarks and browser suites must run serially,
with no other browser, build, unit-test worker or CPU-intensive job in progress.
No benchmark invokes `verification.arrange`, `pause`, `advance`, teleports actors,
alters AI, changes the camera, or suppresses effects.

## Immutable comparisons

- GOAL 016: exact `solrahn-goal-016/` Git blobs from Pages commit
  `4521174ae290685b5a7e875640081e2a73066b5b`, source `93912bf…`.
  That runtime is byte-identical to the approved source tip `7e193f8…`
  for `src`, `public`, package/lock and Vite config (only later receipts differ).
- GOAL 017: production build of unchanged `765041a…` runtime (initial work tip
  `97a0132…` differs only by the GOAL 017A brief).
- `original-dist/` and `.audit/` are ignored local build products, not handoff source.

```sh
npm ci
npx playwright install chromium
git lfs install --local
git lfs pull --include='PlayCanvas/assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb'
python3 scripts/prepare-solrahn-performance.py
npm run build
# In separate shells, all within this repository:
python3 -m http.server 4175 --bind 127.0.0.1 --directory .audit/goal016/solrahn-goal-016
python3 -m http.server 4176 --bind 127.0.0.1 --directory .audit/original-dist
npm run start -- --host 127.0.0.1 --port 4173
```

For the initial audit, the unchanged work tip was built into
`evidence/017a/original-dist/`, served on 4176. This is equivalent to the above
original source reconstruction. `make-benchmark.py` preserves how the initial
benchmark was derived from the prior GOAL's helper. The later helper adds
steady-phase CPU deltas, renderer/extension and readiness counters.

```sh
BUILDS='[["goal016","http://127.0.0.1:4175/?mapPreview=solrahn-v2&frontend=1&verify=1"],["goal017","http://127.0.0.1:4176/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1"]]' LABEL=baseline node tests/helpers/measure-solrahn-performance.ts
BUILDS='[["goal016","http://127.0.0.1:4175/?mapPreview=solrahn-v2&frontend=1&verify=1"],["goal017a","http://127.0.0.1:4173/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1"]]' LABEL=final node tests/helpers/measure-solrahn-performance.ts
python3 evidence/017a/aggregate.py
```

Default: three independent contexts/build, alternating build order per round;
cold empty HTTP cache, then warm navigation in the same context. Both conditions
use a requested 20-second steady live-combat window, sampled in five-second
blocks; actual elapsed windows/frame counts are retained. Readiness and natural
combat setup precede sampling. Counts include six full models, actors' positions,
health/deaths/damage, engine texture accounting and all-pass WebGL draw calls.

Acceptance uses the median of **independent run medians**, and median of run p95s.
Run ranges/MAD disclose variability; three runs cannot establish a narrow
population confidence interval. Combat windows are not perfectly matched frames:
software speed affects wall/simulation time and death/respawn trajectories.

`readyMs` starts after navigation, at Enter Crownfall; `navigationToMatchMs` (later
helper) includes navigation. CDP ScriptDuration/TaskDuration are main-thread CPU
accounting; their difference is not a hardware GPU timer. WebGL compile/link/upload
counters/time are API-call wall durations, not complete asynchronous GPU work.
JS heap excludes native decoded backing stores, process memory and physical GPU
residency. WebP is transfer compression; actual runtime texture formats and mip
counts are in each environment snapshot. Hardware timing and physical iPhone
Safari/30 FPS/thermal behavior remain NOT VERIFIED.

## Diagnostics

`prepare-solrahn-diagnostics.py` derives disposable atlas-only and constant-albedo
fragment variants from the candidate build without changing gameplay, geometry,
assets, camera or cache semantics. The original resource set remains resident to
isolate fragment work. Those variants are never shipped or used as visual-parity
acceptance. The lazy-only experiment precedes Low lighting simplification.

## Validation

```sh
npm test
npm run typecheck
npx eslint src tests vite.config.ts
npm run lint
npm run fmt
npm run build
npm run test:browser -- --workers=1 --retries=0 --forbid-only --global-timeout=3600000 --reporter=line
node tests/helpers/capture-solrahn-performance.ts
```

Preserve original GOAL 016/017 receipts: inherited browser tests write into their
old evidence paths, so restore those tracked outputs after saving this run's full
log. New surface test outputs are directed to `017a/`. No assertions are weakened.
No production publication or GOAL 018 work is part of these commands.

## Continuation after interruption

The first diagnostic process stopped after 11 completed conditions. Raw completed
records in `matrix-progress.json` were retained. `RESUME=1` skips each completed
(round, build, cache) key and continues the original alternating order. The one
interrupted High warm context had its HTTP cache primed through normal readiness
before reload; it is flagged `resumedWarmCache` in the raw receipt. No completed
sample was repeated. The resumed console log begins at the High warm condition.
The three baseline and first-iteration cold/warm repeats were already complete.

`matrix.json` uses immutable iteration-one builds, including High. The final
implementation then reduces Low anisotropy to one while retaining trilinear mip
filtering, both atlas/detail samples, and all geometry. High restores the cap of
four. Final checks are required for these new changes; their logs use `*-final`
paths so the earlier completed receipts remain intact.

Diagnostic generation is pinned to `.audit/iteration1` (the `03b67c9` build) via
`--input`, rather than rewriting the final candidate. This copy is a local
ignored build product. Its bundles are recorded in `experiment-bundle-hashes.json`.

To reconstruct the matrix inputs on a fresh checkout, run
`python3 scripts/prepare-solrahn-performance.py --diagnostics`, followed by
`python3 scripts/prepare-solrahn-diagnostics.py --input .audit/iteration1`.
Serve `.audit/lazy-dist`, `atlas-only`, `constant`, `isotropic`, `no-debug` on
4177–4181 as specified by `run-matrix.sh`. The recorded lazy-only snapshot was
built before ownership diagnostics were added; reconstruction preserves its
render/asset path but its metadata/bundle hash differs. High uses the immutable
iteration-one directory for this matrix, not a later final build.

## Final receipt summary

Runtime implementation: `9492c21d86b020e916f64404bad743da581ebc52`.
Final units: 256/256 across 31 files. Typecheck, scoped lint, Python compilation
and production build pass. The full uninterrupted 140-case browser run finished
137 passed / 3 failed in 49.5 minutes. Two failures are in unchanged legacy tests
(respawn wall-time poll and immediate post-restart weapon-instance check). Their
causality is not established by a baseline replay; they were not rerun or weakened.
The third was the new cycle harness asking for advance(340) where the API permits
at most 300. Splitting that request into 300+40 preserves all assertions and total
time. Only that affected new check was rerun: 1/1 passed in 59.3 seconds.

All five resource cycles keep 457,398,212 engine-accounted texture bytes, ten
unique surface requests, four character asset downloads and zero captured errors.
These are bounded engine-accounting checks, not GPU residency/native leak proof.
The 64 matched captures are complete; Low has minor oblique filtering softening,
with geometry, zoning and both texture samples retained.

`inherited-browser-receipts.zip` preserves the 36 generated older-path receipts
before restoring their original tracked files. `browser-failures/` preserves all
three full-run error contexts. No old receipt was overwritten in the handoff.

**Decision: FAIL / BLOCKED**. Final medians 383.3/383.4 ms cold/warm are
1.278×/1.211× the completed GOAL 016 reference; p95 750.0/783.4 ms are
1.364×/1.270×. No review preview is published and GOAL 018 remains blocked.
