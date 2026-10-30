# Set animated Meshy presentation

`Set_Animated.glb` is the unchanged single member of the supplied
`Set_Animated_GLB.zip`. ZIP CRC, member/binary comparison, size and SHA-256 were
verified before removing the staging ZIP.

- Size: **10,000,416 bytes**
- SHA-256: `dbee0fd906f786f4af04eb87f130a816c0f98aa04531874487b403f7ca23e154`
- 20,038 triangles, 20,951 vertices, one mesh/material/skin, 87 skeletal joints
- Three embedded 2048×2048 JPEG textures; no external image dependencies
- Running (0.633333 s), Walking (1.033333 s), Punch_Combo (2.466667 s), RunFast (0.466667 s)

Opt in with `?setPreview=1`, select Set, and start the existing match. Runtime
copies pin horizontal hip motion. Running is the only moving state; RunFast is
intentionally excluded. Ready is a separate constant track sampled at time zero
of Punch_Combo, showing the supplied guarded fighting stance rather than bind pose.
No attacks or abilities are mapped to Punch_Combo.

The visual bind height is normalized to 1.9 m, with a fixed 0.0093135 m sampled
ready-sole correction. Authored forward is +Z; gameplay collision and simulation
are unchanged. See `PlayCanvas/TASK_007D_VERIFICATION.md` for validation and device
acceptance limitations.
