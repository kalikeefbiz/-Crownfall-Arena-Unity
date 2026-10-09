# Crownfall M15.1 visual transformation

Starting HEAD: `fc359e4ca1ebd00151d0a8618546beb658d3142d`. Branch: `browser-parity-unity`. The existing M15 document and four previews remain byte-identical. This is a renderer-only production change for Unity **6000.3.10f1**, Built-in, WebGL. No Cloud Build, player export, deployment, merge, or gameplay redesign was performed.

**READY FOR BUILD #15** means the source is ready for a manually authorized build with fail-closed native preparation. It does not mean native import, Unity visuals, touch behavior on a device, or iPhone 12 performance have passed. Exact Unity is unavailable here.

## Diagnosis and visible changes

The M15 screenshots showed five problems that drove the work:

| Deficiency | Correction |
|---|---|
| A repeated cobble rectangle occupied most combat frames. | Mix staggered weathered flags with the existing cobble detail; add stable worn joints, fractures, missing-stone patches and soil. An irregular world-space paving mask fades into forest litter. |
| Trees and isolated props stood on a featureless flat apron. | Replace the apron with renderer-only banks and exterior continuation; combine embedded bedrock, crowns, understory, ferns and ruined masonry into ten unequal formations. |
| Prominent pale cones, boxes and poles looked like asset-demo placeholders. | Remove Kenney filler from the close formations, retire the oversized `cliff_block_rock` from shipping placements, and confine inexpensive forest/fortification silhouettes to the skyline. Apply shared geological detail to visible stone. |
| Depth and vertical faces were poorly communicated by the camera. | Test 40° and 34° profiles with the same game-space projection. Final 34°/11 profile reveals rock faces and foreground formations while retaining the accepted profile's character scale. |
| Gray illumination and disconnected landmarks weakened Crownfall identity. | Warmer directional highlights, green-blue hemisphere ambient, economical depth fog, overgrown arches, a single twisted-tree landmark and restrained Aether veins. Preserve the center medallion, Major art, forest/waterfall extensions and Saint Rose accents. |

The result is visibly more textured and dimensional than M15. It still has protected open approach areas and recognizable paving repetition. It does not reproduce the Riven illustration's fidelity, nor establish a fully continuous mature forest canopy. Those limitations are visible in the evidence below.

## Camera and readability

| Setting | M15 | M15.1 | Accepted fallback |
|---|---:|---:|---:|
| Elevation | 42° | **34°** | 50° |
| Orthographic half-height | 12.25 | **11** | 11 |
| Camera height | 20 | 20 | 15 |
| Northern ground-focus bias | 3.5 | **6.5** | 0 |
| Presentation extent padding X/Z | 4 / 8 | 4 / 8 | 0 / 0 |
| Yaw / clipping | 0 / 0.1–150 | unchanged | unchanged |

The final profile is in `Assets/Crownfall/Environment/CameraFraming.cs`. `MobaCamera.cs`, its tracking/clamping behavior, `MobileControls.cs`, screen-ray ground projection, ability targeting, actor roots and production character images remain unchanged from the starting commit. No free rotation or new input behavior was introduced. Pure tests exercise both profiles, two landscape aspects, camera limits and ±6-metre combat framing. Native tests additionally use the actual camera and ground-plane ray intersection; their execution remains pending.

The orthographic size restores the accepted baseline's screen-space scale rather than zooming farther out to show the whole arena. Southern crowns have conservative height bounds. The existing six-Summoner projected cutaway remains bounded and allocation-free during updates, using cutout/dither rather than widespread transparency. The replacement floor is excluded from cutaway below Y=0.35 to avoid exposing holes near actors; raised banks can still cut away. Actual HUD, targeting VFX, foliage coverage, cutaway transitions and mobile thumb visibility require Unity/device acceptance.

## Lane, terrain and collision

`StoneSurface.cginc` supplies one world-anchored treatment to the lane, territory and continuation. It retains the original Medieval uneven-brick color/normal detail, mixes deterministic staggered flags and cobble patches, introduces restrained joints and damage outside the cleanest combat band, and blends through moss into forest-floor litter. There are no new transparent paving overlays. The center logo remains at its original presentation placement.

`TerritoryFlow.shader` retains `_Color`, `_Active`, `_Direction`, `_MatchTime` and the exact original Surge/canal wave expressions. Its team tint follows the new paving mask. Territory calculation, transforms, authoritative front position and front geometry do not change. Team tint on bare forest shoulders is intentionally subdued; native visual acceptance must confirm the territory distinction remains adequate.

`WorldContinuation` describes one native-generated mesh: four outer strips, two sculpted banks outside Z=±12.5, and a flat presentation sheet beneath the original floor. The sheet spans the original 68×64 footprint at Y=-0.06. Bank baseline is Y=-0.025, with smooth clearance around the original approaches, camps and Major. Outer geometry continues to X=±58/Z=±54. The mesh has 16,807 vertices and 32,256 triangles and adds **no collider**.

The original floor renderer is hidden; its original cube, floor collider and transform remain active. Boundary renderers are absorbed by exterior terrain while the original boundary colliders remain active. Every existing `Wilderness island` wall keeps its original renderer and collision footprint and uses the shared textured `qn_Rocks` material. These ten low retaining markers prevent invisible authoritative obstacles. No wall, island or floor collider is disabled, resized, replaced or added. The surrounding cosmetic meshes never become collision.

## Authored environment and asset selection

`Tools/compose_m15_1.py` is a reproducible authoring recipe, not runtime scattering. It creates unequal west grove, rose cloister, Aether wood, east crag, watch glen, broken arcade and four foreground formations. Bedrock is embedded into the banks; vegetation and fragmented masonry share those foundations. Authored variation changes spacing, yaw, proportions, elevation and asset selection. Existing camp/Major corridors interrupt the formations intentionally. There are no reflected identical placement pairs or perfectly uniform tree rows.

The shipping composition uses **25 external model identities**, from a prepared catalog of 26:

| Source / treatment | Exact shipping models |
|---|---|
| Quaternius Nature, textured close/middle formations | `CommonTree_1`, `CommonTree_3`, `TwistedTree_1`, `Pine_1`, `Pine_5`, `Fern_1`, `Rock_Medium_1`, `Rock_Medium_2`, `Rock_Medium_3`, **`Bush_Common`** |
| Quaternius Medieval, overgrown fragments | `Wall_UnevenBrick_Straight`, `DoorFrame_Round_Brick`, `Stairs_Exterior_Straight` |
| Kenney Nature, middle/far only | `cliff_large_rock`, `cliff_cornerLarge_rock`, `rock_tallA`, `rock_tallG`, `tree_pineTallA`, `tree_pineTallC`, `tree_default_dark`, `statue_columnDamaged` |
| Kenney Castle, partially embedded skyline fragments | `tower-square-arch`, `tower-hexagon-top`, `wall-corner-half-tower`, `wall-half-modular` |

`kn:cliff_block_rock` remains preserved in staging and the prepared library; it is no longer in the shipping composition. Castle silhouettes and inexpensive Kenney vegetation are unsuitable for prominent close inspection; their role is economical world continuation. Rich Quaternius vegetation is preferred near combat, but flattened crown shapes and alpha cards still need native review. `TwistedTree_1` remains a single landmark.

The only extra model is `qn:Bush_Common`, copied byte-for-byte from the already staged, approved **CC0** Nature pack. Blender's binary FBX inspection found 900 triangles and approximately 1.915×1.582×1.965 source-unit bounds. Its two source material names resolve to the existing twisted-leaf material; it adds no texture or material payload. Native FBX normalization remains subject to the source-size checks.

## Narrow additional CC0 resources

Two 1024×1024 diffuse JPEGs were needed to replace featureless soil and stretched near-cliff detail. No additional model collection, Unity package, shader dependency or unrelated map bundle was downloaded.

| Resource | Official source and license | Production path |
|---|---|---|
| Forest litter | [Poly Haven forest_ground_04](https://polyhaven.com/a/forest_ground_04), [CC0-1.0](https://polyhaven.com/license) | `Assets/Art/Environment/External/SharedTextures/T_ForestGround04_Color.jpg` |
| Weathered geology | [Poly Haven rock_face_03](https://polyhaven.com/a/rock_face_03), [CC0-1.0](https://polyhaven.com/license) | `Assets/Art/Environment/External/SharedTextures/T_RockFace03_Color.jpg` |

Official file API responses, license-page snapshot, CC0 legal text, source images and SHA-256 provenance are under `ExternalArtStaging/M15_1/ForestGround/` and `ExternalArtStaging/M15_1/RockFace/`. Original downloads remain preserved there. Production copies have matching hashes and provider MD5 verification. Production license/provenance documents are under `Assets/Art/Environment/External/Licenses/` and `Provenance/`. All 419 acquisition-baseline files remain byte-identical.

The added model and two texture payloads total **2,122,561 bytes** before license/provenance/code data. Exact added-file sizes and the production byte delta are in [the changed-files manifest](CROWNFALL_M15_1_CHANGED_FILES.json).

## Materials, atmosphere and quality scaling

The library retains six material families and 20 shared external materials; one shared world-surface material brings the environment total to 21. Existing territory instances and Crownfall sprite/VFX materials are separate. Textured bark/foliage/masonry retain source maps rather than being replaced with uniform dark colors. Shared material multipliers restrain saturation, preserve dielectric response and use low smoothness. Built-in roughness/ORM handling and double-sided alpha-cutout foliage remain deliberate.

The Lit shader adds world-axis geological projection on rocks and low-cost stone filler, avoiding vertical UV stretching. The same rock map is shared across assets and retaining markers. Local emissive fissures appear on the Aether grove around X=10.4/Z=12–30; they use the material, not a population of lights. Source files are not altered.

The generated environment adds one warm directional key at 36°/-48°, intensity 1.18, shadow strength 0.68. Runtime ambient is Trilight with cool sky, muted forest equator and dark warm ground. Linear fog starts at 38 and ends at 105, without volumetric or fullscreen post-processing. The prior ambient/fog state is captured and restored on disposal. Existing forest/waterfall sprite extensions receive a restrained tint; original PNG bytes and placement are preserved.

Only selected near rock/tree/masonry instances cast shadows. Distant filler does not. Lower quality levels disable environment shadow casting/receiving while keeping the composition. Higher shadow resolution allows soft shadows; lower enabled tiers use hard shadows. No realtime point-light forest was added.

Textures remain unique shared dependencies: **27 payloads**, Mobile maximum 1024 except the existing 512 atlas, with mipmaps, appropriate sRGB/linear classification, alpha coverage where required, Repeat/Trilinear and ASTC 6×6 WebGL override. The import policy preserves staged source resolution. ASTC support, normal-map representation, fallback decompression and actual memory residency have not been measured on a device.

No fabricated mesh simplification or fake LOD chain was introduced. `CommonTree_1`, `CommonTree_3`, `TwistedTree_1`, `Pine_1`, `Pine_5` and `DoorFrame_Round_Brick` retain LOD0 with true LOD generation pending. Rich near meshes transition compositionally to cheaper approved distant forms. Shared materials/meshes enable instancing opportunities; no runtime CPU static batching that duplicates meshes is forced. Final native draw calls and overdraw need profiling.

## Visual iteration and comparison

**Eight implementation/render/review iterations** were completed. Each rendered four 1280×720 gameplay-camera-matched views in Blender 4.3.2 using actual preserved source geometry, original Crownfall PNGs and camera constants. All images were opened and critically reviewed. Earlier successful outputs are retained under `M15_1Previews/Iteration1/` through `Iteration7/`; final evidence is under `M15_1Previews/Final/`.

The iterations corrected excessive bank height and clipped canopy, moved meaningful formations into visible bands, reduced checkerboard/tile regularity, acquired two narrow surface resources, lowered elevation without reducing character scale, fixed an offline fog/foliage coverage artifact, replaced the floor's box side faces, and preserved visible authoritative wall markers. [The visual-review record](CROWNFALL_M15_1_VISUAL_REVIEW.json) records each critique and correction.

These are **offline approximations**, not Unity screenshots or proof of native import. The renderer uses staged glTF reference geometry to inspect FBX candidates, approximates Built-in lighting/materials and places static original Summoner images. It does not render HUD, combat VFX, runtime tracking, native foliage mip coverage, texture compression or the six-Summoner cutaway. Offline material translation was also corrected to apply shared tint once and use the deliberate palette rather than source vertex-color metadata; the size of the native visual improvement must therefore be judged separately. Each image is labeled accordingly. The reports include source snapshots, camera transforms and 16 projection checks.

| View | Original M15 | Final M15.1 | Qualitative comparison |
|---|---|---|---|
| Blue combat | [Before](M15Previews/blue-combat.png) | [After](M15_1Previews/Final/blue-combat.png) | Pale near cones/blocks replaced by textured rock faces with vegetation; soil and broken paving shoulders replace the gray apron. Characters remain large and identifiable. |
| Center combat | [Before](M15Previews/center-lane.png) | [After](M15_1Previews/Final/center-lane.png) | Overgrown masonry and Aether bedrock provide distinct left/right landmarks. Surface variation and foreground silhouettes give more depth without covering the medallion. |
| Red combat | [Before](M15Previews/red-combat.png) | [After](M15_1Previews/Final/red-combat.png) | Stronger local rock/forest enclosure, textured soil and irregular worn paving, with less pale primitive filler. Protected combat space remains open. |
| Objective | [Before](M15Previews/objective.png) | [After](M15_1Previews/Final/objective.png) | Clearer Aether/forest framing, textured terrain and subdued structural silhouettes; Major coordinates and approach stay unchanged. |

The qualitative comparison shows immediately recognizable improvement in all four approximations, satisfying the requested minimum of three. This is an art-direction judgment from opened images, not a geometry score or claim of Unity/device visual acceptance. The remaining open land and low-detail skyline make this an improved production foundation, not finished premium illustration quality.

## Estimated costs

All figures are planning estimates, **not measured Unity or iPhone results**. The machine-readable composition report contains per-model repetition and 15 camera-frustum samples.

| Scope | Estimate |
|---|---:|
| Authored external placements | 161: 135 near, 13 mid, 13 far |
| External model identities used / prepared | 25 / 26 |
| Prepared source triangles, including retained unused model | 31,227 |
| External instantiated triangles | 247,652 |
| Derived terrain triangles | 32,256 |
| Existing wall-marker triangles | 120, unchanged cube geometry |
| Total external + terrain + wall triangles | **280,028** |
| Typical external frustum candidate triangles | 53,512–121,709 |
| Conservative range adding whole terrain/all wall markers | **85,888–154,085** |
| Shared environment materials / families | 21 / 6 external families |
| Unique environment textures | 27 |
| ASTC 6×6 with mips | **15.68 MiB** |
| RGBA8 fallback with mips | **140.00 MiB** |
| Alpha-tested external instances | 109 |
| Shadow-eligible external instances / estimated material slots | 23 / 36 |
| External material-slot instance upper bound | 258 |
| Far filler / hero tree instances | 13 / 39 |

Native mesh subdivision and renderer counts remain pending. There are 25 external reference mesh identities, one derived terrain mesh and one reused primitive wall mesh; actual imported FBX meshes may split differently. The 161 source placements plus one terrain renderer and ten retained existing wall renderers are 172 placement/surface roots, not a measured draw count. Binding-based slot estimates conservatively include unused FBX slots; native prefab generation now trims surplus slots to actual submesh count while rejecting missing required materials.

The textures above exclude unchanged Crownfall character/UI/VFX/backdrop residency, render targets, shadows and CPU/GPU mesh storage. Compared with M15's 356,922 external instantiated triangles, external mesh cost decreased; this is a cost observation, not evidence of artistic success. Geological triplanar detail adds three color samples to affected surfaces. Forest-floor detail adds surface sampling. The dominant risks are foliage alpha coverage/overdraw, bark-plus-leaf submissions, shadow multipliers and ASTC fallback. Repeated rocks, trees, bushes and ferns provide instancing opportunities; batching cannot remove different-material submesh or shadow passes automatically.

## Preservation and validation

- **806 protected files** compared byte-for-byte with the starting commit: gameplay/core/map, scene, controls/camera behavior, character/production art, packages/settings, CI and original M15 evidence. The sole authorized change inside the protected Match source is the territory shader's surface treatment.
- **419 staged originals** and **64 declared production copies** pass their SHA-256 checks. No duplicate texture payload, unapproved production file, GLB runtime import, package addition or handwritten Unity GUID/serialized generated asset was introduced.
- Complete-match tests pass for Kit, Set and Riven; the per-tick public authority hashes exactly match the starting commit across 9,537 / 2,716 / 8,900 ticks.
- Existing suites pass: M1 75, economy 13, roster 16, Surge 18, complete match 127,037, production presentation 86,645, camera/terrain 2,152 assertions.
- Production/current-build/M1 static gates pass, including 13 malformed art-reference and 12 production UI failure cases. All nine environment gross-regression fixtures are rejected and authored data is restored byte-for-byte.
- 51 runtime C# files compile/type-check with zero warnings/errors against actual UnityEngine **2021.3.33 reference assemblies**. This is not Unity 6000 compilation, Editor execution, shader compilation or native rendering. Editor C# syntax checks pass separately.
- `git diff --check` and the staged check pass. A path-specific `.gitattributes` exception permits the downloaded license snapshot's original space-before-tab indentation; its bytes/hash are preserved. Code whitespace and all gameplay/asset validators remain strict. Individual Git files remain below GitHub's hard limit. Exact changed files and sizes are recorded separately.

Reproduction commands: `python Tools/validate_m1.py`, `python Tools/validate_current_build.py`, `python Tools/validate_production.py`, `python Tools/validate_environment_library.py`, `python Tools/validate_m15_1_visual.py`, `python Tools/test_wilderness_validation.py`, `python Tools/run_complete_match_tests.py`, `python Tools/compare_gameplay_baseline.py --baseline fc359e4ca1ebd00151d0a8618546beb658d3142d`, and `python Tools/compile_match_runtime.py`. .NET runners need the available SDK/reference environment variables; see [the test record](CROWNFALL_M15_1_TEST_RESULTS.json).

## Native reliability and Build #15 handoff

`PipelineBuild.OnPreprocessBuild` already invokes `WildernessBuildPreparation.PrepareAndValidate()` before player export. This pass extends that generator and validation, rather than fabricating Unity `.asset`, `.mat`, `.prefab`, `.meta` or scene YAML. Catalog/composition/library version is 3. Generation is ordered: import shared textures → create/remap shared materials → normalize and sanitize model prefabs → apply palette → derive terrain/composition → save referenced Resources library → validate dependencies, shipping scene bindings and geometry.

The expanded gate checks the extra FBX, two CC0 textures, rock/Aether texture binding, retaining-marker material, four world/territory texture properties, derived terrain's side-aware topology/heights, library version/hash, actual prefab mesh/material/shader references, clearance, layer visibility and absence of any presentation colliders/rigidbodies/scripts. Missing required submesh materials fail; harmless surplus FBX material slots are trimmed before validation to prevent duplicate draws. Native tests retain the actual projection/ground-ray regression checks. The lab stays excluded from build settings. Existing asset paths are reused through AssetDatabase; stable native references are generated by Unity.

`Tools/run_wilderness_unity_validation.py` found no exact Unity executable and reported **PENDING**, without executing Unity or exporting a player. No native success report was created. When an Editor is available, run:

```sh
python Tools/run_wilderness_unity_validation.py --unity-editor /path/to/6000.3.10f1/Unity
```

This runs import/generation/validation only. The next Cloud Build remains a manual decision.

Build #15 acceptance checklist:

- Native import, Editor/runtime compilation, shader compilation and generation pass the fail-closed gates before export.
- Capture the same blue/center/red/objective positions in Unity and compare with the labeled offline evidence.
- Verify readable territory tint, front, logo, all six Summoners, camps/Major, targeting and ability effects.
- Test foliage cutaway and raised banks at both landscape aspects and multiple combat/objective positions; verify wall-marker visibility and no false occlusion.
- Check rematch cleanup restores ambient/fog and does not duplicate environment roots/lights/materials.
- On iPhone 12 Safari, test movement, independent aim, target previews, six-player combat and full matches, and profile frame time, alpha overdraw, shadows and texture residency/fallback.
- Confirm near scenery rises around the lane in ordinary frames, original Crownfall art is recognizable, and the world continues beyond the gameplay floor.

**Known implementation blockers:** none found by the available source, geometry, compile and gameplay checks.

**Pending native/device verification:** exact FBX unit/axis/material translation; Built-in shader variants and generated references; actual camera tracking/cutaway/territory/HUD rendering; ASTC/fallback memory and iPhone 12 frame time. These are required build/device acceptance steps, not invented successful results.

**Nonblocking remaining visual polish:** some paving repetition, sparse protected approach gaps, compressed/clipped near crowns at certain framing, residual cheap skyline silhouettes, and limited ground-level root/ruin detail. The scene remains short of the long-term premium reference. Further authoring should start from actual Unity gameplay screenshots and preserve these clearance and collision constraints.
