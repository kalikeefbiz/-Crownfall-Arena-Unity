# Riven — Azure Moonreaper

Production source: `Meshy_AI_Azure_Moonreaper_1025005546_texture.glb` (unchanged).

- 23,080,916 bytes; SHA-256 `20bad659e39bc916b7f34fca587e55beed25eeae9d3e77d856879efd173636c8`.
- One static mesh/primitive, 6,243 vertices, 3,043 triangles, one double-sided PBR material.
- Embedded RGB PNG maps: normal 2048², base color 2048², metallic/roughness 4096². No external resources, extensions, skin, animations, or decoder dependencies.
- Authored broad face: XY; thickness: Z. Bounds min `[-0.896937, -0.953125, -0.139220]`, max `[0.897847, 0.949724, 0.139038]`.
- Runtime centers measured mesh bounds, scales Y extent to 1.3 m against Riven's 1.75 m character, tilts the face 60° toward the overhead camera, and places its center 0.95 m above each authoritative projectile position. Collision is unchanged.

The scene's existing `SummonerAssets` owns one container. Weapon loading waits for current character loads to settle, keeping their decode work responsive; fallback scythes remain playable during loading. Reso Blades and temporary Elf Dance entities share its meshes, materials, and textures. Each visual follows its owner's pooled projectile; no additional weapon source is needed. Primitive/loading/error modes use a physical scythe silhouette.

Mobile concern: triangle cost is modest (6,086 triangles for a resting pair), but the source's maps cost approximately 128 MiB with RGBA8 GPU storage and mipmaps, shared across all instances. A separately approved, non-destructive derivative with a 2048² metallic/roughness map and mobile GPU texture compression (KTX2/Basis) is recommended. The original approved design and source are preserved. Software Chromium measurements are not physical iPhone validation.
