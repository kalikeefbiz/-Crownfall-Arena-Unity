# GOAL 017B — iPhone performance playtest preview

**DEPLOYED — automated mobile functionality verified. Actual physical iPhone FPS,
Safari hardware behavior and thermal stability remain NOT VERIFIED.**

Play: **https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017b/**

- Deployed source: `2e70eebe4b6eaeea645a24466513955335d9c989`.
- Pages deployment: `4fff0767efdef6ea0f3b3bbbd87ae627bfbd8bf2`, build status **built**.
- Base source: `9f20e5bc666bfc3f9afedad53573b63c05d4068b`.
- Work branch: `goal-017b-device-preview`. No production merge or GOAL 018 work.
- Immutable hosted provenance: [preview-source.json](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017b/preview-source.json).

## Using the preview

Enter Crownfall → choose Kit Asher, Set or Riven → Enter Arena. The complete
existing 3v3 game, all six animated Summoners, normal AI, controls, abilities,
scoring, results and rematch are retained.

The top-right **Performance** panel is below Pause/Aim Assist and above the normal
movement/ability control region. Use **Hide performance / Show performance** to
collapse or expand it. **Low / High** change graphics in the running match without
rebuilding or restarting. Fresh browser storage starts on Low; an existing saved
quality preference takes precedence. Existing Pause → Settings also works.
High loads its additional family maps on first demand; the panel shows the actual
applied tier and a loading/retry status. It keeps the original High PBR support.

## Monitor behavior

- FPS and mean frame time use completed-render wall intervals over approximately
  one second, rather than clamped simulation delta or a fixture's fixed ticks.
- p95 uses the nearest-rank percentile of a rolling ten-second window, bounded at
  2,048 samples. Samples reset on pause, backgrounding, collapse and quality changes.
- Resolution is the actual canvas render-buffer width/height, not CSS dimensions.
- JS heap appears only when the browser supplies `performance.memory`; it is not
  total browser memory, GPU memory or residency. WebKit omits it.
- Sampling is constant work per rendered frame using two bounded typed arrays.
  DOM updates and percentile sorting occur about once per second. Collapsed or
  inactive monitoring stops sampling. There is no extra RAF loop, GL query,
  console stream, telemetry or network instrumentation.
- The toggle is sticky and its sizing overrides inherited 62px gameplay buttons,
  keeping it visible after quality changes and within the tested mobile layouts.

The preview-only `VITE_DEVICE_PREVIEW=1` build selects the approved V2 surface at
the direct folder URL. Terrain/material/map/combat/input/public asset sources are
byte-identical to GOAL 017A. Game changes only add the optional render observer
and a small performance-state accessor. No terrain redesign or material downgrade
was performed. The prior software optimization gates were not re-audited here.

## Verification results

| Check | Result |
|---|---|
| Focused monitor/texture-lifecycle units | **8/8 pass** (three files) |
| Typecheck, scoped ESLint, Python publisher compilation, production build | **Pass** |
| Public Chromium/WebKit gameplay/monitor/lifecycle checks | **8/8 pass** |
| Final public landscape/portrait toggle visibility after quality changes | **4/4 pass** |
| Public alternative character selection (Riven/Set), six animated models each | **2/2 pass** |
| Actual render-buffer switching at emulated DPR 2 | **844×390 Low → 1688×780 High → 844×390 Low**, both engines |
| Prior deployed Git objects | **306/306 unchanged** |
| Protected old public HTML/JS/CSS/JSON downloads | **85/85 byte-identical before/after** |

The eight public functional checks cover 844×390 and 390×844, character selection,
six full model imports, monitor numbers/collapse, live Low/High switching with
only ten unique surface-map requests after High, touch movement and ability damage,
normal AI damage, results and cached rematch. Separate normal-entry cases use real
countdown and ordinary AI without the verification API. Functional lifecycle
cases use the existing opt-in verification seam for controlled hits and reaching
results; their displayed desktop/software FPS is never treated as iPhone evidence.

Chromium uses native CDP touch movement and native ability taps. Playwright
WebKit provides native touch taps but no public touch-drag API, so WebKit's movement
check uses a trusted mouse drag in a mobile touch-enabled layout. Both engines are
desktop automation. They cannot establish physical iPhone performance or replace
opening this preview on the actual device.

The initial published source `f5c21f0783155583f8aafde55071acf3d2617f57` passed all
eight public functional checks. Visual review then caught inherited button height
clipping the collapse toggle in landscape. The final publication changes only
monitor CSS, the targeted visibility tests and the isolated publisher. **Gameplay
and frontend JavaScript bundles are byte-identical** across the two publications;
the final CSS was verified with the four public layout checks and the two public
alternative-selection checks. See `layout-only-runtime-proof.json`.

Development test receipts also retain two new-harness failures caused by advancing
verification time without re-pausing after the controlled hit fixture. Adding the
required pause resolved both lifecycle cases without changing game logic or
assertions. The first new layout assertion caught the inherited button height;
the corrected dimensions pass in both engines. No test was disabled.

## Known issues retained from GOAL 017A

The two outstanding legacy test failures remain documented and were not expanded
into a new regression campaign:

1. `tests/browser/match.spec.ts:34`: its 15-second wall-time poll still observed the
   inspected actor dead instead of respawned.
2. `tests/browser/six-summoner.spec.ts:209`: the immediate post-restart fixture
   snapshot observed zero Riven weapon instances where four were expected.

Their underlying cause was not established by a new baseline replay. They were
not weakened or declared fixed. The public frontend results/rematch checks pass;
no directly preview-blocking failure remains in the targeted checks. Full 017A
history and the failed software performance gate remain in
[GOAL_017A_VERIFICATION.md](GOAL_017A_VERIFICATION.md).

## Publication protection and provenance

The publisher uses a separate Git index, verifies every protected Pages object,
creates a direct child of the observed Pages commit, limits changed paths to
`solrahn-goal-017b/`, and uses an explicit lease on its push. The initial folder
publication and the monitor-sizing update both preserve all 306 prior objects.
After deployment, all 85 protected public text files also match their original
Git blobs and SHA-256 fingerprints. Unity root, `/playcanvas/`, recovery and all
previous GOAL previews remain unchanged. Protected source refs including
`goal-017a-solrahn-performance` remain unchanged. No existing publication workflow
was dispatched; source commits use `[skip ci]`.

Evidence: [deployment](evidence/017b/deployment-status.json),
[publication](evidence/017b/publication.json),
[protection](evidence/017b/protection-after.json),
[public browser log](evidence/017b/browser-public.txt),
[final layout log](evidence/017b/browser-public-final-toggle.txt),
[selection checks](evidence/017b/public-selection.json),
[commands](evidence/017b/README.md).

**Stop after GOAL 017B.** The preview is ready for the requested physical-device
playtest. No actual iPhone FPS, sustained 30 FPS, thermal or GPU-residency result is
claimed, and no GOAL 018 or production integration has begun.
