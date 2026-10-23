# Goal 007H — human soft aim assistance

Playable: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>.
Baseline: Goal 007F verification commit `e870ab9`, including Goal 007E's six models.

## Behavior and tuning

Normal matches default to **Aim Assist: On**. Only undragged **touch** basic
attacks use assistance. Keyboard and mouse retain their existing command path.
The compact top-right toggle works during a match without resetting it, has a
44px minimum touch height and exposes its state with `aria-pressed`. Only the
explicit On/Off preference is stored locally; storage failure does not block play.
`?aimAssist=0` and `?aimAssist=1` override the stored preference for comparisons.
The training/debug default remains Off unless explicitly enabled or saved On.
Debug mode uses the query parameter; its legacy control panel keeps that corner.

| Basic attack             | Center-to-center acquisition distance | Calculation                |
| ------------------------ | ------------------------------------: | -------------------------- |
| Kit — Solar Whip         |                                   3.3 | Authored 2.8 range + 0.5   |
| Set — Panther Claw       |                                   2.2 | Authored 1.65 range + 0.55 |
| Riven — Reso Blades      |                                   6.0 | Authored 8 range × 0.75    |
| Riven — Percussive Pulse |                                   6.0 | Authored 8 range × 0.75    |

Edit the explicit ability allowlist in `src/combat/human-aim.js` to tune acquisition
padding/scaling. Keep changes confined to that policy, rerun the retreat-and-fire
comparisons, and playtest on the phone. Acquisition can occur slightly beyond
melee hit reach: a marker does **not** promise a hit. Target radius is never added
to acquisition distance. Ability reach, cones, projectiles, damage and cooldowns
are unchanged. No additional directional skills are assisted in this milestone.

The input adapter emits ordinary ability actions with a sampled angle. Selection
uses `uniqueTargets()` and authoritative `valid(target, team, true)`, additionally
excludes eliminated/self actors, and tests the segment against the current
simulation's wall rectangles. It does not call the movement collision query or
mutate collision statistics. Nearest squared distance wins; equal distances use
ordinal actor-ID ordering. There is no facing cone or front/back restriction.
AI controllers do not use the module, and competitive selection rejects a
simulation that is not `match.human`.

Kit/Set held touches reacquire only when the existing cooldown is ready for an
attack tick. Direction remains fixed after cast. Drags beyond the existing 12px
threshold remain manual for that press, even if the finger returns to the center;
the existing 150px cancellation threshold remains. Movement components pass
through the command boundary without modification. Authored dash/combo movement
locks remain in combat authority.

Riven still casts on release. Release samples one assisted or manual direction;
the scheduled second outgoing scythe retains that exact angle even if a closer
enemy appears. Recall does not acquire a target, and orbit/recall logic is
unchanged. Stances, radial/self skills, ground targeting, movement skills,
ultimates and Expellant Blast keep their controls.

Feedback lasts 0.4 simulation seconds: a small diamond on the existing visible
actor label and “Assisted”, “Manual aim”, or “No nearby target” near the basic
button. It never creates an off-screen arrow or reveals another actor. Invalid,
protected, blocked or out-of-range feedback is removed without reacquisition.
Death/stun, cancellation, blur, hidden-page events, capture loss, orientation,
character selection and restart clear their appropriate pending input state.

## Verification

The new unit suite covers all four distances, nearest/ID ties among three enemies,
all eligibility exclusions, authoritative walls, actual melee transactions behind
a retreating player, exact On/Off movement equality, manual drags/cancellation,
sub-tick quick taps, interval-only held reacquisition, death/range changes, Riven's
confirmed two-scythe sequence and recall/orbit, Pulse, desktop input and 30/60/120Hz
render partition equivalence. An acquisition-boundary case proves assistance can
miss. An identical ten-second match replay asserts **all** bot state and decisions
are unchanged with assistance On versus Off. A separate live match places the
human ahead of three unmodified pursuing bots and asserts damage and retreat.

The [single-tick retreat comparison](evidence/007h/retreat-comparison.json) records
identical movement `(0, +1)` and displacement `(0, +0.1)` in both modes. With one
unprotected enemy behind the player, Kit deals 110 and Set 90 damage with
assistance; both deal zero with assistance Off. On casts at π radians and Off at
0 radians. These are unchanged authored first-strike values in the isolated
fixture; normal match modifiers still apply.

The new production browser suite uses trusted CDP touch events with real pointer
capture. Kit and Set move away while attacking rear pursuers: assistance On
records damage transactions and a backward cast angle; Off records the original
forward angle and no hit. Both retain the same joystick vector. It also verifies
Riven release/recall, opposite-direction manual aiming, cancellation, blur,
released pointer capture, orientation, twelve rapid consecutive presses, viewport
scale/text-selection stability, narrowly scoped gesture guards, live toggling,
selection/reset, and combat against three live bots. Brief feedback assertions
pause immediately after the first authoritative cast so they cannot race expiry.
The existing desktop lifecycle test allows 30 wall seconds for its real
three-simulation-second countdown on software WebGL; the repeated three-character
touch case has a 120-second overall budget. Phase, damage and life assertions are
retained.
The focused interaction tests use the existing primitive-model option; the full
suite retains default six-model/terrain and natural-match regressions.

- Unit suite: **207 passed in 21 files**. [Log](evidence/007h/unit-tests.txt).
- Full production browser suite: **100/100 passed**, no retries, in 27.7 minutes. [Log](evidence/007h/browser-full.txt).
- Typecheck, lint, formatting and production build logs are in `evidence/007h/`.
- Typecheck, ESLint, Prettier and production build passed.
- The natural normal-match case passed with all original bots, authoritative
  damage/deaths/results, frozen results and clean restart. It took 10.3 minutes
  on this software-rendered host.
- The existing Vite large-chunk advisory remains; no assets were changed.

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

After publication, this helper compares the live entry bundle's SHA-256 with the
tested local build, then repeats Kit/Set On/Off genuine-touch retreat transactions
with **all six animated models** and saves snapshots/screenshots:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/verify-aim-deployment.ts
```

## Publication and live verification

Implementation commit: `dc5d2c42a97e516e6829a2adc09cb3826b404574`, pushed to
`playcanvas-port`. The [publishing workflow](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/39949834499)
passed install, all 207 unit tests, typecheck, build and upload. The
[GitHub Pages deployment](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/39949920158)
also passed. The existing Unity root is retained; this game remains at `/playcanvas/`.

Live verification completed on 2026-10-23 at 12:02 UTC. The page and entry bundle
returned HTTP 200, and the hosted bundle matched the tested local build byte for byte:

- Entry: `assets/index-JJhsRHL1.js`.
- SHA-256: `0de48a6aee519856f86f6ba536d5ea4d0bf0948bce42a3814376cbbd2a84ab4e`.
- All four live comparisons retained six visible animated summoner instances at
  unchanged gameplay Y=0. No browser exceptions occurred.
- Each used a genuine captured movement touch and separate captured attack touch.
  The joystick vector remained `(0, 0.2222222222222222)` and the human continued
  moving in +Z. Assisted casts faced -Z (π); disabled casts faced +Z (0).

| Summoner | Assistance On                                      | Assistance Off | Live captures                                                                 |
| -------- | -------------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Kit      | Three rear-enemy transactions of 107.8 damage each | No enemy hit   | [On](evidence/007h/live-whip-on.png) / [Off](evidence/007h/live-whip-off.png) |
| Set      | Three rear-enemy transactions of 88.2 damage each  | No enemy hit   | [On](evidence/007h/live-claw-on.png) / [Off](evidence/007h/live-claw-off.png) |

The existing enemy Set aura supplies the normal 2% damage reduction in these
six-actor fixtures. Cone reach and damage are unchanged. Live event timing varies
between runs; the single-fixed-tick unit comparison above proves exact movement
and displacement equality independently of that browser scheduling.

[Raw live snapshots and hashes](evidence/007h/deployment.json),
[verification output](evidence/007h/deployment-check.txt),
[live pursuit test capture](evidence/007h/007h-live-pursuit.png),
[natural combat](evidence/007h/natural-combat.png) and
[natural result](evidence/007h/natural-result.png).

## Mobile gestures and remaining device checks

The viewport already allowed zoom; it still has no `maximum-scale` or
`user-scalable` restriction. Gameplay surfaces already used `touch-action: none`.
This change additionally prevents cancelable touch/gesture/double-click defaults,
callouts, selection and dragging **only** on the canvas, joystick and ability
buttons. Pointer events and capture remain the source of combat input; no second
touch/click path can cast an ability twice. Menus, setting controls and selects
retain browser defaults. Select controls now use at least 16px text to avoid
Safari's automatic focus zoom. Orientation/layout resize releases stale captures.
Canvas sizing no longer reacts to every visual-viewport resize caused by zoom or
browser chrome; it still follows layout-window resize/orientation.

Automated touch/zoom results use Linux Chromium 154 with software WebGL. They do
not establish physical iPhone Safari gesture behavior, performance or touch feel.
The prior two physical iPhone matches were the user's baseline, not a test of this
new build. iOS can retain Safari page-zoom settings and OS accessibility gestures,
which web content cannot reliably override. If browser scaling persists, restore
Safari Page Zoom to 100% and try **Add to Home Screen** in landscape to remove
browser chrome; OS accessibility zoom remains available. Retest rapid taps,
movement plus attack, manual drag/cancel, orientation/background recovery and a
complete rematch on the actual phone before declaring physical-device acceptance.
