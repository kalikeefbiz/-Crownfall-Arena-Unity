# Task 004 — playable 3v3 match integration

## Baseline and authority

Inspected baseline `f59e17963f2d513d51a1afe9cac186a6cf7e92d2`, Task 003's verification report, `match.js`, combat/movement/advanced/returning-weapon systems, Summoner definitions, presentation, controls and retained tests before integrating. Task 003 remains the sole authority for phase, countdown, damage/death records, tickets, final respawns, protection, viability, draw and result freeze. Kit, Set and Riven definitions/balance are unchanged. No Unity files changed.

## Player walkthrough

Open https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/ . Choose Kit, Set or Riven and press **Start match**. Movement and combat remain gated for the visible three-second countdown. **MATCH START · FIGHT!** announces active combat. One Blue human and five independent AI Summoners fight on opposing team spawns in the existing arena.

WASD/arrows or left touch pad move. Space Basic, Q/E/R skills, F stance/earned Blast; existing release-confirmed touch targeting and Riven semantics remain intact. Bots identify valid enemy actors, sample aim with reaction delays and error, navigate obstacle corners, pursue, strafe/retreat at low health, and submit normal basic/skill/ultimate/stance commands. Standard cooldown and combat gates apply. The match damage boundary explicitly rejects same-team sources in addition to existing target filtering.

The HUD shows both ticket counters, phase/time, all six actors' health/death/respawn/protection/final-life/KDA state, kill feed, player health/ultimate, victory/defeat/draw and **Restart match**. All actors have labels and transient cast feedback; all six projectile/effect pools render. Restart creates fresh simulations, bots, records, cooldowns, weapons and tickets, clears ability input and resets the step accumulator. It returns to prematch for another normal Start.

The **Debug** link opens `?debug=1`, preserving Task 002A training and Task 003's inert lifecycle diagnostic fixture. Retained browser tests explicitly open that mode; their gameplay assertions remain intact. No debug actions are needed in normal play.

## Automated validation

- `tests/playable-match.test.js`: six new integration cases. Countdown gates all actors and human commands; navigation routes around a real wall; target teams and protection are respected; friendly damage is rejected; three complete natural command-driven battles (each selected human) exercise all six actors, damage, deaths, repeated respawns, ticket exhaustion, final lives, permanent elimination, natural results, freeze and clean construction. A five-bot match also finishes with an idle human. No debug lethal damage or ticket/life assignments drive these battles.
- `tests/browser/playable.spec.ts`: production default startup, countdown gating under held movement/attack, actual human keyboard damage, all five bots' combat participation, natural terminal result without debug interaction, result freeze and clean restart/restart countdown. Mobile 844×390 and 390×844 checks verify HUD bounds and actual CDP joystick movement plus release-confirmed Riven input.
- Retained lifecycle tests cover exact ticket reservation boundaries, protection/cast semantics, assists, simultaneous draw, result freeze and reset. Retained production browser suites cover all three Summoners, actual touch damage, multitouch, cancellation, Riven release and obstacle collision.

Validation on 2026-10-19, Node 24.19.0 / system Chromium:

- `npm test`: **115 passed**, 11 files, zero failures (109 retained + 6 Task 004 cases).
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: **29 passed**, zero failures, 5.9 minutes (26 retained + 3 Task 004 cases). The default match completed naturally at 1:29 match time, displayed DEFEAT, froze correctly and restarted. All five bots dealt damage and died; human keyboard damage was also verified.
- `npm run typecheck`, `npm run lint`, `npm run fmt`, `git diff --check`: passed.
- `npm run build`: passed; existing large-bundle advisory only.
- Inspected desktop active-match/result and landscape prematch/active screenshots. Both mobile viewport tests checked HUD bounds and genuine touch movement/release.

Tested production bundle SHA-256:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `index.html`                | `0f643aa8f8fa68c4ca71d939d5e9f2c73a8fbd0d090f3137381b51982e6e6461` |
| `assets/index-C2P7KV5O.js`  | `a360ed487cd13eaecf9dcdf9fe27e54765197dd4efde645dd69575e45fb5e7d8` |
| `assets/index-lkmRS7nn.css` | `7e92a09d90f204c5cfb81dfda1df5d648cefe927de481e61b4882ae06ba81e77` |

Pushing to `playcanvas-port` triggers the existing `publish-crownfall-playcanvas.yml`; delivery verification compares all three public Pages files byte-for-byte against these tested files. The final delivery message records the published commit and workflow outcome.

## Remaining limits

This remains a local prototype match in the diagnostic arena with primitive art and no networking, territory, item system or new battlefield. Bots use deterministic seeded decisions and simple visibility-graph routes, not strategic teamwork or a general navmesh. They use standard kit actions and Riven stance changes; Kit's earned bonus Blast remains available to the human but is not selected by bots. No time-limit victory is added. A dead human's camera stays at its last position while team status/results continue. Floating damage numbers and detailed hit banners report the human's journal; bot projectiles and cast markers still render independently.

Physical iPhone Safari touch feel, notched safe areas, rotation, browser gestures and sustained device performance still require physical-device acceptance. Chromium mobile viewport/CDP coverage does not establish those results. Existing large-bundle build advisory remains.
