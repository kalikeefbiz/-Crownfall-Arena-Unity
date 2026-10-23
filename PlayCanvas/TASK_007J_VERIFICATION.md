# Goal 007J — application lifecycle and HUD ownership

Baseline: `b68ed94aeeceb49f47006f9d94baa0a976136d05`, branch `playcanvas-port`.
Scope: CF-001 and the directly related lifecycle safeguards in CF-013 of
[the code health audit](CODE_HEALTH_AUDIT.md). No other audit cleanup is included.

## Ownership and teardown

The canvas now holds one application owner under
`Symbol.for('crownfall.application')`. Re-evaluating the entry module first destroys
the previous owner. The same owner handles HMR disposal and the actual PlayCanvas
`destroy` event. Cleanup is idempotent and registered before scene/input startup.
An owner disposed while graphics-device creation is pending also disposes the
returned device before initialization can continue.

Cleanup aborts startup click/change/resize bindings, releases input and ability
captures through their existing disposers, destroys the HUD, then disposes the
scene and its shared assets. HUD disposal aborts its own selection listener,
clears its selection callback and removes its `<main>`. Body mode classes return
to their state before mounting. The owning `window.__crownfall` property is deleted;
previously saved snapshot and verification callbacks reject with
`Crownfall application disposed` before accessing simulation or scene state.
A saved old owner cannot destroy a replacement application.

The model-load tests reproduced an additional teardown failure: unloading a
container did not cancel its engine-owned HTTP request. Late responses attempted
to register textures in an already-destroyed registry. `SummonerAssets` now owns
an abortable fetch and supplies those same bytes to the existing container parser.
Disposal rejects pending callers. The existing parser's `skipMeshes` and image
processing hooks prevent late resource creation when disposal precedes its queued
contents handoff; live imports use the default mesh and image processing paths.
Already-started decoding is allowed to finish safely. Loaded containers retain
the existing unload and shared-instance ownership policies.

Application destruction remains separate from a normal rematch. Restart does
not abort the application, rebuild the HUD or unload the character cache.
Combat, aim assistance, input semantics, animation policies, terrain, camera,
styles, visible strings, accessibility attributes, assets, dependencies and
configuration were not changed.

## Automated lifecycle evidence

[application-lifecycle.spec.ts](tests/browser/application-lifecycle.spec.ts) adds
six production-browser tests. They re-evaluate the built entry in the **same
page and canvas**, without navigation or iframe replacement hiding leaked state.

1. Three destroy/remount cycles remove HUD/overlay/actor-label DOM, reject all
   four retained diagnostic entry points, and leave zero application-owned native
   window/document listeners. Retained detached controls cannot run old handlers.
   Every remount has unique HUD IDs, and one `KeyE` press produces command serial
   1, one accepted Solar Ring and one damage transaction. The attempt serial
   also remains 1, detecting duplicate submissions even if cooldown rejects them.
2. Re-evaluating startup while mounted replaces the old owner and leaves one HUD.
   One aim-assist toggle click changes its accessible state once.
3. Genuine simultaneous movement and Riven Basic touch captures are active before
   destruction and released afterward. Releasing those physical touches after
   remount causes no stale cast or movement; the negative assertion waits for
   simulation time to pass 0.6 seconds.
4. Three delayed real GLB requests can finish/fail after destruction without
   browser exceptions or recreated UI. Remount creates six visible, playing
   models. Normal restart preserves all six instance GUIDs, GPU counters and
   three cached source loads; Kit still transitions to `RunFast` on movement.
5. Destruction with all nine embedded texture decodes awaiting completion remains
   safe when every real decode callback is delivered afterward.
6. Destruction after all three downloads but before the engine's queued contents
   callbacks remains safe when those callbacks run afterward; remount returns
   to prematch.

Native-listener assertions use Chromium's `DOMDebugger.getEventListeners`,
filtering every evaluation of the application bundle while excluding Playwright's
own listeners. A live listener count is asserted first to prevent a vacuous zero.
The last test deliberately holds the installed engine's actual zero-delay
`Asset.fetchArrayBuffer` contents callback; it does not substitute a fake parser.

[summoner-assets.test.ts](tests/summoner-assets.test.ts) adds one unit regression
for aborting a pending fetch, rejecting pending consumers, idempotent disposal
and preventing a late parse. Existing sharing, failure and late-container cleanup
checks remain and account for the asynchronous fetch boundary.

## Regression results

Validation environment: Node 24.19, npm 11.9, Linux Chromium 154 using SwiftShader.
These checks do not establish physical iPhone/Safari behavior or performance.

- Unit tests: **208 passed in 21 files**, 26.47 seconds.
- Full production browser suite: **all 106 unique cases passed**: 99 in the full
  run before the environment restart interrupted its runner, then the remaining
  seven Wilderness cases passed in a completion run (exit code 0, 1.2 minutes).
  Source and bundle hash were unchanged. [Inventory comparison](evidence/007j/browser-coverage.json)
  verifies exact coverage of every case from `playwright test --list`, with no
  missing or unexpected cases. This was not one uninterrupted suite result.
- Typecheck, ESLint, Prettier and production build: **passed**.
- The complete natural 3v3 match passed in **7.3 minutes**, including all bots
  fighting, deaths, results, frozen results and clean restart.
  [Combat capture](evidence/007j/natural-combat.png) /
  [result capture](evidence/007j/natural-result.png).
- The existing Vite large-chunk advisory remains.

Logs: [unit](evidence/007j/unit-tests.txt),
[browser](evidence/007j/browser-full.txt),
[typecheck](evidence/007j/typecheck.txt), [lint](evidence/007j/lint.txt),
[formatting](evidence/007j/format.txt), [build](evidence/007j/build.txt).

Reproduce from `PlayCanvas/`:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run fmt
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

## Baseline comparison

The final production bundle was compared with an isolated build of the baseline
at 844×390 using the existing deterministic roster fixture, paused at 2.1 seconds.
All eight comparisons passed: complete authoritative match and combat snapshots,
environment, camera (tolerance `1e-6`), stable model contracts, engine GPU counters,
three actual source downloads and no browser exceptions.

The normal prematch captures are **pixel-identical: 0 changed pixels out of
329,160**. Six-model captures retain the same HUD, terrain and character
appearance; real-time animation phase can differ, so they are not claimed to be
pixel-identical. The existing full browser suite separately exercises natural
combat, deaths, results, restart and all three characters' animation behavior.

[Raw comparison and tested bundle hash](evidence/007j/comparison.json),
[prematch baseline](evidence/007j/baseline-prematch.png) /
[final](evidence/007j/candidate-prematch.png),
[six-model baseline](evidence/007j/baseline-six-models.png) /
[final](evidence/007j/candidate-six-models.png).

Tested entry: `assets/index-xZ3oEETT.js`.
SHA-256: `01fd769708e9aeb897b11c2cfbbeda7d939122a5b2554f1674ef97612cc8a6ab`.
Styles and the three original character GLBs are unchanged.

## Remaining limits

The tests cover real browser listeners, pointer capture, network, parsing and
decoding boundaries. They do not prove arbitrary heap retention, physical GPU
memory reclamation or device-specific Safari behavior. Browser-native image
decoding already in progress is not forcibly cancelled; its late completion is
covered explicitly. The queued-contents regression intentionally targets the
installed PlayCanvas implementation and may need adaptation on an engine upgrade.
Context-loss recovery and the other non-lifecycle CF-013 recommendations remain
outside this goal.
