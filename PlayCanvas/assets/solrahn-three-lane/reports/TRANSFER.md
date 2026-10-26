# Binary transfer status

The visual preparation and checks are complete. **Binary upload failed**: `gh release upload` received HTTP 401 Bad credentials from `uploads.github.com`. API calls to create/read the draft worked; the upload host rejected authentication. No available connected tool exposes release-asset uploads. No login or credential replacement was attempted. The empty task-created draft (ID 424673459) was removed; no preparation release is published. The founder’s original release is unchanged.

All binaries remain under `/workspace/crownfall/PlayCanvas/assets/solrahn-three-lane/`. Exact paths, bytes and hashes are in [artifacts.json](../manifests/artifacts.json). The evidence archive, its exact size and SHA-256 are in [transfer-package.json](../manifests/transfer-package.json). **Copy these files out of this workspace before it is discarded.**

Transfer the following files together to a machine whose GitHub authentication supports repository contents writes on **both `api.github.com` and `uploads.github.com`**:

- `working/solrahn-three-lane-optimized.blend`
- `working/solrahn-lane-collision-candidates.blend`
- `runtime/solrahn-three-lane-visual.glb`
- `runtime/solrahn-lane-collision-candidates.glb`
- `packages/solrahn-goal-013-evidence.zip`
- `packages/SHA256SUMS.txt`

The four runtime/native binaries total **103,428,271 bytes**. Allow additional room for the evidence ZIP; no Git LFS or ordinary Git binary commit is necessary. The read-only original source and full-texture intermediate remain local too; the original can also be recovered from the founder’s unchanged source release.

After transferring, place the six files together and run `sha256sum --check SHA256SUMS.txt`. From a clone of this repository containing the lightweight Goal 013 commit, use the following separate asset-release workflow. This publishes assets only, not the game. Verify the target branch/commit before running; do not dispatch deployment workflows or edit the source release.

```bash
delivery_commit=$(git rev-parse HEAD)
gh release create solrahn-three-lane-prepared-goal-013-v1 \
  --repo kalikeefbiz/-Crownfall-Arena-Unity \
  --draft --target "$delivery_commit" \
  --title 'Sol’Rahn three-lane — Goal 013 prepared asset candidate' \
  --notes-file PlayCanvas/assets/solrahn-three-lane/reports/RELEASE_NOTES.md
gh release upload solrahn-three-lane-prepared-goal-013-v1 \
  --repo kalikeefbiz/-Crownfall-Arena-Unity \
  /path/to/transferred/solrahn-three-lane-optimized.blend \
  /path/to/transferred/solrahn-lane-collision-candidates.blend \
  /path/to/transferred/solrahn-three-lane-visual.glb \
  /path/to/transferred/solrahn-lane-collision-candidates.glb \
  /path/to/transferred/solrahn-goal-013-evidence.zip \
  /path/to/transferred/SHA256SUMS.txt
gh release view solrahn-three-lane-prepared-goal-013-v1 \
  --repo kalikeefbiz/-Crownfall-Arena-Unity --json assets,isDraft,url
# Only after all six assets are present and verified:
gh release edit solrahn-three-lane-prepared-goal-013-v1 \
  --repo kalikeefbiz/-Crownfall-Arena-Unity \
  --draft=false --prerelease --latest=false
```

Intended download URLs are recorded for a future successful transfer; they are not active uploads from this session. Do not interpret the release-notes template as proof that upload succeeded.
