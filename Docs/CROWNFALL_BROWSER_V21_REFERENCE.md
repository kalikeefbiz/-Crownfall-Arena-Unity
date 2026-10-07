# PRESERVED BROWSER V21 REFERENCE

This document is a preserved historical handoff for browser Version 21. Its behavioral/source descriptions remain authoritative unless explicitly superseded by current Unity-branch design documents.

IMPORTANT: the final historical instruction in this document to avoid a one-shot conversion is superseded for the `browser-parity-unity` branch by `AGENTS.md` and `Docs/CODEX_BROWSER_PARITY_GOAL.md`. The current task is an end-to-end functional-parity pass, not another M0/M1-style migration milestone.

# Crownfall Arena — Unity handoff, Version 21

## Authoritative checkpoint and scope

| Field | Preserved reference |
|---|---|
| Commit | `5a73918bf4cd56cd54bdc98ba2a9929f4d347753` (`5a73918`) |
| Published version | 21 |
| Recorded automated validation | 186 passed, 0 failed |
| Recorded match validation | Three complete bot matches passed |
| Recorded build result | Passed |

These are the completed checkpoint results, not newly executed handoff tests. The source working tree was clean and matched this commit when packaged. No game files were edited, no deployment was performed, and no Unity work was started.

Crownfall Arena is a mobile-first **3v3 territorial combat game**. This browser project is the preserved behavioral reference. The production direction is a **new Unity project**, not further architectural conversion inside this browser repository.

## Package and inspection

`crownfall-browser-reference-v21.zip` contains the exact tracked source, assets, tests, project configuration, build tool, observation tool and reference documents from this commit. `SOURCE_SHA256.json` records each included original file's digest. The handoff document is also included. Generated `dist/`, hosting metadata, Git internals, caches, temporary uploads and private environment files are excluded.

Use current source and tests as the final authority on edge cases. Historical release documents and `CHARACTER_ASSET_CONTRACT.md` contain superseded milestone statements, dimensions and missing-art descriptions; they are retained for context, not as competing specifications.

Prerequisites: modern Node.js with the built-in test runner, npm, Python 3; Git is needed by historical regression guards. No npm dependency installation is required by the current package.

```sh
npm run build
npm start
# Open http://localhost:8080 (or /dist/ for the generated single-page bundle).
npm test
```

**Test-history limitation:** the source ZIP deliberately excludes `.git`. Several unchanged tests call `git show` against historical checkpoint hashes and will fail without the original repository history. To reproduce the full 186-test suite, use an original-history checkout at `5a73918`, or restore that history separately, then build before testing. The ZIP includes all current test source and fixtures; it is not a standalone historical Git backup. Behavioral tests remain useful Unity acceptance specifications. Do not weaken historical guards to make a history-free export appear to pass.

## Core match design

One Crownfall Lane crosses the arena along X, with Wilderness to either side along Z. There are no towers, minion waves, Nexus/base destruction, escort-minion victory or overtime. Training-target names in test fixtures do not introduce match minions.

Actual match geometry is `MATCH_MAP` / `MATCH_LANE` in `src/match-data.js`: 68 × 64 world units, territorial endpoints X = −28 and +28, lane half-width 12. Preserve the authored M7 boundaries, islands, routes, camp placements and collision data; the smaller training map is not the competitive arena.

Teams begin at 50/50. The authoritative front uses living, non-respawn-reserved Summoners within the lane. With both teams present and uncrossed, it is the midpoint between Blue's furthest forward X and Red's furthest forward X. When players cross, the prior front is clamped between those forward positions rather than automatically awarding the crossing player the entire lane. With only one side present, its forward position controls the front subject to the neutral boundary; neither side present returns it to neutral. With both sides present, the front is kept just inside the endpoints. Wilderness units do not directly push it. Team-wipe collapse toward neutral is implemented behavior, not a bug to redesign.

| Rule | Implemented value / behavior |
|---|---|
| Countdown | 3 seconds before active play |
| Forward-control pressure | Above 50% for one team; pressure age resets when the controlling side changes or control becomes neutral |
| Grace before CP | 2 seconds of sustained forward control |
| CP rate | 12 per second after grace; depth bonus is 0 |
| CP retention | Previously earned CP remains when pressure changes |
| Crownfall CP threshold | 1,000 CP wins |
| Territorial victory | Reaching 100–0 wins immediately |
| Regulation | 300 seconds of active match time |
| Timer resolution | Higher CP, then higher current territory, then draw |
| Other victory | All three opposing Summoners permanently eliminated; simultaneous absence of viable teams can draw |

Resolution order in `crownfall-rules.js` is total territorial control, team viability/elimination, CP threshold, then regulation-time resolution. A respawn-reserved Summoner remains viable. Match progression stops once a result exists. No new sudden-death phase is implied.

## Lives, respawns and shared combat rules

Each team starts with **15 shared tickets**. A death consumes a ticket while any remain and schedules a normal respawn. Once there are no tickets, each Summoner can consume **one personal final respawn**. A later death permanently eliminates that Summoner. The death that consumes the last shared ticket is still ticket-funded and does not also consume the personal final respawn. The team loses when all three are permanently eliminated.

Respawns take 3 seconds. Respawn protection lasts 2 seconds; offensive casts break protection, while buff/stance actions are exempt. Spawn/reset behavior, temporary states and weapon cleanup are defined in `match.js` and `combat.js`.

Match health uses a 1.3 multiplier on kit base health: Kit 845, Set 1,625, Riven 910. Base movement speed is 6 and collision radius 0.45. Damage below is nominal before modifiers. Temporary modifiers combine according to `modifiers.js`, not by a newly invented stacking rule.

Ultimate meter begins at 0, caps at 100, and a successful ultimate consumes it. Enemy Summoner damage grants 0.04 meter per point dealt and 0.025 per point received; camp damage does not generate ultimate. Existing ultimate cooldowns also apply. Preserve both gates.

## Summoners

Current matches contain Kit, Set and Riven on each team. The selected human is on Blue, with the other five actors bot-controlled.

### Kit Asher

| Action | Current behavior |
|---|---|
| Inner Flame passive | +5% movement speed while in tagged Wilderness |
| Solar Whip basic | Two-step cone sequence: 110 / 150 damage; range 2.8; cooldown 0.55 s; combo window 1.25 s |
| Ember Step | Forward dash, range 7, speed 24, width 0.65; 100 damage; cooldown 6 s. Two successful dashes prime the third to stun for 1.5 s; the empowered success resets the streak. A miss resets it. |
| Solar Ring | 360° radial attack, radius 3.5, damage 190, cooldown 4 s |
| The Last Flame | Ultimate: piercing Summoner-only projectile, damage 550, range 23, speed 16, width 1.15, cooldown 18 s |
| Expellant Blast | Hitting at least two distinct enemy Summoners with Last Flame grants a 15 s temporary cast opportunity. Blast is a non-piercing, Summoner-only lethal projectile, range 26, speed 32, width 0.85. Casting consumes the grant. Do not replace its lethal behavior with an invented fixed damage value. |

Basic supports existing held-repeat input; aimed abilities use the shared preview/release conventions. Dash direction, radial center and projectile direction come from authoritative cast state. Visual animation never determines damage timing.

Integrated visuals: authored idle, eight-frame run at 12 FPS, six-frame basic at 12 FPS; Ember Step retains run and leaves the supplied ground trail; Solar Ring uses the supplied ground ring; Last Flame uses the supplied travelling dragon; Expellant uses a temporary cast pose plus directional blast. All current assets remain unchanged.

### Set

| Action | Current behavior |
|---|---|
| Protective Presence passive | Nearby allied mitigation, 2%, radius 5; exact eligibility is in the aura implementation |
| Panther Claw basic | Punch / punch / kick: 90 / 90 / 135 damage; range 1.65; cooldown 0.5 s; combo window 1.15 s |
| War Cry | Self buff for 5 s: +25% damage and 20% mitigation; cooldown 10 s |
| Predatory Combo | Contact leap: range 4, speed 16, width 0.5. On contact, strikes for 70 / 90 / 160 at 0 / 0.18 / 0.4 s, with range 1.75 and a cone validity check per strike. Cooldown 8 s begins on leap completion, including a miss. Leap/sequence locks ordinary movement and casting; death/stun cancels. |
| Panther Fist | Ground-targeted ultimate: targeting range 14, radius 3, damage 460, impact after 0.7 s, cooldown 18 s. Target is clamped at commitment. |

Integrated visuals: idle, eight-frame run at 12 FPS, four-frame basic at 12 FPS, three-frame War Cry at 12 FPS. Predatory uses run during the leap and reuses the same four basic frames at **18 FPS only after successful contact**; miss does not play the combo. This shorter visual clip does not retime the three gameplay strikes. Panther Fist uses `001.png` as descending spectral claw and `000.png` as ground impact. No new art is needed to preserve these behaviors.

### Riven

Riven has two stances, initially **Reso Blades**, with a 3 s stance-switch cooldown. Basic and first-skill cooldown channels are shared across stances. Preserve the current stance button, indication and weapon state transitions.

| Stance/action | Current behavior |
|---|---|
| Reso Blades basic | Two persistent orbiting scythes. Each outbound scythe: 75 damage, range 8, speed 13, width 0.4, piercing; basic cadence/cooldown 0.48 s. After both launches, the next basic command recalls them. |
| Recall | Each scythe's base damage is `95 × (1 + min(outgoingHits, 6) × 0.25)`; return speed 17. Return tracks Riven; successful returns restore the orbit/sequence. Separate outbound and return hit tracking is preserved. |
| Elf Dance (Reso skill) | Five piercing scythe shots, interval 0.085 s, damage 48 each, range 9, speed 16, width 0.35; cooldown 4 s |
| Percussive Pulse basic | Non-piercing wave: 100 damage, range 8, speed 12, width 0.7; cooldown 0.6 s |
| Percussive Solo (Pulse skill) | Current implemented skill name: radial 130 damage, radius 3.8, cooldown 6 s; a 1.5 s zone applies 35% slow with 0.6 s refreshed slow duration |
| AMP'D | Shared buff, +30% damage for 3 s, cooldown 6 s |
| Death Scream / SCREAM | Shared ultimate, 55 damage, radius 6, 1.3 s stun, enemy Summoners only, cooldown 18 s |

**Version 21 basic input:** press snapshots current facing and enters targeting. Nothing fires while held, and movement remains independent of aim. Release after hold/drag confirms the preview direction. A quick tap (under 180 ms and not dragged) casts on release using the facing captured on press, without an extra hold delay. “Instant tap” does not mean firing on pointer-down: that would break hold-to-aim.

In Reso, an accepted first launch schedules the second through the existing cooldown cadence using the **same confirmed angle**. It does not fire both simultaneously or change their speed/damage. Recall remains a subsequent command. Interrupted/disabled/dead/stance-changed input clears pending follow-up state according to `ability-input.js`. Pulse also uses release-confirmed basic input. Bots retain their direct command behavior.

Integrated Riven art is idle plus eight run frames in the approved imported order, looping at 12 FPS with existing runtime mirroring and immediate return to idle when movement stops. Dedicated Riven attack/ability/scythe artwork has not been added; preserve current fallback/VFX behavior rather than assuming a complete authored animation set.

## Wilderness

There are **three minor camp types at six sites**, not only three total monsters: Mobility at (−22,−22)/(22,−22), Cooldown at (−18,24)/(18,24), Defense at (−7,−27)/(7,−27). Major Damage objective is at (0,26). These are X/Z coordinates.

| Camp | Reward / current parameters |
|---|---|
| Mobility | Killing Summoner gets +20% speed for 20 s |
| Cooldown | Killing Summoner gets 20% cooldown reduction for 20 s |
| Defense | Killing Summoner gets 20% damage mitigation for 20 s |
| Minor monsters | 850 health, 42 damage each 1 s, 45 s respawn |
| Major objective | 5,200 health, 110 damage each 1 s, 100 s respawn; securing team gets +25% damage for 25 s |

Camp AI has 9-unit aggro, 12-unit home leash, 3.8 movement speed and reach 2.3 (minor) / 3.2 (major). Without a valid target, after 2 s since last hit it heals and resets home. Respawn-protected players are excluded from aggro. Major buff is refreshed onto living teammates while the team reward remains active, including returning teammates. Kills are attributed through the existing damage source, not a new participation algorithm.

Wilderness rotations trade lane presence for buffs. Bots think every 0.15 s, advance, engage, pressure, retreat and return, and probe around obstacles. Camp coordination avoids rotations when fewer than three teammates are alive or team control is below 35%. It assigns healthy bots, generally one to a minor camp; major attempts can send two while requiring sufficient lane presence and at least 45% control. Team starts are staggered; exact schedules, cancellations and proximity priorities are in `wilderness.js` / `match-bots.js`. Preserve the implemented policy before proposing smarter Unity AI.

## Controls, lifecycle and presentation

Mobile movement and facing/aim are separate touch controls with simultaneous input support. Ability dragging updates the existing directional/ground preview; release commits. Typical non-Riven abilities support quick tap using the existing aim/default target and hold/drag to aim. Ground targets clamp to range; radial/self actions stay centered on the caster. Pointer cancellation/lost capture must not become casts; the current drag threshold is 12 px and cancellation distance 150 px. Kit/Set basic held-repeat behavior differs deliberately from Riven's release-to-cast behavior. Keyboard controls coexist with mobile controls.

Main Menu → Summoner Select → match intro/countdown → active match → victory → results → Play Again or Menu is part of the reference. Rematch creates a clean match. Pause and the control-layout editor must leave gameplay inert. Settings stores versioned local control-slot positions, scale and opacity; Save/Cancel/confirmed Reset and panel collapse preserve their existing semantics. Competitive score information is not draggable. A previously reported rapid-control-edit crash was outside the recent visual work; do not assume a fix from this checkpoint.

| Version 21 presentation | Reference value |
|---|---|
| Summoner size | 30% larger than Version 20, with proportionally scaled grounding offsets |
| Manifest scale / offset | Kit 2.6 / [0, 0.806]; Set and Riven 2.86 / [0, 1.001] |
| Names | 8 px |
| Health bars | 44 × 5 px |
| Scoreboard | Max width 290 px, compact padding and spacing; retains percentages, meter, CP, tickets, timer and pressure/scoring/neutral status |
| Territory fill | Desaturated team tint at 12% opacity, terrain visible beneath |
| Frontier | Restrained colored edge at the same authoritative front |

These are browser presentation references, **not mandatory Unity pixel/world measurements**. Collision, ranges and positions did not grow with the characters. Preserve original artwork and frame order. Some image paths have historical container/matte quirks; inspect actual bytes and alpha, not just `.png` extensions. Existing white-matte removal is a browser rendering workaround, not a requirement to copy into production shaders. Edge quality, scale and grounding ultimately need device review.

## Technical architecture and migration boundary

The browser uses JavaScript ES modules, a 60 Hz fixed simulation step with bounded frame delta, custom WebGL 1 world rendering, Canvas 2D combat feedback/nameplates and HTML/CSS interface. A small Python bundler builds `dist/`; no game engine or server-authoritative multiplayer stack is present. The current match is local human-plus-bots, not production networking.

| Source area | Responsibility |
|---|---|
| `match-data.js`, `crownfall-rules.js`, `match.js` | Map/match constants, front and victory rules, match orchestration, lives, protection, ult economy |
| `combat-data.js`, `summoners.js`, `riven-data.js` | Kit definitions and ability parameters |
| `combat.js`, `combat-core.js`, `advanced-actions.js`, `returning-weapons.js`, `modifiers.js` | Combat execution, swept hits, timed actions, weapon phases, buffs/status |
| `simulation.js`, `config.js`, `match-bots.js`, `wilderness.js` | Movement/collision, simulation configuration, AI and camps |
| `input.js`, `ability-input.js`, `control-layout.js`, `game-ux.js` | Input/targeting, editor and lifecycle |
| `character-visuals.js`, `character-renderer.js`, `renderer.js`, `arena-art.js`, `combat-view.js` | Authored clips, cached textures, terrain/front, world VFX |
| `tests/`, `tools/m7-match-observation.mjs` | Behavioral and historical regression evidence; complete-match observation |

Character visuals are data-driven, with idle/run/action clips, FPS, looping, anchors, offsets, mirror-facing, texture caching and safe fallback. Visual observers read authoritative events/state and do not control hit timing. Ground shadows stay at gameplay position. Rendering layers combine terrain/tint, ground effects/shadows, props/characters, combat VFX/telegraphs, Canvas feedback and HTML HUD. Exact depth behavior is in the renderer; do not mistake this practical ordering for a full production render graph. Loose large textures can be costly on mobile; caching avoids repeated decode but does not eliminate texture-memory cost.

### A. Carry behavior and design into Unity

Carry match rules and tie-break precedence; tickets/final lives; pressure/grace/CP; map coordinates/routes/collision; damage/ranges/cadence/status/ult economy; camp rewards/AI; independent move/aim and Riven release commitment; animation event semantics; menu/rematch/editor lifecycle; and regression scenarios. Use the preserved source to settle numerical and ordering questions. The current source and tests outrank historical prose.

### B. Do not translate browser architecture literally

Do not line-for-line port DOM/CSS UI, pointer-event plumbing, Canvas drawing, custom WebGL shaders/buffer management, browser projection hacks, texture matte workarounds, localStorage APIs, bundling or hosting/deployment plumbing. Implement equivalent behavior with Unity-native input, UI, animation/presentation, assets, scene management and persistence. Keep presentation independent of authoritative combat. No source requires a browser-sized coordinate or pixel to become a Unity hitbox.

## Unity implementation intent

Leave this browser reference untouched after handoff. Create a **new Unity project** with real **3D X/Z gameplay space**. Existing character and VFX artwork may initially be sprites/billboards, with a presentation interface that can later support true 3D characters without changing combat rules. Preserve behavior, not browser implementation details.

Do not attempt a one-shot full-game conversion. First establish a reproducible match/rules test harness and basic movement/collision; then migrate combat and lifecycle in bounded, testable increments, followed by presentation and device validation. Each phase should compare against this reference before expanding scope. This handoff authorizes no conversion, new art, rebalancing or deployment.