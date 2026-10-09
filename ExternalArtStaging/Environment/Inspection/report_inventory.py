"""Build review documentation and contact sheets from measured staging metadata."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
manifest_path=ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json'
j=json.loads(manifest_path.read_text())
shortlist=json.loads((HERE/'shortlist.json').read_text())
first=set('qn:CommonTree_1 qn:CommonTree_3 qn:TwistedTree_1 qn:Pine_1 qn:Pine_5 qn:Rock_Medium_1 qn:Rock_Medium_2 qn:Rock_Medium_3 qn:Fern_1 kn:cliff_large_rock kn:cliff_block_rock kn:cliff_cornerLarge_rock kn:rock_tallA kn:rock_tallG kn:tree_pineTallA kn:tree_pineTallC kn:tree_default_dark kn:statue_columnDamaged qm:DoorFrame_Round_Brick qm:Stairs_Exterior_Straight qm:Wall_UnevenBrick_Straight kc:tower-square-arch kc:wall-half-modular kc:wall-corner-half-tower kc:tower-hexagon-top'.split())
models={m['id']:m for m in j['models']}
reviewed=list(shortlist)+['qm:Wall_Arch']
for m in j['models']:
 m['shortlisted']=m['id'] in shortlist
 m['shortlist_reason']=shortlist.get(m['id'])
 m['first_integration_pass_recommended']=m['id'] in first
 m['visual_review']='Blender 4.3.2 original glTF materials, orthographic inspection render' if m['id'] in reviewed else 'Not individually rendered; geometry/dependencies inspected'
j['shortlist_model_ids']=list(shortlist)
j['first_pass_model_ids']=[x for x in shortlist if x in first]
j['visual_review_caveat']='Studio previews are normalized independently to fit; they are not Unity Built-in screenshots or relative-scale comparisons. One rejected timber arch remains in the 39 inspected images.'
manifest_path.write_text(json.dumps(j,indent=2)+'\n')

font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for batch in range(3):
 subset=reviewed[batch*13:(batch+1)*13];out=Image.new('RGB',(1280,1440),(25,29,35));d=ImageDraw.Draw(out)
 for i,key in enumerate(subset):
  x=(i%4)*320;y=(i//4)*360
  out.paste(Image.open(HERE/'Previews'/(key.replace(':','_')+'.png')),(x,y))
  d.text((x+6,y+327),key+(' [REJECT: timber]' if key=='qm:Wall_Arch' else ''),font=font,fill='white')
 out.save(HERE/f'shortlist-contact-sheet-{batch+1}.jpg',quality=90)

lines=['# Crownfall external environment asset inventory','',
'Acquired and inspected 2026-10-09. **Staging only; no Unity import or environment integration.**', '',
f'Starting HEAD: `{j["starting_head"]}`. Target branch: `browser-parity-unity`. The staging commit is the commit containing this document; final HEAD is reported in the delivery message to avoid a self-referential commit hash.', '',
'144 unique model candidates staged (143 accepted role candidates + 1 visually rejected timber arch), with 144 original FBX alternates and 144 original glTF/GLB files. **38 models shortlisted; 25 recommended for the first integration pass.** Unique-model counts never count both export formats twice. The downloaded archives contain 649 model identities across four packs; 505 were excluded before staging. Raw archives stay outside the repository. Selected original members total **192,906,194 bytes (183.97 MiB)**; this is staging disk size, not runtime memory.', '',
'## Sources and provenance','',
'| Source | Result | Available in downloaded archive | Staged unique models | Staging path |','|---|---|---:|---:|---|']
for s in j['sources']:
 lines.append(f'| [{s["name"]}]({s["official_page"]}) | {s["status"]} | {s.get("archive_model_count_single_format","not downloaded")} | {s["staged_unique_model_count"]} | `{s["staging_path"]}/` |')
lines += ['',
'Quaternius Nature and Medieval are the publicly downloadable **Standard/free subsets**, not the complete paid MegaKits. Nature Standard contains 68 of the advertised 116 models; 40 are staged. Medieval Standard contains 176 model identities; only 21 structural candidates are staged. No purchase, account login, Asset Store package, URP project, or custom shader was acquired.', '',
'Ultimate Modular Ruins: the official page links a public Google Drive folder. The visible FBX listing was inspected and 24 selected models plus license, usage notes and preview were attempted; the endpoints returned HTML instead of files. The preserved representative response says **Google Drive — Quota exceeded**. The visible listing was incomplete (first 50 entries), so this is not a full-pack audit. No Ruins asset or original license bytes were acquired. Retry the official public source when its quota recovers; do not substitute an unverified mirror.', '',
'For each successful source, `Provenance/source.json` records the official URL, public download endpoint or itch.io upload ID, download host, date, archive size and SHA-256. `Provenance/official-source-page.html` preserves the official CC0 statement. Every selected original file has its original archive path, byte size and SHA-256 in the machine-readable manifest. Original license files are retained byte-for-byte:', '']
for s in j['sources']:
 for p in s.get('license_files',[]):lines.append(f'- [{s["name"]}: original license](<../{p}>)')
lines += ['',
'All acquired model content is explicitly **CC0 1.0 Universal** under those original license files. Website HTML is retained as provenance evidence, not treated as CC0 model content. Source models, textures and licenses were not edited, rescaled, recompressed or converted. Generated inspection PNGs/JPEGs are separate derivatives in `Inspection/`; they do not replace source files.', '',
'## Coherent Crownfall selection','',
'Build one substantial wilderness enclosure around the existing single 3v3 lane: textured Quaternius boulders and trees define the near edge; taller tree tiers and cliff bands create the midground; simplified forest silhouettes, clustered rock outcrops and fortification crowns extend the horizon. Keep all future placements decorative and outside existing traversable space/collider constraints. No second lane, playable terraces, camera change, or gameplay tower is implied.', '',
'The near palette is mossy gray stone, green common trees and layered pines. Quaternius twisted trees and `Bush_Common` have red foliage in their original materials: use them as a restrained landmark pocket, not uniformly across the forest. The Kenney Nature originals have cyan foliage and warm orange/brown terrain, while Castle masonry is pale and warm. They need a later shared Crownfall palette/material pass and distance separation; they are not ready to mix unchanged at the near edge. Original material colors are preserved here.', '',
'Visual inspection rejected `qm:Wall_Arch`: it is a thin timber arch using `MI_WoodTrim`, despite its promising filename. `DoorFrame_Round_Brick` is the stronger stone opening. `Wall_UnevenBrick_Straight` includes a timber cap; reserve it for surviving masonry, not a substitute for heavily broken ruins. Kenney cliffs are visibly block-like and suit hidden backing/midground courses, not close hero cliffs.', '',
'**Remaining gaps:** no acquired pack provides a vetted large broken-arch/wall library or finished distant mountain meshes. Damaged Kenney columns are small substitutes; intact battlements are arena remains only by composition. Rock clusters can suggest distant mountains but are not authored mountain assets. Tall rugged hero cliffs and convincing broken ruins remain the strongest reasons to retry Ultimate Modular Ruins and later assess additional approved art.', '',
'## Visual shortlist (38 models)','',
'Source keys: `qn` Quaternius Nature, `qm` Quaternius Medieval, `kn` Kenney Nature, `kc` Kenney Castle. **First** marks the 25 recommended initial models. Recommendations remain conditional on later Built-in material mapping and scale checks.', '',
'| Model | Class | Triangles | Materials | First | Selection reason |','|---|---|---:|---:|:---:|---|']
for key,reason in shortlist.items():
 m=models[key];lines.append(f'| `{key}` | {m["classification"]} | {m["triangle_count"]:,} | {m["material_count"]} | {"yes" if key in first else ""} | {reason} |')
lines += ['',
'The three contact sheets show 39 inspected candidates, including the rejected timber arch. Source-scale normalization is per image, so apparent thumbnail size is not comparable between assets. These are CPU Blender studio previews of original glTF materials, not Unity screenshots or target-device validation:', '',
'- [Contact sheet 1](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-1.jpg)',
'- [Contact sheet 2](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-2.jpg)',
'- [Contact sheet 3](../ExternalArtStaging/Environment/Inspection/shortlist-contact-sheet-3.jpg)', '',
'## Performance and import observations','',
'There is no arbitrary scene triangle ceiling in this acquisition. Preserve the substantial composition, then scale visibility, repetition, materials and texture residency with measured iPhone 12 WebGL frame time and memory.', '',
'| Staged source | Triangle range per model | Materials per model | Unique referenced image payloads | RGBA8 + full mips estimate |','|---|---:|---|---:|---:|']
for s in j['sources']:
 ms=[m for m in j['models'] if m['source_id']==s['id']]
 if not ms:continue
 tex={t['sha256']:t for m in ms for t in m['textures']}
 lines.append(f'| {s["name"]} | {min(m["triangle_count"] for m in ms):,}–{max(m["triangle_count"] for m in ms):,} | {", ".join(str(x) for x in sorted(set(m["material_count"] for m in ms)))} | {len(tex)} | {sum(t["rgba8_mip_chain_estimate_bytes"] for t in tex.values())/1048576:.2f} MiB |')
lines += ['',
'These image-memory estimates assume uncompressed RGBA8 plus approximately 33% for mipmaps, deduplicate identical payload hashes within each pack, and include the rejected arch because it remains staged. They are a worst-case planning scenario for all staged image sets, not measured Unity residency or WebGL download size. ASTC/other supported compression, channel packing, shared texture import, selective residency and lower-resolution distance materials should be measured later. Original textures span 512×512, 1008×981, 1024×1024 and 2048×2048. The non-power-of-two foliage image requires particular import/mipmap review.', '',
'- **Repeated masses:** Quaternius rocks are only 244–522 triangles with one material. `Pine_5` is 1,646 triangles versus 3,947 for `Pine_1`. Kenney distant pines such as `tree_pineTallA` are 78 triangles; cliffs can be 12–32 triangles. Use them to build depth, not as an excuse for a sparse world.',
'- **Hero geometry:** twisted trees reach 9,564–10,104 triangles and 14,064–15,647 exported vertices for the shortlisted variants. Preserve their close silhouette, then generate distance LODs in a later derived-asset pass. `DeadTree_2` is still 6,557 triangles despite having no leaf canopy.',
'- **Foliage fill cost:** 22 staged Nature models use non-opaque materials; many use double-sided masked leaves. Overlapping canopy cards, two-sided rendering and alpha-tested shadow maps can dominate before geometry does. Plan foliage LODs, coverage-preserving mipmaps and limited distant shadows; avoid deep stacks of transparent/alpha-tested grass.',
'- **Draw calls:** Kenney Nature models often have 2–3 material slots despite low triangle counts. `Wall_UnevenBrick_Straight` has 3 materials for only 56 triangles. Material count is a lower-level risk indicator, not a measured draw-call count; submeshes, shadows and passes multiply work. Reuse shared materials/atlases and batch or instance repeated mesh/material pairs. Confirm Built-in/WebGL instancing support on the actual graphics path; keep batching fallback.',
'- **Castle atlas:** 29 staged Castle models share one 512×512 colormap, generally one material per model. This is a strong batching/instancing opportunity for repeated distant battlements. Avoid importing duplicate copies of the same atlas from alternate-format folders.',
'- **Material translation:** several Kenney Nature glTF materials specify `metallicFactor: 1` despite representing dirt, bark or leaves. Do not trust automatic PBR translation. Recreate dielectric Built-in materials deliberately later. Quaternius foliage cutoff/double-sided behavior also needs explicit Built-in implementation; source glTF files do not provide the advertised custom wind shader. Medieval roughness/ORM maps are not directly interchangeable with Built-in Standard smoothness conventions. Original Godot-Unity normal-map alternatives are preserved where relevant.',
'- **LOD/impostors:** no authored LOD names or `MSFT_lod` extensions were detected in staged glTF. Generate LODs for common/twisted/dead trees and brick doorway frames; consider clustered forest impostors for the far horizon. No LODs or impostors were generated in acquisition.',
'- **Scale:** source glTF bounds differ markedly: TwistedTree variants are about 16–19 nominal units tall; Kenney trees are around 1–2. Do not drop these exports at uniform import scale. FBX axis/unit interpretation and Unity scale still require a future isolated import check. Thin wall/floor modules are not solid retaining cliffs.',
'- **Colliders:** no collider/collision/UCX name markers were detected in the canonical glTF files. This does not certify absent metadata in every FBX. No collider was generated or imported, and decorative placements should not generate gameplay colliders automatically.', '',
'## First integration pass recommendation','',
'Start with the 25 **First** models above. Establish broad, tall enclosure masses using layered Quaternius common trees/pines and the three textured boulders; add one restrained twisted-tree landmark. Use Kenney cliff backing and repeated distant forest/outcrops behind those richer silhouettes. Add the round brick doorway, masonry/stair segments and a small number of Castle crowns/corner masses to imply a larger ancient arena. The intended result is one playable lane embedded in a deep wilderness, not scattered props on a plane.', '',
'Before any future shipping integration, use an isolated import scene to settle source scale, palette, opaque/leaf materials, texture sharing and LOD behavior for **Unity 6000.3.10f1, Built-in Render Pipeline, WebGL**. Profile the target iPhone 12 during that later pass. No Unity scene was created or imported during this task; this paragraph is a recommendation, not an executed integration plan.', '',
'## Measurement method and limits','',
'The JSON manifest is the authoritative per-asset inventory. It records source and original path, original alternate-format paths, byte size, CC0 license, exported vertex count, mesh/scene triangle counts, primitive/material counts, texture references/dimensions/hash/memory estimates, transformed bounds, LOD/collider detection, classification and Crownfall role. `files[]` contains sizes/hashes for FBX, glTF, buffer, texture and license members individually. Shared dependencies are not charged repeatedly to each model file size.', '',
'Geometry is read directly from unmodified glTF/GLB buffers. POSITION accessors are counted once (avoids overcounting shared accessors across material primitives); seam-split vertices remain distinct. Triangle indices are validated and scene-node transforms applied for bounds. Bounds are source Y-up AABBs, nominal metres, not Unity-verified dimensions. The glTF figures do not independently certify that every FBX exporter produced identical topology. No Unity editor, player, WebGL build or device profiler was run.', '',
'Classification coverage includes every staged candidate; 505 omitted source model identities are explicitly recorded as `REJECT` in `excluded_candidates[]`, meaning out of scope for this acquisition, not necessarily defective. Omitted model geometry was not measured. Thirty-nine candidates were individually rendered; the rest were inventoried without individual visual approval.', '',
'## Full staged inventory','',
'Canonical file bytes below exclude shared buffers/textures and alternate FBX. Texture dimensions and original paths are fully expanded in the JSON manifest. All rows are CC0-1.0; all have original FBX alternates. Bounds are X×Y×Z in source glTF units.', '',
'| ID / canonical format | Class | File bytes | Vertices | Triangles | Materials | Textures | Bounds size |','|---|---|---:|---:|---:|---:|---:|---|']
for m in j['models']:
 dims=' × '.join(f'{v:.3f}' for v in m['bounds']['size'])
 lines.append(f'| `{m["id"]}` / {Path(m["staged_path"]).suffix[1:]} | {m["classification"]} | {m["file_size_bytes"]:,} | {m["mesh_vertex_count"]:,} | {m["triangle_count"]:,} | {m["material_count"]} | {m["texture_count"]} | {dims} |')
lines += ['',
'## Reproduction and verification','',
'`Inspection/acquire_inventory.py /path/to/cache` stages selected members from official archives named `qn.zip`, `qm.zip`, `kn.zip`, `kc.zip`; it also needs saved official pages and public-download provenance JSON. It uses Python 3, NumPy and Pillow, and never writes into `Assets/`. `Inspection/render_shortlist.py` renders original canonical glTF with Blender 4.3.2; `Inspection/report_inventory.py` regenerates this report and contact sheets. The rejected arch preview is retained from the initial 39-candidate review.', '',
'`Inspection/validate_staging.py` verifies every staged original member against the manifest and acquisition archives when supplied, confirms complete dependency resolution, checks the shortlist/classification relationships, and rejects any changed tracked file outside `Docs/EXTERNAL_ENVIRONMENT_*` and `ExternalArtStaging/Environment/`. See `Inspection/validation-report.json` for the recorded checks. No gameplay tests were run because gameplay, scenes, colliders, camera, packages and project settings were unchanged.', '']
(ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_INVENTORY.md').write_text('\n'.join(lines))
print('Wrote inventory, manifest annotations and three contact sheets.')
