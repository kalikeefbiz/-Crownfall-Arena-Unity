# Crownfall Macro Pressure: First Surge

Status: locked prototype rule for the first macro-pressure experiment.

## Strategic purpose

Crownfall's continuous territorial rubber-band remains the primary lane identity.

The Surge is not a second scoring system and not an attack on the losing team. It is a one-time tempo reward that creates an autonomous lane obligation so the advancing team can briefly rotate toward a Wilderness objective without instantly surrendering its earned control.

The goal is the same strategic function that a pushed wave provides in a MOBA: create a temporary window, not a guaranteed objective.

## Trigger

- Each team can trigger exactly one Surge per match.
- The Surge triggers the first time that team reaches 70% live territorial control.
- No additional Surge thresholds exist for now.
- A team's Surge cannot be earned a second time after control falls below 70%.
- This is intentionally limited while the mechanic is being validated.

## Presentation concept

The existing territory shader remains authoritative for live control.

During Surge:

- the advancing team's territorial shader visibly flows forward with directional Aether motion
- three physical Aether Canals activate in lane
- the Canals visually feed the forward flow
- the event must read as the battlefield carrying stored territorial momentum, not as three turrets or three damage sources

## Canal rules

- Three Canals.
- All three have the same rules and the same pressure behavior.
- No per-Canal pressure tiers.
- Any one surviving Canal keeps the Surge active.
- Having three Canals only increases the time required to fully end the event.
- Canals do not attack Summoners.
- Canals do not damage, slow, debuff or crowd-control the defending team.
- Canals do not grant gold, buffs, healing, tickets or secondary rewards.
- Their entire strategic value is maintaining the Surge.
- The advancing team may defend them, but defending them costs a Summoner's rotation opportunity.

Exact Canal HP is tuning data and is not locked yet.

## Territorial behavior while Surge is active

The normal live control meter remains authoritative.

When no Summoner from either team is exerting lane presence:
- Surge creates slow autonomous forward pressure for the team that earned it.

When the defending/retreating team returns to lane while at least one Canal remains:
- their presence can stop the unattended forward drift
- they cannot reverse the advancing team's earned control merely by standing in lane
- the current territorial state is maintained until every Canal is destroyed

When normal opposing combat presence exists:
- the standard territory contest rules still apply for the active fight
- the Surge is not an offensive damage multiplier
- the mechanic must never reward the advancing team for ignoring Canals and simply farming kills

Once all three Canals are destroyed:
- Surge ends immediately
- all special hold/autonomous-pressure protection disappears
- normal live territorial rubber-banding resumes

## Intended macro window

The Surge should buy enough time for the advancing team to rotate and begin Major.

It must not buy enough time to guarantee Major.

Desired decision state:

- advancing team rotates and starts Major
- defenders spend time ending Surge
- Major is meaningfully damaged but not automatically secured
- once the final Canal falls, the advancing team must decide whether to finish Major, turn on rotating defenders, or abandon Major and return to lane

The exact window must be tuned against actual Major kill time rather than selected in isolation.

## Snowball guardrails

Do not add, unless later testing proves necessary:

- Canal damage
- Canal healing
- Canal repair
- extra Canals
- separate Canal pressure rates
- kills accelerating Surge
- Surge-specific combat buffs
- repeat Surges
- reward drops for destroying Canals

The current prototype tests one question only:

Can one earned autonomous-pressure window create meaningful rotation decisions while preserving Crownfall's live territorial rubber-band?

## Format note

5v5 is the official format.

3v3 single-lane is the shipping format and current test bed. The Surge should function cleanly in 3v3, but permanent macro rules should not be over-optimized around the smaller format.
