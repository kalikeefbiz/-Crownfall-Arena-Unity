# CODEX GOAL 007A — Kit 10K Static 3D Vertical Slice

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## GOAL

Deliver a fully working, deployed PlayCanvas build in which the local human-controlled Kit uses the supplied optimized 10K GLB as his real 3D presentation during a normal Crownfall match, while preserving all existing gameplay, controls, camera behavior, Wilderness, territory/CP, bots, lifecycle, and results.

This is an execution goal, not an approval-gated planning task.

Proceed autonomously from inspection through implementation, validation, commit, and deployment. Make reasonable implementation decisions when details are non-consequential. Do not pause merely to ask for approval of ordinary code changes, file placement, refactors required by the goal, test updates, or deployment steps already authorized below.

Only stop if a genuinely blocking issue requires user action, such as:
- missing or mismatched required binary asset
- unavailable credentials/permissions
- destructive action outside the explicitly authorized repository/branch
- an unrecoverable external service failure

If one approach fails, diagnose it and try a reasonable alternative before stopping.

## REQUIRED INPUT ASSET

The user will attach:

`Kit_10K_PlayCanvas_Test_1K.glb`

Expected identity:
- exact byte size: 5,317,848 bytes
- SHA-256: `11f0b6ad226eae565ddaa7e9104ca1aae2a85ecc954203a70fdce23b0adfb547`
- approximately 10,290 triangles
- approximately 20,888 vertices
- one mesh
- one material
- embedded 1024×1024 PBR textures
- unrigged
- no embedded animations

Verify the attached file before integration.

Do not substitute:
- the earlier ~21.65 MB Meshy export
- the original multi-million-triangle source model
- any regenerated or re-encoded replacement

If the supplied file does not match the expected byte size and SHA-256, stop and report the mismatch.

## READ FIRST

Read and preserve the intent of:
- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/TASK_006_VERIFICATION.md`
- `PlayCanvas/TASK_006_PARITY_AUDIT.md`
- current `src/presentation/scene.ts`
- current `src/gameplay/simulation.ts`
- current match/actor presentation code
- current production browser tests

## LOCKED ACCEPTANCE ITEMS

Do not redesign or rebalance:
- Crownfall match rules
- Wilderness
- bots
- tickets/lives
- territory/CP
- total-control correction
- results
- Task 005A camera
- camera smoothing/follow
- enlarged mobile controls
- touch semantics
- current collision/gameplay roots

The 3D model is presentation only.

## ASSET PLACEMENT

Store the supplied GLB at a stable production path such as:

`PlayCanvas/public/assets/summoners/kit/kit-10k-test.glb`

Keep the binary bytes unchanged.

Add a concise source note documenting:
- original filename
- SHA-256
- byte size
- triangle/vertex estimate
- embedded texture resolution
- unrigged/unanimated evaluation status

Do not re-encode, recompress, retopologize, rig, or animate the asset in this goal.

## IMPLEMENTATION OUTCOME

In a normal playable match, when the local human player selects Kit:

- display the real 3D Kit GLB as the local human's character presentation
- preserve the authoritative simulation/gameplay root
- preserve current collision radius and hit logic
- preserve movement, targeting, combat timing, effects, territory, Wilderness, bots, lives, and results
- the GLB must never become gameplay/collision authority

For this goal only:
- Set remains the existing prototype presentation
- Riven remains the existing prototype presentation
- non-local actors may remain the existing prototype presentation

Do not migrate the whole roster.

## LOADING + FALLBACK

Prefer loading the Kit GLB only when Kit is actually needed.

Until the GLB finishes loading:
- show the existing primitive Kit presentation

If loading fails:
- keep the primitive presentation
- keep the match playable
- expose a concise diagnostic in debug/verification mode
- do not show a raw failure wall to normal players

## SCALE + GROUNDING

After loading the instantiated model:

1. inspect the render hierarchy bounds
2. compute the visual bounding box
3. uniformly scale the model to a standing visual height of approximately 1.7–1.8 world units
4. vertically offset it so the visible lowest point/feet sit near gameplay ground Y≈0
5. center it horizontally on the existing gameplay presentation root

Do not scale or otherwise alter the authoritative gameplay root or collision radius.

Keep the chosen presentation transform isolated/configurable and report the final:
- scale
- local translation/offset
- forward-axis correction

## ORIENTATION

Do not use the old front/back/side sprite/material swap system for this 3D Kit visual.

Rotate the Kit visual around Y according to the existing authoritative presentation direction.

Preserve the established facing hierarchy:
- active aim / pre-cast direction owns facing
- committed cast direction remains held according to current behavior
- movement owns facing outside targeting
- idle retains last facing

Do not use camera heading as character facing.

If the imported model's authored forward direction requires correction, isolate it in one clearly named yaw constant/config value.

## ANIMATION

This GLB is intentionally unrigged and unanimated.

Therefore:
- do not invent skeletal animation
- do not procedurally deform limbs
- do not add fake walk cycles
- do not build speculative rigging infrastructure

For this goal, the model may translate and rotate rigidly with the existing gameplay root.

Current combat projectiles, hit feedback, Aether/VFX, and timings remain active.

This build is specifically intended to determine whether this exact 10K model is worth rigging next.

## MATERIALS + LIGHTING

Use the embedded PBR material/textures.

Do not repaint or retexture Kit.

Use current PlayCanvas lighting first.

Only make minimal import/presentation fixes required for correct rendering, such as:
- material culling
- normal-map interpretation
- import exposure

Do not create a custom shader unless stock imported PBR rendering is demonstrably broken.

## CAMERA — LOCKED

Do not change:
- camera offset Y 15.5 / Z 18
- forward look-ahead 4 toward -Z
- fixed behind-player heading
- follow smoothing rate 9

The model must be evaluated under the accepted Crownfall camera.

## A/B VERIFICATION SEAM

Add a lightweight debug-only way to force the old Kit primitive, preferably:

`?kitPrimitive=1`

Expected behavior:
- normal Kit match uses the GLB after successful load
- `?kitPrimitive=1` forces the old primitive Kit presentation

Do not expose this as a normal player setting.

## DEBUG / PERFORMANCE OBSERVABILITY

In existing debug mode or an equivalent verification seam, expose concise information if practical:
- Kit GLB loaded yes/no
- asset byte size
- computed model bounds/height
- applied scale
- render/mesh-instance count
- existing FPS/frame timing

Do not build a new profiler.

## REQUIRED TEST COVERAGE

Add or update tests proving:

### Asset integrity
- asset exists at expected path
- exact byte size
- exact SHA-256
- production build serves it
- no 404 during normal Kit match

### Presentation
- local selected Kit instantiates GLB
- primitive fallback is hidden after successful load
- `?kitPrimitive=1` keeps primitive
- Set/Riven presentations remain unchanged
- gameplay root/collision values are unchanged
- Kit visual follows authoritative world position
- Kit visual rotates with existing presentation direction
- normalized visual height is within expected range
- lowest visible bound is near ground
- no NaN/invalid transforms

### Gameplay regression
Retain and pass existing coverage for:
- touch movement
- touch aiming
- Kit Basic held repeat
- abilities
- territory
- Wilderness
- tickets/lives
- full results
- total-control
- CP
- restart
- locked camera
- mobile HUD overlap

### Browser/mobile
At the existing iPhone-style landscape viewport verify:
- Kit model visibly renders
- movement changes model position
- aim/facing changes model yaw
- combat remains authoritative
- camera remains unchanged
- no critical control overlap
- match can progress normally

Do not add rigging/animation expectations.

## PHYSICAL IPHONE ACCEPTANCE TARGET

The deployed build must make it possible for the user to judge:
- whether Kit reads as a real character at actual gameplay distance
- whether model scale is correct
- whether the 10K facial fidelity loss matters from the real camera
- whether 1K textures are sufficient
- whether rigid movement is tolerable for this pipeline test
- whether loading remains acceptable
- whether gameplay remains smooth

Do not encode a subjective answer to those questions.

## EXPLICITLY OUT OF SCOPE

Do not:
- rig Kit
- animate Kit
- import the 21.65 MB source export
- import the multi-million-triangle source
- add Set/Riven 3D assets
- replace all six actors
- add LODs
- change collision
- rebalance gameplay
- redesign camera
- redesign controls
- alter Wilderness/territory rules
- add networking
- modify Unity
- perform a production environment pass

## VALIDATION + COMPLETION

Complete the work end-to-end.

Run:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run fmt`
- `git diff --check`
- `npm run build`
- full production-browser suite

Fix failures caused by this work before completion.

Commit all intended changes to `playcanvas-port`.

Trigger the existing `/playcanvas/` deployment if the repository workflow permits it without requiring user credentials or destructive authorization.

Do not stop at "implementation complete"; finish validation and deployment as part of the goal.

## COMPLETION REPORT

Return:
1. final commit SHA
2. exact GLB asset path
3. verified SHA-256 + byte size
4. final model scale
5. final local offset
6. authored-forward yaw correction
7. lazy/eager loading behavior
8. unit-test count/result
9. browser-test count/result
10. typecheck result
11. lint result
12. format result
13. git diff check result
14. build result
15. deployed preview URL
16. any automated performance/loading observations
17. exact remaining physical-iPhone acceptance questions
