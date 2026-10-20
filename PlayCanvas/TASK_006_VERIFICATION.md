# Goal 006 — total control, Wilderness and integrated match verification

Baseline: `43a073efc4a2fec51e8f244a8523cab1a179a202`, branch `playcanvas-port`.
Frozen source: `kalikeefbiz/Crownfall-Browser-V21-Reference` at
`35082348aef27ad4eaed436e369a290ce7bf6c57` (original V21
`5a73918bf4cd56cd54bdc98ba2a9929f4d347753`). Read the migration contract,
reference list, combat parity, Task 005 verification, Tasks 005A/005B/006 and
Goal 006. No Unity files or combat definition values changed.

## Phase A — root cause and correction

`CrownfallRules.measure()` previously inset the front from both endpoints whenever
both teams had a living lane actor. It prevented even an ordered formation midpoint
at/past the goal from reaching exact control 0/1. `step()` already resolved exact
endpoints immediately; the measurement made those values unreachable.

The inset now requires **both teams present and `b > r`**, the crossed-formation
branch. For normally ordered `b <= r`, the real midpoint can clamp to an endpoint.
No arbitrary spawn trigger, capture timer, CP or grace dependency was introduced.
The crossed prior-front clamp remains intact; single-team and empty-lane behavior
remain unchanged. Four pure-rule cases cover exact/past-goal Blue/Red wins, and
another covers both crossed extremes. Production browser fixtures cover both
living formations, zero CP, exact HUD percentages, actual goal frontier and
immediate results, plus a crossed runner that cannot win.

Before Wilderness integration, 140 unit tests, the three new production total-control
browser tests, typecheck/lint and build passed. The initial retained browser run
later hit its 60s wall-clock budget during repeated real lifecycle button clicks;
its assertions were retained, with a 120s budget for software WebGL. Final full-suite
results below supersede that exploratory run. Formatting-only normalization of
provided Goal/Task Markdown makes the repository formatting check pass.

## Phase B — authority and coordinates

`wilderness-data.js` preserves V21 parameters/sites and transforms authored positions
through `referenceToWorld`. No camp ownership is inferred from A/B suffixes.

| Neutral site | World X | World Z |
| ------------ | ------: | ------: |
| Mobility A   |     -22 |      22 |
| Mobility B   |     -22 |     -22 |
| Cooldown A   |      24 |      18 |
| Cooldown B   |      24 |     -18 |
| Defense A    |     -27 |       7 |
| Defense B    |     -27 |      -7 |
| Major Damage |      26 |       0 |

The two tagged strips are centered at world `(−22,0)` / `(22,0)`, each 20×68.
Kit's existing Inner Flame reads these regions for exactly +5% movement while inside.
Regions and camps do not modify the front or CP. Tests physically traverse both
lane edges, return to eligibility and route from ordinary spawn to all seven homes.

`wilderness.js` adapts the source authority: neutral combatants, last-hit attribution,
850/5200 HP, 42/110 attack damage, one-second attacks, aggro 9, leash 12, speed 3.8,
reach 2.3/3.2, normal collision/status checks, no protected/dead/eliminated targets,

> 2s no-target reset/full heal and 45/100s camp respawn. Respawn restores home,
> health and rewardable state. Dead camps cannot attack.

Minor rewards last 20s: +20% speed, 20% skill CDR, or 20% mitigation. Same-type
modifiers replace rather than multiply duplicates. Basic, stance and ultimate
cooldowns are excluded. Set's full Predatory cooldown is reduced on leap resolution.
Defense and Set aura compose normally on actual neutral incoming damage.

Major securing gives the living securing team +25% outgoing damage for one fixed
25s team window, excluding enemies. Death clears modifiers; returning teammates
receive only the authoritative remaining duration. Eliminated actors receive no
new active modifier. Rematch constructs fresh camps, team windows and assignments.
Neutral damage in either direction grants no Ultimate Meter; Summoner-only abilities
exclude monsters. Camp rewards bypass participant damage/K/D/A/assist accounting.

Prototype presentation provides lateral tints, neutral camp bodies/health bars,
projected type/HP or respawn labels, a larger gold major, securing feed and compact
local buff names/remaining time. Existing territory and controls remain readable.

## Bot assignments and physical execution

The coordinator ports source policy, rather than replacing the existing bot:

- First minor eligibility Blue 14s / Red 20s, 24s interval and timeout.
- First major eligibility Blue 48s / Red 55s, +50s next eligibility, 36s timeout.
- Three living teammates, ≥35% control, candidates above 55% health; human never
  automatically assigned. Major additionally needs ≥45%, all three in lane before
  assignment and at least two bots. One real lane teammate remains.
- At most one minor assignment per team, selecting live nearby unowned reward types.
  Major may assign two bots. Invalid/dead/expired assignments clear, and unsafe
  team state cancels rotations. Nearby valid lane enemies within 5 can supersede
  objective focus, as in V21.
- Assignment only: no teleport, direct camp damage, reward grants, front/CP edits or
  ticket/life edits. Existing sampled aim, cooldown/cast gates, combat cadence and
  visibility-graph routing physically execute commands.

Dedicated unit and production-browser tests observe actual travel outside the lane
and actual camp damage transactions. A pure coordinator test snapshots entities,
camps and rules and proves no mutations beyond assignment/schedule bookkeeping.

## Phases C/D — integration evidence

`tests/full-loop.test.js` contains five tests covering **seven complete simulations**:
three ordinary no-fixture matches with selected Kit, Set and Riven; two coordinated
major-opening fixtures with selected Set and Riven; a full ordinary-accounting points
match; and a full 300s neutral regulation draw. All use the normal match authority.

Ordinary matches start with default health/tickets/countdown and all five production
bots. A deterministic command pilot drives the local slot without automated
Wilderness assignments. They verify finite actor/camp geometry, real combat, deaths,
ticket spending, respawns, personal final lives, front changes, CP, rotations, minor
fights, major attempts, valid results and six participant rows. Minor rewards are
asserted across the ordinary set, not guaranteed in every match.

The major fixtures begin at the actual 48s eligibility clock with separated,
full-health actors. They do not inject assignments, monster damage, rewards or
changed policy. The normal coordinator sends a pair, ordinary combat secures the
full-health major, and the simulation continues to an existing match result. A
separate solo/duo fight verifies that the source major is materially riskier/slower
alone. Freeze and fresh playable rematch assertions include camp/reward state.

Retained rule/lifecycle tests exercise tickets/elimination and reservation,
total-control before other outcomes, points, regulation by CP, regulation by
territory for both sides, regulation draw, retained CP and post-result freeze.
Minor death cleanup, fixed major expiry/resume, aura mitigation, no neutral Ultimate,
all-target filtering and all-six results remain integrated.

The production suite retains an **ordinary no-fixture complete playable match**:
normal selection/countdown, keyboard movement/Basic damage, five command bots,
natural result, all six rows, freeze, restart and active rematch. The final
production rerun ended naturally with Red winning by total control at **52.8s**:
CP **40 / 310**, territory **0% / 100%**, tickets **7 / 10**. An earlier integrated
production run also ended naturally on points at **120.0s**, CP **44 / 1000**,
territory **5.6% / 94.4%**, tickets **2 / 3**. The human dealt
150 Summoner damage; all five bots dealt damage and died. The complete result
screenshot was visually inspected. Wilderness browser
checks additionally exercise real captured touch into both sides and back, touch
camp securing for all reward types, incoming monster damage, buff/feed/respawn
presentation and expiry, ordinary bot travel, and all four active buff indicators
at existing landscape sizes including safe-area simulation. Task 002A touch damage,
Riven release/cancellation, Kit/Set held repeat, lifecycle, Crownfall and Task 005A
camera/control suites are retained.

Verification-only browser fixtures are opt-in `?verify=1`. Camp fixtures wound through
the normal damage boundary; the real touch Solar Ring supplies the securing hit.
`all-buffs` grants through authoritative camp deaths only to stress the widest HUD.
The rotation fixture retains ordinary bots at separated spawn positions. Bounded
advance runs every 60Hz tick; it does not skip monster/combat/lifecycle logic.
Normal play exposes snapshots only. `?debug=1` preserves legacy lifecycle geometry.

## Validation

Final validation: Node 24.19.0, system Chromium, production Vite preview.

| Check                                                  | Result                                               |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `npm test`                                             | **165 passed, 14 files**, zero failures              |
| `npm run typecheck`                                    | Passed                                               |
| `npm run lint`                                         | Passed                                               |
| `npm run fmt`                                          | Passed                                               |
| `git diff --check`                                     | Passed                                               |
| `npm run build`                                        | Passed; existing large-chunk advisory only           |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | **57 passed**, zero failures (full production suite) |

Camera offset Y15.5/Z18, look-ahead 4, follow rate 9, fixed behind-Blue heading,
landscape 72px skills / 88px Basic / 72×52px stance are unchanged. Input command,
release/repeat and cancellation implementation files are unchanged. All changed
tracked files are under `PlayCanvas/`; Unity is untouched.

Pushing the implementation commit to `playcanvas-port` triggers the existing
`publish-crownfall-playcanvas.yml` workflow, publishing to
<https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>. The delivery
message records the final SHA and observed deployment status.

## Phase E and remaining acceptance

Read-only source audit: [TASK_006_PARITY_AUDIT.md](TASK_006_PARITY_AUDIT.md).
Remaining V21 flows include menu/pause/control-layout editing and the existing Kit
bot Expellant repertoire gap. Prototype rendering differs from authored V21 art;
networking, production art/audio and final AI/Summoner balance remain deferred.
No extra systems were implemented in response to audit findings. The integrated
browser pass found a maximum-buff-row wrapping issue only at the two smallest
safe-area targets. Explicit content width within safe-area bounds fixed it without
changing controls; the final tests include all four rewards plus Inner Flame and
assert both separation and absence of text overflow.

Physical iPhone Safari still needs Wilderness/camp/buff readability, touch aiming
and cancellation, simultaneous movement/combat, notch safe areas, orientation and
browser gestures, results scrolling, sustained GPU/frame pacing, thermal and memory
acceptance. Chromium/CDP tests do not establish those device outcomes. Accepted
camera/control design remains locked.
