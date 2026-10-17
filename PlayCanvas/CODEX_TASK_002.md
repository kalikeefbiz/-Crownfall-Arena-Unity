# CODEX TASK 002 — Crownfall Combat Parity Block

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Governing sources

Read `PlayCanvas/MIGRATION_CONTRACT.md` first.

The PlayCanvas implementation is no longer a greenfield prototype. Port proven behavior from the frozen browser implementation instead of redesigning Crownfall.

Authoritative browser reference repository:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

Pinned preservation commit:
`35082348aef27ad4eaed436e369a290ce7bf6c57`

The preserved repository documents the original authoritative Version 21 source commit:
`5a73918bf4cd56cd54bdc98ba2a9929f4d347753`

Before implementation, inspect at minimum:
- `CROWNFALL_UNITY_HANDOFF_V21.md`
- `src/combat-data.js`
- `src/combat-core.js`
- `src/combat.js`
- `src/advanced-actions.js`
- `src/returning-weapons.js`
- `src/modifiers.js`
- `src/summoners.js`
- `src/riven-data.js`
- `src/ability-input.js`
- `tests/combat.test.js`
- `tests/set.test.js`
- `tests/riven.test.js`
- `tests/ability-input.test.js`

Use current source/tests to settle edge cases. Do not line-for-line port browser DOM/rendering architecture.

If the reference repository is not already present in the workspace, clone or fetch it read-only into a temporary sibling directory. Do not vendor it into `PlayCanvas/` and do not modify it.

## Goal

Port the complete Version 21 combat foundation and all three playable Summoner kits into the existing PlayCanvas technical slice as one bounded combat-parity block.

This task should leave PlayCanvas with a real combat sandbox, not another targeting-only mockup.

## Required architecture

Preserve the Task 001 separation:
- authoritative gameplay/simulation independent from PlayCanvas rendering
- input produces intentions/commands
- presentation reads simulation state/events
- animation/VFX never determine damage timing
- continuous aim remains continuous
- directional presentation remains Front / Back / Right Side / mirrored Left
- aim owns presentation direction during targeting/pre-cast
- movement owns presentation direction outside targeting
- committed actions capture/lock direction as required by the reference

Create a reusable combat layer rather than coding three one-off characters directly into `main.ts`.

## Combat foundation

Implement and test:
- combatant identity/team
- max/current health
- alive/defeated/targetable state
- damage transactions with source provenance
- friendly-fire/self filtering where reference requires it
- target deduplication
- cooldown channels
- cast acceptance/rejection
- authoritative attack timelines
- cone, radial, projectile, ground-target and contact/leap hit shapes needed by the three kits
- status effects required by the kits: stun, slow, mitigation, damage modifiers
- timed buffs
- action interruption on death/stun where reference specifies it
- ultimate meter:
  - starts 0
  - caps 100
  - 0.04 meter per point of enemy Summoner damage dealt
  - 0.025 per point received
  - successful ultimate consumes meter
  - ultimate cooldown remains an additional gate
- deterministic/non-rendering test seams wherever practical

Do not implement tickets/respawns in this task. Defeat is sufficient for the combat sandbox.

## Playable combat sandbox

Add a simple debug/selection mechanism allowing the tester to control:
- Kit
- Set
- Riven

Use replaceable primitive/diagnostic presentation if production art is not already readily available in the repository. Do not regenerate artwork and do not block combat parity on visual polish.

Spawn enough opposing target combatants to validate:
- single-target hits
- cone/radial multi-target hits
- piercing projectiles
- stun/slow
- Set aura/mitigation eligibility
- Riven returning weapon behavior
- Kit Expellant multi-Summoner grant

Targets may be stationary diagnostic enemies for this task. Bots are explicitly out of scope.

Expose readable health/status/cooldown/ultimate diagnostics for device testing.

## Kit Asher — port Version 21 behavior

Preserve exact source behavior. Guardrail values from the handoff:

- Inner Flame passive: +5% movement speed while in tagged Wilderness.
  - Wilderness itself is out of scope, but structure the passive hook so the future tagged-Wilderness state can activate it; do not fake permanent +5%.
- Solar Whip basic:
  - two-step cone sequence
  - 110 / 150 damage
  - range 2.8
  - cooldown 0.55 s
  - combo window 1.25 s
  - preserve held-repeat behavior from the reference
- Ember Step:
  - dash range 7
  - speed 24
  - width 0.65
  - 100 damage
  - cooldown 6 s
  - two successful dashes prime the third to stun 1.5 s
  - empowered success resets streak
  - miss resets streak
- Solar Ring:
  - self-centered 360° radial
  - radius 3.5
  - 190 damage
  - cooldown 4 s
- The Last Flame:
  - ultimate
  - piercing
  - enemy-Summoner-only
  - 550 damage
  - range 23
  - speed 16
  - width 1.15
  - cooldown 18 s
- Expellant Blast:
  - hitting at least two distinct enemy Summoners with Last Flame grants a 15 s cast opportunity
  - non-piercing
  - enemy-Summoner-only
  - lethal behavior, not an invented fixed damage number
  - range 26
  - speed 32
  - width 0.85
  - cast consumes grant

## Set — port Version 21 behavior

- Protective Presence:
  - nearby allied mitigation 2%
  - radius 5
  - exact eligibility from source
- Panther Claw basic:
  - 90 / 90 / 135
  - range 1.65
  - cooldown 0.5 s
  - combo window 1.15 s
- War Cry:
  - 5 s self buff
  - +25% damage
  - 20% mitigation
  - cooldown 10 s
- Predatory Combo:
  - contact leap
  - range 4
  - speed 16
  - width 0.5
  - successful contact schedules 70 / 90 / 160 at 0 / 0.18 / 0.4 s
  - strike range 1.75 with source cone validity rules
  - cooldown 8 s begins on leap completion including miss
  - leap/sequence locks ordinary movement/casting
  - death/stun cancels
- Panther Fist:
  - ground-targeted ultimate
  - targeting range 14
  - radius 3
  - 460 damage
  - impact delay 0.7 s
  - cooldown 18 s
  - committed target is clamped to range

## Riven — port Version 21 behavior

Riven starts in Reso Blades. Stance-switch cooldown is 3 s.
Basic and first-skill cooldown channels are shared across stances.

### Reso Blades
- two persistent orbiting scythes
- each outbound:
  - 75 damage
  - range 8
  - speed 13
  - width 0.4
  - piercing
  - cadence/cooldown 0.48 s
- accepted first launch schedules second through existing cadence using the same confirmed angle
- after both launches, next basic command recalls them
- recall:
  - each scythe base damage = 95 × (1 + min(outgoingHits, 6) × 0.25)
  - return speed 17
  - return tracks Riven
  - successful returns restore orbit/sequence
  - preserve separate outbound/return hit tracking
- Elf Dance:
  - five piercing shots
  - interval 0.085 s
  - 48 damage each
  - range 9
  - speed 16
  - width 0.35
  - cooldown 4 s

### Percussive Pulse
- basic:
  - non-piercing wave
  - 100 damage
  - range 8
  - speed 12
  - width 0.7
  - cooldown 0.6 s
- Percussive Solo:
  - radial 130 damage
  - radius 3.8
  - cooldown 6 s
  - 1.5 s zone
  - applies 35% slow
  - slow duration refreshes to 0.6 s

### Shared Riven actions
- AMP'D:
  - +30% damage for 3 s
  - cooldown 6 s
- Death Scream / SCREAM:
  - ultimate
  - 55 damage
  - radius 6
  - 1.3 s stun
  - enemy Summoners only
  - cooldown 18 s

### Riven input contract
Preserve Version 21 release-to-cast semantics:
- press snapshots current facing and enters targeting
- nothing fires on pointer-down
- movement remains independent
- release after hold/drag confirms preview direction
- quick tap under 180 ms and not dragged casts on release using facing captured on press
- pending follow-up state clears on interruption/death/disable/stance change per source

Do not convert Riven to Kit/Set held-repeat behavior.

## HUD/input requirements

Replace Task 001's non-damaging Basic mock with actual combat commands.

Maintain the existing landscape mobile layout:
- left movement
- Basic
- Skill 1
- Skill 2
- Ultimate

Add Riven's stance-switch control in a clear non-conflicting location.

For Kit/Set and normal aimed abilities, preserve the reference quick-tap versus hold/drag behavior where applicable.
Do not let lost pointer/cancel events become casts.

Desktop fallback controls may exist for automated/browser validation.

## Tests and validation

Do not claim parity from compile success.

Port/adapt enough browser-reference assertions to cover at minimum:
- health/damage/defeat and target filtering
- Kit two-step basic timing/damage
- Ember Step streak/stun/miss reset
- Solar Ring radial target filtering
- Last Flame piercing and Expellant grant/consumption
- Set combo ordering
- War Cry modifiers
- Predatory hit/miss/cancel/cooldown behavior
- Panther Fist clamping/delay
- Riven stance cooldown
- Riven outbound/second launch/recall lifecycle
- recall damage scaling and hit deduplication
- Elf Dance five-shot cadence
- Pulse/Solo slow zone
- AMP'D modifier
- SCREAM stun/enemy-only behavior
- Riven quick-tap and release-confirmed input semantics
- ultimate meter generation/consumption/gating
- action interruption edge cases

Add production-browser tests that prove:
- app starts without page exceptions
- each of Kit, Set and Riven can be selected
- Basic actually damages a target
- at least one aimed ability and one radial/ground ability execute through the real HUD/input path
- simultaneous mobile move + aim remains functional
- Riven stance switching changes available actions
- diagnostics update after damage/status/cooldown events

Run:
- unit/non-rendering tests
- typecheck
- lint
- formatting check
- production build
- production-browser tests

Fix failures before finishing.

## Deployment

The existing `Publish Crownfall PlayCanvas Preview` workflow deploys `PlayCanvas/dist` from `playcanvas-port` to the existing GitHub Pages `/playcanvas/` preview.

Do not replace or delete the Unity-hosted root build.

## Explicitly out of scope

Do NOT implement in this task:
- full 3v3 match orchestration
- tickets
- respawns/final personal respawn
- permanent-elimination team victory
- territory/front/Crownfall Points
- Wilderness camps/objectives
- bots
- production networking
- production arena art pass
- new character artwork
- audio polish

Those belong to later parity blocks.

## Finish criteria

Do not stop after implementing Kit or after proving one attack.

Complete all three kits and the shared combat foundation, run the full verification set, commit the result to `playcanvas-port`, and ensure the deployment workflow is triggered.

At completion report:
1. final commit SHA
2. files created/changed
3. reference files/tests used
4. unit test count/results
5. browser test count/results
6. typecheck/lint/format/build results
7. exact public preview URL
8. any remaining difference from Version 21 combat behavior
9. any physical-device behavior that still requires user acceptance
