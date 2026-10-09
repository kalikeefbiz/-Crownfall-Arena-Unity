# Crownfall external environment asset inventory

Acquired and inspected 2026-10-09. **Staging only; no Unity import or environment integration.**

Starting HEAD: `489e81588d1a9876132625ba65a180b749bb1d61`. Target branch: `browser-parity-unity`. The staging commit is the commit containing this document; final HEAD is reported in the delivery message to avoid a self-referential commit hash.

144 unique model candidates staged (143 accepted role candidates + 1 visually rejected timber arch), with 144 original FBX alternates and 144 original glTF/GLB files. **38 models shortlisted; 25 recommended for the first integration pass.** Unique-model counts never count both export formats twice. The downloaded archives contain 649 model identities across four packs; 505 were excluded before staging. Raw archives stay outside the repository. Selected original members total **192,906,194 bytes (183.97 MiB)**; this is staging disk size, not runtime memory.

## Sources and provenance

| Source | Result | Available in downloaded archive | Staged unique models | Staging path |
|---|---|---:|---:|---|
| [Stylized Nature MegaKit — Standard](https://quaternius.com/packs/stylizednaturemegakit.html) | acquired | 68 | 40 | `ExternalArtStaging/Environment/Quaternius/Nature/` |
| [Medieval Village MegaKit — Standard](https://quaternius.com/packs/medievalvillagemegakit.html) | acquired | 176 | 21 | `ExternalArtStaging/Environment/Quaternius/Medieval/` |
| [Nature Kit 2.1](https://kenney.nl/assets/nature-kit) | acquired | 329 | 54 | `ExternalArtStaging/Environment/Kenney/Nature/` |
| [Castle Kit 2.0](https://kenney.nl/assets/castle-kit) | acquired | 76 | 29 | `ExternalArtStaging/Environment/Kenney/Castle/` |
| [Ultimate Modular Ruins](https://quaternius.com/packs/ultimatemodularruins.html) | blocked | not downloaded | 0 | `ExternalArtStaging/Environment/Quaternius/Ruins/` |

Quaternius Nature and Medieval are the publicly downloadable **Standard/free subsets**, not the complete paid MegaKits. Nature Standard contains 68 of the advertised 116 models; 40 are staged. Medieval Standard contains 176 model identities; only 21 structural candidates are staged. No purchase, account login, Asset Store package, URP project, or custom shader was acquired.

Ultimate Modular Ruins: the official page links a public Google Drive folder. The visible FBX listing was inspected and 24 selected models plus license, usage notes and preview were attempted; the endpoints returned HTML instead of files. The preserved representative response says **Google Drive — Quota exceeded**. The visible listing was incomplete (first 50 entries), so this is not a full-pack audit. No Ruins asset or original license bytes were acquired. Retry the official public source when its quota recovers; do not substitute an unverified mirror.

For each successful source, `Provenance/source.json` records the official URL, public download endpoint or itch.io upload ID, download host, date, archive size and SHA-256. `Provenance/official-source-page.html` preserves the official CC0 statement. Every selected original file has its original archive path, byte size and SHA-256 in the machine-readable manifest. Original license files are retained byte-for-byte:

- [Stylized Nature MegaKit — Standard: original license](<../ExternalArtStaging/Environment/Quaternius/Nature/Original/License_Standard.txt>)
- [Medieval Village MegaKit — Standard: original license](<../ExternalArtStaging/Environment/Quaternius/Medieval/Original/Medieval Village MegaKit[Standard]/License_Standard.txt>)
- [Nature Kit 2.1: original license](<../ExternalArtStaging/Environment/Kenney/Nature/Original/License.txt>)
- [Castle Kit 2.0: original license](<../ExternalArtStaging/Environment/Kenney/Castle/Original/License.txt>)

All acquired model content is explicitly **CC0 1.0 Universal** under those original license files. Website HTML is retained as provenance evidence, not treated as CC0 model content. Source models, textures and licenses were not edited, rescaled, recompressed or converted. Generated inspection PNGs/JPEGs are separate derivatives in `Inspection/`; they do not replace source files.

## Coherent Crownfall selection

Build one substantial wilderness enclosure around the existing single 3v3 lane: textured Quaternius boulders and trees define the near edge; taller tree tiers and cliff bands create the midground; simplified forest silhouettes, clustered rock outcrops and fortification crowns extend the horizon. Keep all future placements decorative and outside existing traversable space/collider constraints. No second lane, playable terraces, camera change, or gameplay tower is implied.

The near palette is mossy gray stone, green common trees and layered pines. Quaternius twisted trees and `Bush_Common` have red foliage in their original materials: use them as a restrained landmark pocket, not uniformly across the forest. The Kenney Nature originals have cyan foliage and warm orange/brown terrain, while Castle masonry is pale and warm. They need a later shared Crownfall palette/material pass and distance separation; they are not ready to mix unchanged at the near edge. Original material colors are preserved here.

Visual inspection rejected `qm:Wall_Arch`: it is a thin timber arch using `MI_WoodTrim`, despite its promising filename. `DoorFrame_Round_Brick` is the stronger stone opening. `Wall_UnevenBrick_Straight` includes a timber cap; reserve it for surviving masonry, not a substitute for heavily broken ruins. Kenney cliffs are visibly block-like and suit hidden backing/midground courses, not close hero cliffs.

**Remaining gaps:** no acquired pack provides a vetted large broken-arch/wall library or finished distant mountain meshes. Damaged Kenney columns are small substitutes; intact battlements are arena remains only by composition. Rock clusters can suggest distant mountains but are not authored mountain assets. Tall rugged hero cliffs and convincing broken ruins remain the strongest reasons to retry Ultimate Modular Ruins and later assess additional approved art.

## Visual shortlist (38 models)

Source keys: `qn` Quaternius Nature, `qm` Quaternius Medieval, `kn` Kenney Nature, `kc` Kenney Castle. **First** marks the 25 recommended initial models. Recommendations remain conditional on later Built-in material mapping and scale checks.

| Model | Class | Triangles | Materials | First | Selection reason |
|---|---|---:|---:|:---:|---|
| `qn:CommonTree_1` | HERO | 6,265 | 2 | yes | Broad canopy anchor for the near wilderness edge |
| `qn:CommonTree_3` | HERO | 3,505 | 2 | yes | Alternate full canopy to break repeated tree outlines |
| `qn:CommonTree_5` | HERO | 3,182 | 2 |  | Secondary hero canopy; compare silhouette with CommonTree_1 |
| `qn:TwistedTree_1` | HERO | 9,564 | 2 | yes | Distinctive ancient forest landmark |
| `qn:TwistedTree_3` | HERO | 10,089 | 2 |  | Tall irregular hero tree for vertical enclosure |
| `qn:TwistedTree_5` | HERO | 10,104 | 2 |  | Heavy accent tree; sparse placement rather than mass repetition |
| `qn:Pine_1` | NEAR WILDERNESS | 3,947 | 2 | yes | Tall conifer rhythm behind broadleaf heroes |
| `qn:Pine_3` | NEAR WILDERNESS | 4,964 | 2 |  | Alternate conifer shape for layered tree masses |
| `qn:Pine_5` | NEAR WILDERNESS | 1,646 | 2 | yes | Variation for deeper woodland rows |
| `qn:DeadTree_2` | MIDGROUND | 6,557 | 1 |  | Sparse bare silhouette next to ancient stone remains |
| `qn:Bush_Common` | NEAR WILDERNESS | 900 | 1 |  | Rounded undergrowth mass; supplied leaves are red, so reserve for the red hero-tree pocket or later material matching |
| `qn:Fern_1` | NEAR WILDERNESS | 288 | 1 | yes | Selective near-edge undergrowth |
| `qn:Rock_Medium_1` | NEAR WILDERNESS | 342 | 1 | yes | Textured boulder foundation for tall boundary formations |
| `qn:Rock_Medium_2` | NEAR WILDERNESS | 244 | 1 | yes | Alternate rock profile for shelves and boundary footing |
| `qn:Rock_Medium_3` | NEAR WILDERNESS | 522 | 1 | yes | Third boulder profile to reduce visible repetition |
| `kn:cliff_large_rock` | MIDGROUND | 32 | 1 | yes | Large repeatable cliff face; use behind textured foreground rocks |
| `kn:cliff_block_rock` | MIDGROUND | 12 | 2 | yes | Solid modular mass for elevated backdrop shelves |
| `kn:cliff_cornerLarge_rock` | MIDGROUND | 12 | 1 | yes | Turn cliff bands without changing playable topology |
| `kn:cliff_steps_rock` | MIDGROUND | 219 | 2 |  | Stepped geological silhouette for elevated wilderness |
| `kn:rock_tallA` | DISTANT FILLER | 136 | 3 | yes | Cheap tall outcrop for distant rock clusters |
| `kn:rock_tallD` | DISTANT FILLER | 38 | 3 |  | Alternate vertical outcrop |
| `kn:rock_tallG` | DISTANT FILLER | 62 | 3 | yes | Distant spire variation |
| `kn:rock_largeC` | DISTANT FILLER | 72 | 2 |  | Cheap broad rock mass under distant outcrops |
| `kn:tree_pineTallA` | DISTANT FILLER | 78 | 2 | yes | Repeatable tall distant forest silhouette |
| `kn:tree_pineTallC` | DISTANT FILLER | 98 | 2 | yes | Alternate distant pine for canopy variation |
| `kn:tree_default_dark` | DISTANT FILLER | 114 | 2 | yes | Dark broadleaf filler behind the richer near forest |
| `kn:tree_oak_dark` | DISTANT FILLER | 196 | 2 |  | Distant broad canopy variation |
| `kn:statue_columnDamaged` | STRUCTURAL | 108 | 2 | yes | Small broken-column substitute pending Ruins availability |
| `qm:Wall_UnevenBrick_Straight` | STRUCTURAL | 56 | 3 | yes | Textured masonry boundary segment |
| `qm:DoorFrame_Round_Brick` | STRUCTURAL | 2,046 | 1 | yes | Smaller stone arch detail; architectural scale differs from Wall_Arch |
| `qm:Stairs_Exterior_Straight` | STRUCTURAL | 62 | 2 | yes | Visible elevation cue on inaccessible backdrop remains |
| `qm:Floor_UnevenBrick` | STRUCTURAL | 4 | 1 |  | Stone foundation/shelf dressing, not a replacement gameplay floor |
| `kc:tower-square-arch` | STRUCTURAL | 308 | 1 | yes | Low-cost tall architectural opening |
| `kc:tower-hexagon-top` | STRUCTURAL | 168 | 1 | yes | Fortification crown for distant skyline rhythm |
| `kc:tower-square-top` | STRUCTURAL | 148 | 1 |  | Square battlement silhouette |
| `kc:wall-corner-half-tower` | STRUCTURAL | 632 | 1 | yes | Corner fortification mass to punctuate the enclosure |
| `kc:wall-half-modular` | STRUCTURAL | 80 | 1 | yes | Cheap modular battlement band |
| `kc:wall-narrow-stairs` | STRUCTURAL | 262 | 1 |  | Low-cost stepped silhouette for secondary remains |

The three contact sheets show 39 inspected candidates, including the rejected timber arch. Source-scale normalization is per image, so apparent thumbnail size is not comparable between assets. These are CPU Blender studio previews of original glTF materials, not Unity screenshots or target-device validation:

- [Contact sheet 1](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-1.jpg)
- [Contact sheet 2](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-2.jpg)
- [Contact sheet 3](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-3.jpg)

## Performance and import observations

There is no arbitrary scene triangle ceiling in this acquisition. Preserve the substantial composition, then scale visibility, repetition, materials and texture residency with measured iPhone 12 WebGL frame time and memory.

| Staged source | Triangle range per model | Materials per model | Unique referenced image payloads | RGBA8 + full mips estimate |
|---|---:|---|---:|---:|
| Stylized Nature MegaKit — Standard | 48–10,104 | 1, 2 | 13 | 193.03 MiB |
| Medieval Village MegaKit — Standard | 4–3,102 | 1, 2, 3 | 15 | 320.00 MiB |
| Nature Kit 2.1 | 8–402 | 1, 2, 3 | 0 | 0.00 MiB |
| Castle Kit 2.0 | 28–632 | 1 | 1 | 1.33 MiB |

These image-memory estimates assume uncompressed RGBA8 plus approximately 33% for mipmaps, deduplicate identical payload hashes within each pack, and include the rejected arch because it remains staged. They are a worst-case planning scenario for all staged image sets, not measured Unity residency or WebGL download size. ASTC/other supported compression, channel packing, shared texture import, selective residency and lower-resolution distance materials should be measured later. Original textures span 512×512, 1008×981, 1024×1024 and 2048×2048. The non-power-of-two foliage image requires particular import/mipmap review.

- **Repeated masses:** Quaternius rocks are only 244–522 triangles with one material. `Pine_5` is 1,646 triangles versus 3,947 for `Pine_1`. Kenney distant pines such as `tree_pineTallA` are 78 triangles; cliffs can be 12–32 triangles. Use them to build depth, not as an excuse for a sparse world.
- **Hero geometry:** twisted trees reach 9,564–10,104 triangles and 14,064–15,647 exported vertices for the shortlisted variants. Preserve their close silhouette, then generate distance LODs in a later derived-asset pass. `DeadTree_2` is still 6,557 triangles despite having no leaf canopy.
- **Foliage fill cost:** 22 staged Nature models use non-opaque materials; many use double-sided masked leaves. Overlapping canopy cards, two-sided rendering and alpha-tested shadow maps can dominate before geometry does. Plan foliage LODs, coverage-preserving mipmaps and limited distant shadows; avoid deep stacks of transparent/alpha-tested grass.
- **Draw calls:** Kenney Nature models often have 2–3 material slots despite low triangle counts. `Wall_UnevenBrick_Straight` has 3 materials for only 56 triangles. Material count is a lower-level risk indicator, not a measured draw-call count; submeshes, shadows and passes multiply work. Reuse shared materials/atlases and batch or instance repeated mesh/material pairs. Confirm Built-in/WebGL instancing support on the actual graphics path; keep batching fallback.
- **Castle atlas:** 29 staged Castle models share one 512×512 colormap, generally one material per model. This is a strong batching/instancing opportunity for repeated distant battlements. Avoid importing duplicate copies of the same atlas from alternate-format folders.
- **Material translation:** several Kenney Nature glTF materials specify `metallicFactor: 1` despite representing dirt, bark or leaves. Do not trust automatic PBR translation. Recreate dielectric Built-in materials deliberately later. Quaternius foliage cutoff/double-sided behavior also needs explicit Built-in implementation; source glTF files do not provide the advertised custom wind shader. Medieval roughness/ORM maps are not directly interchangeable with Built-in Standard smoothness conventions. Original Godot-Unity normal-map alternatives are preserved where relevant.
- **LOD/impostors:** no authored LOD names or `MSFT_lod` extensions were detected in staged glTF. Generate LODs for common/twisted/dead trees and brick doorway frames; consider clustered forest impostors for the far horizon. No LODs or impostors were generated in acquisition.
- **Scale:** source glTF bounds differ markedly: TwistedTree variants are about 16–19 nominal units tall; Kenney trees are around 1–2. Do not drop these exports at uniform import scale. FBX axis/unit interpretation and Unity scale still require a future isolated import check. Thin wall/floor modules are not solid retaining cliffs.
- **Colliders:** no collider/collision/UCX name markers were detected in the canonical glTF files. This does not certify absent metadata in every FBX. No collider was generated or imported, and decorative placements should not generate gameplay colliders automatically.

## First integration pass recommendation

Start with the 25 **First** models above. Establish broad, tall enclosure masses using layered Quaternius common trees/pines and the three textured boulders; add one restrained twisted-tree landmark. Use Kenney cliff backing and repeated distant forest/outcrops behind those richer silhouettes. Add the round brick doorway, masonry/stair segments and a small number of Castle crowns/corner masses to imply a larger ancient arena. The intended result is one playable lane embedded in a deep wilderness, not scattered props on a plane.

Before any future shipping integration, use an isolated import scene to settle source scale, palette, opaque/leaf materials, texture sharing and LOD behavior for **Unity 6000.3.10f1, Built-in Render Pipeline, WebGL**. Profile the target iPhone 12 during that later pass. No Unity scene was created or imported during this task; this paragraph is a recommendation, not an executed integration plan.

## Measurement method and limits

The JSON manifest is the authoritative per-asset inventory. It records source and original path, original alternate-format paths, byte size, CC0 license, exported vertex count, mesh/scene triangle counts, primitive/material counts, texture references/dimensions/hash/memory estimates, transformed bounds, LOD/collider detection, classification and Crownfall role. `files[]` contains sizes/hashes for FBX, glTF, buffer, texture and license members individually. Shared dependencies are not charged repeatedly to each model file size.

Geometry is read directly from unmodified glTF/GLB buffers. POSITION accessors are counted once (avoids overcounting shared accessors across material primitives); seam-split vertices remain distinct. Triangle indices are validated and scene-node transforms applied for bounds. Bounds are source Y-up AABBs, nominal metres, not Unity-verified dimensions. The glTF figures do not independently certify that every FBX exporter produced identical topology. No Unity editor, player, WebGL build or device profiler was run.

Classification coverage includes every staged candidate; 505 omitted source model identities are explicitly recorded as `REJECT` in `excluded_candidates[]`, meaning out of scope for this acquisition, not necessarily defective. Omitted model geometry was not measured. Thirty-nine candidates were individually rendered; the rest were inventoried without individual visual approval.

## Full staged inventory

Canonical file bytes below exclude shared buffers/textures and alternate FBX. Texture dimensions and original paths are fully expanded in the JSON manifest. All rows are CC0-1.0; all have original FBX alternates. Bounds are X×Y×Z in source glTF units.

| ID / canonical format | Class | File bytes | Vertices | Triangles | Materials | Textures | Bounds size |
|---|---|---:|---:|---:|---:|---:|---|
| `qn:Bush_Common` / gltf | NEAR WILDERNESS | 2,101 | 1,800 | 900 | 1 | 1 | 1.915 × 1.582 × 1.965 |
| `qn:Bush_Common_Flowers` / gltf | NEAR WILDERNESS | 3,654 | 2,515 | 1,368 | 2 | 2 | 1.915 × 1.582 × 1.965 |
| `qn:CommonTree_1` / gltf | HERO | 3,869 | 9,458 | 6,265 | 2 | 3 | 4.311 × 7.265 × 4.578 |
| `qn:CommonTree_2` / gltf | HERO | 3,866 | 8,107 | 5,648 | 2 | 3 | 4.464 × 7.643 × 4.276 |
| `qn:CommonTree_3` / gltf | HERO | 3,864 | 5,749 | 3,505 | 2 | 3 | 4.063 × 9.425 × 4.241 |
| `qn:CommonTree_4` / gltf | HERO | 3,865 | 5,900 | 4,066 | 2 | 3 | 3.826 × 9.438 × 3.755 |
| `qn:CommonTree_5` / gltf | HERO | 3,860 | 4,873 | 3,182 | 2 | 3 | 3.671 × 7.006 × 4.220 |
| `qn:DeadTree_1` / gltf | MIDGROUND | 2,206 | 8,036 | 6,169 | 1 | 2 | 6.149 × 9.495 × 5.749 |
| `qn:DeadTree_2` / gltf | MIDGROUND | 2,213 | 8,635 | 6,557 | 1 | 2 | 6.730 × 11.488 × 6.379 |
| `qn:DeadTree_3` / gltf | MIDGROUND | 2,211 | 7,936 | 5,802 | 1 | 2 | 6.388 × 13.280 × 6.430 |
| `qn:DeadTree_4` / gltf | MIDGROUND | 2,211 | 7,653 | 5,702 | 1 | 2 | 7.961 × 12.771 × 7.732 |
| `qn:DeadTree_5` / gltf | MIDGROUND | 2,211 | 7,499 | 5,648 | 1 | 2 | 8.356 × 16.437 × 8.413 |
| `qn:Fern_1` / gltf | NEAR WILDERNESS | 2,058 | 243 | 288 | 1 | 1 | 2.827 × 0.840 × 2.652 |
| `qn:Grass_Common_Short` / gltf | NEAR WILDERNESS | 2,023 | 153 | 155 | 1 | 1 | 0.639 × 1.334 × 0.737 |
| `qn:Grass_Common_Tall` / gltf | NEAR WILDERNESS | 2,025 | 303 | 326 | 1 | 1 | 0.895 × 1.873 × 0.993 |
| `qn:Grass_Wispy_Short` / gltf | NEAR WILDERNESS | 2,025 | 559 | 494 | 1 | 1 | 1.322 × 1.072 × 1.210 |
| `qn:Grass_Wispy_Tall` / gltf | NEAR WILDERNESS | 2,023 | 644 | 622 | 1 | 1 | 1.540 × 1.672 × 1.594 |
| `qn:Pebble_Square_1` / gltf | MIDGROUND | 1,850 | 216 | 104 | 1 | 1 | 0.435 × 0.130 × 0.440 |
| `qn:Pebble_Square_2` / gltf | MIDGROUND | 1,847 | 162 | 78 | 1 | 1 | 0.391 × 0.140 × 0.280 |
| `qn:Pebble_Square_3` / gltf | MIDGROUND | 1,847 | 108 | 52 | 1 | 1 | 0.373 × 0.159 × 0.319 |
| `qn:Pebble_Square_4` / gltf | MIDGROUND | 1,846 | 96 | 48 | 1 | 1 | 0.340 × 0.168 × 0.291 |
| `qn:Pebble_Square_5` / gltf | MIDGROUND | 1,849 | 156 | 72 | 1 | 1 | 0.352 × 0.152 × 0.450 |
| `qn:Pebble_Square_6` / gltf | MIDGROUND | 1,850 | 139 | 65 | 1 | 1 | 0.462 × 0.138 × 0.263 |
| `qn:Pine_1` / gltf | NEAR WILDERNESS | 3,832 | 5,246 | 3,947 | 2 | 3 | 4.945 × 7.317 × 4.538 |
| `qn:Pine_2` / gltf | NEAR WILDERNESS | 3,833 | 4,926 | 3,648 | 2 | 3 | 5.728 × 7.376 × 5.221 |
| `qn:Pine_3` / gltf | NEAR WILDERNESS | 3,827 | 6,573 | 4,964 | 2 | 3 | 3.611 × 7.392 × 3.996 |
| `qn:Pine_4` / gltf | NEAR WILDERNESS | 3,831 | 4,888 | 3,370 | 2 | 3 | 5.802 × 10.236 × 5.371 |
| `qn:Pine_5` / gltf | NEAR WILDERNESS | 3,815 | 2,315 | 1,646 | 2 | 3 | 6.420 × 8.724 × 6.222 |
| `qn:Plant_1` / gltf | NEAR WILDERNESS | 2,057 | 120 | 120 | 1 | 1 | 1.273 × 1.014 × 1.386 |
| `qn:Plant_1_Big` / gltf | NEAR WILDERNESS | 2,075 | 360 | 360 | 1 | 1 | 1.807 × 2.348 × 1.954 |
| `qn:Plant_7` / gltf | NEAR WILDERNESS | 1,844 | 54 | 48 | 1 | 1 | 1.048 × 0.250 × 0.962 |
| `qn:Plant_7_Big` / gltf | NEAR WILDERNESS | 1,857 | 126 | 112 | 1 | 1 | 1.311 × 0.253 × 1.362 |
| `qn:Rock_Medium_1` / gltf | NEAR WILDERNESS | 1,831 | 351 | 342 | 1 | 1 | 3.225 × 2.260 × 2.989 |
| `qn:Rock_Medium_2` / gltf | NEAR WILDERNESS | 1,825 | 249 | 244 | 1 | 1 | 3.049 × 1.899 × 2.479 |
| `qn:Rock_Medium_3` / gltf | NEAR WILDERNESS | 1,832 | 531 | 522 | 1 | 1 | 3.420 × 2.316 × 3.476 |
| `qn:TwistedTree_1` / gltf | HERO | 3,819 | 14,064 | 9,564 | 2 | 3 | 13.516 × 16.726 × 11.549 |
| `qn:TwistedTree_2` / gltf | HERO | 3,815 | 13,407 | 9,134 | 2 | 3 | 10.563 × 18.949 × 9.203 |
| `qn:TwistedTree_3` / gltf | HERO | 3,817 | 14,805 | 10,089 | 2 | 3 | 11.357 × 16.073 × 11.506 |
| `qn:TwistedTree_4` / gltf | HERO | 3,817 | 14,576 | 9,600 | 2 | 3 | 10.381 × 18.738 × 11.293 |
| `qn:TwistedTree_5` / gltf | HERO | 3,822 | 15,647 | 10,104 | 2 | 3 | 9.495 × 15.662 × 9.387 |
| `qm:Corner_ExteriorWide_Brick` / gltf | STRUCTURAL | 2,227 | 2,249 | 2,882 | 1 | 3 | 0.712 × 3.043 × 0.756 |
| `qm:Corner_Exterior_Brick` / gltf | STRUCTURAL | 2,225 | 2,424 | 3,102 | 1 | 3 | 0.531 × 3.016 × 0.576 |
| `qm:DoorFrame_Flat_Brick` / gltf | STRUCTURAL | 2,222 | 1,489 | 1,880 | 1 | 3 | 1.575 × 2.376 × 0.494 |
| `qm:DoorFrame_Round_Brick` / gltf | STRUCTURAL | 2,223 | 1,616 | 2,046 | 1 | 3 | 1.603 × 2.586 × 0.477 |
| `qm:Floor_Brick` / gltf | STRUCTURAL | 2,105 | 8 | 4 | 1 | 3 | 2.000 × 0.020 × 2.000 |
| `qm:Floor_UnevenBrick` / gltf | STRUCTURAL | 2,159 | 8 | 4 | 1 | 3 | 2.000 × 0.020 × 2.000 |
| `qm:Prop_Brick1` / gltf | STRUCTURAL | 2,184 | 82 | 108 | 1 | 3 | 0.346 × 0.208 × 0.250 |
| `qm:Prop_Brick2` / gltf | STRUCTURAL | 2,185 | 77 | 94 | 1 | 3 | 0.395 × 0.245 × 0.217 |
| `qm:Prop_Brick3` / gltf | STRUCTURAL | 2,189 | 98 | 126 | 1 | 3 | 0.381 × 0.250 × 0.216 |
| `qm:Prop_Brick4` / gltf | STRUCTURAL | 2,187 | 98 | 126 | 1 | 3 | 0.257 × 0.250 × 0.216 |
| `qm:Prop_ExteriorBorder_Corner` / gltf | STRUCTURAL | 2,201 | 34 | 18 | 1 | 3 | 0.700 × 0.134 × 0.700 |
| `qm:Prop_ExteriorBorder_Straight1` / gltf | STRUCTURAL | 2,180 | 28 | 16 | 1 | 3 | 2.000 × 0.134 × 0.700 |
| `qm:Prop_ExteriorBorder_Straight2` / gltf | STRUCTURAL | 2,180 | 28 | 16 | 1 | 3 | 2.000 × 0.134 × 0.700 |
| `qm:Stairs_Exterior_Platform` / gltf | STRUCTURAL | 3,792 | 63 | 32 | 2 | 6 | 2.000 × 1.000 × 2.001 |
| `qm:Stairs_Exterior_Platform45Clean` / gltf | STRUCTURAL | 3,810 | 67 | 45 | 2 | 6 | 2.000 × 1.000 × 2.001 |
| `qm:Stairs_Exterior_Sides` / gltf | STRUCTURAL | 2,147 | 32 | 16 | 1 | 3 | 2.000 × 1.000 × 2.000 |
| `qm:Stairs_Exterior_Straight` / gltf | STRUCTURAL | 3,820 | 118 | 62 | 2 | 6 | 2.000 × 1.204 × 2.078 |
| `qm:Stairs_Exterior_Straight_Center` / gltf | STRUCTURAL | 2,189 | 90 | 50 | 1 | 3 | 2.000 × 1.022 × 2.078 |
| `qm:Wall_Arch` / gltf | REJECT | 2,163 | 260 | 196 | 1 | 3 | 2.000 × 3.000 × 0.064 |
| `qm:Wall_UnevenBrick_Door_Round` / gltf | STRUCTURAL | 5,413 | 142 | 136 | 3 | 9 | 2.000 × 3.123 × 0.406 |
| `qm:Wall_UnevenBrick_Straight` / gltf | STRUCTURAL | 5,392 | 76 | 56 | 3 | 9 | 2.000 × 3.123 × 0.406 |
| `kn:cliff_blockDiagonal_rock` / glb | MIDGROUND | 2,564 | 18 | 8 | 2 | 0 | 1.000 × 1.000 × 1.000 |
| `kn:cliff_blockHalf_rock` / glb | MIDGROUND | 2,788 | 24 | 12 | 2 | 0 | 1.000 × 0.500 × 1.000 |
| `kn:cliff_blockSlope_rock` / glb | MIDGROUND | 6,720 | 124 | 70 | 2 | 0 | 1.200 × 1.000 × 1.000 |
| `kn:cliff_block_rock` / glb | MIDGROUND | 2,776 | 24 | 12 | 2 | 0 | 1.000 × 1.000 × 1.000 |
| `kn:cliff_cave_rock` / glb | MIDGROUND | 5,480 | 102 | 64 | 1 | 0 | 1.000 × 1.000 × 0.169 |
| `kn:cliff_cornerInner_rock` / glb | MIDGROUND | 5,008 | 90 | 56 | 1 | 0 | 1.000 × 1.000 × 1.000 |
| `kn:cliff_cornerLarge_rock` / glb | MIDGROUND | 2,376 | 24 | 12 | 1 | 0 | 0.418 × 1.000 × 0.418 |
| `kn:cliff_corner_rock` / glb | MIDGROUND | 2,360 | 24 | 12 | 1 | 0 | 0.169 × 1.000 × 0.169 |
| `kn:cliff_large_rock` / glb | MIDGROUND | 3,560 | 54 | 32 | 1 | 0 | 1.000 × 1.000 × 0.418 |
| `kn:cliff_rock` / glb | MIDGROUND | 3,556 | 54 | 32 | 1 | 0 | 1.000 × 1.000 × 0.169 |
| `kn:cliff_steps_rock` / glb | MIDGROUND | 15,952 | 357 | 219 | 2 | 0 | 1.000 × 1.000 × 1.050 |
| `kn:cliff_top_rock` / glb | MIDGROUND | 5,312 | 87 | 53 | 2 | 0 | 1.000 × 1.000 × 0.269 |
| `kn:hanging_moss` / glb | DISTANT FILLER | 4,776 | 84 | 52 | 1 | 0 | 0.160 × 0.478 × 0.035 |
| `kn:plant_bush` / glb | DISTANT FILLER | 4,396 | 80 | 32 | 1 | 0 | 0.396 × 0.244 × 0.396 |
| `kn:plant_bushLarge` / glb | DISTANT FILLER | 6,436 | 132 | 60 | 1 | 0 | 0.374 × 0.243 × 0.336 |
| `kn:plant_bushLargeTriangle` / glb | DISTANT FILLER | 4,564 | 81 | 39 | 1 | 0 | 0.408 × 0.169 × 0.471 |
| `kn:plant_bushSmall` / glb | DISTANT FILLER | 3,212 | 48 | 16 | 1 | 0 | 0.383 × 0.207 × 0.336 |
| `kn:rock_largeA` / glb | DISTANT FILLER | 7,552 | 146 | 80 | 2 | 0 | 0.785 × 0.260 × 1.015 |
| `kn:rock_largeB` / glb | DISTANT FILLER | 8,560 | 163 | 85 | 3 | 0 | 0.767 × 0.430 × 1.015 |
| `kn:rock_largeC` / glb | DISTANT FILLER | 7,004 | 132 | 72 | 2 | 0 | 1.064 × 0.321 × 1.016 |
| `kn:rock_largeD` / glb | DISTANT FILLER | 7,992 | 147 | 80 | 3 | 0 | 1.069 × 0.568 × 1.030 |
| `kn:rock_largeE` / glb | DISTANT FILLER | 6,464 | 118 | 64 | 2 | 0 | 1.095 × 0.292 × 0.920 |
| `kn:rock_largeF` / glb | DISTANT FILLER | 7,516 | 135 | 73 | 3 | 0 | 1.095 × 0.479 × 0.899 |
| `kn:rock_tallA` / glb | DISTANT FILLER | 12,072 | 254 | 136 | 3 | 0 | 0.983 × 0.996 × 0.683 |
| `kn:rock_tallB` / glb | DISTANT FILLER | 14,060 | 302 | 172 | 3 | 0 | 0.765 × 0.884 × 0.770 |
| `kn:rock_tallC` / glb | DISTANT FILLER | 5,184 | 76 | 37 | 3 | 0 | 0.456 × 0.783 × 0.437 |
| `kn:rock_tallD` / glb | DISTANT FILLER | 5,132 | 74 | 38 | 3 | 0 | 0.443 × 0.772 × 0.461 |
| `kn:rock_tallE` / glb | DISTANT FILLER | 5,192 | 76 | 38 | 3 | 0 | 0.456 × 0.444 × 0.527 |
| `kn:rock_tallF` / glb | DISTANT FILLER | 5,608 | 86 | 46 | 3 | 0 | 0.444 × 0.574 × 0.512 |
| `kn:rock_tallG` / glb | DISTANT FILLER | 6,772 | 116 | 62 | 3 | 0 | 0.425 × 0.783 × 0.491 |
| `kn:rock_tallH` / glb | DISTANT FILLER | 7,792 | 142 | 78 | 3 | 0 | 0.575 × 0.711 × 0.664 |
| `kn:rock_tallI` / glb | DISTANT FILLER | 5,584 | 86 | 44 | 3 | 0 | 0.456 × 0.812 × 0.464 |
| `kn:rock_tallJ` / glb | DISTANT FILLER | 5,424 | 82 | 42 | 3 | 0 | 0.488 × 0.620 × 0.538 |
| `kn:statue_columnDamaged` / glb | STRUCTURAL | 8,824 | 176 | 108 | 2 | 0 | 0.300 × 0.700 × 0.300 |
| `kn:statue_obelisk` / glb | STRUCTURAL | 4,416 | 64 | 38 | 2 | 0 | 0.307 × 0.875 × 0.307 |
| `kn:statue_ring` / glb | STRUCTURAL | 6,568 | 118 | 76 | 2 | 0 | 0.600 × 0.796 × 0.400 |
| `kn:tree_default_dark` / glb | DISTANT FILLER | 9,436 | 192 | 114 | 2 | 0 | 0.755 × 1.708 × 0.654 |
| `kn:tree_detailed_dark` / glb | DISTANT FILLER | 31,416 | 758 | 402 | 3 | 0 | 0.847 × 1.332 × 0.762 |
| `kn:tree_fat_darkh` / glb | DISTANT FILLER | 5,584 | 96 | 50 | 2 | 0 | 0.755 × 1.150 × 0.654 |
| `kn:tree_oak_dark` / glb | DISTANT FILLER | 14,648 | 324 | 196 | 2 | 0 | 0.641 × 1.226 × 0.740 |
| `kn:tree_pineDefaultA` / glb | DISTANT FILLER | 17,220 | 392 | 230 | 2 | 0 | 0.532 × 1.546 × 0.532 |
| `kn:tree_pineDefaultB` / glb | DISTANT FILLER | 18,180 | 416 | 246 | 2 | 0 | 0.532 × 1.546 × 0.532 |
| `kn:tree_pineRoundA` / glb | DISTANT FILLER | 14,488 | 316 | 204 | 2 | 0 | 0.617 × 1.366 × 0.712 |
| `kn:tree_pineRoundB` / glb | DISTANT FILLER | 18,464 | 406 | 262 | 3 | 0 | 0.532 × 1.196 × 0.613 |
| `kn:tree_pineRoundC` / glb | DISTANT FILLER | 15,332 | 342 | 206 | 2 | 0 | 0.480 × 1.253 × 0.555 |
| `kn:tree_pineRoundD` / glb | DISTANT FILLER | 13,748 | 306 | 170 | 2 | 0 | 0.480 × 1.082 × 0.555 |
| `kn:tree_pineSmallA` / glb | DISTANT FILLER | 12,820 | 280 | 164 | 2 | 0 | 0.500 × 0.967 × 0.500 |
| `kn:tree_pineSmallB` / glb | DISTANT FILLER | 7,816 | 152 | 86 | 2 | 0 | 0.386 × 1.009 × 0.392 |
| `kn:tree_pineTallA` / glb | DISTANT FILLER | 7,200 | 136 | 78 | 2 | 0 | 0.386 × 1.530 × 0.392 |
| `kn:tree_pineTallB` / glb | DISTANT FILLER | 7,204 | 136 | 78 | 2 | 0 | 0.386 × 1.935 × 0.392 |
| `kn:tree_pineTallC` / glb | DISTANT FILLER | 8,080 | 156 | 98 | 2 | 0 | 0.480 × 1.671 × 0.555 |
| `kn:tree_pineTallD` / glb | DISTANT FILLER | 8,080 | 156 | 98 | 2 | 0 | 0.480 × 2.075 × 0.555 |
| `kn:tree_simple_dark` / glb | DISTANT FILLER | 6,508 | 120 | 62 | 2 | 0 | 0.355 × 1.519 × 0.409 |
| `kn:tree_tall_dark` / glb | DISTANT FILLER | 7,008 | 132 | 72 | 2 | 0 | 0.400 × 1.688 × 0.461 |
| `kc:ground-hills` / glb | MIDGROUND | 12,732 | 220 | 116 | 1 | 1 | 1.000 × 0.288 × 1.000 |
| `kc:rocks-large` / glb | MIDGROUND | 16,204 | 280 | 150 | 1 | 1 | 1.201 × 0.500 × 1.348 |
| `kc:rocks-small` / glb | MIDGROUND | 15,192 | 260 | 140 | 1 | 1 | 1.030 × 0.500 × 1.105 |
| `kc:stairs-stone-square` / glb | STRUCTURAL | 9,556 | 156 | 100 | 1 | 1 | 0.233 × 0.675 × 0.819 |
| `kc:stairs-stone` / glb | STRUCTURAL | 9,836 | 162 | 104 | 1 | 1 | 0.233 × 0.675 × 0.819 |
| `kc:tower-base` / glb | STRUCTURAL | 41,724 | 792 | 332 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:tower-hexagon-base` / glb | STRUCTURAL | 8,336 | 132 | 68 | 1 | 1 | 0.900 × 1.310 × 0.779 |
| `kc:tower-hexagon-mid` / glb | STRUCTURAL | 33,568 | 612 | 404 | 1 | 1 | 0.952 × 0.460 × 0.825 |
| `kc:tower-hexagon-top` / glb | STRUCTURAL | 13,848 | 240 | 168 | 1 | 1 | 0.864 × 0.130 × 0.748 |
| `kc:tower-square-arch` / glb | STRUCTURAL | 29,724 | 544 | 308 | 1 | 1 | 0.930 × 1.010 × 0.930 |
| `kc:tower-square-base` / glb | STRUCTURAL | 4,456 | 56 | 28 | 1 | 1 | 1.000 × 1.010 × 1.000 |
| `kc:tower-square-mid-open-simple` / glb | STRUCTURAL | 19,752 | 352 | 176 | 1 | 1 | 0.930 × 0.878 × 0.930 |
| `kc:tower-square-mid` / glb | STRUCTURAL | 7,744 | 120 | 76 | 1 | 1 | 0.930 × 1.010 × 0.930 |
| `kc:tower-square-top` / glb | STRUCTURAL | 13,276 | 232 | 148 | 1 | 1 | 1.000 × 0.300 × 1.000 |
| `kc:tower-top` / glb | STRUCTURAL | 27,408 | 496 | 320 | 1 | 1 | 1.000 × 0.130 × 1.000 |
| `kc:wall-corner-half-tower` / glb | STRUCTURAL | 80,020 | 1,551 | 632 | 1 | 1 | 1.500 × 1.440 × 1.500 |
| `kc:wall-corner-half` / glb | STRUCTURAL | 12,976 | 226 | 144 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall-corner-slant` / glb | STRUCTURAL | 16,028 | 281 | 140 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall-corner` / glb | STRUCTURAL | 15,264 | 262 | 168 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall-doorway` / glb | STRUCTURAL | 37,560 | 684 | 500 | 1 | 1 | 0.500 × 1.310 × 1.000 |
| `kc:wall-half-modular` / glb | STRUCTURAL | 8,016 | 126 | 80 | 1 | 1 | 0.605 × 1.310 × 1.000 |
| `kc:wall-half` / glb | STRUCTURAL | 12,132 | 210 | 126 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall-narrow-corner` / glb | STRUCTURAL | 9,384 | 154 | 96 | 1 | 1 | 0.500 × 1.310 × 0.500 |
| `kc:wall-narrow-gate` / glb | STRUCTURAL | 17,092 | 296 | 192 | 1 | 1 | 0.630 × 1.310 × 1.000 |
| `kc:wall-narrow-stairs` / glb | STRUCTURAL | 26,972 | 493 | 262 | 1 | 1 | 0.965 × 1.310 × 1.000 |
| `kc:wall-narrow` / glb | STRUCTURAL | 12,160 | 210 | 126 | 1 | 1 | 0.500 × 1.310 × 1.000 |
| `kc:wall-pillar` / glb | STRUCTURAL | 18,156 | 320 | 186 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall-to-narrow` / glb | STRUCTURAL | 19,776 | 350 | 214 | 1 | 1 | 1.000 × 1.310 × 1.000 |
| `kc:wall` / glb | STRUCTURAL | 16,552 | 288 | 178 | 1 | 1 | 1.000 × 1.310 × 1.000 |

## Reproduction and verification

`Inspection/acquire_inventory.py /path/to/cache` stages selected members from official archives named `qn.zip`, `qm.zip`, `kn.zip`, `kc.zip`; it also needs saved official pages and public-download provenance JSON. It uses Python 3, NumPy and Pillow, and never writes into `Assets/`. `Inspection/render_shortlist.py` renders original canonical glTF with Blender 4.3.2; `Inspection/report_inventory.py` regenerates this report and contact sheets. The rejected arch preview is retained from the initial 39-candidate review.

`Inspection/validate_staging.py` verifies every staged original member against the manifest and acquisition archives when supplied, confirms complete dependency resolution, checks the shortlist/classification relationships, and rejects any changed tracked file outside `Docs/EXTERNAL_ENVIRONMENT_*` and `ExternalArtStaging/Environment/`. See `Inspection/validation-report.json` for the recorded checks. No gameplay tests were run because gameplay, scenes, colliders, camera, packages and project settings were unchanged.
