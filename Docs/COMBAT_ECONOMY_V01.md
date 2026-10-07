# Crownfall Combat Economy v0.1

Status: first numerical baseline for simulation and runtime tuning. These are framework targets, not final character balance.

## Design goals

Crownfall combat should create information, pressure and retreat decisions before it creates deaths.

A normal equal-state 1v1 should require several successful offensive rotations. Landing one full non-Ult kit should usually force respect, positioning change or disengagement rather than produce a 100-to-0 kill.

The opening team skirmish should function as a data download:
- opponent mechanical skill
- preferred engage/retreat pattern
- ability sequencing
- teammate aggression and positioning
- matchup strengths
- likely rotation behavior

A normal opening exchange should not burn roughly half of a team's 15 tickets.

## Reference health scale

The internal balance reference is 1000 HP. UI may display health however presentation chooses.

Initial archetype bands:
- fragile ranged / assassin-like: 850-950 HP
- standard: 1000 HP
- bruiser: 1050-1150 HP
- tank: 1200-1350 HP

First three reference profiles:
- Kit: 950 HP
- Riven: 900 HP
- Set: 1300 HP

These values represent role durability, not final shipped stats.

## Rotation damage budget

Damage is evaluated against a 1000 HP reference target.

Expected non-Ult offensive rotation:
- sustained/ranged pressure profile: 280-330 damage
- standard damage profile: 320-380 damage
- high-risk burst profile: 380-430 damage
- tank/control profile: 250-320 damage

Expected full commitment including Ultimate:
- most damage-oriented kits: 450-600 total damage
- tank/control kits: 380-500 total damage

A normal full kit must not independently guarantee a 100-to-0 kill on an equal-state opponent.

## Rotation definition

A rotation is one meaningful offensive sequence, not every button on cooldown in isolation.

For balance testing, a rotation includes:
- the intended basic-attack contribution for that sequence
- one use of normal offensive abilities that reasonably belong in the combo
- movement/access time required to make the sequence possible
- no Ultimate unless explicitly testing an Ult rotation

This prevents ranged kits from receiving the same nominal damage budget as melee kits while ignoring the time and health melee kits spend gaining access.

## Time-to-kill targets

Equal-state 1v1:
- ordinary committed duel: approximately 10-16 seconds
- clean favorable catch / successful burst setup: approximately 7-10 seconds
- tank-vs-tank or low-damage matchup: can exceed 16 seconds
- normal one-rotation kill: failure condition

Coordinated focus:
- 2-3 enemies may kill a badly positioned target substantially faster
- target should normally still receive a readable reaction window unless hard-CC'd or already low
- instant deletion from neutral health should be exceptional, not baseline

## First-three balance budgets

### Kit
Identity: mobile extended-melee damage dealer.

Reference HP: 950.
Non-Ult rotation target: 350-400 versus 1000 HP.
Ult commitment target: 520-600 versus 1000 HP.

Kit pays for:
- mobility
- strong close/extended-melee conversion
- combo execution

Kit should be punished for failed sequencing or spending Ember Step poorly.

### Riven
Identity: ranged spacing / stance pressure.

Reference HP: 900.
Non-Ult rotation target: 280-330 versus 1000 HP.
Ult commitment target: 430-520 versus 1000 HP.

Riven already receives value from:
- earlier damage access
- spacing
- ranged uptime
- stance flexibility

Therefore Riven should not receive Kit-level burst simply because both are damage-focused Summoners. Riven wins neutral interactions through repeated spacing and uptime.

### Set
Identity: tank Embodiment / engage anchor.

Reference HP: 1300.
Non-Ult rotation target: 260-320 versus 1000 HP.
Ult commitment target: 400-480 versus 1000 HP.

Set's balance cannot be solved by raw damage alone.

Set requires:
- enough attack reach to strike without body overlap
- enough durability to survive approach
- a reliable engage distance
- meaningful stickiness/control after successful access

The desired matchup is:
- Riven favored while spacing successfully
- Set becomes threatening after successfully closing space

If Set loses most of his health before meaningful interaction is possible, the access model is broken even if his paper damage is balanced.

## Effective-threat model

Every Summoner is evaluated through:

Effective Threat = Access x Damage x Uptime x Reliability

This is a design model, not a literal runtime formula.

Range, mobility, durability, CC, projectile safety and reliability all have value before damage numbers are assigned.

A ranged ability that deals 100 damage safely and repeatedly is not balance-equivalent to a melee ability that deals 100 damage only after a risky approach.

## Opening-skirmish acceptance target

With 15 shared tickets per team:

Normal first major confrontation:
- target outcome: 0-3 total deaths across both teams before reset/retreat/objective transition
- a full wipe is possible after clear outplay
- repeated spawn-to-fight-to-death behavior should not be the default pacing

The first fight should more often create:
- damaged players
- cooldown disadvantages
- territorial movement
- retreat decisions
- objective windows
than immediate ticket collapse.

## Health-state decision bands

Health should create strategic states, not only alive/dead.

Reference interpretation:
- 70-100%: comfortable
- 45-70%: combat-capable but vulnerable
- 25-45%: danger zone
- below 25%: high kill threat

Forcing an enemy from 100% to 60% and making them disengage is a successful combat outcome even without a ticket loss.

## Out-of-combat regeneration

Crownfall uses automatic percentage-based recovery to prevent one won/lost skirmish from permanently determining the next fight.

Initial tuning:
- regeneration delay: 4.5 seconds after the most recent damaging interaction
- regen rate: 4.5% maximum HP per second
- taking damage resets the delay
- dealing successful damage resets the delay
- misses do not reset the delay
- movement does not stop regeneration
- simply standing in lane does not stop regeneration
- regeneration cannot revive a defeated Summoner
- regeneration stops at maximum health

Expected recovery:
- 60% to full: about 8.9 seconds of regen, about 13.4 seconds including delay
- 40% to full: about 13.3 seconds of regen, about 17.8 seconds including delay
- 25% to full: about 16.7 seconds of regen, about 21.2 seconds including delay

This is intentionally fast enough for a mobile match to reset without requiring a base trip, but slow enough that disengaging concedes real time and map pressure.

## Regen design consequence

Retreat becomes a strategic transaction:

A low-health team can disengage and recover, but while doing so it may concede:
- territorial control
- Major access
- Wilderness camps
- Surge response time
- positioning

The opponent therefore receives macro value from winning a skirmish even when no ticket is burned.

## Balance-test matrix

Every Summoner must be tested against:
1. 1000 HP standard target
2. fragile target
3. tank target
4. shorter-range opponent
5. longer-range opponent
6. equal movement opponent
7. faster movement opponent

Measure:
- first meaningful damage time
- seconds-to-contact
- damage per non-Ult rotation
- damage per Ult commitment
- time to force retreat
- time to kill
- health remaining after approach
- ability to disengage
- time required to recover from 25/40/60% HP

Do not lock individual move values until the matchup matrix behaves coherently.
