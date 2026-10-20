# CODEX TASK 005B — Natural Full-Territory Crownfall Victory Fix

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Context

Physical iPhone Safari playtest of Task 005A passed strongly:
- camera composition is accepted and should not change
- camera smoothing/follow behavior is accepted
- controls are improved
- match feels like Crownfall
- scoreboard/results are accepted
- AI balance remains intentionally deferred

One gameplay defect was found before Wilderness work:

The Red team pushed Blue completely back to Blue spawn and visually controlled essentially the full Crownfall Lane, but the match did NOT end immediately by total territorial control.

This must be corrected before Task 006 Wilderness is implemented.

## Verified root cause

Current `CrownfallRules.measure()` applies the endpoint inset whenever BOTH teams have eligible lane presence:

```js
if (b !== null && r !== null)
    this.front = Math.max(
        LANE.goalA + (LANE.goalB - LANE.goalA) / 1000,
        Math.min(LANE.goalB - (LANE.goalB - LANE.goalA) / 1000, this.front)
    );
```

That means as long as even one living defender is still standing in the lane, control is prevented from reaching exactly 0 or 1.

This preserves the old anti-backcap/crossing guard, but it also prevents the intended natural Crownfall condition where one team genuinely drives the opposing formation all the way behind its own territorial goal line/spawn.

The result trigger itself is present and correct:

```js
if (this.control >= 1) ...
if (this.control <= 0) ...
```

The problem is that normal live play is prevented from ever reaching those values while both teams remain alive in-lane.

## Goal

Allow genuine positional domination to reach 100% territory and immediately end the match, while preserving the anti-backcap behavior that prevents a single runner crossing through/behind an active defender from stealing the entire lane.

## Required rule behavior

Reference-space terminology remains:
- Blue forward-most eligible actor = `b = max(x)`
- Red forward-most eligible actor = `r = min(x)`
- Blue advances toward +X
- Red advances toward -X

### Normal ordered formations

When both teams are present and:

```text
b <= r
```

the front is the midpoint:

```text
front = (b + r) / 2
```

If that genuine midpoint reaches or passes an endpoint:
- clamp to the endpoint
- allow control to become exactly 0 or 1
- immediately resolve `total-control`

Examples that MUST win:
- Blue defenders forced to/behind reference X = -30 spawn while Red attackers advance far enough that their midpoint reaches reference goalA = -28 -> Red total-control victory
- mirrored case at goalB = +28 -> Blue total-control victory

No grace period.
No CP requirement.
Defenders do not have to be dead.
Tickets do not need to be exhausted.

### Crossed formations / anti-backcap

When:

```text
b > r
```

players have crossed.

Preserve the established prior-front clamp behavior:

```text
front = clamp(previousFront, r, b)
```

A runner crossing behind an active defender must NOT automatically drag the frontier to the endpoint or grant total control.

For this crossed case, keeping the front strictly inside endpoints while both sides remain present is acceptable and intended.

Do not let a backline runner bypass the territorial fight.

### Single-team lane presence

Preserve current behavior:
- only Blue present -> Blue can push from neutral to goalB
- only Red present -> Red can push from neutral to goalA
- no eligible lane actors -> neutral

### Lane eligibility

Do not change:
- living only
- not respawn-reserved
- physically inside the Crownfall Lane
- Wilderness/lateral actors exert no direct territory pressure

## Implementation guidance

Refactor `measure()` so endpoint protection is conditional on the CROSSED-position case rather than applied unconditionally whenever both teams exist.

Keep this logic pure and testable.

Do NOT implement an arbitrary "if enemy near spawn then win" special case.
Do NOT derive victory from visual territory fill.
Do NOT derive victory from kills.
Do NOT add a capture timer.

The authoritative FRONT must naturally be capable of reaching the goal endpoint when the positional midpoint genuinely warrants it.

## HUD/presentation

The normal HUD/frontier should display the authoritative result accurately.

If control is exact endpoint:
- display 100.0% / 0.0%
- world frontier sits at the actual goal line
- result immediately transitions to victory/defeat
- result reason is `total-control`

Do not change camera composition.

## Regression tests

Add pure-rule tests for BOTH directions:

1. Red pushes Blue back to/behind Blue spawn while formations remain normally ordered.
   - both teams alive
   - both teams still lane-eligible
   - midpoint reaches/passes goalA
   - control becomes exactly 0
   - Red immediately wins
   - reason `total-control`

2. Blue mirrored case.
   - control becomes exactly 1
   - Blue immediately wins
   - reason `total-control`

3. No CP or grace needed for either.

4. Preserve anti-backcap:
   - a runner crosses behind an active defender
   - crossed branch uses prior-front clamp
   - control remains strictly below 100%
   - no total-control result

5. Preserve existing:
   - neutral start
   - CP/grace
   - tickets/final lives
   - regulation
   - result freeze
   - transformed world/reference mapping
   - Wilderness remains absent for now

## Production-browser acceptance test

Add a deterministic normal-match verification fixture that reproduces the physical playtest scenario:

- Blue actors remain alive and lane-eligible near/behind Blue spawn
- Red actors advance sufficiently that the genuine formation midpoint reaches Blue's territorial goal
- verify the rendered HUD reaches exact 0.0% Blue / 100.0% Red
- verify immediate DEFEAT/result transition
- verify reason is Total control
- verify CP is NOT required to be 1000
- mirror for Blue if practical

Keep the existing crossed-runner browser/rule regression proving no backcap.

## Do not change

- Task 005A camera values or follow smoothing
- mobile ability sizes
- AI difficulty
- bot decision policy
- Summoner balance
- CP rate/grace
- tickets/lives
- regulation
- full participant results
- networking
- Wilderness systems

Task 006 has NOT been implemented yet. Do not start it as part of this correction.

## Validation

Run and fix:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run fmt`
- `npm run build`
- full production-browser suite

All retained Task 002A through Task 005A coverage must continue to pass.

## Finish criteria

Finish only when:
- genuine two-team positional domination can reach exact 100% territory
- immediate total-control victory occurs
- crossed-runner anti-backcap remains intact
- physical-playtest scenario has automated coverage
- camera/controls remain unchanged
- all tests/checks/build pass
- result is committed to `playcanvas-port`
- existing `/playcanvas/` deployment is triggered

At completion report:
1. exact root cause
2. exact rules change
3. new natural full-control scenarios tested
4. anti-backcap regression result
5. unit/browser test counts
6. typecheck/lint/format/build results
7. final commit SHA
8. deployed preview URL
9. anything still requiring physical iPhone acceptance
