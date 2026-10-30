# GOAL 017B verification commands

No optimization audit or full legacy regression campaign was run for this goal.
Base: `9f20e5bc666bfc3f9afedad53573b63c05d4068b`.
Deployed source: `2e70eebe4b6eaeea645a24466513955335d9c989`.

## Build and unit checks

From `PlayCanvas/`:

```sh
npx vitest run tests/performance-monitor.test.ts tests/terrain-textures.test.ts tests/solrahn-material-lifecycle.test.ts
npm run typecheck
npx eslint src/ui/performance-monitor.ts src/ui/frontend.ts src/game.ts src/main.ts tests/performance-monitor.test.ts tests/browser/goal017b-device.spec.ts playwright.device-preview.config.ts
VITE_DEVICE_PREVIEW=1 npm run build
python3 -m http.server 4182 --bind 127.0.0.1 --directory dist
```

Eight focused unit tests pass. Scoped lint, typecheck, Python compilation and
production builds pass. The 017A inherited repository-wide lint/format issues
were not mass-formatted or folded into this task.

## Browser checks

```sh
npx playwright install chromium webkit
npx playwright test -c playwright.device-preview.config.ts --project=chromium --reporter=line
npx playwright test -c playwright.device-preview.config.ts --project=webkit --reporter=line
DEVICE_PREVIEW_URL='https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017b/' RECEIPT_PREFIX=public npx playwright test -c playwright.device-preview.config.ts --reporter=line
```

This Debian 13 worker lacked WebKit system dependencies and could not install
packages as root. Debian packages were downloaded/extracted into the ignored
`.audit/017b/webkit-libs/root` directory without modifying system libraries.
`webkit-local-deps.txt` records package versions. The local launcher is preserved
in `webkit-local-launcher.sh`; it uses the unmodified Playwright WebKit WPE binary
and local dependency search path. On this worker, commands select it with
`DEVICE_WEBKIT_EXECUTABLE="$PWD/.audit/017b/webkit-local.sh"`. Systems with normal
WebKit dependencies use the default launcher and omit that variable.

Local coverage: three initial scenarios per engine plus one DPR-2 scenario each;
four toggle-visibility scenarios were added after visual review. Two development
lifecycle failures were harness calls made without re-pausing verification; the
corrected lifecycle cases pass. Two initial landscape toggle checks caught the
inherited fixed 62px button height; corrected sizing passes. All raw logs remain.

Public `browser-public.txt`: eight functional cases pass on source `f5c21f0`.
The final CSS-only monitor update has byte-identical gameplay/frontend bundles
(`layout-only-runtime-proof.json`). `browser-public-final-toggle.txt`: all four
final-source visibility checks pass. `public-selection.txt/json`: two additional
normal public-entry checks select Riven and Set, each with six animated models.
Thus public coverage is eight functional + four final-layout + two selection
checks, not a physical-device performance measurement.

Chromium movement uses trusted CDP touches; WebKit uses trusted mouse dragging in
a mobile touch-enabled layout and native touchscreen ability taps (Playwright's
public WebKit API does not provide touch drag). Functional fixed-time advances
only reach AI/lifecycle states and are not performance samples. Separate ordinary
entry checks verify real countdown and natural AI with no verification API.

## Isolated deployment

```sh
python3 scripts/verify-solrahn-device-preview.py
python3 scripts/publish-solrahn-device-preview.py COMMIT_SHA
python3 scripts/verify-solrahn-device-preview.py --after
```

The publisher builds the exact clean source with `VITE_DEVICE_PREVIEW=1`, stages
only `solrahn-goal-017b/` in a separate Git index, proves all older objects match,
and uses a lease-protected direct-child Pages push. The monitor sizing update
recognizes only this task's prior publication receipt; it cannot overwrite an
unknown preview revision. All 306 old objects and 85 old public text files match.
The original and final publication receipts retain both immutable source SHAs.

Normal URL:
https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017b/

Use Hide/Show performance and Low/High in the gameplay overlay. Fresh storage
starts Low; saved device quality takes precedence. FPS/mean are about one-second
completed-render wall cadence, p95 is a ten-second window capped at 2,048 samples,
and resolution is canvas pixels. Optional JS heap is neither GPU residency nor
native browser memory. Actual iPhone FPS, Safari hardware/thermal behavior and
sustained 30 FPS remain NOT VERIFIED.

The two unresolved 017A legacy test failures stay documented in the parent
verification report and the 017B report. No assertions in those tests were changed
or rerun, no production merge was made, and GOAL 018 was not begun.
