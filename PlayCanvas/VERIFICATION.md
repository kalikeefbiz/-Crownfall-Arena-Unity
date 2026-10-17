# Task 001 verification

Verified on 2026-10-17, Node 24.19.0, npm 11.9.0, Linux system Chromium.

| Check                                                | Result                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Official scaffold                                    | create-playcanvas 0.10.1, Engine + TypeScript + Vite                                          |
| npm test                                             | PASS: 13 non-rendering tests                                                                  |
| npm run typecheck                                    | PASS: application, tests and configuration                                                    |
| npm run lint                                         | PASS                                                                                          |
| npm run fmt                                          | PASS                                                                                          |
| npm run build                                        | PASS: static dist output                                                                      |
| CHROMIUM_PATH=/usr/bin/chromium npm run test:browser | PASS: 3 production-browser tests                                                              |
| Unity/reference preservation                         | PASS: all 218 tracked files outside PlayCanvas matched original Git blob hashes byte-for-byte |
| Contract/task preservation                           | PASS: both original Markdown files unchanged                                                  |

Browser checks cover a running 3D arena with no page exceptions, keyboard movement, independent aiming while moving, Left mirroring on the presentation child only, commit capture and lock, movement ownership afterward, idle facing persistence, viewport resize, obstruction collision, and simultaneous landscape mobile movement/aim plus touch release/cancellation. Desktop and mobile screenshots were generated and visually inspected. Screenshots and build output remain ignored generated artifacts.

The mobile release test initially supplied an incorrect CDP touch-end point list. Ending the touch sequence correctly and starting a fresh sequence for cancellation passed; the final complete suite passed after input capture cleanup.

The build reports Vite's advisory for the approximately 1.08 MB minified engine/application chunk (281 KB gzip). It succeeds. Chromium uses software WebGL in this environment, so its FPS is not a phone performance measurement.

Actual iPhone Safari hardware performance, physical touch feel and nonzero notch safe-area insets remain device QA, not an implementation blocker. No external deployment or account/service is needed to run the slice locally.

## Scope and acceptance

All twelve CODEX_TASK_001 deliverables are implemented. The Basic region is an independent targeting/pre-cast control with presentation confirmation; combat/dummy health belongs to a later task. The three reserved ability buttons are disabled. No Unity files, match loop, bots, Wilderness, networking, abilities or production art were changed or introduced.
