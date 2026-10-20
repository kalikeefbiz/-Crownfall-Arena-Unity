# Goal 006 — frozen V21 gameplay parity audit

Audit date: 2026-10-20. Authority: `kalikeefbiz/Crownfall-Browser-V21-Reference`
at preservation commit `35082348aef27ad4eaed436e369a290ce7bf6c57`, preserving
browser V21 `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`. The reference checkout
was read only and its commit was verified. This audit documents differences;
it does not authorize another implementation phase.

## Evidence and method

Compared current source and tests, rather than historical feature proposals:
`src/wilderness.js`, `match-bots.js`, `match-data.js`, `match.js`,
`crownfall-rules.js`, `combat.js`, `combat-core.js`, `modifiers.js`,
`advanced-actions.js`, `returning-weapons.js`, `combat-data.js`, `summoners.js`,
`riven-data.js`, `ability-input.js`, `game-ux.js` / the V21 handoff, and
`tests/wilderness.test.js` / `tests/match.test.js`. Reformatting reference modules
in temporary files confirmed identical Kit/Riven definitions and modifier math;
Set definitions differ only in import order. Existing combat observers add
journaling, explicit targetability and target deduplication, without retiming
attacks. Reference files were not reformatted in place.

Executable evidence is in local `tests/crownfall.test.js`, `wilderness.test.js`,
`full-loop.test.js`, retained combat/lifecycle/input suites, and production browser
`territory.spec.ts`, `wilderness.spec.ts`, `ergonomics.spec.ts` and the retained
browser suites. See [TASK_006_VERIFICATION.md](TASK_006_VERIFICATION.md) for the
validation run and fixture boundaries.

## Implemented / parity

| System               | Current implementation and evidence                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crownfall identity   | One Crownfall Lane and lateral Wilderness. No towers, minion waves, Nexus/base destruction, Crown Core, item shop or overtime. No obsolete design is revived.                                                                                                                                                                                                 |
| Space and front      | Source `MATCH_MAP` / `MATCH_LANE`, with reversible `world.x = reference.z`, `world.z = -reference.x`. Front position is authoritative. Living, nonreserved, physically eligible lane actors determine midpoint or crossed prior-front clamp; neither camps nor rotation assignments edit territory. Empty lane returns neutral.                               |
| Pressure/points      | Neutral 50/50 start, uninterrupted 2-second grace, retained CP at 12/s, exact fractional accounting, 1000 target. No reward changes these values.                                                                                                                                                                                                             |
| Match resolution     | Total control, tickets/team viability, points, then 300-second regulation by CP, territory, draw. Result freezes all match/camp progression. Natural ordered total control is the authorized correction described below.                                                                                                                                      |
| Lives                | 15 shared tickets plus one personal final respawn per Summoner. Spending the last shared ticket preserves the personal final respawn. Three-second respawn, two-second protection, offensive break, reserved viability, permanent elimination.                                                                                                                |
| Kit                  | Solar Whip, Ember Step/stun streak, Solar Ring, Last Flame, earned lethal Expellant, and real +5% Inner Flame in either tagged Wilderness strip.                                                                                                                                                                                                              |
| Set                  | Protective Presence, Panther Claw, War Cry, contact leap/combo and Panther Fist. CDR uses the full Predatory cooldown only on leap completion. Existing aura also mitigates neutral damage.                                                                                                                                                                   |
| Riven                | Both stances, shared cooldown channels, persistent scythes and recall scaling, Elf Dance, Pulse/Solo slow, AMP and Summoner-only SCREAM. Release-confirmed Basic and follow-up cadence remain locked.                                                                                                                                                         |
| Camps                | Exactly six neutral minor sites (two each Mobility/Cooldown/Defense), one major Damage objective; canonical transformed placement. All seven homes are reachable by physical movement with ordinary map routing.                                                                                                                                              |
| Neutral AI           | 850/5200 HP, 42/110 damage, 1s attack, 9 aggro, 12 home leash, speed 3.8, reach 2.3/3.2, status and collision checks, protected/dead exclusion, >2s no-target reset/full heal, 45/100s respawn. Uses source collision probing, not new monster pathfinding.                                                                                                   |
| Rewards              | Securing Summoner attribution, once per camp death, no participation formula. Minor +20% speed / 20% normal skill CDR / 20% mitigation for 20s; no duplicate-type stacking. Major +25% team damage, one 25s expiry, living allies immediately and returning allies only for remaining duration. Death clears actor modifiers; rematch clears camp/team state. |
| Combat economy       | Neutral dealt/received damage grants zero Ultimate Meter. Summoner-only Last Flame, Expellant and SCREAM exclude monsters. Camp securing does not create participant damage/K/D/A or assists.                                                                                                                                                                 |
| Rotations            | V21 eligibility, schedules, timeouts, proximity/type choice, cancellation, control/health/lane gates and nearby enemy priority. Only bot slots are assigned; one bot per minor, two may attempt major while a real teammate remains in lane. Physical movement and casts execute through the existing controller.                                             |
| Participants/results | All six identity-based participant rows, K/D/A, damage and lane pressure time; controller type is metadata. No overall score formula added. Clean playable restart.                                                                                                                                                                                           |

## Intentional PlayCanvas adaptation

- **Authorized Goal 006 correction to V21:** V21 inset endpoints whenever both
  teams were present. The port now applies that inset only for crossed formations
  (`b > r`). Ordered midpoint domination can reach exact 0/1 with living defenders
  and win immediately, with no CP/grace gate. Crossed runners still cannot backcap.
- The accepted Task 005A camera remains fixed behind Blue: offset Y 15.5 / Z 18,
  look-ahead −4 Z, exponential follow rate 9. Competitive controls remain 72px
  abilities / 88px Basic, with Riven stance 72×52px in landscape. These supersede
  browser pixel/projection conventions. Camera heading never follows aim.
- Existing PlayCanvas BotController retains sampled think cadence (0.22–0.38s),
  seeded aim error, attack selection/cadence, low-health reposition and visibility
  graph routing. V21's tactical controller thinks at 0.15s and probes obstacles.
  Goal 006 ports its Wilderness assignment and nearby-enemy policy while preserving
  the accepted port's combat policy; it does not claim identical match trajectories.
- Presentation reads simulation. PlayCanvas 3D primitives, projected DOM labels,
  HUD and observational combat journal replace custom WebGL/Canvas internals.
  The transform swaps authored dimensions, including Wilderness 68×20 to 20×68.
- Normal local inspection is read only. Named `?verify=1` arrangements and bounded
  ticking exist solely for deterministic browser verification. Legacy `?debug=1`
  lifecycle geometry intentionally has no competitive camps/regions. Sandbox
  training targets remain defeated until explicit reset, as accepted previously.
- Source timers use `Infinity` for permanent/no respawn and `-Infinity` for no last
  hit. These intentional sentinels are retained; movement, health, meter and camp
  geometry are checked finite throughout complete simulations.

## Known presentation difference

- Prototype characters/camps and simple health bars replace V21 sprites, creature
  presentation and arena art. Camp type/HP, death/respawn time, larger gold major,
  lateral green strips, compact local buffs and securing feed are present.
- The port's territory fill/frontier/HUD typography and six-row result table differ
  from V21's compact scoreboard, menu transitions and Canvas feedback. Exact pixels,
  art grounding, character scale and source animation frames are not parity claims.
- Camp nameplates may share screen space with other world labels during crowding;
  production occlusion/label layout remains a presentation follow-up. Automated
  checks cover critical HUD/control separation at existing landscape targets.

## Still missing gameplay / player flows

- V21's Main Menu → selection → intro → victory/results → Play Again/Menu flow is
  represented by the port's simpler selection/prematch/countdown/results/restart.
  A separate menu return and player-facing pause flow are absent.
- V21's control-layout editor, saved slot positions/scale/opacity and its
  Save/Cancel/confirmed Reset/collapse behavior are absent. No pause/editor gameplay
  inertness can be claimed for controls that do not exist in this port.
- Existing Kit bot ability selection still does not include earned Expellant Blast;
  the human grant/cast is implemented. This pre-existing AI repertoire gap is
  documented rather than silently expanded under a no-rebalance task.
- No additional core lane/lifecycle/camp gameplay gap was identified by this focused
  audit. This is source/test evidence, not a claim of physical-device acceptance or
  exhaustive equivalence of every possible simulation trajectory.

## Deferred balance

AI difficulty, Summoner tuning, team durability, camp risk, rotation success rate and
all timing/range/damage constants are prototype values. No balancing was performed.
Ordinary matches need not secure the major; a coordinated full-health opening proves
it is attainable with preserved mechanics. Changing policy to guarantee rewards in
every match would change the reference behavior and is not authorized.

## Future multiplayer/networking

The build is a local six-actor authority with five command bots. Actor identities,
combat, camps and reward attribution are controller independent. Networking,
matchmaking, online lobby, replication, server authority, prediction/reconciliation,
anti-cheat and persistence are not implemented. V21 also is not a production network
stack. The diagnostic seams are not transport or security boundaries for online play.

## Production art/audio

No character/VFX artwork migration, new camp creature art/lore, production arena pass,
audio or final animation set is included. Unity remains untouched. V21's authored
sprite clips and fallbacks remain reference material, not production assets imported
by this Goal. No towers/minions/Nexus/Crown Core/new Summoners were added.

Physical iPhone Safari still needs Wilderness readability/route/buff review, touch
combat/cancellation and simultaneous move/aim, notch/orientation/gesture review,
results scrolling, sustained frame pacing/thermal/memory checks. Existing accepted
camera/control design is locked; device review is not permission to redesign it.
