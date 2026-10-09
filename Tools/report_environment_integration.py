"""Regenerate the isolated integration report and explicit planning workloads."""
from pathlib import Path
import json
import math

ROOT=Path(__file__).resolve().parents[1]
j=json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text())
validation=json.loads((ROOT/'Docs/ENVIRONMENT_ASSET_INTEGRATION_VALIDATION.json').read_text())
fbx=json.loads((ROOT/'Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json').read_text())
by_id={m['id']:m for m in j['models']}
materials={m['key']:m for m in j['materials']}
def residency(limit,compressed):
 total=0
 for texture in j['textures']:
  scale=min(1,limit/max(texture['width'],texture['height']));w=max(1,round(texture['width']*scale));h=max(1,round(texture['height']*scale))
  while True:
   total+=(math.ceil(w/6)*math.ceil(h/6)*16 if compressed else w*h*4)
   if w==h==1:break
   w=max(1,w//2);h=max(1,h//2)
 return total

# These are assumed simultaneously visible instances, not an authored arena.
scenarios=[]
for name,hero_factor,far_factor in [('Layered enclosure planning case',1,1),('Dense enclosure planning case',4,4)]:
 counts={m['id']:1 for m in j['models']}
 counts.update({'qn:CommonTree_1':20*hero_factor,'qn:CommonTree_3':16*hero_factor,'qn:TwistedTree_1':4*hero_factor,
  'qn:Pine_1':24*hero_factor,'qn:Pine_5':24*hero_factor,'qn:Fern_1':80*hero_factor,
  'qn:Rock_Medium_1':50*hero_factor,'qn:Rock_Medium_2':50*hero_factor,'qn:Rock_Medium_3':50*hero_factor,
  'kn:tree_pineTallA':300*far_factor,'kn:tree_pineTallC':300*far_factor,'kn:tree_default_dark':300*far_factor,
  'kn:cliff_large_rock':40*far_factor,'kn:cliff_block_rock':40*far_factor,'kn:cliff_cornerLarge_rock':40*far_factor,
  'kn:rock_tallA':60*far_factor,'kn:rock_tallG':60*far_factor})
 scenarios.append({'name':name,'simultaneouslyVisibleInstances':counts,'lod0TriangleEstimate':sum(by_id[id]['sourceTriangles']*count for id,count in counts.items()),
  'unbatchedBaseMaterialSubmissionEstimate':sum(len(by_id[id]['bindings'])*count for id,count in counts.items())})
perf={'sourceTrianglesOneEach':j['totalSourceTriangles'],'oneEachBaseMaterialSlots':sum(len(m['bindings']) for m in j['models']),
 'oneEachShadowCastingMaterialSlots':sum(len(m['bindings']) for m in j['models'] if m['castShadows']),
 'texturePayloads':len(j['textures']),'alphaTestedModels':j['foliageAlphaTestedModels'],
 'textureResidencyBytes':{'fullRGBA8WithMipmaps':residency(2048,False),'mobileRGBA8WithMipmaps':residency(1024,False),
  'fullASTC6x6WithMipmaps':residency(2048,True),'mobileASTC6x6WithMipmaps':residency(1024,True)},
 'scenarios':scenarios,'measurementStatus':'Source geometry plus explicit planning assumptions; no Unity frame time, actual draw-call or device-residency measurement'}
(ROOT/'Docs/ENVIRONMENT_ASSET_PERFORMANCE_PLAN.json').write_text(json.dumps(perf,indent=2)+'\n')

lines=['# Crownfall external environment Unity integration lab','',
'**Prepared input library and deterministic Editor tooling completed. Native Unity import/render validation is PENDING; the library is NOT READY for shipping arena composition.**', '',
'Starting HEAD: `ef735e9d1407a1dd9104f071226ebfd9fff1c3d3`; branch `browser-parity-unity`. No gameplay, MatchSimulation, MatchMap, lane/camp/Major locations, collision, camera, character/HUD presentation, shipping scene, package manifest or project setting changed. No build, deployment or main-branch action was performed.', '',
'## Availability and what was actually executed','',
'No `Unity`/`unity` executable or Unity installation was found in the selected environment’s command path or standard `/opt`, `/usr/local`, `/Applications` locations. Project version remains **6000.3.10f1**. There are no fabricated Unity `.meta` files, GUIDs, `.mat`, `.prefab`, `.asset` or `.unity` files in this prepared library.', '',
'Blender 4.3.2 imported **16 binary FBX** files. The **nine Kenney Nature ASCII FBX** files are unsupported by Blender’s FBX importer; their vertices, polygon indices, static transforms, material colors/names and FBX global axis/unit settings were inspected directly instead. Their measured triangles and normalized dimensions match the canonical glTF references. Native Unity support for these ASCII exports remains an explicit acceptance gate.', '',
'Existing static checks passed: `validate_m1.py` (includes M0 syntax/assets and current-build contracts), `validate_production.py` (includes UI dependency regressions), and the new `validate_environment_library.py`. Four new Editor C# files are syntax-parsed; this is **not** an API compile. The repository’s compiled complete-match tests and runtime-reference compile were attempted but could not run because .NET SDK and verified Unity reference assemblies are unavailable. Native runner correctly refuses to pretend success without the Editor.', '',
'Existing validators received two limited scope updates: pending new environment files may await Editor-created metadata; unreferenced 3D-library textures are checked/budgeted independently from the shipping sprite/brand 90 MiB budget. All prior shipping checks remain active. Hidden files follow Unity’s ignore convention. The new environment gate verifies exact candidates, dependencies, copies, source hashes and unchanged protected paths.', '',
'## Production structure and byte accounting','',
'| Content | Path |','|---|---|',
'| Approved Quaternius Nature FBXs | `Assets/Art/Environment/External/Quaternius/Nature/Models/` |',
'| Approved Quaternius Medieval FBXs | `Assets/Art/Environment/External/Quaternius/Medieval/Models/` |',
'| Approved Kenney Nature FBXs | `Assets/Art/Environment/External/Kenney/Nature/Models/` |',
'| Approved Kenney Castle FBXs | `Assets/Art/Environment/External/Kenney/Castle/Models/` |',
'| One copy per texture payload | `Assets/Art/Environment/External/SharedTextures/` |',
'| Four original CC0 licenses and four provenance records | `Assets/Art/Environment/External/Licenses/`, `Provenance/` |',
'| Import/material/model catalog | `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json` |',
'| Built-in shader family | `Assets/Crownfall/Environment/Shaders/` |',
'| Native Editor automation | `Assets/Editor/CrownfallEnvironment/` |',
'| Editor-generated materials and presentation prefabs (PENDING) | `Assets/Crownfall/Environment/Generated/Materials/`, `Generated/Prefabs/` |',
'| Editor-generated non-shipping lab scene (PENDING) | `Assets/Editor/CrownfallEnvironment/Generated/EnvironmentAssetLab.unity` |', '',
f'Original production input payloads: **{j["sourcePayloadBytes"]:,} bytes** ({j["sourcePayloadBytes"]/1048576:.2f} MiB): 25 FBXs, 25 textures, four licenses and four provenance records. Total files added under `Assets/`, including catalog, shaders, documentation and Editor scripts: **{validation["totalAddedAssetsBytes"]:,} bytes**. These figures exclude future Editor-generated metadata/materials/prefabs/scene/Library import artifacts.', '',
'There are 41 model-to-texture dependencies represented by 25 unique texture payloads: **16 repeated dependencies share existing production copies**. No alternate glTF/GLB or entire source folder was imported. Each model/material binding and texture dependency is expanded in the catalog’s `models`, `materials`, `textures` and `productionCopies` arrays. All 58 source copies and all 419 staged original members pass SHA-256/byte checks. Staged originals and acquisition documentation remain unchanged. No individual new file reaches GitHub’s 100 MB hard limit.', '',
'## Exact approved 25-model inventory','',
'Scale columns separate FBX file normalization from a proposed presentation-wrapper scale. The latter is a starting lab size, not a validated Crownfall placement. Height reflects the normalized source bounds times presentation scale. Production FBX filenames match the names below under their source-group `Models/` folder.', '',
'| ID | Lab group | FBX globalScale | Proposed presentation scale | Proposed height | Source triangles | LOD treatment |','|---|---|---:|---:|---:|---:|---|']
for m in j['models']:
 lines.append(f'| `{m["id"]}` | {m["group"]} | {m["importScale"]:g} | {m["presentationScale"]:g} | {m["expectedSize"][1]*m["presentationScale"]:.3f} m | {m["sourceTriangles"]:,} | {"Derived LOD plan; pending" if m["lodCandidate"] else "LOD0 only"} |')
lines += ['',
'## Scale, axis and pivot findings','',
'All 25 FBXs declare positive Y up, Z front and X coordinate axes. Quaternius and Kenney Castle declare `UnitScaleFactor = 1` (centimeter metadata); Kenney Nature ASCII exports declare `10` (decimeters), with coordinates correspondingly about ten times the canonical meter-sized glTF coordinates. Configure **useFileScale=true**, **bakeAxisConversion=true**, globalScale=1 for 24 models and **0.3125 for Fern_1**. Do not ignore FBX units or apply an additional blanket 100× conversion.', '',
'`Fern_1` has the same 288 triangles in both exports, but its FBX bounds are approximately **9.046 × 2.689 × 8.487 m**, versus **2.827 × 0.840 × 2.652** for glTF: a uniform 3.2× discrepancy. Normalization by 1/3.2 addresses that measured export difference. The proposed fern wrapper scale of 0.6 yields about 0.504 m height. All other source bounds agree within inventory rounding. Native bounds checks allow small importer/AABB variation but fail mismatched axes or scale instead of guessing a corrective rotation.', '',
'Hero tree source heights span 7.265–16.725 m. Kenney distant trees are 1.530–1.708 m before the proposed 5× presentation scale. Cliff/outcrop backing uses an 8× lab proposal; Castle modular structures use 4×; Medieval masonry retains 1×. These are explicit per-asset proposals, not a redesign of the arena. Presentation prefabs retain a unit root, center their visual pivot on X/Z, ground the minimum Y, and place proposal scaling on a dedicated child. Native report will record imported and presentation bounds. Asymmetric handedness/front-face appearance still needs visual Unity review.', '',
'## Deliberate Built-in material strategy','',
'**Six families; 20 shared source-compatible material variants**, plus two neutral lab-only materials generated by the Editor. Variant count reflects distinct source textures/colors rather than one material per object. Native `.mat` generation is pending.', '',
'| Family | Planned variants | Behavior |','|---|---:|---|']
for family in sorted(set(m['family'] for m in j['materials'])):
 count=sum(m['family']==family for m in j['materials'])
 behavior={'alpha-cutout foliage':'Double-sided alpha test, cutoff 0.2, lit front/back normals, opaque shadow cutout',
  'bark':'Opaque dielectric; normal maps where supplied; includes surviving timber trim',
  'distant vegetation':'Opaque source-colored Kenney foliage; distant prefab shadows disabled',
  'masonry':'Opaque dielectric; source roughness/ORM mapping; two-sided where required by open/thin geometry',
  'opaque foliage':'Source-colored solid Kenney grass surfaces',
  'stone':'Opaque dielectric textured boulders or source-colored rock/dirt backing'}[family]
 lines.append(f'| {family} | {count} | {behavior} |')
lines += ['',
'The two project-owned surface shaders use Unity’s Built-in Standard lighting, support shared-material instancing, and require no URP/HDRP or external shader/import package. Metallic is explicitly **zero** in the shaders; source Kenney/Medieval PBR metadata is not trusted. Color values and base textures are preserved, including cyan Kenney vegetation/warm earth and red twisted-tree foliage. No Crownfall palette redesign occurs here.', '',
'Medieval linear roughness R maps to smoothness `1-R`; ORM R maps to occlusion and G to roughness, while B metallic is intentionally ignored for these dielectric surfaces. Normal maps use original provided **Godot-Unity** variants for Medieval. Bark is opaque even when the glTF exporter tagged it MASK. Leaf cards use a separate double-sided cutout shader. Shader compilation, two-sided normal/shadow correctness, normal-map handedness, source color-space interpretation and material appearance remain native visual acceptance items.', '',
'Imported FBX source material names are matched explicitly to catalog bindings. `ImportStandard` supplies temporary source identifiers without relying on its visual translation. `AddRemap` and the assignment callback resolve shared deliberate materials. Unexpected names/null materials fail generation. Materials are never auto-created separately for each object.', '',
'## Model/texture import policy','',
'Models: native FBX; measured globalScale; useFileScale; baked axis conversion; imported normals; MikkTSpace tangents; CPU mesh readability disabled; mesh compression **Off** to protect silhouettes until native comparison; animation/blend shapes/cameras/lights/collider generation disabled; mesh index/vertex optimization enabled. No glTF importer package, runtime loader or package-manifest change.', '',
'Textures: one shared payload per hash; color/cutout maps sRGB, normal/data maps linear; NormalMap type for normal maps; mipmaps on, trilinear filtering, anisotropy 2, unreadable CPU copies, no WebGL streaming-mipmap assumption. Wrap Repeat for tiled opaque materials, Clamp for foliage atlases and Castle colormap. NPOTScale=None; selected textures are power-of-two. Cutout alpha from input, alpha transparency dilation and coverage-preserving mipmaps use cutoff 0.2. Other maps discard unused alpha in importer configuration.', '',
'Original pixels/resolution are unchanged. Default/Full texture limits are 2048; the Mobile lab entry point applies 1024 **WebGL import limits**, not destructive resizing. In a non-WebGL active Editor target, its preview texture may still use the full default size: verify platform-specific import separately. EditorPrefs stores only the selected lab tier; each entry point explicitly selects its tier and reimports the scoped textures. No project quality settings are changed.', '',
'WebGL override: **ASTC 6×6** for the iPhone 12-class mobile path. This does not certify browser/desktop extension support. Unsupported paths may decompress or require a separate platform compression variant, greatly increasing residency. Verify actual iPhone 12 WebGL texture format/extension support and fallback behavior before composition/device acceptance. This task performs no player build.', '',
'## LOD decisions','',
'No derived geometry or fake LOD chain is claimed. `CommonTree_1`, `CommonTree_3`, `TwistedTree_1`, `Pine_1`, `Pine_5` and `DoorFrame_Round_Brick` are tagged as six LOD candidates; their generated presentation prefabs initially contain the original LOD0 only.', '',
'- Common trees: preserve trunk branching and canopy outline; simplify trunk bevel/detail separately from whole foliage-card clusters. Judge card removal from the elevated camera, including alpha-coverage and shadow silhouettes.',
'- TwistedTree_1: retain the bent trunk and landmark silhouette; its 9,564 triangles justify derived distance levels after native material/scale acceptance.',
'- Pine_1: preserve tier spacing and branch outline. Pine_5 is already 1,646 triangles; additional reductions must prove useful visually and in frame time.',
'- DoorFrame_Round_Brick: preserve the opening and stone outline; reduce small bevels selectively only if repeated masonry cost warrants it.',
'- The other 19 models retain LOD0. Kenney meshes are already 12–632 triangles; redundant decimated levels add management without guaranteed savings. Forest cluster proxies/impostors are a later far-distance option, while the same 3D world composition remains intact.', '',
'No blanket decimation or arbitrary triangle target is applied. Later derived LODs must use separate asset paths, leave source FBXs intact, receive elevated-view silhouette review, and then be assigned by native LODGroup automation.', '',
'## Isolated lab and native commands','',
'Open this checkout with Unity **6000.3.10f1**, then use **Crownfall → Environment Lab → Generate and validate (full textures)**. Batch equivalent:', '',
'```sh',
'python Tools/run_environment_unity_validation.py --unity-editor /absolute/path/to/Unity',
'# Optional tier inspection:',
'python Tools/run_environment_unity_validation.py --unity-editor /absolute/path/to/Unity --mobile-textures',
'```', '',
'`--no-graphics` supports an import/generation-only environment and never certifies rendering. Unity must be installed/licensed first. The tool executes no BuildPipeline/player build. The exact version and Built-in renderer are enforced inside the Editor.', '',
'The generator creates an additive scene, preserving existing active scenes and protected file hashes. Models are laid out in HERO / NEAR, MIDGROUND, DISTANT and STRUCTURAL groups on a neutral ground/reference slab, each beside a **1.8 m marker**, with neutral directional light, labels, and a **50° elevated orthographic lab camera**. All lab roots receive a (1000,0,1000) offset to keep its camera away from any loaded arena. Group centers relative to that offset are (-55,-45), (55,-45), (-55,65), (55,65) in X/Z; three columns use 24 m spacing. Open the generated lab scene alone for visual acceptance. Placement is inspection-only, not arena coordinates.', '',
'Source clones are unpacked into presentation wrappers containing only transforms, MeshFilters and MeshRenderers. Physics, animation and other components are stripped. Primitive lab markers/ground immediately lose their temporary colliders. Both prefabs and saved/opened lab are asserted collider-free. The lab path lives under Editor and is explicitly rejected if found in EditorBuildSettings; the generator never adds build scenes. Re-running safely regenerates owned lab outputs and preserves native metadata GUIDs.', '',
'Native validation records exact Editor version, actual model triangles/bounds/material slots, importer and texture settings, shader/material dependency checks, prefab collider absence, lab load/coverage, and warnings/errors during import/generation in `Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json`. That report is deliberately absent until Unity executes. A native import pass still requires visual render approval; it does not automatically mark composition readiness true.', '',
'## First-pass performance observations','',
f'One instance of each approved model totals **{perf["sourceTrianglesOneEach"]:,} source triangles** and **{perf["oneEachBaseMaterialSlots"]} base material slots** before instancing/batching. There are **{perf["oneEachShadowCastingMaterialSlots"]} shadow-casting slots** in the proposed prefab policy. Six models use alpha-tested foliage. The lab is a library comparison, not a density/frame-time stress test.', '',
'| Shared texture tier | RGBA8 with exact mip chain | ASTC 6×6 with exact mip chain |','|---|---:|---:|']
for tier in ('full','mobile'):
 r=perf['textureResidencyBytes'];lines.append(f'| {tier} | {r[tier+"RGBA8WithMipmaps"]/1048576:.2f} MiB | {r[tier+"ASTC6x6WithMipmaps"]/1048576:.2f} MiB |')
lines += ['',
'These estimates sum 25 unique texture payloads only and assume consistent formats; Unity normal-map conversion, upload alignment, driver duplication, fallback decompression and frame buffers can change actual memory. They exclude shipping character/UI/VFX textures. Source dimensions are 512², 1024² and 2048²; each texture’s dimensions/role/import limit is recorded in the catalog.', '',
'A substantial enclosure can easily exceed the one-each library count. Two explicit planning cases assume visible repeated near trees, boulders, forest rows and cliffs:', '',
'| Planning case | LOD0 triangles | Unbatched base material submissions |','|---|---:|---:|']
for s in scenarios:lines.append(f'| {s["name"]} | {s["lod0TriangleEstimate"]:,} | {s["unbatchedBaseMaterialSubmissionEstimate"]:,} |')
lines += ['',
'These are illustrative simultaneously-visible instance workloads, **not measured arena visibility, a frame-time forecast or a triangle ceiling**. Exact assumed counts are in `ENVIRONMENT_ASSET_PERFORMANCE_PLAN.json`; final visibility depends on camera, occlusion, LOD and composition. Preserve the substantial world and scale those costs intelligently for iPhone 12.', '',
'- Instancing: repeated CommonTree/Pine pairs, the three boulders sharing `qn_Rocks`, Kenney forest meshes with shared source-color materials, and Castle pieces sharing one 512² atlas. Material variants enable instancing; actual Built-in/WebGL batching results need native/device measurement.',
'- Static batching candidates: stationary masonry, cliff courses and fortification pieces after composition. Do not mark every tree static automatically; compare static-batch geometry duplication with instanced repetition.',
'- Far forest clustering: `tree_pineTallA`, `tree_pineTallC`, `tree_default_dark` are 78, 98 and 114 triangles respectively. Prefab distant shadows are disabled; group clusters can later receive derived LODs/proxies without flattening the whole environment.',
'- Draw-call multipliers: material slots, shadow-map cascades, additional per-pixel lights and depth passes multiply submissions. For one-each geometry, base 42 plus shadow-casting slots per cascade gives a useful lower-level planning proxy; it is not a captured GPU draw-call count.',
'- Shadow/fill risks: overlapping double-sided leaf cards, alpha-tested shadow casters, deep forest overlap and full-resolution bark/normal sets. Fern shadow casting is off, distant assets cast/receive no shadows; near hero trees retain shadows. Further reductions belong to measured quality tiers, not arbitrary removal of world depth.', '',
'## Readiness and next step','',
'**NOT READY for Crownfall arena composition. READY for the required native Unity import-validation step.** The checked-in deliverable is prepared production inputs plus automation; native materials, prefabs and the scene have not been generated or viewed.', '',
'Next: run the native generator on Unity 6000.3.10f1, inspect all 25 labeled lab placements and source/material scales, resolve any ASCII FBX or shader errors, and review leaf coverage/normal/shadow behavior. Then produce silhouette-preserving LODs for the candidates and profile a dense isolated enclosure on iPhone 12 before authorizing arena composition.', '',
'Future arena composition should use textured near trees/rock footing, layered tall cliff/forest masses and selective ancient structures around the existing single 3v3 lane. Remaining art gaps are substantial broken ruins, rugged hero cliffs and finished mountains/Aether formations; no newly authored geometry or effects for those gaps are claimed in this pass.', '',
'Machine-readable evidence: `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json`, `Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json`, `Docs/ENVIRONMENT_ASSET_INTEGRATION_VALIDATION.json`, `Docs/ENVIRONMENT_ASSET_PERFORMANCE_PLAN.json`.', '']
(ROOT/'Docs/ENVIRONMENT_ASSET_UNITY_INTEGRATION.md').write_text('\n'.join(lines))
print(json.dumps(perf,indent=2))
