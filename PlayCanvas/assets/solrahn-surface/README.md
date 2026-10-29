# GOAL 017 material sources

All four source materials are **CC0-1.0**, from [Poly Haven](https://polyhaven.com/license):
Dry Ground Rocks, Grass Path 2, Forrest Ground 01 (the provider's spelling), Mossy Rock.
The original 1K download URLs, SHA-256 values, dimensions, conversion settings and
runtime output hashes are in `public/assets/solrahn-surface/materials.json`.
The four provider API responses are retained in `source/*.json`.

Run `python3 scripts/solrahn-materials.py` from `PlayCanvas/` with the pinned
`requirements-solrahn-v2.txt`. It fetches missing authoring sources into `source/`
and rebuilds the runtime maps. Authoring JPG/PNG files are intentionally ignored
by Git and are never browser assets. There are no scenic objects or displacement maps.

Each layer has two 1024×1024 WebP maps: sRGB base-color RGB with linear roughness
in alpha, and linear OpenGL tangent-space normal RGB with linear AO in alpha.
Both alpha channels are material data, not transparency. Source normal XY strength
is reduced to 0.38 and normalized; runtime normal blending normalizes again after
lossy decode. Roughness and AO use 1/32 quantization before WebP alpha encoding.
Colors are adjusted in linear space and mildly desaturated. Roughness is clamped
to [0.64,0.98] in the terrain shader. Albedo WebP quality 88; normals quality 92.
All runtime maps use mipmaps, trilinear filtering and anisotropy capped at 4.

One shared 6 m tile convention uses U=-Z/6, V=X/6, Y-up. No chunk-local UVs.
The outer skirt has face-aligned rock UVs; the existing geometry is unchanged.
