# CODEX TASK 006 — Wilderness Gameplay + Bot Rotation Parity

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Read first

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/TASK_005_VERIFICATION.md`
- `PlayCanvas/CODEX_TASK_005A.md`

Authoritative frozen reference:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

Inspect at minimum:
- `src/wilderness.js`
- `src/match-bots.js`
- `src/match-data.js`
- `src/match.js`
- `src/combat.js`
- `src/combat-core.js`
- `src/modifiers.js`
- `tests/wilderness.test.js`
- `tests/match.test.js`

Use current preserved Version 21 source/tests to settle edge cases.

## Current accepted PlayCanvas baseline

The current playable build is accepted at a high level on physical iPhone Safari:
- actual 3v3 Crownfall match works
- territory/frontier and Crownfall Points are implemented
- all four match outcomes exist
- full six-participant results exist
- behind-player camera direction is accepted
- Task 005A camera/controls are the current ergonomic baseline
- current AI difficulty is intentionally NOT being balanced yet

Do not redesign those systems.

## Goal

Port the complete Version 21 Wilderness gameplay loop into the current PlayCanvas match:

- two Wilderness side regions
- six minor camp sites
- one major Damage objective
- neutral-monster combat
- aggro / pursuit / leash / reset / respawn
- minor buffs
- major team buff
- Kit Inner Flame Wilderness passive activation
- camp reward attribution/feed
- bot Wilderness rotation assignments
- readable debug-quality camp/buff presentation
- regression coverage against territory, combat, lifecycle, touch controls and results

After this task, Crownfall should contain its full Version 21 strategic match loop:
lane pressure <-> Wilderness rotations <-> buffs <-> combat <-> tickets/lives <-> territory/CP.

## Coordinate transform

Task 005 established and verified:

```text
world.x = reference.z
world.z = -reference.x
reference.x = -world.z
reference.z = world.x
```

Preserve it.

Do not rotate the accepted camera or change the authoritative coordinate mapping.

All Wilderness reference positions/regions must be transformed through the existing match-space helper rather than manually inventing PlayCanvas coordinates throughout gameplay code.

## Wilderness regions

Reference Version 21 Wilderness tags:

- center reference (0, -22), size 68 × 20
- center reference (0, +22), size 68 × 20

After the established transform these are lateral world strips centered around:
- world X ≈ -22
- world X ≈ +22

spanning the competitive battlefield along world Z.

Port them as tagged gameplay regions used by simulation.

These regions are NOT capture zones and do NOT directly affect territory/front position.

They exist for:
- Kit Inner Flame
- Wilderness identification/presentation
- camp placement/navigation

## Camp sites

Reference `CAMP_SITES` must remain authoritative and be transformed into PlayCanvas world coordinates.

Reference sites:
- Mobility A: (-22, -22)
- Mobility B: (+22, -22)
- Cooldown A: (-18, +24)
- Cooldown B: (+18, +24)
- Defense A: (-7, -27)
- Defense B: (+7, -27)
- Major Damage objective: (0, +26)

Do not reinterpret A/B as Blue/Red ownership.
Camps are neutral objectives.

There are exactly:
- 2 Mobility minor camps
- 2 Cooldown minor camps
- 2 Defense minor camps
- 1 Major Damage objective

## Neutral monster combat

Create a Wilderness authority/module equivalent to Version 21.

Monsters:
- team 0 / neutral
- valid damageable combatants
- kills do not count as enemy-Summoner kills
- monster damage must NOT generate Ultimate Meter
- Summoner-only abilities must continue excluding monsters
- normal abilities that can hit neutral monsters in Version 21 must still do so

### Minor monsters

Each minor:
- health: 850
- damage: 42
- attack interval: 1 second
- respawn: 45 seconds
- collision radius: 0.7
- attack reach: 2.3

### Major objective

- health: 5200
- damage: 110
- attack interval: 1 second
- respawn: 100 seconds
- collision radius: 1.3
- attack reach: 3.2

### Shared neutral behavior

- aggro range: 9
- home leash: 12
- movement speed: 3.8
- choose valid nearby Summoner targets according to the reference
- respawn-protected players are excluded from aggro
- dead/eliminated players are excluded
- while pursuing, remain constrained by home leash behavior
- if no valid target and more than 2 seconds since last hit:
  - heal to full
  - reset to home
- normal map collision remains respected
- stun/status behavior follows existing combat primitives where applicable

Do not invent threat tables, boss phases, new attacks, or new lore.

## Reward attribution

Rewards are based on the existing damage source / securing Summoner.

Do not create a participation/assist reward algorithm.

Each camp rewards only once per death.
Respawn resets its rewardable state.

Feed should announce the securing Summoner and camp/objective in a compact way.

## Minor buffs

Duration: 20 seconds.

### Mobility

Killing Summoner:
- +20% movement speed
- immediate
- timed
- expires after 20 s

### Cooldown

Killing Summoner:
- 20% cooldown reduction
- immediate
- timed
- expires after 20 s

Preserve Version 21 exclusions:
- normal ability cooldowns are reduced
- Basic cooldowns remain unchanged
- stance cooldown remains unchanged
- Ultimate cooldown remains unchanged

Do not stack duplicate same-type camp modifiers beyond Version 21 behavior.

### Defense

Killing Summoner:
- 20% damage mitigation
- immediate
- timed
- expires after 20 s

Neutral monster damage must demonstrate this mitigation while still granting zero Ultimate Meter.

### Death/reset behavior

Preserve Version 21:
- minor camp buffs are temporary actor modifiers
- death clears them according to existing defeat/reset behavior
- rematch begins with no camp rewards/modifiers

## Major Damage reward

Securing team receives:
- +25% outgoing damage
- duration: 25 seconds

Rules:
- applies to living teammates immediately
- enemy team receives nothing
- team reward has one authoritative fixed expiry
- if a teammate dies and respawns while the team reward is still active, the returning teammate receives the remaining-duration buff
- do not restart/extend the expiry merely because a teammate respawned
- rematch clears it

Do not grant the buff to both teams.
Do not turn it into a personal last-hit-only reward.

## Kit Inner Flame

Activate the already-structured Kit Wilderness hook in the real match.

When Kit is inside a tagged Wilderness region:
- +5% movement speed

When Kit leaves:
- bonus ends

Do not make the bonus permanent.
Do not tie it to camp ownership.

Test entry and exit using actual transformed Wilderness regions.

## Wilderness presentation

This remains prototype presentation, not production art.

Add clear in-world/readable representation for:
- six minor camps
- major objective
- camp type
- health
- alive/dead/respawn state
- major vs minor distinction

Use simple PlayCanvas primitives/materials/labels.

Also expose active Wilderness buffs clearly enough for physical-device QA:
- Mobility
- Cooldown
- Defense
- Team Damage
- remaining duration

Do not clutter the normal HUD with debug walls of text.
Prefer compact buff indicators for the local player and clear camp health/labels in-world.

The territorial HUD/frontier must remain readable.

## Human gameplay

The human must be able to:
- leave Crownfall Lane into either Wilderness side
- reach camps through current authored match geometry
- damage/kill camps with valid kit abilities
- receive correct reward
- return to lane
- retain buff until expiry/death
- see buff state
- continue affecting territory only while physically eligible in lane

Wilderness combat must use the same touch controls and accepted Task 005A camera.

Do not add a separate Wilderness control scheme.

## Bot rotation coordinator

Port the strategic assignment behavior from Version 21 without replacing authoritative match rules.

The coordinator owns assignments only.
Bots still submit ordinary movement/combat commands.
The coordinator must never:
- teleport bots
- directly damage camps
- directly grant buffs
- directly change territory/CP
- directly change tickets/lives

### Scheduling

Version 21:
- Blue first minor rotation eligibility: 14 s
- Red first minor rotation eligibility: 20 s
- minor rotation interval: 24 s
- Blue first major attempt: 48 s
- Red first major attempt: 55 s
- after a major attempt, next major eligibility for that team: +50 s
- minor assignment timeout: 24 s
- major assignment timeout: 36 s

### Safety / lane-presence gates

For each team:
- if fewer than 3 teammates alive: cancel/avoid rotations
- if team control is below 35%: cancel/avoid rotations
- candidate rotating bots should be above 55% health
- do not assign the human automatically
- only bot-controlled actors may receive automated Wilderness assignments

Minor:
- preserve at least meaningful lane presence
- Version 21 never sends all three; with current one-human + two-bot setup, a minor rotation is at most one bot
- require the source policy's lane/bot eligibility before assigning

Major:
- may assign two bots
- requires sufficient lane/control state
- preserve at least one actual teammate as lane presence
- current prototype human may be that remaining lane player
- do not send the whole team automatically

### Camp selection

For minor rotations:
- choose a live minor camp
- prefer eligible camp types not already active on the bot
- use the source's proximity policy
- no assignment to a dead camp
- assignment clears if actor dies, timeout expires, or camp is no longer valid

### Bot combat priority

When assigned:
- objective can become the bot's movement/combat target
- nearby enemy Summoners remain relevant as in Version 21
- preserve the source behavior where a close enemy can interrupt/directly supersede objective focus
- ordinary combat ranges/cooldowns/target filters remain authoritative

Do not make camp rotations perfect.
Do not rebalance bot accuracy/aggression in this task.

## Current BotController integration

Task 004/005 already has a deterministic PlayCanvas `BotController`.

Do not blindly delete and replace it if that would regress working combat/pathing.

Integrate Wilderness assignment awareness into the existing controller while preserving:
- current combat command path
- deterministic testing
- obstacle routing
- ordinary cooldown/cast gates
- accepted match completion

Use the frozen V21 bot policy as behavioral authority specifically for:
- rotation eligibility
- objective assignment
- objective-vs-nearby-enemy priority
- lane-presence safety

AI balance remains deferred.

## Tests

Port/adapt the authoritative assertions from `tests/wilderness.test.js`.

At minimum prove:

### Regions / Kit passive
- actual lateral movement can leave lane and enter transformed Wilderness
- lane pressure excludes lateral/Wilderness actors
- Kit gains exactly +5% movement in tagged Wilderness
- Kit loses it on exit

### Camp mechanics
- exactly six minor camps + one major exist
- canonical transformed positions are correct
- Mobility gives +20% speed for 20 s and expires
- Cooldown reduces normal skill cooldowns by 20%
- Basic/stance/Ultimate cooldowns remain unchanged
- Set Predatory full cooldown gets correct CDR timing after leap resolution
- Defense mitigates actual incoming damage by 20%
- neutral damage generates zero Ultimate Meter
- Major has 5200 HP
- Major grants +25% team damage for 25 s
- enemy team receives no major reward
- teammate respawning during active major window receives remaining-duration buff
- camp reward triggers once per death
- camps respawn/reset correctly
- minor buffs clear on death
- rematch clears all Wilderness state
- solo major attempt remains materially riskier/slower than coordinated two-Summoner attempt through existing mechanics

### Neutral AI
- aggro at valid range
- excludes respawn-protected actors
- pursues toward target
- respects leash/home
- attacks at correct interval/damage
- resets/heals after >2 s without valid target/engagement
- dead camp does not attack
- respawn restores full health/home/rewardable state

### Rotation coordinator
- never assigns all three teammates to a minor
- minor assignment is at most one bot per team under the current 1-human + 2-bot setup
- major can assign two bots
- major preserves a real lane teammate
- no rotation when fewer than three teammates are alive
- no rotation under 35% control
- major requires at least 45% control as in Version 21
- low-health bots are excluded
- assignment expires/cancels correctly
- assigned bots physically travel/fight through normal commands
- bots do not directly mutate camp health/rewards

### Complete matches
Run multiple deterministic full matches long enough to prove:
- normal Summoner combat still occurs
- rotations occur
- at least one camp reward occurs across the test set
- at least one major attempt occurs
- territory/CP still progress
- match reaches a valid existing Crownfall result
- all actor/camp numeric state remains finite

Do not require every random/deterministic match to have identical winner/reward sequence.

## Browser/device tests

Add production-browser coverage proving:
- Wilderness/camps visibly exist in normal playable match
- local human can physically travel from lane into Wilderness with real controls
- local Kit Wilderness passive activates/deactivates by region
- a deterministic verification fixture can secure each minor reward and major reward through authoritative damage
- buff indicator updates and expires
- monster attacks can damage the local player
- territory remains governed only by lane-eligible actors
- at least one automated bot rotation visibly leaves lane toward a real camp
- enlarged Task 005A mobile ability controls still function in Wilderness combat
- accepted camera composition remains unchanged
- no critical HUD/control overlap at existing mobile landscape test sizes

Touch assertions must remain present; do not replace all mobile coverage with mouse.

## Results / multiplayer-friendly architecture

Do not regress the participant-based result model.

Camp rewards/rotations are local match systems, but actor identity must remain controller-agnostic.

Do not encode Wilderness rules as "AI-only" behavior.
Only the automated assignment policy is bot-specific.

Future network players must be able to use the same:
- camp combat
- reward attribution
- modifiers
- region detection
- match state

No networking is implemented in this task.

## Explicitly out of scope

Do NOT:
- rebalance AI difficulty
- rebalance Summoners
- change CP/territory/tickets/regulation
- redesign camera
- shrink Task 005A controls
- add item shop
- add towers/minions/Nexus/Crown Core
- add production networking/matchmaking/server authority
- add production arena art
- create final camp creature art/lore
- add audio polish

## Validation

Run and fix:
- unit/non-rendering tests
- typecheck
- lint
- formatting
- production build
- full production-browser suite

Retain all Task 002A touch combat, Task 003 lifecycle, Task 004 playable match, Task 005 Crownfall rules/results, and Task 005A camera/control regression coverage.

## Finish criteria

Do not stop after placing camp primitives.

Finish only when:
- tagged Wilderness regions work
- Kit Inner Flame works in the real match
- all six minor camps work
- major objective works
- neutral monster AI works
- all rewards work and expire/reset correctly
- bot rotation coordinator works
- bots physically execute assignments through normal commands
- lane territory/CP still work
- all match victory paths remain valid
- touch combat remains valid
- accepted camera/controls remain unchanged
- full results remain participant-based
- all tests/typecheck/lint/format/build/browser suite pass
- implementation is committed to `playcanvas-port`
- existing `/playcanvas/` deployment is triggered

At completion report:
1. final commit SHA
2. files changed
3. frozen reference files/tests used
4. transformed Wilderness/camp coordinates
5. unit test count/result
6. browser test count/result
7. full-match rotation/reward evidence
8. typecheck/lint/format/build results
9. deployed preview URL
10. remaining Version 21 differences
11. anything still requiring physical iPhone acceptance
