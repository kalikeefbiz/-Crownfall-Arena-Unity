# Crownfall Arena PlayCanvas Port Contract

## Purpose
Build a code-first PlayCanvas implementation of Crownfall Arena while preserving the Unity implementation as a read-only behavioral/reference source.

## Non-negotiable rules
- Work only on branch `playcanvas-port`.
- Do not modify, delete, rename, or migrate existing Unity files unless a later task explicitly authorizes it.
- New PlayCanvas code lives under `PlayCanvas/`.
- Unity remains the reference implementation for proven behavior.
- This port is not a visual downgrade. Preserve the 2.5D target: real 3D arena/environment, controlled MOBA camera, mobile-first controls, and replaceable character presentation.
- Do not invent new gameplay rules to make the port easier.
- Gameplay simulation must remain independent from presentation/art.
- Continuous aim remains continuous. Directional sprite presentation may classify Front / Back / Side, with Left mirrored from Side.
- During targeting/pre-cast, aim direction owns presentation facing.
- Outside targeting, movement direction owns presentation facing.
- On cast commit, capture/lock the presentation direction for the action.

## Crownfall core reference
- Mobile-first 3v3 territorial combat.
- Single Crownfall Lane plus Wilderness.
- No towers, minion waves, or Nexus.
- Territory starts 50/50 and front shifts.
- Crownfall Points come from forward territorial pressure.
- 15 shared tickets per team.
- After team tickets reach zero, each Summoner gets one final personal respawn; after that death they are permanently eliminated.
- Team loses when all three Summoners are permanently eliminated.
- Wilderness has six minor camps, three per side: Mobility, Cooldown, Defense.
- Major objective grants a temporary Damage buff.

## Technical slice target
The first PlayCanvas slice is intentionally narrow:
1. 3D test arena with lane readability.
2. Elevated/slightly angled MOBA camera.
3. Kit player root.
4. Landscape mobile movement control.
5. Independent aim/targeting control.
6. Four-direction presentation: Front, Back, Right Side, Left mirrored.
7. Kit basic attack.
8. One target dummy with health/damage/defeat diagnostics.
9. Mobile HUD shell with Basic, Skill 1, Skill 2, Ultimate positions.
10. Browser deployment suitable for iPhone testing.

## Kit reference
- Kit basic range: 2.8.
- Basic attack remains simulation-owned, not animation-event-owned.
- Current directional presentation art in the Unity repo is reference material.
- Do not regenerate art during engineering tasks.
- Ember Step, Solar Ring, Last Flame, and Expellant are later milestones, not Task 001.

## Acceptance philosophy
A task is not complete because TypeScript compiles. It must:
- build successfully,
- run in browser,
- expose enough diagnostics to verify behavior,
- have automated tests where behavior can be tested without rendering,
- avoid coupling gameplay rules to presentation,
- preserve a clean path to true 3D character models later.

## Source of truth
Use existing Unity source only to recover proven Crownfall behavior. If Unity code conflicts with this contract, this contract wins.
