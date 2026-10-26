# Sol’Rahn — founder-supplied Meshy master map files

## Asset intake (not game integration)

Source of truth for upcoming approved 3-lane arena is the founder-supplied Meshy/Blender files, **not** the rejected Goal 012 generated graybox.

Upload the 3-lane `.blend` and `.glb` to the dedicated **GitHub Release** with tag:

`solrahn-three-lane-source-v1`

Release title: `Sol’Rahn Three-Lane Arena — Source Files V1`

Create / upload here:
https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/new

After creating the release, the stable release page is:
https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-source-v1

The release should be published as a **prerelease** to indicate unoptimized, unapproved-for-runtime source files. It is not a game deploy. Include both `.blend` (editable source) and `.glb` (raw Meshy export), preserve original names, and make the release assets available to Codex.

GitHub Release assets are not normal Git repository files: Codex must explicitly retrieve them from the release rather than searching the git tree. GitHub allows up to 2 GiB per individual release asset; do not commit massive files to the branch. If a source file exceeds 2 GiB, report and use an alternative storage workflow.

## Cleanup boundary

The next **cleanup-only** Codex assignment will:
1. Remove **only** the rejected Goal 012 preview/geography implementation and its obsolete generated tests and assets; preserve previous working Crownfall files, accepted game systems and git history.
2. Confirm normal app/build behavior remains intact.
3. Verify the published Release and exact two source asset filenames/sizes; optionally record hashes where feasible.
4. STOP. Do not import, optimize, remesh, or implement these files yet.

The implementation and optimization task for the new map will follow separately, after cleanup/release verification.
