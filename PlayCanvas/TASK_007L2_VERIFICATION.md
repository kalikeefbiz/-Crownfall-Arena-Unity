# Goal 007L.2 — authoritative locomotion and release validation

Baseline: `9c1563bcfc7d4523a8ab35bf5a24b469c7811c46`.
Release revision: `4a61ca42b2f2f64b9d4cdc7fa019339fc3920060`.
Date: 2026-10-24 UTC.

## Root cause and focused correction

The failures were real one-frame presentation transitions, not legitimate stops.
`CommandStepper` advances movement at 60 Hz; rendering can occur without another
simulation tick. Both presenters compared positions against the preceding render,
interpreted unchanged positions as idle, and reset playback through an idle/run
transition. The existing CI traces show Riven at x=1.2 for Running then Idle_6,
and Set at x=16.6 for Running then Ready, before movement resumes. Horizontal hips
remain stable. See the retained [007L.1 evidence](TASK_007L1_VERIFICATION.md#ci-validated-artifact-and-publication).

`src/presentation/set-model.ts` and `src/presentation/riven-model.ts` now read
`player.animation === 'run'`, the existing authoritative movement result retained
between ticks. Release, collisions and stun produce idle through that authority;
Set's leap already explicitly produces run. Alive/phase gates, idle/Ready policies,
clip selection, playback, facing, grounding and hip correction remain unchanged.
No simulation, assets, HUD, browser assertions, timeouts, retries or workflows changed.

`tests/presenter-locomotion.test.ts` adds two small cases using the real simulation
and presenters. Both failed on the original source on a second render without a
tick. Both pass after correction, covering continuous running, release, stun,
solid-boundary collision, death and reselection. No browser or layout cases were added.

## Validation

| Check                                            | Local                            | GitHub Actions            |
| ------------------------------------------------ | -------------------------------- | ------------------------- |
| Clean lockfile installation                      | Passed                           | Passed                    |
| Focused Set/Riven browser tests                  | 19 passed (3.8 min)              | Included in full suite    |
| Unit tests                                       | 226 passed / 23 files            | 226 passed                |
| Typecheck / ESLint / Prettier / production build | Passed                           | Passed                    |
| Complete production browser suite                | 113 passed / 1 failed (34.5 min) | **114 passed (31.8 min)** |

Both complete runs executed all 114 discovered browser cases once, with zero
skipped tests or automatic retries. Both original animation cases passed locally
and in CI, preserving every continuous-Running, idle, playback and hip assertion.
No workflow rerun was requested.

The separate local failure was `playable.spec.ts:87`, the 844×390 normal-mobile
countdown poll: still countdown after 15 seconds, with 0.133333 seconds remaining
in its last sample. The natural match passed. This noncritical local timing budget
is recorded in the backlog; no timeout was increased or test rerun. Trace retained
at `/workspace/007l2-evidence/local-countdown-trace.zip`, SHA-256
`4c6ffd75bd1a1e46832d309ee003ae801575b790a444bf1a40f8cbf6a186c6a0`.
The GPU-free regression fixtures also emit two PlayCanvas application-context
diagnostics in CI; both pass, and the production suite supplies real-engine coverage.

## Exact validated artifact and live publication

[CI run 40077097908](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40077097908)
successfully validated and published the immutable release revision above. The
publisher downloaded [artifact 12554407777](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40077097908/artifacts/12554407777)
from that same run and verified its source SHA, file manifest and current branch
head before publishing, without rebuilding. Independently downloaded ZIP digest:
`7794ba4bc8bee60c58c9686f4c3179ebb758ba3086d5290d5f2aafc9a91df698`.
It matches GitHub's artifact digest and the publisher's downloaded digest.
Every artifact file matches the tested local build and published Git bytes.

Publication commit: `182ae008ccd31c7cbc4a6637e95151c3929ae885` on `gh-pages`.
GitHub Pages build `1310323524` completed successfully. Source remains
`playcanvas-port`; destination remains `/playcanvas/`. Every root entry outside
that directory has an identical Git hash, including Unity `Build/` and root HTML.
The live Unity HTML also matches its original Git blob.

The [live game](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/)
served HTML, JS, CSS and three GLBs matching the validated artifact. A real match
loaded six distinct visible, playing instances (two of each summoner), three
shared assets, advancing playback and zero browser errors. A subsequent
client-local roster fixture preserved all six instance IDs.

| Tested artifact = published Git = live HTTP | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `assets/index-D9Y8C38P.js`                  | `c54b9713c7d47386907fe3b5499a4655ed732081b952ce789097a0d3f28c90f7` |
| `assets/index-D-9p9G16.css`                 | `601081d02761817f1f1121214ead098bb099aea8a9a7519016ac1efc50b56421` |

Raw local results, artifact, publication comparisons and live checks are retained
in `/workspace/007l2-evidence/`, outside the repository. CI browser evidence is
available from the run above. No large evidence archive is committed.

## Completion

No remaining release blocker. Changed files: the two presenters, the small
regression test and this document. Noncritical local timing and fixture diagnostics
are recorded above. This maintenance sprint is closed; no further cleanup or
unrelated development was initiated.
