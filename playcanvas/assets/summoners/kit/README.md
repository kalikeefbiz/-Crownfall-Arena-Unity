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
