# CODEX TASK 002A — Physical iPhone Combat Acceptance Fix

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

Read first:

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/CODEX_TASK_002.md`
- `PlayCanvas/COMBAT_PARITY.md`

## Physical-device report

Task 002 is deployed and opens successfully on a real iPhone Safari device.

Observed on physical iPhone:

- mobile HUD renders correctly
- movement works
- character selection works
- combat controls can be pressed/dragged
- user reports attacks/damage are not reliably perceived as connecting with the stationary targets
- Kit screenshot diagnostics showed target HP already reduced (for example near-a 3340, near-b 3660, line-a 3690, line-b 4780, object 3290), proving at least some authoritative damage transactions are occurring
- Riven screenshot showed near-a / near-b / line-a / line-b / object all still at 5000 after attempted combat
- therefore do NOT rewrite the combat engine blindly: isolate physical-touch command execution, hit geometry, and presentation feedback separately

This is an acceptance bugfix pass, not the next gameplay parity block.

## Goal

Make real mobile touch combat unambiguous and reliable for Kit, Set and Riven before any Task 003 work begins.

A tester on iPhone Safari must be able to:

1. select each Summoner,
2. stand near a clearly valid target,
3. use the actual on-screen Basic control,
4. visibly see that an attack was committed,
5. visibly see HIT or MISS feedback,
6. observe target HP change on a valid hit,
7. repeat this for at least one non-basic action per Summoner.

## First: diagnose, do not guess

Audit the current touch path end-to-end:

DOM PointerEvent
→ AbilityInput
→ AbilityCommands
→ main fixed-step command handoff
→ CombatSimulation.cast
→ hit query/projectile/timeline
→ damage transaction
→ presentation/diagnostics.

Specifically investigate:

- whether short physical taps can begin and end entirely between fixed simulation ticks, causing Kit/Set held Basic to produce no command
- whether iOS pointer capture / lostpointercapture ordering can clear a confirmed cast
- whether release-confirmed Riven Basic is reliably enqueued from real touch input
- whether pointer drag vectors and world aim directions agree with the camera/world convention
- whether the 150 px cancellation distance makes ordinary phone aiming unexpectedly cancel
- whether ability previews accurately represent the attack's actual world range/shape
- whether damage occurs but is effectively invisible because presentation suppresses number effects or hit feedback

Do not change Version 21 gameplay rules simply to make tests pass.

## Required fixes

### 1. Mobile command reliability

Every intentional Basic interaction must survive frame timing:

- Kit/Set held-repeat behavior remains authoritative.
- A legitimate touch press must not disappear merely because pointerdown and pointerup occur between two 60 Hz simulation ticks.
- Preserve repeat-while-held behavior.
- Do not convert Kit/Set to Riven release-only semantics.
- Riven remains release-to-cast and never fires on pointerdown.
- Riven quick tap under 180 ms remains valid on release.
- pointercancel/lost capture must not cast.
- multi-touch movement + ability input must remain independent.

If necessary, add a latched/queued press command seam for Kit/Set so the initial attack attempt is not dependent on one rendered frame observing `attackHeld=true`.

### 2. Touch-only browser acceptance tests

Current Basic damage browser tests use mouse input. That is insufficient after this physical-device report.

Add production-browser tests that use CDP touch events / mobile context for:

- Kit Basic: touch interaction damages a valid in-range target
- Set Basic: touch interaction damages a valid in-range target
- Riven Basic: no damage on pointerdown/hold, damage after valid release
- simultaneous movement finger + attack finger while damage still resolves
- touch cancellation produces zero cast/damage
- one aimed action executed through touch
- one radial or ground action executed through touch

Tests must inspect authoritative transactions/HP, not only facing or button state.

### 3. Deterministic mobile acceptance target

The sandbox currently has several diagnostic targets for geometry tests. Keep them, but make physical QA straightforward.

Add one clearly identifiable enemy Summoner target positioned at a known valid Basic test location relative to the reset spawn, without breaking the existing geometry/parity targets.

It should be visually and diagnostically labeled as the mobile acceptance target.

Do not alter combat ranges to reach it.

### 4. Visible attack confirmation

A successful attack must be obvious without reading tiny diagnostic HP text.

Implement lightweight debug-quality combat feedback:

- render damage-number effects that the simulation already emits OR an equivalent presentation observer
- brief target hit flash/pulse on authoritative damage
- explicit short-lived HIT / MISS feedback tied to authoritative combat events/transactions
- distinguish cast accepted from actual hit
- do not make presentation drive damage

For projectiles, preserve visible projectile travel.
For melee/radial actions, show enough world feedback to understand the affected direction/area.

### 5. Ability-aware targeting preview

The current generic aim line must not imply a hit when the active ability uses a different range/shape.

During touch targeting, show debug-quality authoritative preview appropriate to the selected action:

- cone/range for melee cone
- line/range/width for projectile
- radial radius for self AOE
- clamped target marker + radius for ground target
- dash path/range for dash

This is diagnostic presentation only. It must read the same ability data used by simulation.

Do not build a production VFX system in this task.

### 6. Diagnostics

Expose enough state to distinguish these cases on device:

- cast rejected
- cast accepted, no targets hit
- cast accepted, N targets hit
- most recent ability id/name
- most recent transaction target/damage
- pointer/cancel state only if useful and unobtrusive

Keep diagnostics removable/debug-oriented.

## Regression requirements

Preserve:

- Task 001 movement/collision/camera/facing
- all Task 002 combat parity tests
- exact Version 21 Kit/Set/Riven combat semantics
- Riven stance and weapon state
- independent movement/aim
- existing GitHub Pages `/playcanvas/` deployment
- Unity root build untouched

## Validation

Run and fix:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- formatting check
- `npm run build`
- full production-browser test suite

The browser suite must now include real touch DAMAGE assertions, not just touch-facing assertions.

## Finish criteria

Do not stop at a speculative fix.

Finish only when:

- touch-only automated tests prove real damage for Kit, Set and Riven Basics
- Riven still proves no fire-before-release
- cancellation proves no accidental cast
- multi-touch move + attack proves damage resolves
- at least one aimed and one radial/ground touch action work
- visible authoritative HIT/MISS/damage feedback exists
- all old tests remain passing
- production build passes
- result is committed to `playcanvas-port`
- deployment workflow is triggered

At completion report:

1. root cause(s) found
2. exact code changes
3. touch-only test scenarios and results
4. total unit/browser test results
5. final commit SHA
6. deployed preview URL
7. any remaining behavior that only physical Safari can validate
