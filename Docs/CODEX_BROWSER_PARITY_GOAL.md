# Codex Goal — Crownfall Browser V21 to Complete Unity 3D Parity

## Objective

Using the existing Unity project on branch `browser-parity-unity`, produce one complete playable 3v3 Crownfall Arena match that carries the proven browser game's systems into Unity-native 3D X/Z gameplay.

This is not a request for another migration milestone. Continue across systems until the game-shaped loop is complete.

## Inputs

- Existing Unity project and all current work on this branch.
- `AGENTS.md`.
- `Docs/CROWNFALL_BROWSER_V21_REFERENCE.md`.
- Current Unity design docs, especially:
  - `Docs/COMBAT_FRAMEWORK.md`
  - `Docs/COMBAT_ECONOMY_V01.md`
  - `Docs/FIRST_ROSTER_BALANCE_V01.md`
  - `Docs/MACRO_PRESSURE_SURGE.md`
- The preserved `crownfall-browser-reference-v21.zip` when supplied to the Codex task. Inspect the actual source/tests/assets inside it. Do not rely only on the prose handoff.

## Critical precedence

Do **not** blindly copy stale V21 numerical tuning over deliberate post-V21 Unity decisions.

Use current Unity docs/configuration for intentionally revised combat/economy values. Use V21 for the complete proven behavior and edge cases that the Unity branch has not superseded.

When uncertain whether a difference is a deliberate revision or unfinished migration debt, inspect commit/docs/context and preserve the newer explicit decision rather than silently reverting it.

## Required end-to-end systems

Implement/integrate enough of the following for a complete match:

- Main menu and Summoner selection.
- Kit, Set and Riven selectable as the human Blue Summoner.
- Five bot-controlled Summoners completing both teams.
- True 3D X/Z movement, collision and camera.
- Independent movement and aim on mobile-first landscape controls.
- Directional/ground/self targeting and release/cancel semantics.
- Functional Kit, Set and Riven combat kits, including Riven stance behavior.
- Health, damage, CC/buffs, cooldowns, ultimate gates and current recovery policy.
- Death, shared tickets, respawn protection, final personal respawns and permanent elimination.
- Crownfall Lane territorial front and reversible pressure.
- Crownfall Points/victory logic plus current post-V21 Surge policy.
- Wilderness traversal.
- Six minor camp sites across Mobility/Cooldown/Defense and the Major Damage objective.
- Camp combat, rewards, reset/respawn behavior.
- Bots that can lane, fight, retreat/return and make useful Wilderness rotations.
- Match countdown/timer.
- Valid victory/defeat/draw resolution.
- Results, replay and menu return.
- Readable HUD for health, abilities, team tickets/final-life state, timer, territory/CP and relevant stance/buff state.

## Art/presentation rule

Use the real available character art during this first complete build.

Kit, Set and Riven do **not** need 3D character models before parity is complete. Existing directional 2D assets are acceptable production presentation inside the 3D battlefield.

Use all supplied directional side/front/back or mirrored movement/action art where available. Do not delay the match waiting for a theoretically complete 3D art set.

If browser-reference art needs to be copied/imported into Unity, preserve source bytes and frame order. Do not regenerate or 'fix' artwork because of preview/transparency assumptions without runtime evidence.

Where an individual action truly lacks art, use the smallest temporary presentation fallback and keep going.

## Scope discipline

The priority is **complete executable gameplay**, not infrastructure expansion.

Do not:
- stop after creating a framework for a later system;
- create speculative architecture for ranked, matchmaking, monetization or networking;
- add new Summoners;
- production-polish every effect before the match works;
- redesign the game's core loop;
- translate browser DOM/Canvas/WebGL code line-for-line;
- weaken current tests merely to obtain green output.

You may make broad coordinated changes across scenes/scripts/configuration/prefabs/UI when necessary to achieve the complete loop.

## Execution approach

1. Inspect the entire Unity project and the full V21 browser reference before changing architecture.
2. Build a migration map from existing Unity systems to remaining browser-parity systems.
3. Reuse working Unity code where sensible.
4. Remove/consolidate intermediate scaffolding if it materially obstructs the complete target.
5. Implement across the full match rather than requesting approval after every subsystem.
6. Continuously compile/test whatever can be validated in the Codex environment.
7. Keep the branch in a coherent state and make logical commits/checkpoints.
8. Do not start a paid/limited Unity Cloud build unless the user explicitly requests it.

## Completion report

Do not report 'done' merely because code was written.

At completion report:
- exact branch/head SHA;
- systems completed;
- browser behaviors intentionally preserved;
- post-V21 Unity decisions preserved;
- production assets integrated for Kit/Set/Riven;
- placeholders that remain and why;
- tests/compilation/runtime checks actually executed;
- any Unity-only/device-only checks still required;
- any known blocker preventing a complete 3v3 match.

The success criterion is a coherent Unity project whose next meaningful verification is playing the complete match, not another foundation milestone.
