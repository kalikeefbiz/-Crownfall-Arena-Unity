# Goal 010 texture-only runtime variants

The four approved source GLBs in the parent directory remain byte-for-byte intact.
These variants preserve every non-image buffer view, accessor, mesh, UV, normal,
node transform, material definition and texture binding. Only the twelve embedded
JPEGs change from 2048² to 512² (Pillow Lanczos, quality 95, no chroma subsampling).
No remeshing, decimation, recoloring or material consolidation was applied.
`preparation.json` records sizes, SHA-256, source bounds and triangle counts.

All models are authored upright (+Y), approximately 0.95 units high, with centered
origins. Runtime derives bounds once per species, centers X/Z and grounds min Y.
Heights vary from 5.4m pines to 12.2m redwoods. Source materials remain opaque and
double-sided, with their original PBR maps. Instances share one mesh/material set
per species; no per-frame traversal, shadows, collider or navigation insertion.

Reproduction: `python tests/helpers/prepare-wilderness.py` (Pillow required).
The focused test checks byte equality of all geometry streams and exact material
metadata equality between source and runtime GLBs, plus rotated canopy exclusion.
