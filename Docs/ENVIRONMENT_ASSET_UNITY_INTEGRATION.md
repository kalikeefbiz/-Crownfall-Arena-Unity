# Crownfall external environment Unity integration lab

**Prepared input library and deterministic Editor tooling completed. Native Unity import/render validation is PENDING; the library is NOT READY for shipping arena composition.**

Starting HEAD: `ef735e9d1407a1dd9104f071226ebfd9fff1c3d3`; branch `browser-parity-unity`. No gameplay, MatchSimulation, MatchMap, lane/camp/Major locations, collision, camera, character/HUD presentation, shipping scene, package manifest or project setting changed. No build, deployment or main-branch action was performed.

## Availability and what was actually executed

No `Unity`/`unity` executable or Unity installation was found in the selected environment’s command path or standard `/opt`, `/usr/local`, `/Applications` locations. Project version remains **6000.3.10f1**. There are no fabricated Unity `.meta` files, GUIDs, `.mat`, `.prefab`, `.asset` or `.unity` files in this prepared library.

Blender 4.3.2 imported **16 binary FBX** files. The **nine Kenney Nature ASCII FBX** files are unsupported by Blender’s FBX importer; their vertices, polygon indices, static transforms, material colors/names and FBX global axis/unit settings were inspected directly instead. Their measured triangles and normalized dimensions match the canonical glTF references. Native Unity support for these ASCII exports remains an explicit acceptance gate.

Existing static checks passed: `validate_m1.py` (includes M0 syntax/assets and current-build contracts), `validate_production.py` (includes UI dependency regressions), and the new `validate_environment_library.py`. Four new Editor C# files are syntax-parsed; this is **not** an API compile. The repository’s compiled complete-match tests and runtime-reference compile were attempted but could not run because .NET SDK and verified Unity reference assemblies are unavailable. Native runner correctly refuses to pretend success without the Editor.

Existing validators received two limited scope updates: pending new environment files may await Editor-created metadata; unreferenced 3D-library textures are checked/budgeted independently from the shipping sprite/brand 90 MiB budget. All prior shipping checks remain active. Hidden files follow Unity’s ignore convention. The new environment gate verifies exact candidates, dependencies, copies, source hashes and unchanged protected paths.

## Production structure and byte accounting

| Content | Path |
|---|---|
| Approved Quaternius Nature FBXs | `Assets/Art/Environment/External/Quaternius/Nature/Models/` |
| Approved Quaternius Medieval FBXs | `Assets/Art/Environment/External/Quaternius/Medieval/Models/` |
| Approved Kenney Nature FBXs | `Assets/Art/Environment/External/Kenney/Nature/Models/` |
| Approved Kenney Castle FBXs | `Assets/Art/Environment/External/Kenney/Castle/Models/` |
| One copy per texture payload | `Assets/Art/Environment/External/SharedTextures/` |
| Four original CC0 licenses and four provenance records | `Assets/Art/Environment/External/Licenses/`, `Provenance/` |
| Import/material/model catalog | `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json` |
| Built-in shader family | `Assets/Crownfall/Environment/Shaders/` |
| Native Editor automation | `Assets/Editor/CrownfallEnvironment/` |
| Editor-generated materials and presentation prefabs (PENDING) | `Assets/Crownfall/Environment/Generated/Materials/`, `Generated/Prefabs/` |
| Editor-generated non-shipping lab scene (PENDING) | `Assets/Editor/CrownfallEnvironment/Generated/EnvironmentAssetLab.unity` |

Original production input payloads: **67,624,322 bytes** (64.49 MiB): 25 FBXs, 25 textures, four licenses and four provenance records. Total files added under `Assets/`, including catalog, shaders, documentation and Editor scripts: **67,732,072 bytes**. These figures exclude future Editor-generated metadata/materials/prefabs/scene/Library import artifacts.

There are 41 model-to-texture dependencies represented by 25 unique texture payloads: **16 repeated dependencies share existing production copies**. No alternate glTF/GLB or entire source folder was imported. Each model/material binding and texture dependency is expanded in the catalog’s `models`, `materials`, `textures` and `productionCopies` arrays. All 58 source copies and all 419 staged original members pass SHA-256/byte checks. Staged originals and acquisition documentation remain unchanged. No individual new file reaches GitHub’s 100 MB hard limit.

## Exact approved 25-model inventory

Scale columns separate FBX file normalization from a proposed presentation-wrapper scale. The latter is a starting lab size, not a validated Crownfall placement. Height reflects the normalized source bounds times presentation scale. Production FBX filenames match the names below under their source-group `Models/` folder.

| ID | Lab group | FBX globalScale | Proposed presentation scale | Proposed height | Source triangles | LOD treatment |
|---|---|---:|---:|---:|---:|---|
| `qn:CommonTree_1` | HERO / NEAR | 1 | 1 | 7.265 m | 6,265 | Derived LOD plan; pending |
| `qn:CommonTree_3` | HERO / NEAR | 1 | 1 | 9.425 m | 3,505 | Derived LOD plan; pending |
| `qn:TwistedTree_1` | HERO / NEAR | 1 | 1 | 16.726 m | 9,564 | Derived LOD plan; pending |
| `qn:Pine_1` | HERO / NEAR | 1 | 1 | 7.317 m | 3,947 | Derived LOD plan; pending |
| `qn:Pine_5` | HERO / NEAR | 1 | 1 | 8.724 m | 1,646 | Derived LOD plan; pending |
| `qn:Fern_1` | HERO / NEAR | 0.3125 | 0.6 | 0.504 m | 288 | LOD0 only |
| `qn:Rock_Medium_1` | HERO / NEAR | 1 | 1 | 2.260 m | 342 | LOD0 only |
| `qn:Rock_Medium_2` | HERO / NEAR | 1 | 1 | 1.899 m | 244 | LOD0 only |
| `qn:Rock_Medium_3` | HERO / NEAR | 1 | 1 | 2.316 m | 522 | LOD0 only |
| `kn:cliff_large_rock` | MIDGROUND | 1 | 8 | 8.000 m | 32 | LOD0 only |
| `kn:cliff_block_rock` | MIDGROUND | 1 | 8 | 8.000 m | 12 | LOD0 only |
| `kn:cliff_cornerLarge_rock` | MIDGROUND | 1 | 8 | 8.000 m | 12 | LOD0 only |
| `kn:rock_tallA` | DISTANT | 1 | 8 | 7.967 m | 136 | LOD0 only |
| `kn:rock_tallG` | DISTANT | 1 | 8 | 6.264 m | 62 | LOD0 only |
| `kn:tree_pineTallA` | DISTANT | 1 | 5 | 7.648 m | 78 | LOD0 only |
| `kn:tree_pineTallC` | DISTANT | 1 | 5 | 8.353 m | 98 | LOD0 only |
| `kn:tree_default_dark` | DISTANT | 1 | 5 | 8.539 m | 114 | LOD0 only |
| `kn:statue_columnDamaged` | STRUCTURAL | 1 | 4 | 2.800 m | 108 | LOD0 only |
| `qm:Wall_UnevenBrick_Straight` | STRUCTURAL | 1 | 1 | 3.123 m | 56 | LOD0 only |
| `qm:DoorFrame_Round_Brick` | STRUCTURAL | 1 | 1 | 2.586 m | 2,046 | Derived LOD plan; pending |
| `qm:Stairs_Exterior_Straight` | STRUCTURAL | 1 | 1 | 1.204 m | 62 | LOD0 only |
| `kc:tower-square-arch` | STRUCTURAL | 1 | 4 | 4.040 m | 308 | LOD0 only |
| `kc:tower-hexagon-top` | STRUCTURAL | 1 | 4 | 0.520 m | 168 | LOD0 only |
| `kc:wall-corner-half-tower` | STRUCTURAL | 1 | 4 | 5.760 m | 632 | LOD0 only |
| `kc:wall-half-modular` | STRUCTURAL | 1 | 4 | 5.240 m | 80 | LOD0 only |

## Scale, axis and pivot findings

All 25 FBXs declare positive Y up, Z front and X coordinate axes. Quaternius and Kenney Castle declare `UnitScaleFactor = 1` (centimeter metadata); Kenney Nature ASCII exports declare `10` (decimeters), with coordinates correspondingly about ten times the canonical meter-sized glTF coordinates. Configure **useFileScale=true**, **bakeAxisConversion=true**, globalScale=1 for 24 models and **0.3125 for Fern_1**. Do not ignore FBX units or apply an additional blanket 100× conversion.

`Fern_1` has the same 288 triangles in both exports, but its FBX bounds are approximately **9.046 × 2.689 × 8.487 m**, versus **2.827 × 0.840 × 2.652** for glTF: a uniform 3.2× discrepancy. Normalization by 1/3.2 addresses that measured export difference. The proposed fern wrapper scale of 0.6 yields about 0.504 m height. All other source bounds agree within inventory rounding. Native bounds checks allow small importer/AABB variation but fail mismatched axes or scale instead of guessing a corrective rotation.

Hero tree source heights span 7.265–16.725 m. Kenney distant trees are 1.530–1.708 m before the proposed 5× presentation scale. Cliff/outcrop backing uses an 8× lab proposal; Castle modular structures use 4×; Medieval masonry retains 1×. These are explicit per-asset proposals, not a redesign of the arena. Presentation prefabs retain a unit root, center their visual pivot on X/Z, ground the minimum Y, and place proposal scaling on a dedicated child. Native report will record imported and presentation bounds. Asymmetric handedness/front-face appearance still needs visual Unity review.

## Deliberate Built-in material strategy

**Six families; 20 shared source-compatible material variants**, plus two neutral lab-only materials generated by the Editor. Variant count reflects distinct source textures/colors rather than one material per object. Native `.mat` generation is pending.

| Family | Planned variants | Behavior |
|---|---:|---|
| alpha-cutout foliage | 4 | Double-sided alpha test, cutoff 0.2, lit front/back normals, opaque shadow cutout |
| bark | 4 | Opaque dielectric; normal maps where supplied; includes surviving timber trim |
| distant vegetation | 1 | Opaque source-colored Kenney foliage; distant prefab shadows disabled |
| masonry | 7 | Opaque dielectric; source roughness/ORM mapping; two-sided where required by open/thin geometry |
| opaque foliage | 1 | Source-colored solid Kenney grass surfaces |
| stone | 3 | Opaque dielectric textured boulders or source-colored rock/dirt backing |

The two project-owned surface shaders use Unity’s Built-in Standard lighting, support shared-material instancing, and require no URP/HDRP or external shader/import package. Metallic is explicitly **zero** in the shaders; source Kenney/Medieval PBR metadata is not trusted. Color values and base textures are preserved, including cyan Kenney vegetation/warm earth and red twisted-tree foliage. No Crownfall palette redesign occurs here.

Medieval linear roughness R maps to smoothness `1-R`; ORM R maps to occlusion and G to roughness, while B metallic is intentionally ignored for these dielectric surfaces. Normal maps use original provided **Godot-Unity** variants for Medieval. Bark is opaque even when the glTF exporter tagged it MASK. Leaf cards use a separate double-sided cutout shader. Shader compilation, two-sided normal/shadow correctness, normal-map handedness, source color-space interpretation and material appearance remain native visual acceptance items.

Imported FBX source material names are matched explicitly to catalog bindings. `ImportStandard` supplies temporary source identifiers without relying on its visual translation. `AddRemap` and the assignment callback resolve shared deliberate materials. Unexpected names/null materials fail generation. Materials are never auto-created separately for each object.

## Model/texture import policy

Models: native FBX; measured globalScale; useFileScale; baked axis conversion; imported normals; MikkTSpace tangents; CPU mesh readability disabled; mesh compression **Off** to protect silhouettes until native comparison; animation/blend shapes/cameras/lights/collider generation disabled; mesh index/vertex optimization enabled. No glTF importer package, runtime loader or package-manifest change.

Textures: one shared payload per hash; color/cutout maps sRGB, normal/data maps linear; NormalMap type for normal maps; mipmaps on, trilinear filtering, anisotropy 2, unreadable CPU copies, no WebGL streaming-mipmap assumption. Wrap Repeat for tiled opaque materials, Clamp for foliage atlases and Castle colormap. NPOTScale=None; selected textures are power-of-two. Cutout alpha from input, alpha transparency dilation and coverage-preserving mipmaps use cutoff 0.2. Other maps discard unused alpha in importer configuration.

Original pixels/resolution are unchanged. Default/Full texture limits are 2048; the Mobile lab entry point applies 1024 **WebGL import limits**, not destructive resizing. In a non-WebGL active Editor target, its preview texture may still use the full default size: verify platform-specific import separately. EditorPrefs stores only the selected lab tier; each entry point explicitly selects its tier and reimports the scoped textures. No project quality settings are changed.

WebGL override: **ASTC 6×6** for the iPhone 12-class mobile path. This does not certify browser/desktop extension support. Unsupported paths may decompress or require a separate platform compression variant, greatly increasing residency. Verify actual iPhone 12 WebGL texture format/extension support and fallback behavior before composition/device acceptance. This task performs no player build.

## LOD decisions

No derived geometry or fake LOD chain is claimed. `CommonTree_1`, `CommonTree_3`, `TwistedTree_1`, `Pine_1`, `Pine_5` and `DoorFrame_Round_Brick` are tagged as six LOD candidates; their generated presentation prefabs initially contain the original LOD0 only.

- Common trees: preserve trunk branching and canopy outline; simplify trunk bevel/detail separately from whole foliage-card clusters. Judge card removal from the elevated camera, including alpha-coverage and shadow silhouettes.
- TwistedTree_1: retain the bent trunk and landmark silhouette; its 9,564 triangles justify derived distance levels after native material/scale acceptance.
- Pine_1: preserve tier spacing and branch outline. Pine_5 is already 1,646 triangles; additional reductions must prove useful visually and in frame time.
- DoorFrame_Round_Brick: preserve the opening and stone outline; reduce small bevels selectively only if repeated masonry cost warrants it.
- The other 19 models retain LOD0. Kenney meshes are already 12–632 triangles; redundant decimated levels add management without guaranteed savings. Forest cluster proxies/impostors are a later far-distance option, while the same 3D world composition remains intact.

No blanket decimation or arbitrary triangle target is applied. Later derived LODs must use separate asset paths, leave source FBXs intact, receive elevated-view silhouette review, and then be assigned by native LODGroup automation.

## Isolated lab and native commands

Open this checkout with Unity **6000.3.10f1**, then use **Crownfall → Environment Lab → Generate and validate (full textures)**. Batch equivalent:

```sh
python Tools/run_environment_unity_validation.py --unity-editor /absolute/path/to/Unity
# Optional tier inspection:
python Tools/run_environment_unity_validation.py --unity-editor /absolute/path/to/Unity --mobile-textures
```

`--no-graphics` supports an import/generation-only environment and never certifies rendering. Unity must be installed/licensed first. The tool executes no BuildPipeline/player build. The exact version and Built-in renderer are enforced inside the Editor.

The generator creates an additive scene, preserving existing active scenes and protected file hashes. Models are laid out in HERO / NEAR, MIDGROUND, DISTANT and STRUCTURAL groups on a neutral ground/reference slab, each beside a **1.8 m marker**, with neutral directional light, labels, and a **50° elevated orthographic lab camera**. All lab roots receive a (1000,0,1000) offset to keep its camera away from any loaded arena. Group centers relative to that offset are (-55,-45), (55,-45), (-55,65), (55,65) in X/Z; three columns use 24 m spacing. Open the generated lab scene alone for visual acceptance. Placement is inspection-only, not arena coordinates.

Source clones are unpacked into presentation wrappers containing only transforms, MeshFilters and MeshRenderers. Physics, animation and other components are stripped. Primitive lab markers/ground immediately lose their temporary colliders. Both prefabs and saved/opened lab are asserted collider-free. The lab path lives under Editor and is explicitly rejected if found in EditorBuildSettings; the generator never adds build scenes. Re-running safely regenerates owned lab outputs and preserves native metadata GUIDs.

Native validation records exact Editor version, actual model triangles/bounds/material slots, importer and texture settings, shader/material dependency checks, prefab collider absence, lab load/coverage, and warnings/errors during import/generation in `Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json`. That report is deliberately absent until Unity executes. A native import pass still requires visual render approval; it does not automatically mark composition readiness true.

## First-pass performance observations

One instance of each approved model totals **30,327 source triangles** and **42 base material slots** before instancing/batching. There are **29 shadow-casting slots** in the proposed prefab policy. Six models use alpha-tested foliage. The lab is a library comparison, not a density/frame-time stress test.

| Shared texture tier | RGBA8 with exact mip chain | ASTC 6×6 with exact mip chain |
|---|---:|---:|
| full | 481.33 MiB | 53.75 MiB |
| mobile | 129.33 MiB | 14.49 MiB |

These estimates sum 25 unique texture payloads only and assume consistent formats; Unity normal-map conversion, upload alignment, driver duplication, fallback decompression and frame buffers can change actual memory. They exclude shipping character/UI/VFX textures. Source dimensions are 512², 1024² and 2048²; each texture’s dimensions/role/import limit is recorded in the catalog.

A substantial enclosure can easily exceed the one-each library count. Two explicit planning cases assume visible repeated near trees, boulders, forest rows and cliffs:

| Planning case | LOD0 triangles | Unbatched base material submissions |
|---|---:|---:|
| Layered enclosure planning case | 536,888 | 2,738 |
| Dense enclosure planning case | 2,137,172 | 10,916 |

These are illustrative simultaneously-visible instance workloads, **not measured arena visibility, a frame-time forecast or a triangle ceiling**. Exact assumed counts are in `ENVIRONMENT_ASSET_PERFORMANCE_PLAN.json`; final visibility depends on camera, occlusion, LOD and composition. Preserve the substantial world and scale those costs intelligently for iPhone 12.

- Instancing: repeated CommonTree/Pine pairs, the three boulders sharing `qn_Rocks`, Kenney forest meshes with shared source-color materials, and Castle pieces sharing one 512² atlas. Material variants enable instancing; actual Built-in/WebGL batching results need native/device measurement.
- Static batching candidates: stationary masonry, cliff courses and fortification pieces after composition. Do not mark every tree static automatically; compare static-batch geometry duplication with instanced repetition.
- Far forest clustering: `tree_pineTallA`, `tree_pineTallC`, `tree_default_dark` are 78, 98 and 114 triangles respectively. Prefab distant shadows are disabled; group clusters can later receive derived LODs/proxies without flattening the whole environment.
- Draw-call multipliers: material slots, shadow-map cascades, additional per-pixel lights and depth passes multiply submissions. For one-each geometry, base 42 plus shadow-casting slots per cascade gives a useful lower-level planning proxy; it is not a captured GPU draw-call count.
- Shadow/fill risks: overlapping double-sided leaf cards, alpha-tested shadow casters, deep forest overlap and full-resolution bark/normal sets. Fern shadow casting is off, distant assets cast/receive no shadows; near hero trees retain shadows. Further reductions belong to measured quality tiers, not arbitrary removal of world depth.

## Readiness and next step

**NOT READY for Crownfall arena composition. READY for the required native Unity import-validation step.** The checked-in deliverable is prepared production inputs plus automation; native materials, prefabs and the scene have not been generated or viewed.

Next: run the native generator on Unity 6000.3.10f1, inspect all 25 labeled lab placements and source/material scales, resolve any ASCII FBX or shader errors, and review leaf coverage/normal/shadow behavior. Then produce silhouette-preserving LODs for the candidates and profile a dense isolated enclosure on iPhone 12 before authorizing arena composition.

Future arena composition should use textured near trees/rock footing, layered tall cliff/forest masses and selective ancient structures around the existing single 3v3 lane. Remaining art gaps are substantial broken ruins, rugged hero cliffs and finished mountains/Aether formations; no newly authored geometry or effects for those gaps are claimed in this pass.

Machine-readable evidence: `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json`, `Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json`, `Docs/ENVIRONMENT_ASSET_INTEGRATION_VALIDATION.json`, `Docs/ENVIRONMENT_ASSET_PERFORMANCE_PLAN.json`.
