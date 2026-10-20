# Task 005A — Mobile camera and combat control ergonomics

Baseline: `2071540fb66d5627d9df8b439180e41868cc8179` on `playcanvas-port`.
Read Task 005A, the migration contract and Task 005 verification. This correction
changes competitive presentation and CSS touch-target dimensions. Crownfall rules,
territory/CP, results, lifecycle, combat values, input/capture/cancellation code,
Summoners and bot policy are preserved. Wilderness remains deferred.
`CODEX_TASK_005A.md` has whitespace-only Prettier changes for the full format check.

## Camera

Tunables are exported from `src/combat/match-space.js` and consumed by the scene:

| Property                              | Task 005 | Task 005A competitive |
| ------------------------------------- | -------- | --------------------- |
| Offset above followed human           | 15       | 15.5                  |
| Offset behind in world +Z             | 12.5865  | 18                    |
| Distance to human ground position     | 19.5811  | 23.7539 (+21.31%)     |
| Elevation from player ground position | 50.00°   | 40.73°                |
| Actual viewing pitch below horizontal | 50.00°   | 35.17°                |
| Look-ahead toward world -Z            | 0        | 4                     |
| Exponential follow rate               | 9        | 9                     |
| Vertical field of view                | 48°      | 48°                   |

`CAMERA_OFFSET = { y: 15.5, z: 18 }`, `CAMERA_LOOK_AHEAD = 4`, and
`CAMERA_FOLLOW_RATE = 9`. The camera follows the same smoothed human position;
the look target is `(follow.x, 0, follow.z - 4)`. Heading remains fixed behind Blue,
with no lateral rotation or response to aim/facing. The reference/world transform
is unchanged. Debug/training uses `TRAINING_CAMERA_OFFSET = { y: 15, z: 12.5865 }`
with zero look-ahead and the same follow smoothing.

The viewing pitch includes look-ahead: `atan2(15.5, 18 + 4)`. Distance is measured
to the followed human's ground position, as in the task baseline. Settled actual
browser-camera measurements verify these values; frame-by-frame samples verify
smooth convergence without snapping or overshooting for Kit, Set and Riven.
Competitive screenshots show the human below center with battlefield ahead and
readable lane/frontier/actor geometry. No near/far clipping changes were needed.

## Landscape controls and clearance

The competitive landscape rule applies at heights up to 500 CSS px:

| Control                             | Old dimensions | New dimensions         |
| ----------------------------------- | -------------- | ---------------------- |
| Normal ability / Kit's earned Blast | 61×61          | 72×72 CSS px (+18.03%) |
| Basic                               | 76×76          | 88×88 CSS px (+15.79%) |
| Riven stance                        | 64×48          | 72×52 CSS px           |
| Ability-bar gap                     | 9              | 8 CSS px               |
| Stance offset above bar bottom      | 86             | 98 CSS px              |

Ordering is unchanged and Basic remains largest. The bar retains
`right: max(18px, safe-right)`; landscape uses `bottom: 20px + safe-bottom`
to leave the bottom notice clear even with the home-indicator inset.
Combat feedback adds the bottom safe inset to its 112 px offset and caps width at
`min(320px, 42%)`, keeping long messages clear of the movement joystick and stance.
The redundant READY banner is hidden before Start Match in landscape, and the
prematch announcement receives a bounded width so it clears the start button.
Combat feedback becomes visible when the match starts. No aim vectors, combat
ranges or pointer handlers were changed.

Bounding-box checks cover 844×390 without insets and 844×390, 667×375 and 640×360
with simulated 44 px left/right and 21 px bottom safe insets. All three Summoners
are checked, including Riven's separate stance target and a layout-only fixture
showing Kit's normally earned fifth action. Basic, normal controls and stance fit
inside viewport/safe bounds; the bar and stance avoid the joystick, scoreboard,
team status and both READY and long HIT feedback. Pairwise HUD/control checks
pass, including the bottom notice and prematch start-button clearance. At the
tightest 640×360 fixture, the five-action bar retains 10 px clearance
from the joystick. The banner width correction also clears a long-message overlap
found during implementation. Existing portrait checks remain in the full suite.

## Validation

Run on 2026-10-20 using Node 24.19.0 and `/usr/bin/chromium` with software WebGL.

| Check                                                  | Result                                 |
| ------------------------------------------------------ | -------------------------------------- |
| `npm test`                                             | 135 passed, 12 files                   |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | 43 passed, zero failures, 6.7 minutes  |
| `npm run typecheck`                                    | Passed                                 |
| `npm run lint`                                         | Passed                                 |
| `npm run fmt`                                          | Passed                                 |
| `git diff --check`                                     | Passed                                 |
| `npm run build`                                        | Passed; existing large-bundle advisory |

The new browser coverage verifies camera geometry and smooth following for every
Summoner, actual competitive Kit/Set held-repeat damage, Riven hold-without-cast
then release-to-cast damage, fixed heading while aiming, and landscape clearance.
The retained full suite covers Task 002A genuine touch/capture/cancellation,
Riven release semantics, territory/frontier/grace/CP, all six result rows, full
natural 3v3 play, lifecycle, restart and portrait compatibility.

Tested production bundle SHA-256:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `index.html`                | `8768cc9ea708877b53dd63289bf7fbd95ddffbdaa1ef07c2442172c31351c4dc` |
| `assets/index-DBendI_g.css` | `051f5930a76e210f369d30be919f9b962ea27fed1669f0586e2dc846cca6126a` |
| `assets/index-CQK8zmaH.js`  | `632f254125176e5b695f73b7bc1c690aa6c10f85fe9fa3f1363c319d1c951bea` |

Pushing to `playcanvas-port` triggers the existing
`publish-crownfall-playcanvas.yml` workflow. Preview:
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>. Final delivery
records the commit, workflow status and deployed production asset verification.

## Physical acceptance

Physical iPhone Safari acceptance remains necessary for the farther camera's
composition/readability, thumb reach and drag aiming with larger controls, real
notch/home-indicator safe areas, orientation changes and sustained performance.
Chromium/CDP touch and simulated safe insets do not establish device acceptance.
