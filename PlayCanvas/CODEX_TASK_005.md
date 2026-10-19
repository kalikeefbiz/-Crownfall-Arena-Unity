# CODEX TASK 005 — Territory, Crownfall Points, Win Conditions, and Full Results

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Read first

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/TASK_004_VERIFICATION.md`

Authoritative frozen reference:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

Inspect at minimum:

- `src/match-data.js`
- `src/crownfall-rules.js`
- `src/match.js`
- `src/match-bots.js`
- `tests/match.test.js`
- current PlayCanvas `src/combat/match.js`
- current PlayCanvas `src/combat/bot-controller.js`
- current PlayCanvas HUD/presentation files

Use current preserved Version 21 source/tests to resolve edge cases.

## User acceptance notes from physical iPhone test

The current Task 004 build was physically tested on iPhone Safari.

Accepted:

- actual 3v3 match start and end state works
- combat works
- camera follows the user-controlled Summoner from behind
- this camera direction is the preferred presentation and must be preserved
- the current playable loop is worth keeping

Problems / missing systems:

- results currently show only the human player's final K/D/A in the result detail
- end-game results must show ALL SIX participants, not only the local human
- current prototype uses AI for five actors, but future multiplayer is the goal; results/state architecture must be participant-based, not human-only or AI-specific
- there is currently NO territory/control system
- there is currently NO Crownfall Points system

Do not discard the working Task 004 combat/bot/camera implementation. Extend it.

## Goal

Port the authoritative Crownfall territorial rules and complete Version 21 match victory logic into the current playable 3v3 PlayCanvas build.

After this task, a normal match must be capable of ending through:

1. total territorial control
2. 1,000 Crownfall Points
3. permanent team elimination/tickets
4. regulation resolution

This is the system that makes Crownfall Crownfall.

## Critical identity

Crownfall Arena is:

- mobile-first 3v3 territorial combat
- ONE Crownfall Lane
- Wilderness on the two lateral sides of the lane
- no towers
- no minion waves
- no Nexus/base destruction
- no Crown Core
- no kill-only scoring system

Do not invent MOBA lane mechanics.

## Coordinate adaptation — preserve the accepted camera

Version 21 reference coordinates use:

- X = territorial axis
- Z = lateral/Wilderness axis
- Blue starts at negative X and pushes toward positive X
- Red starts at positive X and pushes toward negative X

The current PlayCanvas build has the accepted behind-the-player camera with Blue advancing from positive world Z toward negative world Z.

Preserve that camera orientation.

Use an explicit documented coordinate transform for match-space reference data:

- reference territorial X -> PlayCanvas world Z with sign inversion
- reference lateral Z -> PlayCanvas world X

Equivalent helper concept:

- `world.x = reference.z`
- `world.z = -reference.x`

Therefore:

- Blue reference spawn X = -30 -> PlayCanvas world Z = +30
- Red reference spawn X = +30 -> PlayCanvas world Z = -30
- reference lane half-width |Z| <= 12 -> PlayCanvas world |X| <= 12
- reference Blue goal X = -28 -> PlayCanvas world Z = +28
- reference Red goal X = +28 -> PlayCanvas world Z = -28

Do NOT rotate the accepted camera simply to preserve the browser's coordinate labels.
Preserve behavior, not arbitrary axis naming.

Add a small well-tested transform/helper instead of scattering sign swaps throughout match code.

## Authoritative match geometry

Port the Version 21 competitive match dimensions and authored collision layout from `MATCH_MAP`, `MATCH_LANE`, and `ARENA_LAYOUT`.

Reference values:

- map: 68 × 64 reference units
- territorial endpoints: -28 / +28
- lane half-width: 12
- team spawn territorial position: ±30
- spawn lateral offsets: 0, -8, +8

Transform these consistently into PlayCanvas world coordinates using the accepted-camera mapping above.

Port the current authored M7 match walls/low islands/shelves into the playable match space as simple debug-quality 3D geometry/collision.

Do not perform a production environment art pass.

The Task 002A debug sandbox may retain its existing diagnostic geometry. This task concerns the normal playable match.

## Authoritative territory/front system

Create/port a pure testable `CrownfallRules`-style authority rather than embedding territory arithmetic in HUD or bot code.

At match start:

- control = 50/50
- authoritative front = neutral

Eligible lane presence:

- actor must be alive
- actor must NOT be respawn-reserved
- actor must be physically inside the Crownfall Lane
- Wilderness/lateral actors do not directly push the front

Use transformed world coordinates but reproduce the Version 21 algorithm exactly.

Reference algorithm semantics:

- Blue forward-most eligible Summoner and Red forward-most eligible Summoner determine the front
- with both teams present and not crossed: front is their midpoint
- when their forward positions cross: preserve/clamp the prior front between those forward positions; do NOT award the whole lane automatically
- with only Blue lane presence: Blue can advance from neutral toward Red goal
- with only Red lane presence: Red can advance from neutral toward Blue goal
- with neither side present: front returns to neutral
- while both teams are present, clamp just inside total-control endpoints
- dead/reserved/Wilderness actors contribute no pressure

Do NOT replace this with:

- capture points
- occupancy percentages
- kill pressure
- a generic contested flag

The front is a POSITION.

## Total-control victory

If Blue pushes the authoritative front to its opponent territorial endpoint:

- Blue wins immediately
- reason: `total-control`

If Red reaches the opposite endpoint:

- Red wins immediately
- reason: `total-control`

There is NO grace period for total territorial victory.
There is NO CP requirement for total territorial victory.

## Crownfall Points

Port Version 21 scoring exactly:

- control > 50% gives Blue pressure
- control < 50% gives Red pressure
- exactly 50% is neutral
- when controlling side changes or control becomes neutral, pressure age resets
- sustained forward control requires 2 seconds grace before CP accrues
- after grace, controlling team gains 12 CP/second
- current depth bonus = 0
- previously earned CP is retained when pressure changes
- CP clamps at 1,000
- 1,000 CP immediately wins
- result reason: `points`

Important:

- losing some forward territory while remaining above 50% does NOT stop Blue scoring
- same for Red below 50%
- only returning to neutral or changing controlling side resets the grace/pressure clock

## Existing ticket/elimination victory

Preserve the accepted Task 003/004 ticket/final-respawn system:

- 15 shared tickets
- normal respawns while tickets remain
- last shared-ticket death remains ticket-funded
- one personal final respawn per Summoner after shared tickets are gone
- permanent elimination after that
- team loses only when no actor is alive or respawn-reserved

Result reason remains:

- `tickets`

Do not regress lifecycle behavior.

## Victory resolution order

Port the Version 21 order:

1. total territorial control
2. team viability / permanent elimination
3. Crownfall Points threshold
4. regulation resolution

Once a result exists:

- freeze authoritative progression
- preserve result
- do not continue CP/front/tickets/timer mutation

## Regulation

Active regulation:

- 300 seconds

At regulation end, if no prior result:

1. higher CP wins
2. if CP tied, higher current territory/control wins
3. if both tied, draw

Result reason:

- `regulation`

No overtime or sudden death.

Display regulation as a countdown or clearly understandable remaining-time presentation in the normal match HUD.

## Territory presentation

Add debug-quality but readable territory presentation to the playable match.

Required:

- visible Crownfall Lane boundaries
- visible authoritative front/frontier in-world
- clear Blue-controlled and Red-controlled portions of the lane
- territory/control percentage in HUD
- Blue and Red CP in HUD
- pressure state:
    - neutral
    - Blue pressure
    - Red pressure
    - scoring after grace
- visible grace progress/countdown when useful
- frontier movement must come from authoritative rule state only

Keep terrain visible under any territory tint.
Do not make the world unreadable with opaque fills.

Do not create production art.

## Match HUD

Normal playable HUD must surface, without debug mode:

- Blue territory %
- Red territory %
- Blue CP / 1000
- Red CP / 1000
- Blue tickets
- Red tickets
- regulation remaining
- current pressure/scoring state

Keep mobile landscape readability.

Do not remove the accepted behind-player camera or combat HUD.

## Full end-game results — required multiplayer-friendly correction

The current results summary only surfaces the local human's final K/D/A. Replace this with a complete six-participant results model and screen.

Results must list ALL SIX Summoners:

- Blue Kit / Set / Riven
- Red Kit / Set / Riven

For every participant show at minimum:

- team
- Summoner name
- K
- D
- A
- damage dealt
- pressure time / lane scoring participation metric already represented by Version 21 `pressureSeconds`

Also show match-level result:

- winner/draw
- victory reason:
    - total control
    - Crownfall Points
    - elimination/tickets
    - regulation
- final territory %
- final CP
- final tickets
- duration

Architecture requirement for multiplayer:

- result data must be participant-based
- do not derive result rows from `human`
- do not assume exactly one human in the result model
- AI/human controller type is metadata only, not the identity of a result row
- the same result structure must be usable later when all six actors are network-controlled players

The prototype UI may mark the local actor as `YOU`, but it must not hide or downgrade other participants.

## Pressure participation record

Restore/port Version 21 `pressureSeconds` per actor:

- increment while alive, eligible, inside the Crownfall Lane, and on the currently scoring team
- do not increment merely because the team has historical CP
- preserve as a match statistic
- include it in final results

Do not invent a new score formula in this task.

## Bots

Five bots already exist and passed Task 004.

Do not remove them.

For this task:

- they must operate correctly on the transformed full match geometry
- they must use ordinary combat/movement commands
- their positions must naturally participate in lane control when inside the lane
- do not let bot code directly modify territory/front/CP

Do not implement Wilderness rotations yet.
Do not add new strategic bot teamwork beyond what is necessary to remain functional on the expanded map.

Their movement/combat can naturally affect territory through authoritative actor positions.

## Camera — locked acceptance item

Physical iPhone feedback explicitly accepts the current camera:

- follows the user-controlled Summoner
- from behind
- this is the preferred direction

Do not redesign or rotate the camera in this task.

Adapt match coordinates/geometry around the accepted camera as specified above.

Add regression coverage so future parity work does not casually revert the camera orientation.

## Tests

Port/adapt authoritative territory/scoring tests from browser `tests/match.test.js`.

At minimum prove:

- match starts exactly 50/50
- actor positions change territory without requiring damage/kills
- approaching/crossing defenders follows authoritative front-clamp behavior
- 2-second scoring grace works including fractional tick accounting
- losing territory from e.g. 76% to 55% retains Blue scoring
- neutral 50% stops scoring immediately
- opposite team requires fresh grace
- Wilderness/lateral actors do not contribute lane pressure
- empty lane returns to neutral
- uncontested advance can reach total-control victory
- total control wins immediately with zero CP if appropriate
- CP retains previously earned progress
- CP clamps to 1000 and wins
- total-control / tickets / points / regulation resolution order is preserved
- 300-second regulation resolves CP first, then territory, then draw
- result freezes future progression
- lifecycle/tickets/final-respawn tests remain passing
- all six result rows are generated from participant records, not the local human
- `pressureSeconds` accrues only under correct scoring conditions
- coordinate-transform tests prove canonical reference positions map correctly into PlayCanvas world space
- accepted camera relationship/orientation remains unchanged

## Browser/device tests

Add production-browser tests that prove:

- normal playable match shows territory + CP HUD
- moving actors changes displayed control/front
- frontier visual follows authoritative state
- CP begins only after grace
- natural playable 3v3 match can end through at least one authoritative Crownfall condition
- controlled deterministic setup can validate total-control and points results without waiting several minutes
- full result screen contains all six participants
- both Blue and Red participant rows are present
- result includes victory reason and final territory/CP/tickets
- restart clears territory, CP, results and participant records
- real touch combat still works after full-match geometry conversion
- iPhone-style landscape viewport has no critical HUD overlap

Do not make browser tests depend only on mouse input.

## Explicitly out of scope

Do NOT implement yet:

- Wilderness camps
- major Wilderness objective
- Wilderness rewards
- Wilderness bot rotations
- production networking
- matchmaking
- server authority
- production environment art
- new character art
- audio polish
- final combat balancing

Multiplayer is the end goal, but this task prepares participant/result architecture; it does not implement networking.

## Validation

Run and fix:

- unit/non-rendering tests
- typecheck
- lint
- formatting
- production build
- full production-browser suite

Retain all Task 002A touch-combat and Task 003/004 lifecycle/playable-match regression tests.

## Finish criteria

Do not stop after drawing a territory bar.

Finish only when:

- authoritative territory/front logic works
- CP/grace logic works
- total-control victory works
- points victory works
- ticket victory still works
- regulation works
- full six-player results work
- pressureSeconds work
- transformed full match geometry works with existing bots
- accepted camera is preserved
- touch combat remains functional
- all tests/typecheck/lint/format/build/browser suite pass
- implementation is committed to `playcanvas-port`
- existing `/playcanvas/` deployment is triggered

At completion report:

1. final commit SHA
2. files changed
3. exact reference files/tests used
4. coordinate transform used
5. unit test result/count
6. browser test result/count
7. typecheck/lint/format/build results
8. deployed preview URL
9. which victory conditions were automatically exercised
10. any remaining Version 21 differences
11. any physical iPhone behavior still requiring acceptance
