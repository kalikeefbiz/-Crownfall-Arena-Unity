"""Generate delivery metadata from measured inventories; run after all renders/checks complete."""
import json,hashlib
from pathlib import Path
base=Path(__file__).resolve().parents[1]
def read(n):return json.loads((base/'manifests'/n).read_text())
def mib(v):return f'{v/1048576:,.2f} MiB'
s=read('source-audit.json');a=read('optimized-audit.json');g=read('glb-visual.json');c=read('glb-collision.json');d=read('geometric-deviation.json');v=read('visual-differences.json')
assert not v['missing']
files=['working/solrahn-three-lane-optimized.blend','working/solrahn-lane-collision-candidates.blend','runtime/solrahn-three-lane-visual.glb','runtime/solrahn-lane-collision-candidates.glb'];artifacts=[]
release='https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-prepared-goal-013-v1'
for f in files:
 p=base/f;artifacts.append(dict(path=f,workspace_path=str(p),bytes=p.stat().st_size,sha256=hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),intended_release_download='https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/download/solrahn-three-lane-prepared-goal-013-v1/'+p.name))
(base/'manifests/artifacts.json').write_text(json.dumps(dict(preparation_only=True,release=None,intended_release=release,upload_status='FAILED: HTTP 401 Bad credentials at uploads.github.com; empty task-created draft removed; no preparation release published.',artifacts=artifacts),indent=2))
source_bounds=next(o for o in s['objects'] if o['type']=='MESH')['bounds'];opt_bounds=next(o for o in a['objects'] if o['type']=='MESH')['bounds']
mesh_floor=s['totals']['source']['vertices']*48+s['totals']['source']['triangles']*12
text=f'''# Goal 013 — founder three-lane Sol’Rahn preparation

Prepared on 2026-10-26 for `kalikeefbiz/-Crownfall-Arena-Unity`, branch `playcanvas-port`, from base `761b8b294d7adf417947fa5c6d23c191825d74ef`. Visual preparation is complete at the measured candidate level; collision preparation is partial. This is not gameplay integration or mobile certification.

## Verified source

`export_Meshy_AI_2026-10-26_4debfa.blend`, **506,928,885 bytes**.

SHA-256: `626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f`.

[Founder’s unchanged source release](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-source-v1). The `7d27be` single-lane file was excluded and not downloaded. The original is read-only in `source/`, excluded from Git, and never saved by the preparation process. All loads disabled automatic execution of embedded scripts. Blender 4.5.15 LTS was used because installed 4.3.2 warned about the newer source; the preliminary read was never saved.

## Actual Blender inventory

The source contains **one object, one mesh datablock, one connected component, and one material**. All terrain, vegetation, rocks, lane surfaces, opposing bases and perimeter architecture are fused into `Mesh_0` directly under the master Scene Collection; there are no separate lane collections, lights, cameras, instances, modifiers, linked libraries or embedded text blocks. Source and evaluated counts are identical: **2,782,049 vertices, 8,353,370 edges, 5,568,924 triangles**. This file has over five million triangles, not over five million Blender vertices.

There are no duplicate objects/mesh datablocks, coincident vertex positions, or disconnected reusable tree/rock meshes. No safe instance substitution or hidden/redundant-geometry removal was established, so none was performed. Original triangles have nonzero measured area. No claim is made about invisible overlapping shells inside the connected reconstruction.

`UVMap` is the sole active UV layer. All source UV coordinates are finite and inside 0–1. The source has custom normals, 5,564,830 smooth faces and 4,094 flat faces; the optimized mesh retains custom normals with 668,163 smooth faces and 107 flat faces. Surviving/interpolated UV and normal data were carried through Blender’s collapse operation; they are not byte-identical to the removed topology.

`Material_0` is a Principled PBR graph: packed sRGB base color (`Image_0`, 4096²), non-color metallic/roughness with green roughness and blue metallic (`Image_1`, 2048²), and non-color tangent-space normal (`Image_2`, 4096²). The original packed payloads are JPEGs. All three decode successfully. The source has **no missing external image dependencies**, libraries or unsupported procedural texture nodes. Original image paths are empty because the images are packed. The delivery images are packed RGB 8-bit PNGs, all 2048²; the shader links, color spaces, active UV and repeat/linear samplers remain intact. No replacement artwork was generated. Source JPEG artifacts remain part of the source detail.

Blender uses a right-handed Z-up scene, Metric units, scale length 1. `Mesh_0` has an identity world matrix, origin (0,0,0), no parent, and quaternion rotation mode. Original world bounds are `{source_bounds}`; dimensions are approximately **1.552285 × 1.901593 × 0.355311** native units. This is Meshy’s normalized asset scale, not an approved gameplay scale. No unit conversion, repositioning, lane redesign or origin change was made.

The three routes, carved surfaces, forests, rock formations, blue/red territories and monumental bases/rim are visible in the original renders. No suspended ceremonial crown is discernible in the surveyed overview/top-plan; there is no separately named crown object. Nothing was added to compensate.

## Optimizations actually performed

A separate working copy uses weighted quadric edge collapse to **12% of source triangles**. Permission weights favor the actual middle/side route corridors near lane height, tall base architecture and high exposed rock formations. Secondary scenery and underside vertices receive more reduction permission. Six source extrema are fixed anchors. Masks are broad geometric protection zones, not certified semantic lane segmentation. See `scripts/optimize.py` and the recorded weight histogram for exact parameters.

No voxel/global remesh, weld, procedural terrain, invented structures, destructive semantic cuts, translation or rotation was used. The retained arena is one continuous visual mesh, organized in `SolRahn_Continuous_AuthoredEnvironment`. Lane/Wilderness/structure categories remain logical review regions. A single visual GLB avoids cuts and placement gaps; its limitation is whole-arena culling granularity. Material consolidation was unnecessary because there was already one material. No normals bake or image generation was performed.

The 4K base-color and normal images were reduced to 2K; the existing 2K metallic/roughness image remains 2K. The original images remain intact in the original source and full-texture geometry checkpoint. The resized buffers were saved, freshly reloaded, packed, and reopened to verify actual stored dimensions. A copied optimized project reopened in an isolated directory with no external texture files and all packed images usable.

Five zero-vector tangents emitted at degenerate UV corners were repaired **in the GLB only** using deterministic unit vectors perpendicular to the existing normals. No positions, UVs, normals, indices or materials changed during this repair. See `tangent-repair.json`. These corners lack a unique UV tangent basis; their local normal-map orientation remains an inherited/converted limitation.

## Before / after measurements

| Metric | Verified original | Optimized visual |
|---|---:|---:|
| Native mesh vertices | 2,782,049 | 331,722 |
| Source/evaluated triangles | 5,568,924 | 668,270 |
| Visual objects / meshes / materials | 1 / 1 / 1 | 1 / 1 / 1 |
| UV layers / texture images | 1 / 3 | 1 / 3 |
| Texture dimensions, base / MR / normal | 4096 / 2048 / 4096 | 2048 / 2048 / 2048 |
| RGBA8 texture memory, full mip chains | 192 MiB | 64 MiB |
| `.blend` disk size | 506,928,885 bytes | {artifacts[0]['bytes']:,} bytes |
| Runtime GLB | Not exported from full source | {g['bytes']:,} bytes |
| Runtime vertices with UV/normal/tangent splits | Not measured | {g['exported_vertices_including_uv_normal_tangent_splits']:,} |
| Runtime geometry buffers | At least {mib(mesh_floor)} estimated | {mib(g['geometry_buffer_bytes'])} measured |
| Geometry + RGBA8 mip textures | At least {mib(mesh_floor+201326592)} estimated | {mib(g['geometry_buffer_bytes']+g['texture_rgba8_mips_bytes'])} estimated |

Triangle reduction is approximately **88.0%**, native vertex reduction **88.1%**, and texture-memory reduction **66.7%**. The original geometry estimate assumes 48 bytes per native vertex (position/normal/UV/tangent) and 32-bit indices, excluding export splits. No full-source GLB was generated, so its exact exported vertex count/file size is **NOT_CHECKED**. GPU estimates exclude driver overhead, staging copies, framebuffer/shadow allocations and target-runtime texture compression. They are not measured device allocation.

Optimized Blender bounds are `{opt_bounds}`. Maximum bounds change against the original is approximately **0.00002706 units**, about 0.0014% of the long axis. Reimported visual GLB bounds match the optimized project exactly at measured precision, and all 668,270 triangles remain present. Native/Blender round-trip transforms are identity. glTF uses standard Y-up conversion `(x,y,z) → (x,z,-y)`; both GLBs use the same conversion, untouched origins and common world coordinates. The GLBs reconstruct their respective authored-coordinate geometry without manual offsets. Collision strips are intentional partial subsets, not missing visual modules.

Potential rendering cost remains significant: **668k triangles in one culling unit**, roughly **{mib(g['geometry_buffer_bytes']+g['texture_rgba8_mips_bytes'])}** of estimated geometry plus uncompressed mipmapped texture storage, a **{mib(g['bytes'])}** download, dense overlapping foliage, and a double-sided material inherited from the export settings. One primitive/material suggests one main visual draw submission, with additional passes depending on future lighting/shadow settings. No WebGL or hardware draw-call capture, download timing or mobile frame-rate test was performed. This candidate needs device profiling and possibly LOD/culling work in a later milestone before production acceptance; the selected ratio is not a proven minimum or universal mobile budget.

## Verification and visual evidence

Both GLBs pass Khronos glTF Validator **with zero errors and warnings**, have embedded resources and no required extensions or external URIs. Both were cleanly reimported in Blender. Visual reimport preserves triangle count, bounds, UV validity and the expected PBR material/images; its overview was rendered and inspected. The optimized `.blend` was independently reopened with embedded execution disabled and packed-image portability checked.

50,000 seeded triangle-centroid samples in each direction measured nearest-surface errors. Source→optimized p99 is **0.00028122**, max sampled **0.00093656**; optimized→source p99 is **0.00031030**, max sampled **0.00101587** native units. Lane-mask p99 values are **0.00027198 / 0.00030971**. The worst directional p99 is about **0.0163%** of the arena long axis. These samples are uniform by triangle index, not area weighted, and do not bound maximum Hausdorff error or certify every hidden detail.

[Comparison gallery](../previews/comparisons/index.html) contains ten labeled original/optimized pairs: entire arena, top plan, upper lane, middle lane, lower lane, Wilderness geography, stadium features, and three gameplay approximations. Left is original, right is optimized. They share camera, lighting, Cycles CPU 16 samples, denoising and AgX color settings. Original-versus-delivery differences include geometry, image resizing, sampling and denoising. Fine surface/foliage detail is softer; the route layout and dominant architectural/geological silhouettes remain visually recognizable in the surveyed views. Independent founder artistic acceptance is **NOT_CHECKED**.

Upper/lower labels provisionally mean negative/positive Blender X side routes; there are no source semantic labels. Gameplay approximations use the existing competitive camera’s 48° vertical FOV and 15.5:22 elevation/look direction from `src/combat/match-space.js` and `src/presentation/scene.ts`. Distance is scaled by 0.018 for the normalized asset. These views do not alter or reproduce a live camera integration; exact gameplay asset scale is undecided.

| View | Foreground MAE / 255 | Foreground RMSE / 255 | Estimated silhouette-mask IoU |
|---|---:|---:|---:|
'''
for row in v['views']:text+=f"| {row['view']} | {row['foreground_mae_8bit']:.3f} | {row['foreground_rmse_8bit']:.3f} | {row['foreground_mask_iou']:.5f} |\n"
text+='''
The masks above use background-color differences; they are diagnostic estimates, not semantic silhouette truth or perceptual acceptance thresholds.

## Collision preparation — partial

`solrahn-lane-collision-candidates.glb` and its separate native project contain three conservative lane-core subsets extracted from actual upward-facing source triangles, then reduced to **2,500 triangles per lane, 7,500 total**. No new terrain surface was generated. The native candidates contain **7,686 vertices** in total. The GLB contains normal-split delivery vertices, detailed in `glb-collision.json`.

The candidates are open and fragmented: upper **48 components / 2,600 boundary edges**, middle **4 / 1,332**, lower **59 / 2,732**. They omit lane margins, some junctions, stairs/base approaches and portions outside the conservative masks. They are review inputs, **not a continuous walkable collider, navigation mesh or ready-to-use physics geometry**. Source top-facing surfaces include roofs and canopy; normals alone cannot establish traversability. Wilderness floor beneath canopy, impassable cliffs and closed major-structure collision volumes were not reliably classified, so those requested categories remain **NOT_PREPARED**. No movement, AI, camps, navigation or collision handling was implemented. See the [candidate-only top view](../previews/comparisons/collision-lane-cores-top-plan.jpg).

## Storage, scope and handoff

Binaries are retained in the workspace and excluded from ordinary Git history. The task-created preparation draft was removed after uploads.github.com rejected binary uploads with HTTP 401 Bad credentials; no assets were uploaded and no preparation release was published. The original release assets are untouched. The repository contains scripts, measured JSON manifests, documentation and compressed comparison JPEGs. Master PNG renders are retained locally and in the evidence ZIP. No optimized binary is installed in `public/`, referenced by the game, or imported into a production scene.

'''
text+='Binary upload is **BLOCKED by upload-endpoint authentication**, while preparation and local validation are complete. File hashes, exact byte sizes and workspace paths: [artifacts manifest](../manifests/artifacts.json). Intended download URLs in that manifest are **not available uploads**. See [transfer instructions](TRANSFER.md).\n\n'
for item in artifacts:text+=f"- `{item['path']}` — **{item['bytes']:,} bytes**; workspace: `{item['workspace_path']}`.\n"
text+='''
Original verified source remains in `source/export_Meshy_AI_2026-10-26_4debfa.blend`. Full-texture geometry-only checkpoint remains in `working/solrahn-candidate-12pct.blend`, not the primary delivery project. The delivery visual and collision files are separate assets; do not render the collision candidates as replacement artwork.

`npm ci` and the existing `npm run build` passed; Vite emitted its existing large-chunk advisory. No game, camera, character, combat, AI, camp, deployment or production-map file was changed. No prior Goal 012 cleanup was repeated. The source branch’s push workflow can publish the game, so the lightweight delivery commit uses `[skip ci]`; no deployment workflow is dispatched. Mobile hardware behavior and in-game appearance remain **NOT_CHECKED**.

[Reproduction commands](REPRODUCE.md) document the exact pipeline. See `manifests/` for detailed source/evaluated inventory, topology, material links, image dimensions, transformations, bounds, geometry samples, texture packing, validators, reimports and collision limitations. Skills used: [Contour3D professional-3d](skill://plugins_6ac1c5318ef88191b7b7bdc8ad728b8c/professional-3d/SKILL.md) inspection/delivery and material/UV procedures, and [cloud environment runtime](skill://plugin_connector_1p_c5b7d5df5d7081918f2c4be5a633ed5d/cloud-environment-runtime/SKILL.md). Modeling and measurements used Blender’s Python API and built-in tools. No image generation or procedural environment replacement occurred.

Stop at this asset-preparation handoff. Integration requires a separate milestone.
'''
(base/'reports/GOAL_013_REPORT.md').write_text(text)
(base/'README.md').write_text('''# Sol’Rahn three-lane — Goal 013 asset preparation

Founder-created environment preparation only. No gameplay integration or deployment.

- [Measured audit, before/after results, deliverables and limitations](reports/GOAL_013_REPORT.md)
- [Original/optimized comparison gallery](previews/comparisons/index.html)
- [Reproduce the Blender pipeline](reports/REPRODUCE.md)
- [Binary hashes, exact sizes, workspace paths and transfer status](manifests/artifacts.json)

The visual asset is reduced to 668,270 triangles with three packed 2K PBR maps. Collision candidates are partial, fragmented lane-core subsets; they are not gameplay-ready. Mobile hardware performance is untested. Source/working/runtime binaries and master PNGs are intentionally excluded from ordinary Git history.
''')
print('REPORT_READY')
