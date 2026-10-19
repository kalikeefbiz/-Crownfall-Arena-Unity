# Task 002A — physical-touch combat acceptance

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`, branch `playcanvas-port`.

## Verified root causes

1. **Dropped Kit/Set press edges:** Basic existed only as `attackHeld`. A valid down/up pair before the next sample produced no action. Two new regression tests failed against the original code with an empty actions array. Reading intentions on a rendered frame with no fixed tick could also acknowledge the hold before it was consumed.
2. **Damage was visually suppressed:** the scene explicitly skipped `number` effects. It did not flash targets or distinguish accepted casts from actual hits/misses. Legacy `Solar Whip · hit 1` text described a combo step even when nothing was damaged.
3. **Misleading geometry/facing:** the universal preview was a 2.8 m line for every ability, including Set's 1.65 m cone and radial/ground actions. Raw screen-axis drag did not account for the actual perspective camera. Initial/reset presentation could face Front or preserve an old committed facing while combat reset to north.
4. **Silent cancellation and difficult QA:** the retained Version 21 150 px cancellation threshold was not explained on screen, and the original targets lacked a single labeled acceptance case.

No independent Riven release-buffer defect was reproduced. Release-confirmed commands survived ordinary pointerup → lostpointercapture ordering. Tests now explicitly distinguish that ordering from an established capture being lost before release. Holding Riven without releasing remains intentionally inert. Physical Safari must still confirm its native delivery/gesture behavior.

## Exact fixes

- `AbilityCommands` retains a valid unsampled Kit/Set press as one explicit command on release. Sampling a held press consumes that initial attempt; held repeat remains immediate and keeps source cooldown/combo cadence. Cancel/lost capture/blur/disable removes unconfirmed input. Riven never gets a press-edge cast.
- `CommandStepper` samples/synchronizes intentions only when a 60 Hz tick actually consumes them. Releases survive sub-tick rendered frames; follow-up scythes use the captured angle and established cooldown channel.
- `AbilityInput` binds real PointerEvents/capture to this state. Camera-derived ground-plane drag mapping preserves continuous aim; the source thresholds are unchanged.
- `CombatJournal` observes acceptance/rejection reasons and actual damage. Pending projectile, barrage, dash, contact/strike and ground-impact work completes its original cast record when the work finishes. HIT counts distinct damaged targets; MISS is resolved only after an offensive action finishes without damage. Buffs/stance report DONE. Evidence is bounded and does not drive gameplay.
- World presentation observes journal hits for flash/pulse and floating damage. Large HIT/MISS/ACCEPTED feedback and readable cast/result/transaction diagnostics replace inference from tiny HP changes. Cone combo wording says strike rather than claiming a hit.
- Preview geometry reads actual cone arc/range, projectile width/range, dash/contact path, radial radius, ground clamp/radius and returning-weapon paths. Ground projections use the current PlayCanvas camera.
- Reset/selection clears old presentation locks and aligns initial visible facing with combat direction.
- A gold enemy Summoner named MOBILE TEST sits at `(0.65,4.1)`, 1.11 m from spawn `(0,5)`. It is a valid unbuffed Basic target for every kit under the existing hit rules. All six original targets and all combat values remain unchanged.

## Touch-only production-browser scenarios

The new `tests/browser/touch-combat.spec.ts` uses landscape mobile contexts, CDP `Input.dispatchTouchEvent`, native pointer capture and recorded trusted `pointerType=touch` events. Combat actions use no mouse, keyboard or test-only cast API. Character setup uses the selection control. Assertions inspect real HP, damage transactions and cast evidence.

1. Kit back-to-back touch down/up: 110 damage to MOBILE TEST, visible HIT and damage number.
2. Set back-to-back touch down/up: 90 damage, visible HIT and damage number.
3. Riven hold: zero cast/damage while held; valid release survives normal capture loss and deals 75 + 75.
4. Riven quick tap and touch stance switch: Reso release works; Pulse also waits for release and deals 100.
5. Simultaneous movement finger + Basic finger: movement and real damage resolve independently.
   6–8. Kit aimed skill, Set aimed skill and Riven Basic touchcancel: zero cast/damage.
6. Riven established capture loss before pointerup: zero cast/damage. The test waits for genuine gotpointercapture before releasing capture and requires genuine lostpointercapture before pointerup.
   10–12. Aimed Ember Step, Predatory Combo and Elf Dance: real per-ability transactions through touch.
7. Solar Ring: 3.5 m radial preview and real 190 damage through touch.
8. Panther Fist: 14 m clamped ground marker / 3 m radius and real 460 damage to the unchanged line target through touch.
9. Set 1.65 m cone preview; visible >150 px cancellation; empty-path Riven release resolves MISS with zero transactions.

The new unit tests also force down/up and cancellation across 8 ms render frames with no consuming tick, prove immediate held-repeat timing without a release duplicate, verify Riven's second confirmed scythe, check journal lifecycle/target counts, and validate preview geometry/reset facing.

## Results

- Unit/non-rendering: **96 passed, 0 failed**, including all 78 original assertions.
- Production-browser: **24 passed, 0 failed** (nine original + 15 touch-only cases).
- Typecheck: passed.
- Lint: passed.
- Formatting: passed.
- Production build: passed; retains the non-failing large-bundle advisory.

A final verification run exposed an intermittent 15 s software-WebGL startup timeout before character selection. The new mobile fixture allows 30 s only for six warmup frames; combat/damage predicates remain at the existing timeout and no retries are configured.

The full original Task 001/002 test files remain unchanged. Tests use the production bundle served by Vite preview. Screenshots under ignored `test-results/` include touch Basic HIT and empty-path MISS acceptance images.

## References and scope

Read `MIGRATION_CONTRACT.md`, `REFERENCE_SOURCES.md`, `CODEX_TASK_002.md`, `COMBAT_PARITY.md` and `CODEX_TASK_002A.md`. Audited the frozen reference at `35082348aef27ad4eaed436e369a290ce7bf6c57`, especially `src/ability-input.js` and `tests/ability-input.test.js`, alongside current combat geometry, definitions, advanced actions and returning weapons. The reference checkout remains read-only.

No changes to damage, ranges, widths, cooldowns, combo windows, statuses, buffs, ultimate economy, hit eligibility or Riven stance/weapon rules. No Unity files, match systems, bots, networking, artwork or audio were added/changed. The task markdown receives formatting only.

Public preview: https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/

Final commit SHA and deployment workflow run are reported in the completion message.

## Physical iPhone Safari acceptance still required

Recheck the deployed build on the actual phone: gold target label/readability, brief taps, Kit/Set hold repeat, Riven release and recall, simultaneous fingers, gesture/capture interruption and the red cancellation threshold. Confirm diagonal aim feel, safe areas/orientation and sustained GPU/thermal/frame pacing. Chromium touch tests establish the complete DOM-to-damage path, but do not establish native Safari event ordering or physical touch feel.

## Files changed

- `PlayCanvas/CODEX_TASK_002A.md`
- `PlayCanvas/COMBAT_PARITY.md`
- `PlayCanvas/README.md`
- `PlayCanvas/TASK_002A_VERIFICATION.md`
- `PlayCanvas/src/combat/ability-commands.js`
- `PlayCanvas/src/combat/ability-input.d.ts`
- `PlayCanvas/src/combat/ability-input.js`
- `PlayCanvas/src/combat/advanced-actions.js`
- `PlayCanvas/src/combat/combat-journal.js`
- `PlayCanvas/src/combat/combat.d.ts`
- `PlayCanvas/src/combat/combat.js`
- `PlayCanvas/src/combat/command-stepper.d.ts`
- `PlayCanvas/src/combat/command-stepper.js`
- `PlayCanvas/src/combat/returning-weapons.js`
- `PlayCanvas/src/combat/sandbox.js`
- `PlayCanvas/src/gameplay/simulation.ts`
- `PlayCanvas/src/main.ts`
- `PlayCanvas/src/presentation/ability-preview.ts`
- `PlayCanvas/src/presentation/combat-overlay.ts`
- `PlayCanvas/src/presentation/scene.ts`
- `PlayCanvas/src/style.css`
- `PlayCanvas/src/ui/hud.ts`
- `PlayCanvas/tests/ability-preview.test.ts`
- `PlayCanvas/tests/browser/touch-combat.spec.ts`
- `PlayCanvas/tests/combat-journal.test.js`
- `PlayCanvas/tests/touch-commands.test.js`
