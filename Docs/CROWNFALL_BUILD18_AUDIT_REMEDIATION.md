# Build #18 Astra audit remediation

Starting commit: `7b6b3d74c471b6f977860a8def4aae1ad4d3bf60`, branch `browser-parity-unity`.

This is a protection, Editor persistence and diagnostic repair. Gameplay, collision, topology, camera, character/UI appearance, wilderness placements, terrain, shaders, textures, packages and the Unity version are unchanged. The exact historical Build #17 mutation remains unknown; this work does not invent that evidence.

## A — Conservative structural metadata admission

The old header/GUID regex admitted malformed YAML, whitespace-varied duplicate GUIDs and unrelated importer settings. Admission now parses a deliberately restricted YAML block-mapping grammar, normalizes keys and rejects duplicates before applying an explicit schema.

Only newly created **DefaultImporter metadata for a pre-existing scene (`.unity`) or folder** is supported. The path must have existed at the initial snapshot; its metadata must have been absent and uncommitted; its GUID must equal the exact registered pre-generation GUID. The only accepted mapping is:

```yaml
fileFormatVersion: 2
guid: <the exact pre-established lowercase GUID>
# folderAsset: yes is required for folders and forbidden for scenes
DefaultImporter:
  externalObjects: {}
  # Only these optional empty scalar fields are accepted:
  userData:
  assetBundleName:
  assetBundleVariant:
```

The comments above explain the schema; comments are deliberately unsupported in admitted files. Unknown types/keys, nonempty user/bundle data, tabs, anchors, aliases, tags, sequences, multiline scalars, malformed/extra flow data and duplicate normalized keys are rejected. NativeFormatImporter, MonoImporter, TextureImporter, ModelImporter and other schemas are **not** admitted. Their missing metadata requires native verification and a separately justified policy, not guessed default settings.

Existing metadata remains byte-protected regardless of its importer type or tracked/untracked status. Admitted metadata is immediately protected against later modification/deletion. New sources and source modifications/deletions still fail closed. All three Astra bypasses have dedicated fixtures against the actual production guard.

## B — Early protection and UI persistence ownership

`PipelineBuild.OnPreprocessBuild` enters `EnvironmentNativeValidation.RunProtected` **before Configure or UI preparation**. Configuration, UI generation, gameplay validation, wilderness preparation and production art validation are named steps inside that original scope. Nested UI/lab/wilderness scopes retain the outer evidence; they do not clear it or authorize a fresh outer baseline.

The original PlayerSettings/build-scene configuration is preserved and remains protected. No exception authorizes its serialized changes. If Unity persists an unexpected configuration mutation, it now fails with path/phase/hash evidence rather than being silently accepted before wilderness capture.

Production UI still imports the default theme, creates/binds the same Resources PanelSettings, assigns the same seven shader dependencies and retains them in Always Included. Its global `AssetDatabase.SaveAssets()` is removed. It saves only its owned panel with `SaveAssetIfDirty(panel)` and the graphics-settings object through an explicit validated operation. Theme source/import behavior is unchanged.

The only settings exception is **existing `ProjectSettings/GraphicsSettings.asset`**, during the UI-owned targeted save:

1. Every active protection baseline is checked before saving.
2. Exact before/after file bytes are retained. Capture precedes both ApplyModifiedProperties and SaveAssetIfDirty, so settings that serialize immediately on Apply are covered by the same validated operation. The previous SHA must match each original snapshot; late recapture cannot conceal an earlier mutation.
3. The seven shader identities come from the native `Shader.Find` bindings and `TryGetGUIDAndLocalFileIdentifier`; they must be distinct nonzero references. GUID/file ID are checked against each saved native PanelSettings shader field; the reference type comes from that native serialization, with no guessed built-in GUID/type literal.
4. The existing Always Included sequence is preserved in order. Only missing required shader references may be appended, in specification order.
5. All bytes outside that single shader-list section must remain identical. Other fields, arbitrary shader additions, removals, reorderings, duplicate sections and unsupported serialization fail.
6. The operation compares all other protected files before adopting the one authorized change. It cannot adopt unrelated dirty source/settings changes.

The authorized change appears in the same path/hash/phase report with `allowedOwnedSettings` and a specific reason. Subsequent unauthorized changes remain protected. Missing initial graphics settings or unsupported native shader reference serialization fail with a native-verification instruction. ProjectSettings is never broadly excluded.

## C — Exceptional exits and scene cleanup

The production `PreparationSafety` helper retains the comparison callback and last operation phase. It records the original failure first, rescans on an exceptional exit before cleanup, then compares again after cleanup/restoration. A normal cleanup mutation becomes a failure; when another exception already exists, its identity and stack are preserved and the changed-file evidence is still recorded.

Lab and wilderness preparation use this helper through `RunProtected`. Temporary prefab creation, composition-scene cleanup and validation-scene restoration also use it, so cleanup exceptions do not replace operation failures. Cleanup retains the existing scene semantics and does not restore protected source bytes or erase evidence. The Build #16 saved-scene Single open still precedes additive scene generation.

Protection reports retain deterministic ordering, exact paths/classifications/roots/phases/SHA-256 values, the 64-record limit and full omitted counts. Reports are enriched after cleanup; successful wilderness reporting occurs after the final comparison.

## D — Best-effort diagnostics preserve the primary failure

The original exception is recorded before report enrichment. `DiagnosticSafety.Attempt` bounds secondary failure handling and prevents recursion, including a failing log sink. Header enrichment, composition hashing, partially generated prefab inspection, serialization and file output are independent best-effort operations.

Secondary errors are retained in `secondaryReportingFailures` and Unity logs. A report-write error never replaces the original exception. The lifecycle rethrows the original object through ExceptionDispatchInfo; no generic wilderness wrapper discards its type/stack. Secondary diagnostic storage is bounded to 64 entries of up to 4096 characters. File-change evidence remains separately bounded to 64 records per comparison.

## Automated coverage and execution

The existing `.github/workflows/validate-crownfall-current.yml` remains the only workflow. Its existing Roslyn preflight links the real protection, lifecycle and settings-policy sources; no Unity license, parser dependency or rendering package is added.

- 34 protected-file fixtures retain the existing tracked/source/deletion/metadata coverage and add Astra's three bypasses, unsupported importer data, aliases and duplicate importer keys.
- Five compiled protection/admission mutants cover disabled enforcement, ignoring tracked metadata, ignoring duplicate keys, admitting malformed data and bypassing the importer schema.
- Eight lifecycle fixtures cover successful preparation, early mutation before UI, mutation followed by an import exception, restoration mutation, cleanup failure, report-write failure, broken primary recording and cleanup mutation plus failure.
- Thirteen settings fixtures cover exact/idempotent shader retention, unrelated fields, unauthorized/reordered shaders, unsupported identities, duplicate sections, actual snapshot adoption, unrelated dirty source rejection, late-baseline rejection, native panel-derived reference types, mismatched identities and duplicate panel shader fields.
- Four compiled audit mutants remove final comparison, replace the primary exception, remove exceptional comparison and ignore unrelated graphics fields.
- Native caller contracts have seven negative source mutations proving the actual Editor callers bind the tested helpers. The existing UI source gate replaces the obsolete global-save requirement with stronger targeted-save/protection requirements and retains shader/theme behavior checks.

The existing manifest validation, M1/current-build/production checks, environment source integrity, composition and nine negative fixtures, complete 3v3 matches, runtime UnityEngine reference compilation and diff checks remain required. The final delivery reports the actual GitHub run URL/result after execution; counts here describe the implemented suite, not a fabricated local PASS.

The first GitHub execution exposed an obsolete wilderness source contract requiring a direct statement and generic BuildFailedException wrapper. That gate now requires the protected shipping call, wilderness lifecycle, failure report and original-exception rethrow; a shipping-call negative caller fixture removes the shipping preparation call. Composition/clearance assertions remain unchanged.

## Verified execution results

The implementation commit `9cb4ecbb4a9f9a492d6add4b55d363306b487c32` passed the existing GitHub Actions preflight: [run 37970173998](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/37970173998). Its actual job logs were retrieved and inspected.

| Gate | Verified result |
| --- | --- |
| Production protection fixtures | 34 PASS, including all three Astra bypasses and malformed YAML delimiter |
| Protection/admission compiled mutants | 5 detected |
| Exceptional lifecycle fixtures | 8 PASS |
| Native shader-reference / owned-settings fixtures | 13 PASS |
| Lifecycle/settings compiled mutants | 4 detected |
| Editor caller source contracts | 7 negative mutations detected |
| Build #16 saved-scene contract | PASS, both negative fixtures retained |
| Protected-source manifest | 311 paths, including 172 metadata files, PASS |
| M1/current-build/production + environment integrity | PASS |
| Wilderness composition | PASS, all 9 negative fixtures rejected |
| Complete 3v3 matches | PASS; 127,037 complete-match, 86,645 presentation and 2,152 camera/terrain assertions |
| Runtime API type-check | 51 files, 0 warnings / 0 errors; verified UnityEngine 2021.3.33 references |
| Source integrity / diff | Protected/art/staging Git blobs unchanged; original Build #15 repair unchanged; diff checks PASS |

The sparse working tree and remote branch were verified at the implementation commit with no outstanding changes. The final caller-boundary check wraps graphics ApplyModifiedProperties inside the captured owned-save operation; its seventh negative contract removes that callback and passed in this run. This documentation update records the inspected results and receives the same preflight trigger; its final run is verified separately in the delivery. Native Unity execution remains PENDING.

## Native-only uncertainties and Build #18 risks

Unity 6000.3.10f1 was not found in the available executor. Native import, exact UnityEditor API compilation, GraphicsSettings targeted persistence/serialized reference shape, scene restoration and pre-export execution are **PENDING**. Runtime reference compilation uses the existing verified UnityEngine 2021.3.33 assemblies and does not prove Unity 6000 Editor compatibility.

The workspace proxy prevented normal Git clone. A genuine sparse source working tree was reconstructed from GitHub data, verifying the original commit, every tree object and selected source blob SHA identities. Full asset/gameplay tests execute in the existing GitHub Actions checkout. The workflow also caught a graphics GUID literal error; reference identities/types are now obtained from the actual saved native panel and verified against Shader.Find, rather than hard-coded. Source/art preservation is independently checked against the full remote Git tree.

Unsupported metadata/settings serialization intentionally fails closed. If the manual native run identifies one, inspect its exact evidence and establish a narrow schema; do not permit all importer metadata or all settings writes. The historical Build #17 mutation cannot be declared solved without native evidence.

No Cloud Build, Build #18, player export, deployment, main modification or Cloud Build setting change is performed by this task. A READY verdict requires all audit fixtures and the actual existing GitHub preflight to pass. Native uncertainty is disclosed separately from known implementation blockers.
