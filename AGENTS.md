# Crownfall Arena — Agent Instructions

## Branch mission

This branch, `browser-parity-unity`, exists to complete the playable Crownfall Arena browser experience as a native Unity 3D/XZ game slice.

Do not treat this as another M0/M1 foundation milestone. Work toward the complete end-to-end playable match.

## Source-of-truth precedence

1. **Current Unity branch decisions and current design docs** win when they intentionally revise older browser values or policies.
   - In particular, preserve the current Unity combat framework/economy, current serialized Kit values, current Set/Riven first-roster framework, current health-regeneration policy, and current one-time 70% Surge policy unless a task explicitly revises them.
2. **Browser Version 21 source and tests** define the established gameplay behavior, lifecycle, map logic, bots, camps, targeting semantics, tickets/final lives, territory/Crownfall flow, UI flow, and edge cases that have not been intentionally superseded.
3. `Docs/CROWNFALL_BROWSER_V21_REFERENCE.md` summarizes the frozen browser checkpoint at commit `5a73918bf4cd56cd54bdc98ba2a9929f4d347753`.
4. Historical milestone docs are context only when they conflict with current decisions.

Preserve behavior, not browser implementation details. Use Unity-native architecture.

## Complete playable target

A successful branch must allow a user to:

Main Menu -> Summoner Select -> 3v3 match -> control Kit, Set, or Riven -> move and aim independently -> use the Summoner's functional combat kit -> fight five bot-controlled Summoners -> rotate through the Wilderness -> contest camps / the Major objective -> push and lose territorial control -> generate Crownfall pressure/points -> use tickets, respawns, final lives and permanent elimination -> trigger a valid victory condition -> reach results -> replay or return to menu.

Do not stop merely because a subsystem compiles or a foundation milestone passes.

## Presentation

The gameplay world is true Unity 3D X/Z space.

Character presentation may remain authored 2D directional sprites/billboards during this pass. Do not wait for 3D character models.

Use the existing Kit art. Use existing Set and Riven directional/movement/action assets wherever available in the supplied browser reference or project inputs. Their current 2D presentation is valid for this parity build and should not be replaced with generic primitives merely because final 3D characters do not exist.

If a specific production asset is genuinely unavailable in the working repository/reference package, use a temporary readable placeholder for that missing presentation only and continue implementing gameplay. Report the missing asset precisely; do not block functional parity.

Do not regenerate, repaint, crop, matte-remove, recompress or otherwise modify supplied production PNG artwork merely to satisfy a preview/tool assumption.

## Engineering rules

- Presentation must not determine authoritative hit timing.
- Prefer complete coherent systems over accumulating milestone-specific scaffolding.
- You may refactor, consolidate, bypass or remove M0/M1-era scaffolding on this branch when it obstructs the complete game, but do not casually discard working systems.
- Keep mobile-first landscape controls and independent movement/aim.
- Preserve true 3D X/Z gameplay space and a presentation layer that can later swap sprites for 3D character models without rewriting combat.
- Do not add towers, minion waves, a Nexus/base-destruction loop or escort-minion objectives.
- Do not invent new Summoners.
- Do not redesign established kits just to simplify implementation.
- Do not spend time production-polishing missing art before the complete match loop works.
- Do not alter `main`; all broad parity work belongs on `browser-parity-unity`.

## Validation philosophy

Tests and validation should prove the playable target, not become the product.

Add or update tests where they protect important behavior, but do not create new layers of infrastructure unless needed to make the complete match reliable.

Before claiming completion, exercise the entire match lifecycle and report what was actually run versus what still requires Unity/Cloud/device execution.
