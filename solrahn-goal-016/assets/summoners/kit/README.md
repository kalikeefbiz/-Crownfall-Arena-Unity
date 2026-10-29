# Kit static evaluation asset

Original supplied filename: `Kit_10K_PlayCanvas_Test_1K.glb`.
Stored unchanged as `kit-10k-test.glb`.

- Size: **5,317,848 bytes**.
- SHA-256: `11f0b6ad226eae565ddaa7e9104ca1aae2a85ecc954203a70fdce23b0adfb547`.
- 10,290 triangles; 20,888 vertices; one mesh and one embedded PBR material.
- Embedded textures: 1024 × 1024.
- Unrigged, static evaluation asset: no skins or animations. No re-encoding or mesh edits.

Task 007A uses this only for the local human Kit in competitive matches.
Bounds normalization, grounding and authored-forward correction live in
`src/presentation/kit-model.ts`; gameplay/collision roots are not scaled.

## Goal 007B animated default

`Kit_20K_Animated.glb` was extracted unchanged from the committed
`PlayCanvas/Kit_20K_Animated_GLB.zip` (upload commit `56e9bf4`). The staging ZIP
is removed after successful verification. Supplied Meshy export name:
`Meshy_AI_Crimson_Shadow_Warrio_All_Animations.glb`.

- Size: **26,939,896 bytes**.
- SHA-256: `b111e1f774b0483b78f45e43413515adb02e501941c5c99a995d09a43f96212f`.
- 20,733 triangles, 37,309 exported vertices, one skinned mesh/material, 66 joints.
- Five clips on that skeleton: Idle_5 (1.833333 s), Walking (1.033333 s),
  Running (0.633333 s), RunFast (0.466667 s), Punch_Combo_1 (2.200000 s).
- Original embedded PNG textures: normal 2048×2048, base color 2048×2048,
  metallic/roughness 4096×4096. No texture reduction, recompression or re-encoding.
- Runtime copies pin horizontal hips to the bind reference; vertical gait and
  all other skeletal tracks are retained. The binary is unchanged.

The normal local Kit match now uses the animated model. `?kitModel=10k` retains
this directory's original static comparison; `?kitPrimitive=1` skips both GLBs.
These are developer URL switches, not player settings. Set, Riven and remote/bot
presentations are unchanged. See `TASK_007B_VERIFICATION.md` for acceptance evidence.
