# Reproduce GOAL 019

From `PlayCanvas/` on `goal-019-solrahn-environment-transformation`:

```
git lfs install --local
git lfs pull
npm ci
python3 scripts/goal019/prepare-trees.py
python3 scripts/goal019/stone-texture.py
python3 scripts/goal019/bake-ground.py
npm test
npm run typecheck
npx eslint src tests vite.config.ts playwright.environment.config.ts
VITE_DEVICE_PREVIEW=1 VITE_LANE_ENCLOSURE=1 npm run build
python3 -m http.server 4182 --bind 127.0.0.1 --directory dist
```

Browsers: Playwright Chromium 156 / WebKit 27.2. Use `npx playwright install
chromium webkit`. On this non-root Debian 13 worker, missing browser libraries
were downloaded from its configured Debian snapshot and extracted under
`/workspace/browser-libs`. The wrapper `/workspace/webkit-goal019.sh` selects those
libraries and the bundled WPE executable. No repository or system credentials
were changed; browser binaries/libraries are not runtime game dependencies.

```
DEVICE_WEBKIT_EXECUTABLE=/workspace/webkit-goal019.sh \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
npx playwright test -c playwright.environment.config.ts
```

The wrapper sets `WEBKIT_EXEC_PATH`, `WEBKIT_INJECTED_BUNDLE_PATH` and
`WEBKIT_INSPECTOR_RESOURCES_PATH` to the bundled `minibrowser-wpe` paths, and
`LD_LIBRARY_PATH` to the extracted libraries plus its `lib` and `sys/lib`.
The actual browser launch and tests, rather than the skipped host preflight,
establish successful execution. Physical Safari is not emulated hardware.

Baseline: immutable build from `8ad97bb` at port 4181. Capture commands run
`scripts/goal019/capture.mjs` with `CAPTURE_NAME=before` (port 4181) or
`CAPTURE_NAME=after CAPTURE_URL=http://127.0.0.1:4182/`. It injects response-only app
and simulation references for reproducible camera poses and restores original
bot controllers for the staged six-character combat views. No hook is shipped.
It writes screenshots directly from Chromium without editing image pixels.

`benchmark.mjs` runs sequential fresh contexts, 844×390 DPR1 Low, three-second
warmup and twelve-second samples. Run it only after all other browser work ends.
`017b-equivalent` uses the original GOAL 018A build with `enclosure=0`: the same
underlying GOAL 017B terrain/actors/monitor, with dormant enclosure code present.
It is explicitly not claimed to be a new exact-source GOAL 017B build. The test
freezes a six-actor workload and retains real rendering; it is not live-combat
throughput, iPhone FPS, native memory or GPU residency evidence.

Publish only after source commit and validation:
`python3 scripts/goal019/publish.py SOURCE_SHA`. This checks every protected Pages
object, adds only the new folder, creates its receipt, and pushes with a lease.
The checked-in publication receipt and hosted `preview-source.json` identify the
exact deployed source. Do not invoke production publication workflows.
