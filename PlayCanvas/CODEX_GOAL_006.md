# CODEX GOAL 006 — Total-Control Fix + Wilderness + Full-Loop Integration

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

This is a deliberately larger overnight goal. It combines two directly related gameplay tasks that should be completed sequentially, then performs an end-to-end Crownfall integration/hardening pass.

Do NOT expand beyond the authorized scope below.

## Read first

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/TASK_005_VERIFICATION.md`
- `PlayCanvas/CODEX_TASK_005A.md`
- `PlayCanvas/CODEX_TASK_005B.md`
- `PlayCanvas/CODEX_TASK_006.md`

Frozen behavioral authority:
`kalikeefbiz/Crownfall-Browser-V21-Reference`

## Current accepted baseline

Physical iPhone Safari acceptance:

- the match now feels like Crownfall
- Task 005A camera composition is strongly accepted
- the behind-player camera is locked
- camera smoothing/follow is locked
- enlarged mobile controls are accepted enough to continue
- scoreboard/full-results correction is accepted
- AI is currently overpowered, but AI/Summoner balance is intentionally deferred
- Task 006 Wilderness has NOT yet been implemented

One known gameplay defect remains:

- genuine full positional lane domination can fail to trigger the 100% total-control win because the current endpoint inset applies whenever both teams remain alive in-lane

This defect must be fixed FIRST, then Wilderness must be integrated on top of the corrected rule.

---

# PHASE A — Execute Task 005B completely

Execute `PlayCanvas/CODEX_TASK_005B.md` first.

Required result before proceeding:

- legitimate two-team positional domination can reach exact 100%
- total-control victory fires immediately
- mirrored Blue/Red cases both work
- no CP/grace requirement
- crossed-runner anti-backcap behavior remains protected
- Task 005A camera/control values unchanged
- all existing tests pass

Do not merely edit tests around the bug.

If Phase A fails, investigate/fix it before moving to Wilderness.

---

# PHASE B — Execute Task 006 completely

Once Phase A is green, execute `PlayCanvas/CODEX_TASK_006.md` completely.

This includes:

- transformed Wilderness regions
- Kit Inner Flame Wilderness passive
- six minor camps
- one major Damage objective
- neutral monster combat
- aggro / movement / leash / reset / respawn
- Mobility buff
- Cooldown buff
- Defense buff
- major team Damage buff
- reward attribution
- buff expiry/death/rematch reset behavior
- readable prototype presentation
- bot Wilderness rotation coordinator
- bot physical travel/combat through ordinary commands
- all required Wilderness unit/browser tests

Preserve all established Crownfall rules and Task 005A ergonomics.

---

# PHASE C — Full Crownfall loop integration and hardening

After both Task 005B and Task 006 individually pass, perform a deliberate integration pass over the complete playable match.

The purpose is NOT to add another feature family. The purpose is to prove that the systems already implemented work together as one game.

## End-to-end loop that must coexist

Verify the playable build supports:

1. Prematch / Summoner selection
2. 3-second countdown
3. 3v3 combat
4. shared 15-ticket lifecycle
5. final personal respawns
6. permanent elimination
7. respawn protection
8. positional Crownfall frontier
9. 50/50 neutral start
10. pressure/grace
11. Crownfall Points
12. genuine 100% total-control victory
13. anti-backcap crossing protection
14. Wilderness entry/exit
15. Kit Inner Flame
16. six minor camps
17. major objective
18. neutral-monster combat/reset/respawn
19. minor/major rewards
20. bot lane combat
21. bot Wilderness rotations
22. all four match resolutions:

- total-control
- points
- tickets
- regulation

23. full six-participant results
24. clean restart/rematch

## Integration-specific requirements

### Territory + Wilderness

- actors in Wilderness do not directly pressure the lane
- leaving lane for a camp can reduce a team's territorial presence naturally
- returning to lane restores positional eligibility naturally
- no camp, buff, or assignment may directly mutate front/control/CP

### Total control + rotations

- Wilderness rotations must not make the anti-backcap fix regress
- a genuine ordered positional push can still reach exact 100%
- a crossed runner still cannot steal the endpoint
- bot rotations can create lane weakness naturally, but the coordinator itself never edits territory

### Camps + lifecycle

- monsters cannot attack dead/eliminated/protected actors when disallowed by source rules
- minor buffs clear on death as required
- major team buff resumes on respawn only for its remaining authoritative duration
- eliminated actors never receive new active gameplay state
- rematch recreates clean Wilderness/camp/reward state

### Camps + combat economy

- neutral damage never generates Ultimate Meter
- Summoner-only abilities continue excluding monsters
- normal eligible attacks can hit monsters
- monster kills do not become enemy-Summoner K/D/A kills
- camp reward attribution never corrupts participant K/D/A or assist logic

### Results

- all six participant rows remain present
- controller type stays metadata only
- Wilderness systems do not make results human-only or bot-only
- pressureSeconds remain lane-scoring participation, not camp participation
- do not invent a new overall score formula

### Camera / controls

LOCK:

- Task 005A camera offset and forward look-ahead
- fixed behind-player heading
- smoothing rate
- landscape ability button sizes
- Riven release semantics
- Kit/Set held-repeat semantics
- touch cancellation semantics

Do not "improve" these during the overnight goal.

---

# PHASE D — Long-form deterministic regression

Add or retain bounded automated scenarios that exercise the whole loop rather than isolated systems only.

At minimum:

## Full-match simulations

Run multiple deterministic complete matches with different selected human Summoners.

Across the set, prove:

- all six actors remain finite/valid
- normal combat damage occurs
- deaths occur
- tickets are spent
- respawns occur
- final lives can be reached
- territory moves
- CP accrues
- Wilderness rotations occur
- minor camps are fought
- at least one minor reward occurs
- at least one major attempt occurs
- at least one major reward occurs across the deterministic set if reasonably attainable under the preserved source policy
- a valid Crownfall result occurs
- results contain all six participants
- restart creates a clean playable state

Do not force every single match to hit every feature.

Use deterministic seeds/fixtures where needed, but keep at least one ordinary no-fixture full playable simulation.

## Victory-condition regression

Explicitly preserve tests for:

- natural total-control with both teams alive in normal ordered formation
- crossed-runner anti-backcap
- CP victory
- tickets/elimination victory
- regulation by CP
- regulation by territory
- regulation draw

## Browser/mobile integration

Production-browser coverage should include:

- current camera composition
- enlarged controls
- real touch movement
- real touch combat
- travel into Wilderness
- visible camp
- visible buff
- territory remains readable
- result screen remains usable
- no critical overlap at existing landscape viewport targets

Do not replace real touch coverage with mouse-only tests.

---

# PHASE E — V21 gameplay parity audit (read-only except documentation)

After implementation and all tests are green, perform a focused source-to-port gameplay audit against the frozen V21 reference.

Create:

`PlayCanvas/TASK_006_PARITY_AUDIT.md`

The audit should categorize remaining differences:

- **Implemented / parity**
- **Intentional PlayCanvas adaptation**
- **Known presentation difference**
- **Still missing gameplay**
- **Deferred balance**
- **Future multiplayer/networking**
- **Production art/audio**

Do not implement new systems merely because the audit finds them.

The audit exists to prevent the next chat/task from inventing Crownfall or accidentally reviving obsolete designs.

Explicitly confirm in the audit:

- one Crownfall Lane
- lateral Wilderness
- no towers
- no minion waves
- no Nexus/base destruction
- no Crown Core
- territory/front position is authoritative
- total-control / points / tickets / regulation are current win-resolution paths
- 15 shared tickets + one personal final respawn per Summoner
- current Kit/Set/Riven kits
- six minor Wilderness camps + one major objective

If the frozen V21 source and current port disagree materially on a gameplay behavior not already authorized for correction, document it rather than silently changing it.

---

# OUT OF SCOPE

Do NOT implement:

- networking
- matchmaking
- server authority
- online lobby
- production art pass
- character-art migration
- audio
- item shop
- towers
- minions
- Nexus/base destruction
- Crown Core
- new Summoners
- final AI balance
- final Summoner balance
- new map redesign
- camera redesign
- control-layout redesign
- monetization/meta progression

Do not modify Unity.

---

# VALIDATION

At the end run and fix:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run fmt`
- `git diff --check`
- `npm run build`
- full production-browser suite

All retained Task 002A, Task 003, Task 004, Task 005 and Task 005A regression coverage must remain green.

Do not stop at compile success.

---

# COMPLETION CRITERIA

This Goal is complete only when:

- Task 005B total-control correction is implemented
- natural 100% territorial victory works
- anti-backcap behavior remains
- Task 006 Wilderness is fully implemented
- all camps/rewards/monster behavior work
- bot rotations work through ordinary commands
- total-control/CP/tickets/regulation still work
- lifecycle remains correct
- touch combat remains correct
- camera/controls remain unchanged from Task 005A
- complete six-participant results remain correct
- clean rematch works
- deterministic full-loop tests pass
- parity audit document is produced
- unit tests pass
- browser tests pass
- typecheck/lint/format/diff/build pass
- changes are committed to `playcanvas-port`
- existing `/playcanvas/` deployment is triggered

## Final report

Report:

1. final commit SHA
2. exact root cause/fix for total-control issue
3. Wilderness systems implemented
4. bot rotation behavior implemented
5. transformed camp coordinates
6. full-match integration evidence
7. all victory conditions exercised
8. unit test count/result
9. browser test count/result
10. typecheck/lint/format/diff/build results
11. deployed preview URL
12. parity-audit path
13. remaining V21 differences
14. physical iPhone acceptance items still remaining
