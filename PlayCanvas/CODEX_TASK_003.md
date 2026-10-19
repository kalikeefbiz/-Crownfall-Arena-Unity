# CODEX TASK 003 — Crownfall 3v3 Match Lifecycle Parity Block

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Read first

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/CODEX_TASK_002A.md`

Authoritative browser reference:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

Inspect at minimum:

- `src/match.js`
- `src/crownfall-rules.js`
- `src/match-data.js`
- `src/combat.js`
- `src/combat-core.js`
- `src/summoners.js`
- `tests/match.test.js`

Use source/tests to settle edge cases. Do not redesign proven match rules.

## Goal

Port the Version 21 3v3 match lifecycle into PlayCanvas as one bounded parity block.

This task adds:

- two 3-Summoner teams
- match phases
- countdown
- shared tickets
- respawns
- final personal respawn
- permanent elimination
- respawn protection
- match-end viability rules
- K/D/A + damage records
- clean rematch/reset lifecycle

This task does NOT yet add territory scoring, Crownfall Points, Wilderness, or bots.

The result should be a real 3v3 lifecycle sandbox built on top of the accepted Task 002/002A combat system.

## Core match setup

Create six actual combat actors:

- Blue: Kit, Set, Riven
- Red: Kit, Set, Riven

The selected human-controlled Summoner belongs to Blue.
For this task, non-human actors may be stationary/inert lifecycle participants controlled only by diagnostic/debug actions.

Do NOT implement bot AI yet.

Each actor must:

- own an independent combat simulation/state
- target the other five Summoners correctly
- preserve team filtering/friendly-fire rules
- have a unique actor/entity ID
- carry its own cooldown/status/ultimate/weapon state
- expose lifecycle state independently from presentation

Full-match health uses the authoritative 1.3 durability multiplier:

- Kit: 845
- Set: 1625
- Riven: 910

Base movement speed remains 6.
Collision radius remains 0.45.

## Match phases

Implement:

1. prematch
2. countdown
3. active
4. results

Countdown:

- 3 seconds
- gameplay input/combat inert until active
- countdown reaches zero cleanly without negative drift

Once a result exists:

- match progression freezes
- no further combat, respawn, score, or state mutation should occur except UI/navigation/reset

## Shared tickets and respawn rules

Each team starts with 15 shared tickets.

Authoritative defeat sequence:

- while team tickets > 0:
    - death consumes exactly one ticket
    - reserve a normal respawn
- the death that consumes the LAST shared ticket is still ticket-funded
- that death does NOT also consume the Summoner's personal final respawn
- once team tickets are 0:
    - each Summoner may consume exactly one personal final respawn
- after that Summoner has consumed its personal final respawn:
    - its next death permanently eliminates it

Per-Summoner fields/state must make this explicit:

- `finalRespawnAvailable`
- `respawnReserved`
- `respawnAt`
- `eliminated`

Respawn:

- 3 seconds
- return to authored team spawn
- restore health to max
- clear death-only transient action state
- reset temporary action state as Version 21 requires
- restore Riven weapon/orbit state correctly
- reset stance to initial stance as reference requires
- ordinary movement/casting remain disabled while dead/reserved

## Respawn protection

After respawn:

- 2 seconds protection
- protected actor cannot take combat damage
- protected actor is excluded from valid hostile targeting where reference requires
- offensive casts break protection
- buff and stance actions do NOT break protection

Preserve exact source behavior from `match.js`.

Add clear temporary debug presentation so protection can be seen on device.

## Team viability and terminal elimination

A team remains viable if at least one Summoner is:

- alive, OR
- dead with a reserved respawn

A team loses only when all three Summoners are permanently eliminated with no reserved respawn.

If both teams become non-viable in the same terminal evaluation:

- result is a draw

Match result reason for this block:

- `tickets`

Do not add territory/CP victory conditions yet.

## Records

Track per actor:

- kills
- deaths
- assists
- damage dealt

Assist window:

- preserve Version 21 behavior
- use actual combat participants
- do not invent participation scoring

Maintain short combat feed for defeats.

## Local lifecycle test controls

Because bots are out of scope, add debug-quality controls sufficient for physical-device lifecycle acceptance without corrupting production rules.

Examples:

- select inspected actor
- apply lethal damage to inspected actor
- damage selected actor
- fast-forward/advance respawn timer only if implemented as an explicit debug/test seam
- reset match

Debug controls must call authoritative match/combat methods, not mutate health/tickets directly unless the action is explicitly a test-only setup helper isolated from production logic.

Provide a compact team-status panel showing:

- Blue tickets
- Red tickets
- each actor alive/dead/respawn-reserved/eliminated
- final-respawn availability
- respawn countdown if reserved
- protection state
- K/D/A
- match phase/result

Do not turn this into production UI polish.

## Human selection

Allow selecting Kit, Set, or Riven as the Blue human before/resetting the lifecycle sandbox.

Selecting a Summoner should not duplicate that Summoner on Blue. Blue remains one each of Kit/Set/Riven, with selected human occupying the human-control slot.

All Red actors remain lifecycle participants.

## Combat integration

Use the accepted combat implementation from Task 002A.

Required integration behavior:

- combat damage can kill another match actor
- actor death enters ticket/final-respawn lifecycle exactly once
- repeated damage against an already-dead/reserved actor cannot consume extra tickets
- respawning actor becomes targetable again only when allowed
- respawn protection blocks damage
- offensive cast breaks protection
- buff/stance does not
- ultimate meter behavior remains correct per actor
- Set aura uses actual teammates and unique owner IDs
- Riven death clears weapon state; respawn restores valid initial weapon state

## Tests

Port/adapt authoritative lifecycle assertions from `tests/match.test.js`.

At minimum cover:

- match creates exactly six unique Summoner actors, 3v3
- selected Blue human roster behavior
- exact 1.3 match health values
- countdown gating
- one death consumes exactly one ticket
- repeated damage while already dead does not consume another
- last shared ticket death remains ticket-funded
- personal final respawn remains available after last-ticket death
- zero tickets uses one personal final respawn
- next death permanently eliminates that Summoner
- reserved respawn keeps team viable
- team loss waits until all three are permanently eliminated
- simultaneous terminal non-viability can draw
- respawn occurs after 3 seconds at correct spawn with full health
- 2-second protection blocks damage
- offensive cast breaks protection
- buff/stance preserves protection
- eliminated actor cannot move/cast
- Riven death/respawn weapon restoration
- actual team Set aura eligibility
- kills/deaths/assists/damage records
- result freezes further match progression
- clean rematch/reset restores tickets, lives, records, cooldown/status/weapon state

## Browser/device acceptance

Add production-browser tests for the actual rendered PlayCanvas app that prove:

- lifecycle sandbox starts
- countdown reaches active
- six actors are represented in diagnostics/status UI
- debug lethal action reduces a team ticket
- respawn countdown is visible
- actor returns after respawn
- protection is visibly active
- after controlled depletion of tickets/final lives, permanent elimination appears
- match reaches results when all three opposing actors are permanently eliminated
- Reset/Play Again creates a clean match
- selected human remains controllable through real touch input after lifecycle integration

Keep the accepted Task 002A touch-damage tests passing.

## Architecture constraints

Do not:

- merge all six actors into one giant state object with character-specific branches
- let UI determine lifecycle state
- let presentation determine respawn timing
- duplicate combat rules inside match code
- hardcode one character's lifecycle
- weaken Task 002A physical-touch behavior

Prefer:

- one local match authority
- six reusable combat actors
- pure/testable lifecycle rules
- presentation as observer
- fixed-step authoritative timing

## Explicitly out of scope

Do NOT implement yet:

- territory/front calculation
- Crownfall Points
- 100% territorial victory
- regulation timer resolution
- Wilderness camps/objectives
- bot AI
- production networking
- production arena/art pass
- production audio
- final balancing

Balance values should remain Version 21 reference values for now.

Do not rebalance damage/health/cooldowns/ranges in this task unless a current value is demonstrably inconsistent with the preserved Version 21 source.

## Validation

Run and fix:

- unit/non-rendering tests
- typecheck
- lint
- formatting
- production build
- complete production-browser suite

No test may replace a real lifecycle assertion with direct state mutation merely to make the suite pass.

## Finish criteria

Do not stop after tickets alone or after one successful respawn.

Finish only when:

- six-actor 3v3 lifecycle exists
- countdown works
- tickets work
- personal final respawns work
- permanent elimination works
- protection works
- records work
- terminal team viability works
- clean rematch works
- combat/touch regressions remain passing
- tests/typecheck/lint/format/build/browser suite all pass
- result is committed to `playcanvas-port`
- existing GitHub Pages `/playcanvas/` deployment is triggered

At completion report:

1. final commit SHA
2. files changed
3. reference source/tests used
4. unit test count/result
5. browser test count/result
6. typecheck/lint/format/build results
7. deployed preview URL
8. any intentional difference from Version 21
9. physical iPhone behaviors still requiring user acceptance
