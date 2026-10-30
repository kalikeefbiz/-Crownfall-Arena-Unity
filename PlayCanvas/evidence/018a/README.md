# GOAL 018A verification

Original source: `d781667bc5216d32a2dad73de54ee031b66aac45` on
`goal-017b-device-preview`. Work is isolated to `goal-018a-lane-enclosure`.

## Playtest

https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-018a/

Enter Arena normally. Move along the middle lane to world Z 14 through -12.
For immediate inspection, expand **V2 terrain · developer overlays**, choose
**Inspect: middle-lane**. This is the pre-existing inspection camera using the
normal gameplay offsets. Change it back to follow player for normal play.
Fresh device storage starts Low; High is available in the existing monitor.

## Scope and placement

One 26m route section: `(x=0,z=-12)` to `(x=0,z=14)`. Four embedded cliff faces,
five boulders, two pines and one red oak. No map-wide rollout, camp decoration,
stone footing, paving, new systems, collision or production merge.

`src/presentation/lane-enclosure-layout.ts` is the complete reproducible placement
roster (metres; Y-up). Rock foot Y = existing terrain height minus `embed`; faces
lean 24 degrees towards the route. Tree foot Y = sampled height - 0.12m; heights
are 5.8, 6.4 and 7.4m. `placement.json` records exact runtime XYZ foot coordinates,
plus shared mesh and material IDs. The native navigation mask allows movement
on these banks: the artwork does not add a collision barrier or change traversal.

Six shared mesh resources / four materials / four container downloads. Repeated
geometry uses four immutable matrix buffers and aggregate culling bounds, giving
six environment draw batches. Single variants retain normal mesh rendering.
Every prop has shadows disabled; no update callback or physics component added.
The existing 512px tree GLBs remain byte-for-byte unchanged.

## Visual evidence

- `before-matched-lane.png`, `after-matched-lane.png`: exact same existing camera
  pose, recorded in the capture JSON (position `[0,16.300060272216797,18]`).
- `after-gameplay.png`: original follow-player camera, all six Summoners.
- `after-integration.png`: closer bank inspection; HUD hidden for terrain review.
- `after-topdown.png`: placement inspection; HUD hidden, existing terrain visible.
- `after-mobile-844.png`, `after-mobile-390.png`: landscape / portrait with all six
  models. Existing middle-lane focus centres the portrait roster. It preserves
  camera offsets/FOV. Portrait has less bank visibility and inherited control
  overlap than landscape; no camera or HUD redesign is included in this goal.
- `source-inspection.png`: Blender asset inspection, **not** a game screenshot.

The capture script injects an app reference into browser responses only, enabling
close/top-down inspection poses on prerender. There is no such hook in shipped
code. The before build is a frozen build of the actual source branch, not a
mocked scene. Capture monitor values include inspection/screenshot stalls and
must not be used as comparative performance evidence.

## Reproduce checks

From PlayCanvas, Node 24.19.0, locked npm dependencies, Blender 4.3.2 / Python 3:

```
npm ci
npm test
npm run typecheck
npx eslint src/presentation/lane-enclosure*.ts src/presentation/solrahn-v2-environment.ts src/presentation/scene.ts tests/browser/goal018a-enclosure.spec.ts playwright.lane-enclosure.config.ts
python scripts/goal018a/verify-assets.py
VITE_DEVICE_PREVIEW=1 VITE_LANE_ENCLOSURE=1 npm run build
python3 -m http.server 4182 --bind 127.0.0.1 --directory dist
npx playwright test -c playwright.lane-enclosure.config.ts --reporter=line
```

The two browser engines exercise landscape/portrait, all six animated Summoners,
AI damage, ability use, movement, Low/High toggles, match completion, rematch,
shared resource identity and stable geometry allocation across rematch. Global
texture accounting is recorded separately: one Chromium portrait check observed
a 3,360-byte warm-up delta while all enclosure asset identities and geometry
buffers remained unchanged. An overly strict global-texture equality assertion
was corrected; both the original failure and targeted recheck are retained.
Cancellation while a stone download is in flight must allow a clean re-entry.
Chromium uses native CDP touch movement; WebKit uses native taps plus mouse drag
because Playwright WebKit has no public native touch-drag API.

This worker has extracted Debian WebKit libraries under ignored `.audit/018a/`.
`webkit-dependencies.txt` and `webkit-local-launcher.sh` retain versions and the
launcher; select it with `DEVICE_WEBKIT_EXECUTABLE` where needed. Standard hosts
use `npx playwright install --with-deps chromium webkit`.

## Performance method

`benchmark.mjs` runs engines sequentially and alternates AB/BA order over three
rounds. Each fresh context uses 844×390, DPR 1, Low, the same original camera and
six-actor roster, a real-time 4s warm-up and a 12s sample. The verification fixture
freezes actor positions for matching visible workload; rendering continues on
wall time. It measures presentation cadence for an equivalent scene, not live
combat throughput. Functional combat/lifecycle checks are separate.

No screenshot, inspector camera, accelerated simulation ticks or concurrent
browser task is used in timing windows. GPU bytes are PlayCanvas accounting for
textures/vertex/index buffers, not native driver residency. Chromium heap is a
JS heap observation, not a complete browser/native allocation profile. WebKit
has no equivalent portable JS heap API, so its heap is explicitly unavailable.

`performance-raw.json` contains every sample, renderer, environment snapshot,
frame intervals and available heap metrics. `performance-summary.json` and the
main goal report summarize the three rounds. Physical iPhone Safari FPS, thermal
behaviour and native memory remain **NOT VERIFIED**. Software Chromium/WebKit
results must not be represented as physical device performance. WebKit masks its
renderer string as `Apple GPU`; this Linux WPE run does not establish Apple GPU
hardware. The worker exposes no `/dev/dri` hardware graphics device.

The initial denser candidate and early comparison remain in `performance-initial*`
and `browser-initial.txt`; those are not the delivered candidate. An off-axis
capture caught the RenderComponent resetting instancing bounds on attachment;
the final implementation sets aggregate bounds after attachment. Final close
captures verify the correction. A cancelled capture's development log is retained
in `capture.txt`. Final capture runs and browser logs identify the delivered state.

## Asset validation and limitations

`gltf-validation.json`: zero errors. Khronos validator warns that tangent spaces
are generated at import (one warning per mesh); normals render correctly in the
Chromium/WebKit checks. No extension decoder is required. The cliff is an open
scan and must remain embedded; it is unsuitable for a freestanding rear view.
Trees retain their approved stylized opaque foliage. Founder review of the
photogrammetry/stylized foliage pairing is still needed before any expansion.

Source URLs, CC0 dedication, download MD5/SHA-256, processing instructions, texture
sizes and runtime hashes are in `public/assets/environment/stones/`. Existing
terrain maps/materials, heightfields, camera function, Blue territory shader,
animations, gameplay and all workflows are protected by `verify-assets.py`.

## Publication

`publish.py COMMIT_SHA` builds the clean immutable source with both preview flags,
uses a separate Git index, stages only `solrahn-goal-018a/`, compares all 374 old
Pages blob/mode/path entries exactly and lease-protects the gh-pages push.
`publication.json` records deployed source and Pages commit SHAs. The preserved
branch heads and Pages object lists provide independently reviewable protection
proof. Production and every previous preview remain byte-for-byte intact.
