# CODEX TASK 001 — Bootstrap Crownfall PlayCanvas Technical Slice

You are working in:
- Repository: kalikeefbiz/-Crownfall-Arena-Unity
- Branch: playcanvas-port

Read `PlayCanvas/MIGRATION_CONTRACT.md` before changing anything.

## Goal
Create the code-first PlayCanvas foundation for Crownfall Arena under `PlayCanvas/` without touching the existing Unity implementation.

Use the official current PlayCanvas code-project scaffold, Engine format, TypeScript + Vite. Prefer the official `create-playcanvas` tooling rather than hand-rolling obsolete boilerplate.

## Deliverables for this task
1. Scaffold a runnable PlayCanvas Engine + TypeScript + Vite project inside `PlayCanvas/`.
2. Keep the Unity project byte-for-byte untouched.
3. Add scripts for:
   - development server,
   - production build,
   - typecheck,
   - tests.
4. Create a clean source structure that separates:
   - gameplay/simulation,
   - input,
   - presentation,
   - UI,
   - configuration,
   - tests.
5. Implement a minimal 3D Crownfall test arena:
   - flat lane floor,
   - visible lane boundaries,
   - a few simple 3D obstruction primitives,
   - no production art yet.
6. Implement an elevated/slightly angled MOBA camera suitable for landscape mobile.
7. Implement a Kit gameplay root with:
   - X/Z movement,
   - collision against test obstructions,
   - movement independent of camera rotation,
   - authoritative aim vector independent of movement.
8. Implement presentation-facing classification:
   - Front,
   - Back,
   - Right Side,
   - Left mirrored from Right Side.
   - Aim owns facing during targeting/pre-cast.
   - Movement owns facing outside targeting.
   - Preserve last facing while idle.
9. Implement a mobile-friendly input abstraction with:
   - left movement region,
   - right basic/aim region,
   - reserved Skill 1 / Skill 2 / Ultimate HUD positions.
   Desktop mouse/keyboard fallback is allowed for development.
10. Add a diagnostic overlay showing:
   - movement vector,
   - aim vector,
   - presentation facing,
   - FPS or frame time,
   - current viewport/safe-area information.
11. Add automated tests for non-rendering logic such as facing classification and input-vector normalization.
12. Run all available checks and production build before finishing.

## Explicitly out of scope
- Do not port the full match loop.
- Do not implement bots.
- Do not implement Wilderness.
- Do not implement Ember Step, Solar Ring, Last Flame, or Expellant.
- Do not add networking.
- Do not migrate production art.
- Do not modify Unity source.
- Do not spend time recreating the old debug UI exactly.

## Finish criteria
Do not stop after scaffolding. Finish the entire slice above, run tests/typecheck/build, fix failures, and leave the branch in a runnable state.

At the end, report:
- files created/changed,
- commands run,
- test/typecheck/build results,
- exact local run command,
- any blocker that still requires human/runtime validation,
- final commit SHA.
