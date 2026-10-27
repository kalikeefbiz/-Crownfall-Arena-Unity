# Goal 013 — durable Git LFS recovery

The four prepared Blender/GLB binaries are now stored remotely in GitHub LFS on **`assets/solrahn-goal-013`**. They are retrievable independently of the temporary Codex workspace. Earlier release-upload failure reports remain historical records; this recovery supersedes the stranded-binary status for these four files.

Repository: `kalikeefbiz/-Crownfall-Arena-Unity`.

Source branch/commit: `playcanvas-port` / `8b3ab267b2c2a5bffe6653e2a1879dd45ca5b35a`.

Asset pointer commit: `07311feacfd96dd9d5de01bf3c6c596bfa063f90`.

Total LFS payload: **103,428,271 bytes**. Ordinary Git stores only 131–133-byte LFS pointers for these binaries. `.gitattributes` tracks the four exact paths, including the two smaller collision files. No binary was committed as an ordinary Git blob.

All paths below are relative to `PlayCanvas/assets/solrahn-three-lane/`:

| File                                              |      Bytes | SHA-256                                                            |
| ------------------------------------------------- | ---------: | ------------------------------------------------------------------ |
| `working/solrahn-three-lane-optimized.blend`      | 53,714,858 | `933d32e010c7e1c6ad1b8e21b06ecc6090ce33b9f9c630fb47db345e78656307` |
| `working/solrahn-lane-collision-candidates.blend` |    299,761 | `a3101eee867eb29c8058b823b0103efcb5871062261f0b9ea979edee8db8f827` |
| `runtime/solrahn-three-lane-visual.glb`           | 48,825,928 | `7faa8ecdc8e5b3f078d7ea0de09507a3572dccb2a63ac5eea30660e640a66a9d` |
| `runtime/solrahn-lane-collision-candidates.glb`   |    587,724 | `7046fbef7d83b48ce561c834e07f7c811f073f323358f1b0a7fb16efc75cba85` |

Git LFS 3.6.1 was already installed. The authenticated LFS batch API accepted all four upload requests, and the actual push uploaded all four objects without quota/authentication errors. The account billing usage API returned **HTTP 403 Resource not accessible by integration**, so exact remaining billing quota could not be read. No paid plan, bucket, token or other infrastructure was created.

Remote verification used a newly empty, separate LFS cache, fetched all four objects from `origin`, ran `git lfs fsck --objects`, and independently checked every downloaded file's complete size and SHA-256 against the original preparation manifest. All checks passed. This verifies remote object retrieval, not just committed pointer files. The structured verification receipt is [lfs-recovery.json](../manifests/lfs-recovery.json).

To retrieve on the next implementation machine with Git LFS installed:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --branch assets/solrahn-goal-013 --single-branch   https://github.com/kalikeefbiz/-Crownfall-Arena-Unity.git crownfall-solrahn-assets
cd crownfall-solrahn-assets
git lfs pull --include='PlayCanvas/assets/solrahn-three-lane/working/*.blend,PlayCanvas/assets/solrahn-three-lane/runtime/*.glb'
git lfs fsck --objects
```

No asset regeneration or optimization occurred. No Release upload endpoint was retried. Cloudflare R2 was not needed. No merge, PR, deployment, gameplay edit or original Meshy Release change occurred. Both `playcanvas-port` and the published `gh-pages` ref remain unchanged. Local source, intermediate files, evidence ZIP and SHA256SUMS are preserved; this recovery branch adds only the four explicitly requested native/runtime binaries to LFS. The comparison images and optimization scripts were already in Git.
