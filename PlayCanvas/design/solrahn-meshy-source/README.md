# Sol’Rahn — founder-supplied Blender map source files

## Asset intake only — no game integration

The founder is uploading **exactly two editable .blend files**, and **no GLB files**:

1. Approved **three-lane** Meshy-generated arena Blender project.
2. Approved **one-lane** Meshy-generated arena Blender project.

Both should be GitHub **Release assets**, not Git-tracked binaries. Preserve the original filenames and bytes. No conversion, export, reduction, or modification is authorized during intake.

**Release tag:** `solrahn-three-lane-source-v1`
**Release title:** `Sol’Rahn Arena — Blender Source Maps V1`
**Create release:** https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/new
**Published release URL:** https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-source-v1

Choose `playcanvas-port` as the release tag target and publish as a prerelease. GitHub Releases permit files up to 2 GiB per asset. No GLBs are expected or required in this release.

GitHub release assets are not part of the Git tree; Codex must query the actual release's assets explicitly.

## Cleanup-only Codex assignment boundary

After **both Blender files** are uploaded:
1. Identify and remove only the rejected Goal 012 procedural preview map implementation and its exclusively associated tests/temporary geometry; preserve the functioning live game, menu, gameplay, other assets, and Git history.
2. Verify the new release exists and contains **two distinct .blend assets** identifiable as the three-lane and one-lane projects. Record exact names, sizes, download URLs, and hashes when feasible.
3. Run proportionate regression/build validation and stop.

**Do not open the .blend files, inspect internal geometry, optimize, export GLBs, integrate maps, generate replacement terrain, or deploy a new map.** Those belong to a separate subsequent implementation task.
