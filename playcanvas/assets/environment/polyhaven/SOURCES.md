# Arena soil — Poly Haven (CC0)

- Packed lane: [dirt](https://polyhaven.com/a/dirt).
- Shoulders / embankments: [dry_ground_rocks](https://polyhaven.com/a/dry_ground_rocks).
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Original map URLs / checksums: `https://api.polyhaven.com/files/dirt` and
  `https://api.polyhaven.com/files/dry_ground_rocks`. Downloaded 2026-10-25;
  each original verified against the API's MD5 before conversion.

All delivered maps are 1024×1024, derived from Poly Haven's **1k JPG** downloads:
`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{asset}/{asset}_{diff|nor_gl|rough|ao}_1k.jpg`.
Base color: WebP quality 92. OpenGL normal (+Y): WebP quality 96. Pillow method 6;
no art generation, tint baking, resizing, normal inversion or sharpening.
`*_ar_1k.png` is lossless RGB packing: R = original AO, G = original roughness,
B = 0. This shares one sampler / allocation for both scalar maps.

Only albedo uses sRGB. Normals and AR remain linear. All maps flip Y together,
repeat, generate mipmaps, use trilinear minification and up to 4× anisotropy.
World UVs cover 4.5m per repeat; embankment faces use dominant-axis projection.
Mesh normals and orthogonal tangent/handedness streams support the normal maps.

## Goal 010 Wilderness scans

- [sparse_grass](https://polyhaven.com/a/sparse_grass) and
  [forest_leaves_02](https://polyhaven.com/a/forest_leaves_02), CC0 1.0.
- Downloaded 2026-10-25 from each asset's `api.polyhaven.com/files/{asset}`
  1K JPG Diffuse, nor_gl, AO and Rough entries; MD5 checked before conversion.
- Delivered at 512×512 using Lanczos downsampling. Albedo WebP quality 92;
  OpenGL normal WebP quality 96; lossless PNG packs AO in R / roughness in G.
  No generated or painted texture replacements. All maps share mipmaps and UVs.
- Grass scan also supplies restrained moss-like cover on the bank and selected
  rock facets; sparse low-profile opaque blade fans supplement it outside play.
- Reproduction: `python tests/helpers/prepare-wilderness.py` (Pillow required).
