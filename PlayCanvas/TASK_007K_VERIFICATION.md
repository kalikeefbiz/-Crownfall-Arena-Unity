# Goal 007K — type safety, runtime contracts and configuration integrity

Baseline: `2132924a2afcff95628828aff0a8a1f80c7710ee`, branch `playcanvas-port`.
Scope: CF-006 and CF-007 in [the code health audit](CODE_HEALTH_AUDIT.md).

Implementation commit: `bd37f66db15a0ac937363f36c0b60530d7337ed7`.
Verification commit follows the implementation and changes documentation/evidence only.
Live deployment: **verified live** on 2026-10-24 UTC through the existing publishing workflow.

## Corrected runtime contracts

The unchanged baseline was inspected through its real JavaScript classes before
editing declarations. [Captured runtime objects](evidence/007k/runtime-before.json)
show the unknown-ability `null`, actual accepted/rejected fields, live/snapshot
actor keys and an earned `{ speedBonus: 0.2, label: 'MOBILITY', expires: 20 }`
modifier.

- `CombatSimulation.ability()` returns `Ability | null`. Known lookups require
  narrowing. The input adapters safely ignore/release orphaned ability controls
  and clear an unavailable Riven follow-up. A grant-name lookup has an ID fallback.
  Aim-query declarations accept `null`, matching their existing zero-distance/
  fallback behavior; human aim policy code is unchanged.
- `CastEvidence` is the union of `AcceptedCastEvidence` and
  `RejectedCastEvidence`, discriminated by literal `accepted: true/false`.
  Rejections do not promise `ability`, `origin`, `angle`, `target`, `pending`,
  `sealed` or `finished`. Accepted records retain their actual pending/resolution
  states, optional finish/interruption fields, and shared ability identity.
  `latestAccepted` and `latestResolution` are accepted records. The actual journal
  producer now uses focused checked JSDoc (`@ts-check`), so its construction and
  mutation are checked against those types. Journal runtime operations are unchanged.
- `CombatModifier` names the supported numeric fields and optional descriptive
  `label`, with numeric expiry. It has no unrestricted `any` or arbitrary-property
  value signature. Generic targets can lack summoner meter/facing; `CombatPlayer`
  separately requires the player's meter, facing and movement state.
- `MatchActor` describes mutable live players and lifecycle fields. Reservation is
  optional until defeat and is deleted on respawn. Human/protection flags and
  score fields belong to `MatchActorSnapshot`; live scores remain in
  `match.actors[].record`. Camps have their own live/snapshot types. Match snapshots
  expose their existing settings, lane, result and other data as read-only views,
  including nested modifier observations and arrays. `active` is a read-only getter.
- Command and damage-option declarations describe the supported action and
  attribution fields. The incomplete `match-data.d.ts` now declares the existing
  defaults, validator and data exports, with one shared `MatchSettings` type.
- The scene's indicator callback accepts ordinary combatants; model-facing reads
  the known roster actor's required player angle. Those targets are the same live
  objects in normal matches. No presenter or camera policy was changed.

Snapshot contents, JSON data and diagnostic API shapes are unchanged. Read-only
is a TypeScript observer contract: this work does not freeze or deep-clone the
runtime's existing shallow snapshots.

## Configuration ownership

All five previously ignored settings remain supported. They enter through
`new CrownfallMatch(selected, { settings })`, pass through the existing
`CrownfallRules` / `matchSettings` validation, and are owned by that match's
`rules.settings`. Authored defaults remain in `MATCH_DEFAULTS`; there are no new
URL options, player controls or alternate tuning defaults. Existing validation
bounds and all default numbers are unchanged.

| Setting                | Exact default | Effective consumer                                                        | Application time                   | Nondefault evidence                                               |
| ---------------------- | ------------: | ------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `countdownSeconds`     |             3 | Match constructor initializes countdown; existing step loop decrements it | New match                          | 1.25-second countdown gates exactly through its last 0.25 seconds |
| `protectionSeconds`    |             2 | Respawn sets `protectedUntil` from the owning match                       | Each respawn                       | Nine seconds gives deadline 10 after respawning at match time 1   |
| `durabilityMultiplier` |           1.3 | Match constructor uses existing `Math.round(baseHealth * multiplier)`     | New match                          | 1.6 produces Kit 1040, Set 2000, Riven 1120 health                |
| `ultimateDealt`        |          0.04 | Existing hostile summoner-damage branch uses actual applied damage        | Each qualifying damage transaction | 100 damage at 0.12 gives 12 meter                                 |
| `ultimateReceived`     |         0.025 | Same branch updates the damaged summoner                                  | Each qualifying damage transaction | 100 damage at 0.06 gives 6 meter                                  |

Countdown/durability are initialization settings; changing those fields after
construction does not retroactively restart the timer or rescale living actors.
Use the constructor for a configured match. Protection and meter consumers read
the owner at their lifecycle/action boundary. Standalone training combat reads
`MATCH_DEFAULTS` for its unchanged meter rates. All eligibility conditions,
mitigation, damage clipping and the 100-meter cap remain in their original places.
Zero rates, friendly damage rejection and no meter from monster damage are tested.

HUD grace time and the CP target come from the match snapshot's existing settings.
Wilderness percentages come from the **earned modifier values**, so changing a
future reward configuration cannot relabel a buff already earned at a different
strength. Kit's Inner Flame percentage comes from its authored passive. Labels,
minus signs, durations and default strings remain identical; percentage formatting
keeps up to two decimal places without trailing zeroes. The match rules, Wilderness
reward logic, modifiers and passive data continue to own the actual calculations.

## Exact default parity

Before production edits, three complete default 3v3 matches were captured with
five ordinary bots and a deterministic command pilot in the local slot. The pilot
uses the existing public command boundary; no health, lifecycle, reward, policy or
clock state is injected. The simulation uses fixed `1/60` steps.

| Selected summoner | Ticks | Damage transactions | Deaths | Respawns | Winner / reason      |
| ----------------- | ----: | ------------------: | -----: | -------: | -------------------- |
| Kit               |  7602 |                 458 |     38 |       35 | Red / tickets        |
| Set               |  7706 |                 453 |     40 |       36 | Blue / tickets       |
| Riven             |  8279 |                 541 |     39 |       36 | Blue / total control |

The corrected implementation matches all three captured command-stream hashes,
per-tick state hashes and transaction-stream hashes **exactly**, plus the complete
final serialized match objects. State hashes include the full match snapshot,
cooldowns, grants, stance, cast evidence, committed facing and bot decision state.
Transactions are recorded in fixed-tick/actor order before bounded histories can
lose them. The comparison uses JSON representations, including their normal
non-finite-number serialization, with no floating-point tolerance.

[Immutable baseline fixture](tests/fixtures/default-contract-replay.json),
[replay helper](tests/helpers/default-contract-replay.js) and
[pre-edit capture output](evidence/007k/baseline-capture.txt).
The runtime contract suite also asserts exact default settings, all six max-health
values, 180 countdown ticks, the protection deadline and default meter generation
in both competitive and training combat. No expected baseline was regenerated
from the corrected production source.

## New tests and complete regression results

- [Compile-only contracts](tests/contracts.typecheck.ts): **21 expected compiler errors** plus guarded positive access
  for nullable lookups, un-narrowed/rejected cast
  fields, wrong modifier values, derived fields on live actors, optional
  reservation, computed activity, snapshot mutation, malformed commands and
  nonnumeric settings. These invalid accesses are never executed.
- [Runtime contracts](tests/runtime-contracts.test.ts): **16 new tests**, using real
  combat/match classes. They cover null lookups and orphaned holds/follow-ups,
  real cast/hit/transaction attribution, rejection fields, 128/64 history bounds,
  descriptive rewards, death/respawn data, exact defaults, every newly effective
  setting, meter eligibility/caps and all three complete baseline replays.
- [HUD contracts](tests/browser/hud-contracts.spec.ts): **two new browser tests**
  render the actual HUD with the actual simulation, settings and earned rewards.
  A small [component entry](tests/helpers/hud-contract-fixture.ts) is bundled in
  memory with the already-installed Vite. No production tuning/diagnostic API,
  dependency or project build configuration is added. Default strings match
  exactly; nondefault grace, CP, all four camp bonuses and Inner Flame are observed.
- Complete unit suite: **224 passed in 22 files**, 56.80 seconds.
- Complete production browser suite: **108 passed**, 25.7 minutes (second complete run; initial failure investigated below).
- Typecheck, ESLint, Prettier and production build: **passed**.
- Normal 3v3 combat/results/freeze/restart: **passed in 4.4 minutes**;
  [combat capture](evidence/007k/natural-combat.png) /
  [result capture](evidence/007k/natural-result.png).
- The initial complete browser run reported **107 passed / one failed** in 21.4
  minutes. The unchanged Riven preview test's combined assertion requires all 40
  render-frame samples to report `Running` as well as exact horizontal hip
  coordinates. An isolated original-test recheck also failed. A temporary copy
  with logging reproduced the same failure on the **untouched baseline**: three
  passes and one failure in four runs. The failed sample reported `Idle_6` while
  both horizontal hip coordinates remained exactly equal. Direct baseline/current
  coordinate sampling found zero X/Z drift in both builds. The presenter derives
  locomotion from actual displacement per render frame, while the test assumes
  uninterrupted running across every sampled render frame. Production animation
  code and the original test are intentionally unchanged in this goal.
  [Initial full run](evidence/007k/browser-initial.txt),
  [original-case recheck](evidence/007k/riven-recheck.txt),
  [baseline reproduction](evidence/007k/riven-baseline-observation.txt) /
  [baseline identity and unchanged-test hashes](evidence/007k/riven-baseline-reproduction.json),
  [coordinate samples](evidence/007k/riven-coordinate-comparison.json).
- The same Riven test passed unchanged in the second complete-suite run. That
  run also passed the natural match/results/restart case again in **8.0 minutes**.
- The existing Vite large-chunk advisory remains.

[Unit log](evidence/007k/unit-tests.txt),
[browser log](evidence/007k/browser-full.txt),
[typecheck](evidence/007k/typecheck.txt), [lint](evidence/007k/lint.txt),
[formatting](evidence/007k/format.txt), [build](evidence/007k/build.txt).
Existing coverage is retained, including Goal 007J destroy/remount, in-flight
loading, native listener/capture cleanup, rematch resource preservation, all six
animated actors, character selection, death/respawn and ordinary natural play.

Reproduce from `PlayCanvas/`:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run fmt
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

## Rendering, assets and protected systems

An isolated baseline production build and the corrected build were compared at
844×390 with the same paused roster fixture. All eight comparisons passed:
complete authoritative match/combat snapshots, environment, camera (`1e-6`
tolerance), stable model contracts including scale/grounding/position/animation,
GPU counters, three source downloads, and no browser errors.
Prematch captures are **pixel-identical: zero changed pixels out of 329,160**.
Six-model captures retain the same appearance and layout; independent real-time
animation phase is not claimed to be pixel-identical.

[Raw comparison](evidence/007k/comparison.json),
[prematch baseline](evidence/007k/baseline-prematch.png) /
[corrected](evidence/007k/candidate-prematch.png),
[six-model baseline](evidence/007k/baseline-six-models.png) /
[corrected](evidence/007k/candidate-six-models.png).

[Protected-file hashes](evidence/007k/protected-files.json) match the baseline for
21 files: the three original GLBs, styles, main entrypoint, Goal 007J shared asset
cache, character presenters/Kit animation, carved environment, authored character
data, AI, human aim policy, movement, camera/map-space data, Wilderness logic/data
and browser controls. No terrain geometry, CSS, asset, ability balance, rendering
policy, dependency or publishing configuration was changed.

Tested entry: `assets/index-BSBNewh8.js`.
SHA-256: `cd79f71c265c23f10a38052ea9fb35986012c8275869db4d95c39a4c0622f1ae`.

## Changed files

Production:

- `src/combat/combat.d.ts`, `match.d.ts`, `match-data.d.ts`, `human-aim.d.ts`:
  truthful contracts and shared settings types.
- `src/combat/combat-journal.js`: checked JSDoc, with unchanged record behavior.
- `src/combat/match.js`, `combat.js`, `match-data.js`: configuration consumers,
  nullable grant lookup and ownership documentation.
- `src/combat/ability-commands.js`, `ability-input.js`: optional assist annotation
  and safe unavailable-ability handling.
- `src/presentation/scene.ts`: generic target callback type and known actor facing.
- `src/ui/hud.ts`: authoritative settings/modifier/passive display values.

Tests: the six new files linked above (compile contracts, runtime tests, replay
fixture/helper, HUD browser tests/component entry). Documentation/evidence:
`TASK_007K_VERIFICATION.md` and `evidence/007k/`.

## Deployment and remaining limits

The [existing publishing workflow](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40043329362)
completed successfully for implementation commit
`bd37f66db15a0ac937363f36c0b60530d7337ed7`, including installation, all unit
tests, typecheck, build and publication. It produced `gh-pages` commit
`cd43d91352f4906925f73600542c83ac2a8f3493` with message
`deploy: bd37f66db15a0ac937363f36c0b60530d7337ed7`. The subsequent
[Pages build and deployment](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40043410475)
also completed successfully. No publishing configuration was changed.

The [live game](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/)
returned HTTP 200 on 2026-10-24 UTC. Both served JavaScript and CSS bytes have
**exactly the tested production build's SHA-256 hashes**, including entry
`index-BSBNewh8.js` and unchanged stylesheet `index-BG9Ns0t1.css`.
A fresh live Chromium session passed all ten checks: HTTP success, prematch phase,
exact default settings, three-second countdown, all six health values, all six
visible animated actors, unchanged zero-height grounding/unit root scale,
exactly three unique GLB requests, three cached sources and no browser errors.
This uses the existing verification fixture for the roster; the complete natural
match, results and restart were exercised by the production browser suite above.

[Deployment and job evidence](evidence/007k/deployment.json),
[live HTTP/hash evidence](evidence/007k/live-http.json),
[live browser evidence](evidence/007k/live-browser.json),
[live prematch](evidence/007k/live-prematch.png) /
[live six-model capture](evidence/007k/live-six-models.png).
The subsequent verification commit contains only this report and live evidence;
its `[skip ci]` marker avoids publishing an identical gameplay build again.

Validation uses Node 24.19, npm 11.9 and Linux Chromium 154 with SwiftShader.
It does not establish physical iPhone/Safari behavior or performance. The existing Riven render-frame assertion remains timing-sensitive, as documented
above; this goal does not alter animation policy or weaken its assertions. Most gameplay
JavaScript remains outside `checkJs`; the focused journal producer, declarations,
compile-negative tests and runtime integrations improve these specific boundaries
without claiming a full language migration. Runtime snapshots retain their
existing shallow sharing and JSON handling of non-finite numbers. Goal 007J's
native decoding/context-recovery limitations are unchanged. No multiplayer,
configuration UI or other audit cleanup is included.
