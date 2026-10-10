# Crownfall Arena — Build #14 recovery charter

## Source-of-truth checkpoints
- Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
- Recovery branch: `recovery-build14`
- Exact Unity Cloud Build #14 source revision: `489e81588d1a9876132625ba65a180b749bb1d61`
- Existing Unity Build #14: successful; user-reported last acceptable playable baseline
- Unity Build #19 source: `b082cf356494d532c2b8c0915849ec0fc61649d7` on `browser-parity-unity`
- Original Unity Build #14 share ID: `tqpNTIdyzwranIKedNWaUKv4CH1xo6W7PDsbow1O4nw`
- Build #14 already includes production roster artwork, presentation, and HUD code. It precedes the later M15 authored 3D wilderness integration.
- Do not equate Unity build success with runtime visual acceptance.

## Recovery intent
Preserve the validated 3v3 match simulation, controls, combat, scoring, map authority, production PNG bytes, roster assets, and existing functional interfaces. Do not rebuild the game from scratch.

Start from the exact Build #14 source. Treat Build #19 changes as reference material only; no wholesale cherry-picks.

## Bounded implementation sequence
1. Establish baseline: inspect the exact Build #14 source, run applicable static and native checks, and confirm which original build visuals the user accepted. Prefer already captured device evidence and the archived Build #14 over spending trial credits on an unchanged rebuild.
2. Isolate rendering in the existing Unity project: render one actual production Summoner sprite and one existing environment asset with clear diagnostic colors/material controls, first separately and then together. Prove actual object creation, sprite and texture assignment, imported material/shader support, visible bounds, camera culling, sorting, and depth occlusion in the native WebGL path.
3. Keep the existing Build #14 camera strictly as a temporary baseline for visual comparison, NOT as the final camera design. Once the visibility baseline is proven, selectively integrate the standard Unity Cinemachine 3.1.7 camera package from the later work, testing player tracking and perspective/composition without importing the unverified M15 environment.
4. Integrate environment models and their materials incrementally; test one real model, a small group, then the environment. Do not merge the full M15 wilderness presentation wholesale before the smaller tests pass.
5. For each meaningful candidate: compile natively using Unity 6000.3.10f1, commit to `recovery-build14`, build WebGL on the exact commit, compare on actual iPhone Safari. One hypothesis / one test / one result per iteration.
6. Maintain a simple evidence log with exact SHA, native build number, runtime screenshots, cause, and pass/fail result. If two focused native iterations fail to isolate visibility, pause patching and submit a presentation-only architecture review.

## Non-negotiable boundaries
- Do NOT touch `main`, `browser-parity-unity`, or the existing `gh-pages` deployment.
- Do NOT change gameplay, hitboxes/collision, character PNGs, match systems, abilities, or map authority.
- Do NOT restore Build #14 camera as the target final presentation.
- Do NOT invent another camera controller or replace Cinemachine with ad-hoc math.
- Do NOT add new art or systems as part of root-cause recovery.
- Do NOT claim rendering is fixed from static checks or successful compilation.
- Do NOT create an overwrite-style Pages publish step; use a separate preview path/target with verified preservation, or ask the user before replacing the live page.
- Keep recovery commits isolated on `recovery-build14`.

## Phase-1 delivery gate
One actual production Summoner sprite and one actual environment model visibly render in an iPhone WebGL build, under an intentionally simple controlled camera. Only then proceed to integrating more sophisticated presentation.

## Provenance
Unity Build #14 share metadata reports `lastBuiltRevision=489e81588d1a9876132625ba65a180b749bb1d61` and success. The subsequent M15 environment integration is recorded after that commit in Git history.
