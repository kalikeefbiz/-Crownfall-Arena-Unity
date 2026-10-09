# Build #17 native environment protection repair

Required source baseline: **0e826e3a706e22103cd9bf22f8ee6e2b5d4517dd**, branch **browser-parity-unity**.

## Established evidence and limits

The supplied Unity 6000.3.10f1 failure is from EnvironmentNativeValidation.AssertProtected(preserved), after Build #15's compilation repair and Build #16's saved-scene initialization succeeded. The old assertion compared whole-directory SHA-256 dictionaries and counts, then emitted only a generic message. It recorded no added/removed/modified path evidence.

**The precise file mutation in Build #17 is not established.** The aggregate error cannot tell whether metadata, scene serialization, project settings, source changes or another filesystem difference caused it. Secondary AssemblyUpdater/Newtonsoft/player-path/post-build messages are not evidence of the primary cause.

Source inspection establishes two concrete weaknesses:
- The protection snapshot preceded saved-scene initialization and synchronous project refresh, but had no intermediate checkpoints or generated-metadata identity policy. Added metadata was indistinguishable from unexpected source additions.
- Environment generation called AssetDatabase.SaveAssets repeatedly. That API saves unrelated dirty assets as well as owned outputs, exposing protected assets to serialization unrelated to environment work. This is a genuine ownership problem, not proof of which file changed in Build #17.

This repair prevents the unnecessary global-save behavior, preserves strict rejection of tracked changes, and records actionable evidence if the underlying native mutation persists. It does not retroactively claim metadata caused Build #17.

The local checkout was stale at 6616bbc and the executor transport disconnected before it could be advanced or run tests. The remote branch and all source reads were verified at the required 0e826e3 baseline. The repair is committed from that exact remote parent through GitHub; validation executes in the existing GitHub Actions preflight, not in a fabricated local/Unity run.

## Surgical implementation

Only Editor validation/setup, preflight tests/workflow and documentation are changed. Gameplay, camera, HUD, characters, collision/topology, placements, terrain, shaders, textures, packages and project settings are unchanged.

The deterministic filesystem policy is extracted into Assets/Editor/CrownfallEnvironment/ProtectedFileSnapshot.cs. The same file is compiled into the license-free preflight; there is no duplicated test implementation or third-party package.

The original protected roots remain. Assets/Crownfall/Combat is additionally covered. Protected roots' own .meta files are now covered too, although the old recursive directory scan omitted them. Docs/CROWNFALL_PROTECTED_SOURCE_PATHS.json records **311 committed protected files, including 172 .meta files**. Tools/validate_protection_manifest.py checks that this coverage matches Git's current tracked paths, preventing silent omission or missing committed inputs.

EnvironmentAssetLab and WildernessBuildPreparation replace global SaveAssets calls with SaveAssetIfDirty restricted to the generated environment directory and the explicitly owned ShippingWilderness library. They do not save the shipping scene. The existing batch-mode Single open before additive lab/composition creation remains intact, as do exception handling and both native failure reports. M15SurfacePreparation.cs is unchanged, preserving Build #15's shadowing repair.

Protection is checked after saved-scene bootstrap, synchronous refresh, texture imports, generated material saves, FBX remap/reimport, lab scene/prefab saves, native lab validation, palette saving, shipping composition saving and native shipping validation. The outer shipping preparation is protected as well as the lab.

## Narrow generated-metadata policy

All existing protected files are immutable across generation, whether committed or already present as untracked outputs. Existing .meta modification or deletion fails. Missing committed inputs fail at baseline capture.

A newly added .meta may be admitted only when ALL conditions hold:
1. Its associated asset or folder existed in the initial protected filesystem snapshot.
2. The metadata did not exist in that snapshot and is not a committed protected path.
3. The associated path is under Assets, not Packages or ProjectSettings.
4. Unity's AssetDatabase supplied a nonempty, 32-hex GUID for that exact associated path before generation.
5. The new file has the Unity version-2 metadata header, exactly one matching GUID, and the correct folder/file marker.
6. The source asset itself and all other protected inputs remain unchanged.

Each admitted addition is reported with its current SHA-256 and reason. It is immediately added to the protected baseline, so later modification/deletion fails even when its GUID remains unchanged.

Unknown GUIDs, mismatched GUIDs, malformed/duplicate metadata, metadata for new source files, unexpected source/directory additions and changes to tracked metadata remain failures. This is not a blanket .meta exclusion or a claim that all Unity metadata changes are harmless. Native import/asset checks still validate the resulting assets.

## Failure diagnostics

Both existing native reports now contain protectedFileChecks:
- Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json
- Docs/CROWNFALL_WILDERNESS_NATIVE_VALIDATION.json

Every reported change includes:
- relativePath
- classification: Added / Removed / Modified
- previousSha256 and currentSha256, where an existing file permits hashing
- protectedRoot
- phase
- reason and allowedGeneratedMetadata

The Unity log receives the same structured records and a count summary. Records are ordered deterministically, rejected changes first, and bounded to **64 per fixed checkpoint**; total/rejected/allowed/omitted counts are preserved. File contents are never logged. The exception includes the first rejected path and its hashes, making the pre-export failure actionable.

Example: a settings change during lab refresh is reported as Modified ProjectSettings/ProjectSettings.asset, protectedRoot ProjectSettings, phase lab synchronous refresh, with the previous/current SHA-256. That remains a failure requiring a targeted correction; it is not ignored because Unity wrote it.

## Automated regression coverage

The operational .github/workflows/validate-crownfall-current.yml is extended, not replaced. Its license-free Editor preflight links the actual native protection code and runs **26 temporary-fixture cases**, including:
- unchanged files;
- gameplay, shipping scene, package and project-setting modification;
- tracked .meta modification/deletion and metadata missing before capture;
- deleted/new protected sources;
- valid registered asset/folder metadata;
- unknown/mismatched GUID, malformed or duplicate-GUID metadata;
- source-plus-metadata additions and incorrect folder markers;
- existing untracked metadata and later mutation/deletion of admitted metadata;
- protected-root metadata;
- unexpected/removed directories;
- deterministic 64-record truncation with 70 rejected changes.

Destructive tests create and clean their own temporary trees; they never mutate real protected assets.

Two compiled Roslyn mutants run through the SAME fixture suite:
- all rejection enforcement disabled;
- all .meta changes bypassed.

The suite must reject both mutants. Existing Roslyn shadowing and Build #16 saved-scene bootstrap negative fixtures remain enforced. Source contracts reject reintroduction of global environment SaveAssets or loss of required phase checkpoints.

The existing workflow still executes production/M1/current-build checks, environment integrity, wilderness composition and nine negative composition fixtures, pure combat and complete 3v3 tests, runtime API type-checking against verified UnityEngine 2021.3.33 references, and git diff --check.

A verified workflow run and its actual logs are required for the final task verdict. No success is inferred solely from source tokens or this document.

## Native uncertainty and next manual build

No exact Unity 6000.3.10f1 Editor was executed in this task. The local executor was inaccessible; GitHub's license-free checks do not establish native Unity import, Editor API compilation, serialization behavior, shader success or device performance.

The exact Build #17 changed file remains unknown unless its native filesystem evidence is supplied or the next manual native preparation emits it. If a tracked file still changes, this guard continues to fail closed and names the path/phase/hashes. Do not broadly exempt that file; investigate its writer and correct only the proven mutation.

After the actual GitHub preflight is green, there are no identified static implementation blockers to a manually chosen Build #18. Native verification remains pending. No Cloud Build, WebGL export, deployment, Pages change, main merge or Cloud Build configuration change is performed by this task.
