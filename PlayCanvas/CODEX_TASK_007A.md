# CODEX TASK 007A — Kit 10K Static 3D Vertical Slice

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`
Branch: `playcanvas-port`

## Purpose

Integrate the first real 3D Summoner asset into the current PlayCanvas Crownfall build as a deliberately narrow production-pipeline test.

This is NOT the full character-art migration.

The goal is to answer:
- does the 10K Kit model read correctly from the locked Crownfall camera?
- is the model scale/orientation correct?
- does it preserve current gameplay and touch controls?
- does the 1K-texture optimized GLB load acceptably on iPhone Safari?
- is this asset quality/performance level worth rigging and animating next?

## Required input asset

Attach/provide this exact file to the Codex task:

`Kit_10K_PlayCanvas_Test_1K.glb`

Expected file properties:
- size: 5,317,848 bytes (~5.07 MiB)
- SHA-256: `11f0b6ad226eae565ddaa7e9104ca1aae2a85ecc954203a70fdce23b0adfb547`
- approximately 10,290 triangles
- approximately 20,888 vertices
- one mesh
- one material
- embedded PBR textures downscaled to 1024×1024
- no rig / skin
- no embedded animations

Do not substitute the earlier ~21.65 MB export or the original multi-million-triangle source model.

Verify the SHA before integration. If the attached asset does not match, stop and report the mismatch rather than silently using another model.

## Read first

- `PlayCanvas/MIGRATION_CONTRACT.md`
- `PlayCanvas/REFERENCE_SOURCES.md`
- `PlayCanvas/TASK_006_VERIFICATION.md`
- `PlayCanvas/TASK_006_PARITY_AUDIT.md`
- current `src/presentation/scene.ts`
- current `src/gameplay/simulation.ts`
- current match/actor presentation code
- current production browser tests

## Locked accepted gameplay/presentation

Do not redesign or rebalance any of this:
- current Crownfall rules
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

## Asset location

Store the supplied GLB under a stable PlayCanvas public asset path, for example:

`PlayCanvas/public/assets/summoners/kit/kit-10k-test.glb`

Keep the original GLB bytes unchanged.

Do not re-encode, recompress, retopologize, rig, or animate it in this task.

Add a small source/asset note documenting:
- original filename
- SHA-256
- byte size
- triangle/vertex estimate
- texture resolution
- that it is an unrigged static evaluation asset

## Integration scope

### Normal playable match only

When the player selects **Kit** in the normal playable match:
- load and display the real 3D Kit model as the local human's presentation
- keep the authoritative gameplay/collision root unchanged
- keep all hitboxes, movement, targeting, combat timing and effects simulation-owned
- the GLB must never become the gameplay collision authority

For this first test:
- Set remains the existing prototype presentation
- Riven remains the existing prototype presentation
- non-local actors may remain the existing prototype presentation
- do not convert the whole roster yet

This isolates one production asset.

### Fallback

Until the GLB is successfully loaded:
- retain/show the existing primitive Kit presentation

If loading fails:
- do not break the match
- keep the primitive fallback
- surface a concise diagnostic in debug/verification mode

Normal users should not see a raw error wall.

## Scale and grounding

Do not hardcode model scale blindly.

After loading:
1. inspect the instantiated model/render hierarchy bounds
2. compute the visual bounding box
3. uniformly scale the model so its standing height is approximately the existing gameplay presentation height, target around 1.7–1.8 world units
4. offset vertically so the lowest visible point/feet sit at gameplay ground Y≈0
5. center the visual horizontally on the existing gameplay root

Do not scale the gameplay root or collision radius.

Document the final computed/selected presentation scale and local offset.

## Orientation

This is an actual 3D model.

Do not use the old front/back/side material swap logic for this local 3D Kit visual.

The model should rotate around world/local Y to face the authoritative presentation/combat direction.

Use the existing simulation facing/aim/movement ownership rules to determine orientation. Preserve the current rule hierarchy:
- active aim / pre-cast direction owns facing
- committed cast direction remains held as already established
- movement owns facing outside targeting
- idle retains last facing

Do not make camera heading determine character facing.

Because the model source may have a different authored forward axis, isolate any corrective yaw in a single named constant/config value rather than scattering offsets.

## Animation

The asset is unrigged and unanimated.

Therefore:
- do NOT fake skeletal animation
- do NOT deform the mesh
- do NOT add procedural limb movement
- do NOT spend time creating animation infrastructure that cannot be used by this asset yet

For this vertical slice the model may translate and rotate rigidly with the gameplay root.

Existing combat projectiles, hit feedback, Aether/VFX and timing remain active.

This is intentional. The next decision after device QA is whether to rig/animate this exact asset.

## Materials / lighting

Use the embedded GLB material/textures first.

Do not repaint/retexture Kit.

Allow the existing PlayCanvas lighting to light the model.

Make only minimal presentation-safe adjustments if required for correct import, such as:
- material culling issue
- normal-map interpretation
- overly dark exposure caused by engine import

Do not author a new shader in this task unless the stock imported PBR path is actually broken.

## Camera

LOCKED:
- camera offset Y 15.5 / Z 18
- forward look-ahead 4 toward -Z
- fixed behind-player heading
- follow smoothing rate 9

Do not change these to make the model look better.

The model must prove itself under the accepted camera.

## Debug comparison seam

Add a lightweight verification/debug-only presentation switch, preferably query-param based, such as:

`?kitPrimitive=1`

Behavior:
- normal playable build uses the GLB for local Kit
- opt-in switch forces the old primitive Kit visual

This is for A/B comparison and automated regression only.

Do not expose it as a normal player-facing settings option.

## Performance / loading instrumentation

In `?debug=1` or a dedicated verification seam, expose concise presentation metrics:
- whether Kit GLB loaded
- asset byte size
- computed model bounds/height
- applied scale
- render/mesh instance count if readily available
- frame timing/FPS using existing diagnostics

Do not build a new profiler.

The browser should not fetch the Kit GLB if the player is using a non-Kit Summoner unless the existing architecture makes lazy loading disproportionately risky. Prefer lazy/on-demand loading.

## Tests

Add/adjust tests proving:

### Asset integrity
- production asset exists at expected path
- exact byte size
- exact SHA-256
- production build serves it successfully
- no 404 in normal Kit match

### Presentation
- selected local Kit instantiates the GLB
- primitive fallback is hidden after successful load
- `?kitPrimitive=1` retains primitive fallback
- Set/Riven remain unchanged
- gameplay root/collision values are unchanged
- Kit visual follows authoritative player world position
- Kit visual rotates with existing presentation direction
- visual height is normalized to expected range
- feet/lowest bound are near ground
- no NaN/invalid transforms

### Gameplay regression
Retain and pass:
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
- locked camera tests
- mobile HUD overlap tests

### Browser/mobile
At existing iPhone-style landscape viewport:
- Kit model visibly renders
- movement changes model screen/world position
- aim/facing changes model yaw
- normal combat still deals authoritative damage
- camera remains unchanged
- no critical control overlap
- match can progress normally

Do not require rigging/animation assertions.

## Physical iPhone acceptance target

The deployed build should let the user answer:
- does Kit look like a real character rather than a cube?
- is his scale correct?
- does the 10K facial loss matter from actual gameplay distance?
- do the 1K textures look acceptable?
- does rigid movement make the model look obviously wrong before rigging?
- does load time remain acceptable?
- does performance remain smooth?

Do not pre-judge those answers in code.

## Explicitly out of scope

Do NOT:
- rig Kit
- animate Kit
- import the 21.65 MB source export
- import the multi-million-triangle original
- add Set/Riven 3D models
- replace all six actors
- add LODs
- change gameplay collision
- rebalance anything
- redesign camera
- redesign controls
- modify Wilderness/territory
- add networking
- modify Unity
- do a production environment pass

## Validation

Run:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run fmt`
- `git diff --check`
- `npm run build`
- full production-browser suite

Commit to `playcanvas-port` and trigger the existing `/playcanvas/` deployment.

## Completion report

Report:
1. final commit SHA
2. exact asset path
3. verified SHA-256 and byte size
4. final model presentation scale
5. final model local offset
6. authored-forward correction/yaw if needed
7. whether asset loads lazily
8. unit/browser test counts
9. typecheck/lint/format/diff/build results
10. deployed preview URL
11. any automated performance/loading observations
12. exact physical iPhone questions still requiring acceptance
