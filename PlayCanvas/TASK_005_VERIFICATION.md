# Task 005 — Crownfall territory, points, victory and participant results

## Authority and scope

Baseline: `1ce6c7b5ac16b35506b40fd9e5c9b8b3ad08e2c8` on `playcanvas-port`.
Read the migration contract, reference sources, combat parity report, Task 004
verification and Task 005 before implementation. Frozen reference checkout:
`kalikeefbiz/Crownfall-Browser-V21-Reference` at
`35082348aef27ad4eaed436e369a290ce7bf6c57`, preserving browser V21
`5a73918bf4cd56cd54bdc98ba2a9929f4d347753`.

Reference files used:

- `src/crownfall-rules.js`: positional measurement, crossing/front clamp, endpoint
  inset, grace/fractional accounting, retained CP, viability and resolution order.
- `src/match-data.js`: defaults, `MATCH_MAP`, `MATCH_LANE`, `ARENA_LAYOUT`, walls,
  goals, spawn positions and lateral offsets.
- `src/match.js`: authoritative orchestration and per-participant `pressureSeconds`.
- `src/match-bots.js`: command-only bot ownership boundary. Existing Task 004 bot
  behavior is retained, rather than porting Wilderness strategy.
- `tests/match.test.js`: eight original pure-rule cases adapted verbatim with their
  original training `LANE`; additional canonical-map and integration cases exercise
  the full competitive lane and production port.

No Unity, kit definitions, damage/range/cooldown values, networking or Wilderness
objectives were changed. `CODEX_TASK_005.md` has whitespace-only Prettier changes
so the repository-wide formatting check passes.

## Coordinates and camera

`src/combat/match-space.js` defines the reversible mapping:

```text
world.x = reference.z
world.z = -reference.x
reference.x = -world.z
reference.z = world.x
```

Reference 68×64 map becomes world width 64, depth 68. All ten collision islands
and shelves are transformed with dimensions swapped. Blue spawns at world Z +30,
Red at -30; lateral offsets are 0/-8/+8. Lane eligibility is world |X| <= 12;
territorial endpoints are world Z +28/-28. Rules operate in reference space via
one adapter over authoritative world positions.

The accepted camera follow, look-at and smoothing are retained: 15 units above
and 12.5865 units behind in positive world Z. Blue still advances toward negative
world Z. Unit and actual browser-camera relationship assertions protect this.

## Implementation and walkthrough

Open <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>. Select Kit,
Set or Riven, then Start match. Five existing bots submit ordinary combat and
movement commands on the expanded map. No bot owns front or CP.

The normal HUD shows both ticket counts, regulation remaining, both territory
percentages, both CP totals/1000, lane front, pressure team, remaining grace and
scoring state. Lane boundaries, translucent controlled portions and a gold
world-space frontier follow the rules state. Terrain remains visible.

`CrownfallRules` starts exactly neutral, measures only living, nonreserved lane
actors, preserves the crossing clamp and both-team endpoint inset, and returns
an empty lane to neutral. Grace is uninterrupted pressure, not advance velocity.
After two seconds the owner earns 12 CP/s, with exact fractional tick accounting;
losing depth without losing the controlling side preserves scoring. CP is retained
on neutralization/ownership change and capped at 1000.

Resolution order is total control, team viability, points, then 300-second
regulation (CP, territory, draw). Total control needs neither grace nor CP.
Ticket-funded last respawn, personal final life, protection and reserved viability
are retained. A result freezes simulation progression.

Results capture a participant-based final model from all actor records, independent
of the local human. All six rows show team, Summoner, K/D/A, damage and pressure
seconds; the summary shows winner/draw, reason, final territory/CP/tickets and
duration. Controller type is metadata only. Pressure participation follows V21's
per-tick scoring-team metric, excluding dead, reserved and lateral actors; its
boundary tick records the tick duration, as in the reference, while CP accounts
only the post-grace fraction.

Restart recreates authority, records, lives, bots, weapons, clocks and result state,
and clears input/step accumulation. `?debug=1` retains the original close-range
lifecycle diagnostic with a neutral territory adapter. Retained lifecycle and
legacy bot elimination tests explicitly select this fixture so positional CP does
not replace the elimination outcome those tests are intended to exercise. Three
additional natural canonical-map matches exercise the normal competitive setup.

## Automated evidence

- `tests/crownfall.test.js`: original V21 pure-rule examples plus canonical
  transforms/walls/spawns, exact neutral start, crossing and endpoint inset,
  eligibility, 76%→55% scoring, grace/neutral/ownership changes, priority, regulation
  tie breakers, points cap, result freeze, pressure records, six participant rows,
  reset and three complete canonical natural matches.
- Retained `tests/match.test.js` and `tests/playable-match.test.js` cover tickets,
  final lives, actual damage/assists/protection, routing, natural elimination and
  frozen results. All Task 002A combat/input tests remain.
- `tests/browser/territory.spec.ts`: production HUD, positional territory, actual
  world frontier, grace, retained CP, camera, deterministic total-control and points
  results, all six table rows, final metrics, freeze, restart and actual touch damage
  on the full map at 844×390. HUD bounding boxes and separation from joystick,
  ability controls and selector are checked.
- `tests/browser/playable.spec.ts`: ordinary player start, keyboard combat, natural
  five-bot match result, freeze and restart; mobile captured touch controls. The
  elimination assertion applies when tickets cause the result; all authoritative
  Crownfall outcomes are now valid. Retained sandbox and lifecycle browser suites
  remain part of the full run.

For deterministic production browser checks only, `?verify=1` exposes named
fixtures and bounded fixed-tick advancement under `__crownfall.verification`.
It is absent in ordinary play; ordinary inspection remains read-only. Fixtures
pause automatic progression, disable command bots, arrange authoritative actor
positions and, for the points threshold case, seed retained CP at 999. Victory,
scoring and results still execute through the normal match authority. Restart
restores normal progression and all five bots. The separate natural-match test
uses no verification fixture. Its compact 640×360 viewport keeps software WebGL
work bounded, with a longer wall-clock budget for the 60-unit opening separation;
separate 844×390 and portrait tests retain mobile viewport coverage.

The normal production-browser match ended naturally through **Crownfall Points**:
Red reached 1000 CP at **98.1 seconds**. The captured result showed Blue/Red
territory **20.6% / 79.4%**, CP **33 / 1000**, tickets **2 / 4**, and all six
participant rows. Human keyboard Basic damage was 150; every bot dealt damage
and died. Result freeze and a clean playable restart passed.

Validation on 2026-10-19, Node 24.19.0 and system Chromium:

| Check                                                  | Result                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `npm test`                                             | **134 passed**, 12 files, zero failures (115 retained + 19 added) |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | **33 passed**, zero failures, 6.9 minutes (29 retained + 4 added) |
| `npm run typecheck`                                    | Passed                                                            |
| `npm run lint`                                         | Passed                                                            |
| `npm run fmt`                                          | Passed                                                            |
| `git diff --check`                                     | Passed                                                            |
| `npm run build`                                        | Passed; existing large-bundle advisory only                       |

All four victory reasons were automatically exercised: total control and points
in production browser fixtures, natural points in the ordinary playable browser
match, tickets in retained lifecycle/browser coverage and natural legacy bot
matches, and regulation CP/territory/draw tie breakers in pure-rule tests. The
priority tests combine competing terminal conditions. Desktop total-control,
compact natural points results, and landscape touch/HUD screenshots were visually
inspected.

Tested production bundle SHA-256:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `index.html`                | `1bf18cc1f936968bcc2dd4cab8e5a202e403dcb9fee7cf017262c509435966fc` |
| `assets/index-Bc6MDKSv.css` | `55d11760db9e82940f311e41ca3c6f6f6172f55cd21f9dd39b1c2b943a881410` |
| `assets/index-CKBocOvJ.js`  | `bc9216217d29a5fbd5e7f51c2e61ee97b00d30b2e070650e2b3f78620794cec7` |

Pushing the implementation commit to `playcanvas-port` triggers the existing
`publish-crownfall-playcanvas.yml` workflow and publishes under `/playcanvas/`.
The final delivery message records the commit, workflow outcome and public bundle
checksum verification. No separate hosting or deployment mechanism is introduced.

## Changed files

All paths below are under `PlayCanvas/`:

- Authority/data: `src/combat/crownfall-rules.js`, `src/combat/match-data.js`,
  `src/combat/match-data.d.ts`, `src/combat/match-space.js`,
  `src/combat/match-space.d.ts`, `src/combat/match.js`, `src/combat/match.d.ts`.
- Runtime/presentation: `src/gameplay/simulation.ts`, `src/main.ts`,
  `src/presentation/scene.ts`, `src/ui/hud.ts`, `src/style.css`.
- Tests: `tests/crownfall.test.js`, `tests/match.test.js`,
  `tests/playable-match.test.js`, `tests/browser/territory.spec.ts`,
  `tests/browser/playable.spec.ts`.
- Documentation: `TASK_005_VERIFICATION.md`, `CODEX_TASK_005.md` (formatting only).

## Remaining V21 differences and physical acceptance

Within this task's normal-match scope the territorial algorithm, defaults, terminal
ordering and competitive geometry follow V21. Rendering uses PlayCanvas primitives,
not browser artwork/renderer internals. Existing Task 004 bots retain their local
combat/navigation policy; Wilderness camps, rotations, rewards and major objective
remain intentionally absent. Networking, matchmaking, production art, audio polish
and final balancing remain outside this task. Kit's earned Blast bot selection
limitation from Task 004 remains; the human can still use the ordinary grant.

Physical iPhone Safari acceptance is still required for the expanded battlefield,
frontier/tint/HUD readability, complete results scrolling, safe areas, orientation
changes, gestures, touch feel and sustained performance. Automated Chromium/CDP
touch coverage does not establish Safari/device acceptance. The accepted camera
has been preserved, not redesigned. The existing Vite large-bundle advisory remains.
