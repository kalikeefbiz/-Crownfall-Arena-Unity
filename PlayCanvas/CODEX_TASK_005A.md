# CODEX TASK 005A — Mobile Camera + Combat Control Ergonomics

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Context

Physical iPhone Safari playthrough of Task 005 passed at a high level.

User acceptance notes:

- the game now feels like Crownfall
- overall movement/combat feel is smoother than the previous two builds
- the behind-player camera direction is correct and must remain
- the scoreboard/results correction is accepted
- AI is currently overpowered, but balance is intentionally deferred
- ability buttons are too small in landscape and make aiming harder
- camera should be roughly 20% farther out
- camera should show more battlefield ahead and feel less top-down

This is a focused ergonomics correction before Wilderness work. Do not rebalance combat or bot difficulty.

## Goal

Improve physical mobile readability and aiming without changing Crownfall rules, combat values, territory, CP, lifecycle, bot logic, or camera heading.

## Camera

Current accepted camera:

- fixed behind Blue in positive world Z
- follows the human
- current offset: `y=15, z=12.5865`
- current look target is directly at the human ground position

Preserve:

- behind-player orientation
- fixed heading
- follow smoothing
- user-controlled Summoner tracking
- existing world/reference coordinate transform

Change the competitive camera to approximately:

- 20% greater camera-to-player distance
- lower apparent top-down pitch
- more forward battlefield visibility

Use explicit tunable constants rather than unexplained literals.

Recommended starting target:

- camera offset approximately `y=15.5, z=18`
- forward look-ahead approximately 3.5–4.5 world units toward Blue's forward direction (-Z)

This yields roughly a 20% distance increase while making the view more forward-looking.

Do not blindly force those exact values if they produce clipping or poor composition in automated viewport screenshots. Stay close to the requested intent:

- ~20% farther
- clearly less top-down
- visibly more space ahead of the player than behind

Do not rotate the camera laterally.
Do not switch to free rotation.
Do not make the camera follow aim/facing.

Keep debug/training camera behavior compatible, but the physical acceptance target is the normal competitive match.

## Mobile ability controls

On iPhone landscape, the current max-height media rule reduces normal ability buttons to 61×61 and Basic to 76×76. This is too small for comfortable aiming.

Increase landscape competitive touch targets approximately 15–20%.

Target range:

- normal ability buttons: ~70–74 CSS px
- Basic: ~86–90 CSS px
- stance/special control should also receive a modest touch-target increase if needed

Preserve:

- current visual ordering
- Basic remains largest
- safe-area handling
- no overlap with movement joystick
- no overlap with scoreboard/team HUD
- no overlap with combat feedback
- touch-action behavior
- pointer capture
- cancellation semantics
- Riven release-to-cast behavior
- Kit/Set held-repeat behavior

Do not change combat ranges or aim vectors to compensate for UI sizing.

If necessary, adjust:

- ability-bar gap
- right/bottom offsets
- combat-feedback vertical position

to keep the enlarged controls clear on common iPhone landscape dimensions.

## Tests

Add/update regression coverage for:

- competitive camera remains behind the human
- camera distance is approximately 20% greater than Task 005 baseline
- camera look target is biased forward, not directly centered under the player
- camera still follows the human smoothly
- normal landscape ability buttons meet the enlarged minimum dimensions
- Basic remains larger than other actions
- ability bar remains inside viewport + safe-area bounds
- ability bar does not overlap movement joystick
- ability bar does not overlap scoreboard/team status
- Task 002A touch combat still passes
- Riven release semantics still pass
- territory/frontier/CP tests remain passing
- full 3v3 match tests remain passing

Use the existing iPhone-style 844×390 browser context and any existing smaller landscape coverage.

## Explicitly do not change

- AI difficulty or decision policy
- damage
- health
- cooldowns
- ranges
- territory algorithm
- CP rate/grace
- tickets/final lives
- regulation
- Wilderness
- networking
- production art

## Validation

Run:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run fmt`
- `npm run build`
- full browser test suite

Commit to `playcanvas-port` and trigger the existing `/playcanvas/` deployment.

## Completion report

Report:

1. final camera constants
2. old vs new camera distance/pitch/look-ahead
3. final landscape button sizes
4. viewport overlap checks
5. unit/browser test counts
6. typecheck/lint/format/build results
7. final commit SHA
8. deployed preview URL
9. anything still requiring physical iPhone acceptance
