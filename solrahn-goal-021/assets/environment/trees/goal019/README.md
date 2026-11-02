# GOAL 019 tree palette derivatives

These are color-only derivatives of the existing founder-approved Meshy mobile
GLBs in `../mobile/`. Pine, maple and redwood are used; red oak is omitted.
Original files are preserved. These assets are not claimed to be CC0 or newly
licensed from a free asset service; the project's existing supplied-asset rights
apply.

Reproduce with `PlayCanvas/scripts/goal019/prepare-trees.py` (Pillow). Base-color
images are reduced to 47% saturation. Pine brightness is multiplied by 1.15;
maple/redwood by 0.90. Existing image dimensions, normal/roughness images,
geometry, accessors, node hierarchy and UVs are retained. Runtime GLBs remain
core glTF 2.0 with JPEG maps and require no additional Safari decoder.

`PlayCanvas/evidence/019/tree-processing.json` records source/runtime SHA-256 and
byte counts; `tree-geometry-proof.json` verifies every non-image buffer view and
mesh/accessor/node definition against the approved originals. Materials receive
a shared restrained matte lighting response at runtime. No animation, physics or
navigation is embedded in these scenery models.
