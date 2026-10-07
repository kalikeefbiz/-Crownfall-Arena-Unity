# Crownfall First Roster Balance v0.1

Status: first playable balance pass for Kit, Set and Riven against the shared combat economy.

This pass is intentionally conservative. It establishes comparable threat geometry and damage budgets before all three full kits are implemented.

## Shared spatial scale

Current Unity fixture body radius is 0.40 WU and movement baseline is 5.0 WU/s. Keep those as the first runtime measurement anchors.

Movement bands:
- slow/frontline: 4.6-4.8 WU/s
- standard: 5.0 WU/s
- fast: 5.2-5.4 WU/s

Range bands, measured from attacker center before target-radius expansion:
- melee: 1.35-1.75 WU
- extended melee: 2.2-2.8 WU
- short range: 3.2-4.0 WU
- medium range: 4.8-5.8 WU
- long range: 6.5+ WU

A target's combat radius is additive for hit eligibility in the current cone-query model. Therefore a 2.6 WU authored range against a 0.4-radius target has an effective center-to-center edge of about 3.0 WU.

## Kit Asher

Role: Damage Dealer / Expellant.
Identity: mobile extended-melee skirmisher.
Reference HP: 950.
Movement: 5.2 WU/s.

### Solar Whip
Classification: extended melee.
Authored reach: 2.6 WU.
Cone: 117 degrees.
Attack interval: 0.85 s.
Two-cast combo damage:
- first cast: 85
- second cast: 105
Combo total: 190.
Combo window: 1.25 s.

Rationale:
- preserves Kit's reach advantage over true melee
- removes the prototype's extremely fast 0.55 s pressure loop
- makes the basic meaningful without consuming the entire non-Ult rotation budget

### Ember Step
Dash distance target: 3.0 WU.
Cooldown target: 6.0 s.
Damage contribution target: 45.
Two-hit setup then next hit stun remains Kit's execution reward.

### Flame Burst
Range target: 4.2 WU.
Cooldown target: 7.5 s.
Damage target: 135.

### Firestorm Ascent
Cooldown target: 55-65 s.
Damage target: about 200 on a clean central hit before later AoE tuning.

### Kit damage check
Representative non-Ult clean sequence:
Solar Whip chain 190 + Ember Step 45 + Flame Burst 135 = 370.

That is 37% of a 1000 HP reference target and requires Kit to enter danger to realize the full budget.

Representative Ult commitment:
370 + ~200 = ~570.

A neutral 100-to-0 remains abnormal.

## Set

Role: Tank / Embodiment.
Identity: access-gated frontline anchor.
Reference HP: 1300.
Movement: 4.7 WU/s.

### Panther Claw
Classification: melee.
Authored reach target: 1.65 WU.
Three-hit chain target:
- 55
- 60
- 70
Total: 185.
Attack interval target: 1.0 s between accepted basic attacks.

The 1.65 reach is intentionally longer than body-contact distance. Against a 0.4-radius target, practical center-to-center contact extends to about 2.05 WU.

### Predatory Combo
Engage leap target: 3.6 WU.
Cooldown target: 8.5 s.
Total clean damage target: 105.
On miss, no follow strikes remains locked.

The leap is the primary answer to Set's prototype access failure. Set should not have to walk through an entire ranged rotation before he can interact.

### War Cry
Cooldown: 10 s.
First-pass active target:
- 3.0 s duration
- 15% incoming-damage reduction
- 10% outgoing-damage increase

These are provisional and should be tested against approach survivability. War Cry is not intended to turn Set into a burst character.

### Panther Fist
Cooldown target: 60-70 s.
Damage target: about 150 plus its control/space value.

### Set damage check
Representative non-Ult clean sequence:
Panther Claw chain 185 + Predatory Combo 105 = 290 before War Cry amplification.

Set's value comes from access, durability, control and protecting space, not Kit-level burst.

## Riven

Role: Damage Dealer / Shaper.
Identity: ranged spacing and stance pressure.
Reference HP: 900.
Movement: 5.0 WU/s.

Riven does not receive a mobility dash in this first balance pass. Range itself is already an access advantage.

### Reso Blades basic
Classification: medium range.
Range target: 5.2 WU.
Attack interval target: 0.95 s.

Two blades outbound and recall remain the identity.

First-pass damage target:
- each outbound blade: 38
- each recall blade: 50
Full two-blade out-and-back connection: 176.

The recall is intentionally stronger because it requires spacing/path prediction after the initial throw.

### Elf Dance
Range target: 5.2 WU.
Cooldown target: 5.5 s.
Five scythes at 24 damage each.
Maximum clean connection: 120.

### AMP'D
Cooldown target: 9 s.
Duration target: 3 s.
First-pass offensive amplification: 10%.

### Percussive Pulse stance
Its complete rotation should remain in the same ~280-330 non-Ult budget as Reso Blades, but may distribute damage through area coverage rather than single-target recall precision.

Do not let stance swapping create two full independent burst rotations back-to-back. Shared cooldown relationships must prevent that exploit.

### Ultimate
Cooldown target: 60-70 s.
Additional clean single-target contribution target: roughly 150-170 before later utility/AoE weighting.

### Riven damage check
Reso clean sequence:
full basic 176 + Elf Dance 120 = 296 before AMP'D.
With ideal AMP'D overlap: about 326.

This intentionally sits below Kit's clean rotation because Riven receives substantially safer access and better sustained spacing.

## Matchup geometry

### Set vs Riven
Riven preferred threat edge is roughly 5.6 WU center-to-center including target radius.
Set basic threat edge is roughly 2.05 WU.
Raw spacing gap: about 3.55 WU.

Set's 3.6 WU Predatory Combo is designed to bridge that gap if he earns a clean engage angle. It does not guarantee attachment because Riven can move, predict and punish the approach.

Acceptance:
- Riven should win repeated neutral spacing if Set walks directly at him.
- A successful Predatory Combo should let Set actually begin his game before losing most of his health.
- Once attached, Riven should be under meaningful pressure.

### Kit vs Riven
Riven has roughly 2.6 WU more basic threat distance.
Kit's 3.0 WU Ember Step can cross that spacing advantage at the cost of his mobility cooldown.

Acceptance:
- Riven can pressure Kit before Kit is in Solar Whip range.
- Kit can deliberately spend Ember Step to contest that advantage.
- If Kit burns Ember Step badly, Riven should regain spacing control.

### Kit vs Set
Kit owns the basic-reach advantage.
Set owns durability and a longer hard engage.
Neither should dominate solely because of attack range.

## Rotation / TTK expectations

Approximate clean-rotation counts before mitigation, regeneration or misses:

- Kit into Riven: ~2.4 full clean rotations
- Kit into Set: ~3.5
- Riven into Kit: ~3.2
- Riven into Set: ~4.4
- Set into Kit: ~3.3
- Set into Riven: ~3.1

These are not literal cooldown-only kill timers. Basics continue between major ability cycles, players miss, disengage, regenerate, use mitigation and receive teammate interference.

They exist to detect obvious budget violations.

## Health regeneration interaction

Current framework:
- 4.5 s without dealing or receiving successful damage
- 4.5% maximum HP regenerated per second

Implication:
A player who disengages is not permanently crippled, but recovery creates a macro absence.

Set regenerates more raw HP per second because recovery is percentage-based; this is intentional because his larger health pool also takes more raw damage to refill.

## Opening-skirmish test

For the 3v3 shipping slice, a normal first confrontation should usually end with:
- 0-3 total deaths
- at least one forced retreat or low-health disengage
- a territorial or Wilderness decision created by the health/cooldown state

Repeated full wipes from neutral opening positions indicate that damage, CC chain, focus-fire access or respawn pacing is too lethal.

## What is locked vs provisional

Locked design relationships:
- Kit = mobile extended melee
- Set = durable access-gated melee
- Riven = ranged spacing
- Riven's safer access costs burst budget
- Set's approach problem is solved through access/durability before raw damage
- normal full kit does not equal neutral 100-to-0
- disengagement and regeneration are expected combat decisions

Provisional numbers:
- every exact range
- every damage number
- every cooldown
- War Cry percentages
- Ult contribution

Those numbers are first-pass simulation targets and must move when device/runtime testing disproves them.
