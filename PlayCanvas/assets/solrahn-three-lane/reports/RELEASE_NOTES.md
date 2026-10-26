Founder-created three-lane Sol’Rahn environment, prepared for future PlayCanvas integration. **Asset preparation only; no game deployment or integration.**

Verified original: `export_Meshy_AI_2026-10-26_4debfa.blend`, 506,928,885 bytes, SHA-256 `626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f`. The founder's original release remains unchanged.

The actual source contains 2,782,049 Blender vertices and 5,568,924 triangles in one connected mesh. Weighted reduction retains the authored environment at 331,722 native vertices and 668,270 triangles. Three packed 2K PBR maps reduce estimated RGBA8 mipmapped texture storage from 192 MiB to 64 MiB. Fine detail is softer in close views; this is a measured preparation candidate, not a certified minimum mobile budget.

- `solrahn-three-lane-optimized.blend`: portable packed optimized visual project.
- `solrahn-three-lane-visual.glb`: 48,825,928-byte self-contained visual export, 452,046 delivery vertices after UV/normal/tangent splits.
- `solrahn-lane-collision-candidates.blend` and `.glb`: 7,500 triangles in three **partial, fragmented lane-core candidates**. The GLB is 587,724 bytes. These are not complete gameplay collision or navigation geometry. Wilderness/cliff/solid-structure collision is not prepared.
- `solrahn-goal-013-evidence.zip`: original/optimized master renders, ten matched comparisons including gameplay approximations, audits, measurements, validators and reproducible scripts.
- `SHA256SUMS.txt`: transfer checksums for the generated release artifacts.

Both GLBs pass Khronos validation with zero errors/warnings and clean Blender reimport. Source-to-optimized bounds differ by at most about 0.000027 native units; reimported visual bounds match the optimized project exactly. Seeded 50,000-point-per-direction nearest-surface sampling measured p99 deviations below 0.000311 native units; these samples are not exhaustive error bounds.

[Full measured report](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/blob/playcanvas-port/PlayCanvas/assets/solrahn-three-lane/reports/GOAL_013_REPORT.md) · [Comparison images](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/tree/playcanvas-port/PlayCanvas/assets/solrahn-three-lane/previews/comparisons)

Coordinates, origins and relative placement remain authored; standard glTF Y-up conversion is consistent across visual/collision copies. No scene scale/placement decision has been made for gameplay. One mesh still limits culling and carries substantial geometry/memory cost. No actual mobile hardware frame-rate testing was performed. No existing map, characters, animations, camps, combat, AI, gameplay camera or live deployment was changed.
