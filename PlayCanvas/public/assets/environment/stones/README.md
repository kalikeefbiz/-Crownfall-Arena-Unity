# GOAL 018A — Poly Haven stone library

Acquired actual glTF meshes, .bin geometry and all referenced PBR JPEG maps on
2026-10-30. No preview geometry, generated substitutes or untextured primitives.

| Asset | Source | Authors | License |
|---|---|---|---|
| Rock Face 02 | https://polyhaven.com/a/rock_face_02 | Dario Barresi; Rico Cilliers (processing) | CC0-1.0 |
| Rock Moss Set 02 | https://polyhaven.com/a/rock_moss_set_02 | Kless Gyzen | CC0-1.0 |

Poly Haven license: https://polyhaven.com/license
Legal dedication: https://creativecommons.org/publicdomain/zero/1.0/legalcode
Poly Haven assets are CC0: redistribution, modification and commercial use allowed.
Attribution is retained voluntarily. Meshy trees are separate, existing approved
project assets; this CC0 statement does not relicense those trees.

## Inspection and selection

Rock Face: 29,566 triangles, one UV-mapped material, irregular photogrammetry
surface, about 2.71 × 2.47 × 2.13m (runtime XYZ). An open cliff scan, not a closed
freestanding wall. Its rear/bottom must remain buried. Suitable only when facing
into the lane and tilted into the bank. This prototype does that.

Moss set: seven individually UV-mapped rocks, 7,894–9,826 triangles each, all using
one atlas material. Three complementary silhouettes (09, 11, 13) selected; the
other four are omitted to bound payload and mesh memory. Set layout transforms
are removed; every variant has a centred foot pivot. No substitute required.

Runtime is uncompressed core glTF 2.0 GLB with JPEG textures (no Draco, Meshopt,
KTX, WebP or extension decoder requirement on Safari). Original albedo, OpenGL
normal and roughness/packed ARM are preserved. Opaque, single-sided. Shared
materials, UVs and photographed surface detail are retained during decimation.
`manifest.json` records exact final triangle counts, texture dimensions, byte
sizes and SHA-256; `provenance/*-files.json` includes original download URLs,
MD5 and byte sizes, including the geometry .bin files.

## Reproduce

From `PlayCanvas/`, use Python 3 + Pillow and Blender 4.3.2 (the processing version
on this worker). No paid service or original Meshy regeneration is involved.

```
python scripts/goal018a/download-rocks.py
blender -b -t 2 --python scripts/goal018a/process-rocks.py
python scripts/goal018a/repack-glb.py
```

Downloads go to ignored `.audit/018a/polyhaven/`. Every original download must
match its recorded MD5 before processing. Blender reduces the cliff to about 3,000
triangles and boulders to about 1,000 each, preserves UVs/normals, centres their
foot pivots and exports Y-up GLBs. Repacking retains all geometry and recompresses
embedded JPEGs at quality 85: cliff albedo 1,024px; all other stone maps 512px, disables double-sided materials and
adds the CC0 source URL to glTF copyright metadata. Blender export metadata can
vary by version; compare geometry/material measurements as well as file hashes.
Copy the verified resulting `mobile/*.glb` into this directory's `mobile/` only
after inspecting the result. No local game-dev packaging CLI was available on the
worker; the explicit source snapshots, closed runtime hash manifest and browser
import/render/sharing/lifecycle checks form the project's admission receipt.

`evidence/018a/source-inspection.png` is a Blender asset inspection render;
all before/after/gameplay/integration/mobile/topdown evidence images are actual
PlayCanvas renders, never generated illustrations.
