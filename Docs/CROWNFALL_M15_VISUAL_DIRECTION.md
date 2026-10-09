# Crownfall M15 visual direction

Implemented from `e9b3f4be88bf13acb9c60c935d42ba110121fa40` on `browser-parity-unity`. This pass refines presentation around the existing single lane. It does not change the authoritative map, collision, camps, Major, simulation, kits, controls, character artwork, UI or shipping scene.

**Native acceptance is PENDING.** Unity 6000.3.10f1 is unavailable in this workspace. Runtime reference compilation, pure C# tests, source inspection and Blender previews are separate evidence; none certifies Unity imports, shaders, rendering or Safari performance. No player export, Cloud Build, deployment or merge was performed.

## Camera

| Setting | Accepted fallback | M15 |
|---|---:|---:|
| Elevation / yaw | 50° / 0° | 42° / 0° |
| Orthographic half-height | 11 m | 12.25 m |
| Height above ground | 15 m | 20 m |
| Northward focal offset | 0 m | 3.5 m |
| Presentation clamp padding X / Z | 0 / 0 m | 4 / 8 m |
| Near / far clip | 0.1 / 150 m | unchanged |
| Follow sharpness | 9 | unchanged |
| Movement / targeting lookahead | 0.6 / 0.6 m | unchanged |

`CameraFraming.cs` defines the bounded profile and shared projection math. `MobaCamera` uses it; no free rotation is added. Padding changes the camera's presentation clamp, not the map or traversal. The higher camera origin prevents the near plane from discarding useful foreground geometry. The northward focal offset gives raised near foliage room while keeping the human and nearby combat in view. Billboard height at a given display resolution falls approximately 10.2% relative to the fallback. Both profiles must be judged on an actual phone.

Freeze/pause, exponential tracking, death hold, respawn lookahead reset and results centering remain. `UseAcceptedBaseline(true)` or the camera component's **Camera/Accepted Build 14 fallback** context menu restores 50°/11/15 framing and original clamp extents. The fallback is an inspection/recovery option, not an added player control.

Touch/keyboard movement and independent aiming remain byte-identical. Mouse aiming already intersects `Camera.main.ScreenPointToRay` with the Y=0 plane. Pure regression tests cover both profiles and both landscape aspects; the native gate additionally constructs the actual `MobaCamera` component, verifies its framing, and round-trips world targets through its viewport rays.

## Stone lane and continuous ground

`StoneSurface.cginc` samples the existing Quaternius Medieval **T_UnevenBrick_BaseColor.png** and **T_UnevenBrick_Normal.png**, shared with the masonry material. There are **zero new texture payloads or external downloads**. Tile UVs use world X/Z over an 8 m repeat; they do not stretch or swim as blue/red territory meshes resize.

The territory shader itself now renders irregular stone, restrained desaturation, worn seams, seam moss, shallow normal detail and a continuous, variable paving-to-soil transition. Its existing `_Color`, `_Active`, `_Direction` and `_MatchTime` bindings remain. The original Surge wave/canal expressions are retained as emission. This is not a decorative opaque cover over territory. Front coordinates, territory mesh positions/scales, targeting rings, camps and the center insignia are unchanged.

`WorldSurface.shader` gives the existing floor/lane and engineering boundary/island renderers the same world-anchored surface. These ground/retaining renderers do not cast shadows. The only bootstrap additions activate the camera profile, bind the floor materials and bind the two existing territory materials' shared textures. Original `Shape` calls, transforms and collision flags are untouched. The old gold grid is replaced by three short broken inlay accents; it no longer outlines the rectangle.

`WorldContinuation.cs` describes a renderer-only, four-strip exterior apron strictly outside the original 68×64 floor. Native Editor generation produces one mesh, 2,500 vertices and 4,608 triangles, rising from the retaining boundary into irregular outer terrain. It has no collider, rigidbody or gameplay script. The authoritative boundary remains in place; the apron is not traversable ground or a new platform. Its small derived mesh retains CPU data for native geometry checks; production FBX meshes remain unreadable.

## Wilderness refinement

All **190 original placements are retained**. Vegetation and architectural roots are grounded more consistently. Elevated midground trees intentionally emerge from paired rock masses. The pass adds **58 placements**, reaching **248 external instances: 150 NEAR / 52 MID / 46 FAR**:

- Twenty broken lane-transition ledges: sixteen textured Quaternius rocks and four small Kenney cliff fragments, with approach gaps and varied height/rotation/spacing.
- Seven small fern patches around weathered stone.
- Four low spreading Quaternius hero crowns positioned within the normal north-facing camera band.
- Four aged masonry fragments: three walls and one arch among existing groves, not a continuous fortress wall.
- Eighteen cheap mid/far placements selectively promoted from the prior off-camera study, grounded on the exterior apron and checked against the new camera's bounded views.
- Five irregular textured retaining crests absorb the north engineering boundary behind the Major without entering its protected clearance.

The near wilderness supplies physical rock toes, foliage overlap and isolated ruin silhouettes. Midground paired rocks/trees and fragments rise behind it. Cheap far forest/spires and outer terrain extend the world without importing another source pack. Conservative bounds retain protected lane, camp/Major disks and approach corridors. Pocket scenery remains presentation-only in the existing wilderness; it does not acquire collision.

All shipping model AABBs intersect at least one sampled gameplay-camera state. Near vertical scenery exists on both lane sides and passes ordinary ±6 m viewpoint checks. Layer, clearance, permanent-visibility, rotation and mirror checks remain; the validator rejects nine gross regressions. These checks prevent gross failure, not certify art quality.

## Exact external models used

Production FBX paths and dependency/material bindings remain in `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json`. No FBX or texture copy changed.

| Approved model ID | Instances |
|---|---:|
| qn:CommonTree_1 | 26 |
| qn:CommonTree_3 | 13 |
| qn:TwistedTree_1 | 1 |
| qn:Pine_1 | 23 |
| qn:Pine_5 | 4 |
| qn:Fern_1 | 17 |
| qn:Rock_Medium_1 | 14 |
| qn:Rock_Medium_2 | 15 |
| qn:Rock_Medium_3 | 18 |
| kn:cliff_large_rock | 9 |
| kn:cliff_block_rock | 1 |
| kn:cliff_cornerLarge_rock | 1 |
| kn:rock_tallA | 8 |
| kn:rock_tallG | 22 |
| kn:tree_pineTallA | 30 |
| kn:tree_pineTallC | 29 |
| kn:tree_default_dark | 5 |
| kn:statue_columnDamaged | 1 |
| qm:Wall_UnevenBrick_Straight | 4 |
| qm:DoorFrame_Round_Brick | 2 |
| qm:Stairs_Exterior_Straight | 1 |
| kc:tower-square-arch | 1 |
| kc:tower-hexagon-top | 1 |
| kc:wall-corner-half-tower | 1 |
| kc:wall-half-modular | 1 |

Original Crownfall center logo, three forest extensions, two waterfall accents, three Saint Rose accents and the Major Aether Mound remain. They enhance the geometry; they do not replace the near physical enclosure. TwistedTree stays a single landmark. Staged sources, CC0 licenses and provenance remain byte-identical; acquisition documents were not rewritten.

## Materials, lighting and occlusion

The twenty external shared materials retain six families: stone, masonry, bark, opaque foliage, alpha-cutout foliage and distant vegetation. One native-generated shared world-surface material reuses the stone/normal textures. The two existing territory clones remain necessary for independent team/Surge state; there is no per-object material creation for scenery.

Bark/near foliage multipliers retain more source detail than the preceding dark tint. Opaque materials have a restrained saturation control; Castle's colored atlas is desaturated rather than discarded. Source roughness/ORM handling, dielectric response, alpha cutoff/coverage and two-sided foliage remain deliberate. Source resolutions are preserved; Mobile WebGL import limits remain at most 1,024 px with mipmaps, trilinear sampling and planned ASTC 6×6.

One directional key uses 42°/-35°, warm restrained color, intensity 1.05 and shadow strength 0.60. Flat blue-gray ambient fill separates the forms and is restored on match disposal. **Fourteen instances** are shadow-eligible; mid/far filler does not automatically cast. Disabled quality shadows remove environment casting and key shadows while retaining the world composition. Higher shadow resolution allows soft key shadows; lower enabled settings use hard shadows. Quality selection and GPU cost need device testing. Existing shared character contact-shadow discs are raised from Y=.012 to Y=.075 (above territory Y=.02 and insignia Y=.06) when the presentation roots bind; sorting order -20 keeps team markers ahead of them. Artwork and character/controller code are unchanged. This fixes an existing depth-test grounding issue without new lights, textures or per-frame work.

The existing six-Summoner bounded cutaway is retained. A narrow world-anchored dither rim softens its edge without transparent blending; shadow-caster passes bypass camera cutaways. Subject buffers are reused, with no new per-frame environment allocations or physics queries. The shader tests only geometry in front of Summoners. It does not alter gameplay state or the character renderers. Major/camp footprints and approaches retain clearance; their projected readability and ability previews still require native visual inspection.

No robust simplifier is present. CommonTree_1, CommonTree_3, TwistedTree_1, Pine_1, Pine_5 and DoorFrame_Round_Brick retain LOD0. Cheap approved Kenney meshes provide distance tiers; true silhouette-preserving LOD chains remain a follow-up, not fabricated geometry.

## Performance estimates

These are source/reference and conservative AABB-frustum estimates, not GPU/device measurements. `Docs/CROWNFALL_M15_VALIDATION.json` contains per-view estimates, repetition counts and per-texture mip calculations.

| Scope | Estimate |
|---|---:|
| Unique source models / source triangles | 25 / 30,327 |
| External instances / instantiated triangles | 248 / 352,314 |
| Exterior apron mesh / triangles | 1 / 4,608 |
| External plus apron total triangles | 356,922 |
| Representative 16:9 external visible triangles | 100,019–220,422 |
| Including the entire apron as an upper bound | 104,627–225,030 |
| Reference unique meshes including apron | 26; exact native FBX subdivision pending |
| External plus apron shared materials | 21; two existing territory clones are separate |
| Unique external texture payloads | 25; no duplicates/new payloads |
| Mobile ASTC 6×6 mip residency | 14.49 MiB |
| RGBA8 mip fallback residency | 129.33 MiB |
| Alpha-tested model instances | 84 |
| Shadow-eligible instances / material slots | 14 / 22 |
| External material-slot instances | 450 |
| Rich tree instances / far filler instances | 67 / 46 |

The 248 placements plus apron imply 249 reference mesh renderers; original Crownfall's ten sprite renderers and combined inlay are additional. Child transforms/native renderer splits are not counted as placements. Source texture memory is shared with masonry, not added again for paving. Existing production sprite residency is reported separately by `validate_production.py` (83.73 MiB conservative RGBA32); buffers, render targets, imports and WebGL overhead add further cost.

Repeated trees, rocks and cliffs share meshes/materials and are candidates for automatic GPU instancing where Unity/WebGL supports it. Runtime-created hierarchy uses instancing rather than CPU static mesh copies. Static batching would require deliberate native profiling/readability treatment; it is not enabled by assertion. Foliage overdraw, Standard surface passes, six-subject cutaway fragment work, shadows and the 129.33 MiB fallback are the main risks. ASTC support and Safari's actual fallback/residency must be verified. No arbitrary triangle ceiling is imposed.

## Native generation and evidence

`WildernessBuildPreparation.PrepareAndValidate` continues to run before player export. It requires exact Unity/Built-in, imports/remaps all required dependencies, generates sanitized model prefabs/materials and the shipping Resources catalog, builds the renderer-only composition, and fails closed on bad references or shader errors.

M15 adds checks for the shared surface textures/material/shader, actual shipping bootstrap material/catalog references in an additive scene, derived terrain topology/heights/outside-floor vertices, actual runtime-camera profile and targeting-ray projection. Existing mesh/material/texture/renderer/transform/version/clearance/collider checks remain. Native report fields continue to distinguish dependency checks from visual approval. No serialized prefab, scene, material, GUID or `.meta` was guessed in this workspace.

Run when the exact Editor is available:

```sh
python Tools/run_wilderness_unity_validation.py --unity-editor /path/to/6000.3.10f1/Editor/Unity
```

This invokes preparation/validation only; it does not export a player. The lab remains excluded from shipping build settings.

Offline evidence is in `Docs/M15Previews/{blue-combat,center-lane,red-combat,objective}.png`. Each image is visibly labeled **OFFLINE BLENDER APPROXIMATION**. The renderer uses the intended orthographic profile, clamped actor viewpoints, 150 m clip, original static character PNG scale references and preserved glTF reference geometry. Sixteen viewport assertions verify handedness and projection. It does not reproduce Unity shader compilation, mip alpha, ASTC, the runtime cutaway, HUD, VFX, tracking motion or FBX import. No overhead image is substituted for gameplay-camera views.

Validation executed: complete-match/parity tests, both historic and exact-starting-head per-tick gameplay comparison, M1/current-build/production checks, environment integration and nine negative composition fixtures, 2,135 pure camera/terrain assertions, C# syntax parsing and runtime type-check against actual **2021.3.33 reference assemblies**. The latter is not native Unity 6000 compilation. Protection evidence records 783 unchanged files, including gameplay/input, collision/topology, scene, packages and artwork. The bootstrap diff is constrained to exactly three presentation bindings.

The exact changed-file list and production source-byte delta are recorded in `Docs/CROWNFALL_M15_CHANGED_FILES.json`. Test results and evidence-log hashes are in `Docs/CROWNFALL_M15_TEST_RESULTS.json`; preservation hashes are in `Docs/CROWNFALL_M15_GAMEPLAY_PRESERVATION.json`.

## Build #15 acceptance

- [ ] Exact Unity 6000.3.10f1 preparation succeeds; inspect import/compiler/shader warnings and native report.
- [ ] Review blue, center, red and Major viewpoints in Unity with normal movement, targeting and HUD.
- [ ] Confirm stone/weathering, rock-to-lane transitions, visible crowns/ruins and outer depth improve the prior board presentation.
- [ ] Confirm Summoners, front line, objectives, Surge/Canals and ability previews remain clear; test cutaway edges/shadow passes.
- [ ] Compare the accepted camera fallback during actual engagements; preserve independent touch aim/movement.
- [ ] Confirm unchanged traversal/collision and lab exclusion in the native player preparation.
- [ ] Trigger Build #15 manually only after the preceding native review; then test iPhone 12 Safari frame time, overdraw, shadows, texture fallback/residency and rematch/lifecycle.

**NOT READY FOR BUILD #15 native sign-off yet.** The concrete remaining gate is execution of the exact Editor's import/compilation/shader/prebuild validation and review of these four actual gameplay-camera positions. Run the command above, correct any native errors it reports, and accept the camera/material/occlusion results in Unity before triggering the build. Device performance is a subsequent Build #15 acceptance test, not a claimed result or a speculative source-code blocker.
