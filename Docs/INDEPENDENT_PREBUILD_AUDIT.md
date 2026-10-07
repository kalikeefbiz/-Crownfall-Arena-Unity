# Independent pre-build audit — 2026-10-07

Audited current `main` at `d175f693e695276ab37654b98c7d88f968599452` in a fresh
Linux checkout. The remote main reference matched this SHA when checked. No Unity
Editor, Unity Cloud build, workflow dispatch, deployment, or credentialed Cloudflare
API call was started. Changes described below are local workspace changes.

## Recommendation

Another Default WebGL build is justified after these changes reach the commit
selected by Build Automation. The independent audit found no remaining
repository-detectable blocker in the active build path. This is a static and pure
C# test conclusion, not a claim that Unity compilation/import or IL2CPP has run.

## Issues found and fixed

1. Four populated directional art folders lacked committed folder metas:
   `Idle/Front`, `Basic/Front`, `Basic/Back`, `Basic/Side`. Added stable, unique folder
   GUIDs. Existing texture GUIDs, source bytes, pivots and sprite sequences are
   unchanged. Missing folder metas normally generate during import rather than
   stopping a build; they were an import reproducibility defect.
2. The validation workflow excluded `Assets/Art`, `Assets/Scripts`, shaders,
   materials, the WebGL template, other scenes and source manifests from its push
   filters. A green run could therefore predate an unvalidated asset change. It now
   triggers for all `Assets/**` and `Docs/Kit*Manifest.json` changes.
3. `Tools/validate_m1.py` failed on current main because it still required the
   M0.1 baseline's old idle path and byte-identical files. Further unreachable
   checks assumed only ten textures, a single sprite sequence and the old
   nondirectional presentation call. Replaced those milestone assumptions with
   current scene/configuration/sequence checks; retained original source SHA-256,
   RGBA, alpha, GUID, pivot, importer and combat separation checks. CI now executes
   this repaired validator. Historical ZIP import workflows retain their original
   import contracts and are not part of the default build chain.
4. The current static mirror did not validate directional back/side PNG decoding
   and importer settings, sprite cadence, typed script/configuration/material
   bindings, scene activation, the build scene's GUID, case collisions or actual
   PlayerSettings. Some importer checks only searched for matching text anywhere.
   Added parsed-field checks and full image decoding. These were coverage gaps;
   the existing production assets passed the stronger checks.
5. M1's scene text read assumed the process working directory was the project
   root. It now resolves `Scenes/M0.unity` from `Application.dataPath` using
   `Path.Combine`, retaining CRLF normalization and the same health/radius gates.

No gameplay, balance, art bytes, package dependencies or WebGL player settings
were changed.

## Complete project prebuild chain

No assembly definitions, additional project preprocessors or repository-defined
Cloud prebuild shell script were found. Editor-folder sources compile into the
Editor assembly; pure test classes are not player scripts.

| Order | Callback | Calls and checks |
| --- | --- | --- |
| 0 | `PipelineBuild.OnPreprocessBuild` | `Configure(report.summary.platform)`, then `M0Validation.Validate`: configuration and M0 scene loads, idle/four-run ordering, Sprite import settings and alpha, tuning, then `ValidateTargeting` against the actual TargetingSession. |
| 5 | `FrameworkValidation.OnPreprocessBuild` | `Validate` → `TerritorySurgeTests.Run`. |
| 6 | `CombatEconomyValidation.OnPreprocessBuild` | `Validate` → `CombatEconomyTests.Run`. |
| 7 | `FirstRosterBalanceValidation.OnPreprocessBuild` | `Validate` → `FirstRosterBalanceTests.Run`. |
| 10 | `M1Validation.OnPreprocessBuild` | `Validate`: attack Snapshot, scene fixture values, movement, sprite configuration and reused idle, import/alpha/order, AtTime cadence/final frame, then `M1CombatTests.Run`. |

`PipelineBuild.BuildWeb` is an optional explicit batch entry point, not another
automatic callback. It configures WebGL and calls BuildPlayer; normal callbacks
then run. It was inspected but not invoked.

## Verified repository state

- Unity pin: `6000.3.10f1`. Manifest contains only built-in IMGUI and Physics modules,
  both `1.0.0`; no stale `inputlegacy` or `textrendering` package dependency or
  package lock remains. Runtime code uses built-in rendering, IMGUI, physics and
  legacy input APIs, with no external package dependency.
- Sole enabled build scene: `Assets/Scenes/M0.unity`; its GUID matches the scene
  meta. Scene root/component local bindings, enabled state, MonoScript GUIDs,
  configuration and material references match the actual composition code.
- Serialized Kit HP `950`, target HP `1000`, target radius `0.52`, movement `5.2`,
  Solar Whip range `2.6`, cooldown `0.85`, damage `85/105`, cone `117`, combo window
  `1.25`, immediate hit at `0`; target position also matches code's default.
- Every explicit AssetDatabase load in the project validators resolves with exact
  filename case; configuration MonoScripts match their expected types. Every
  serialized external GUID in scenes, assets, materials and project settings
  resolves, apart from Unity's built-in zero-prefixed references. Material shader
  GUIDs resolve to the checked-in custom shaders.
- 92 unique committed metas after the four additions, with no orphan metas or
  missing imported-file metas. Empty `.gitkeep` staging folders remain allowed.
- All 17 Kit textures decode as 1254×1254 RGBA PNGs with alpha extrema 0/255.
  Uppercase Back/Side `.PNG` names are consistent with their metas and GUIDs;
  no case collisions or Apple metadata exist. Front and legacy sequences contain
  five attack frames plus reused idle; Back has four frames, Side three.
- WebGL uses `PROJECT:PipelineTest`, an existing template with all four loader/data/
  framework/code tokens; IL2CPP, gzip with decompression fallback, disabled data
  caching and threads, valid memory limits, landscape configuration and legacy
  input. PipelineBuild sets 960×540 and High managed stripping; checked-in link.xml
  preserves runtime-created primitive renderer/collider components.
- Historical milestone documentation/ZIP import contracts contain older paths and
  balance values. BasicAttackDefinition also retains old new-asset initializer
  values and KitSpriteSet a legacy eight-frame initializer/tooltip. The active
  scene supplies the current serialized assets (including the four-frame run
  array), so those are not active build/prebuild defects and were not rebalanced.

## Checks executed

- Reproduced original main: `validate_m0.py` and `validate_current_build.py` passed;
  `validate_m1.py` failed at the obsolete baseline idle path.
- After fixes: `validate_m1.py` passed, including M0 and current-build validation;
  `validate_current_build.py` also passed independently. All 36 C# source files
  parsed with tree-sitter without syntax errors. This is not Unity API type checking.
- Compiled the seven actual pure core C# files and four existing test classes using
  .NET SDK 8.0.425, Release configuration and warnings as errors. All 122 assertions
  passed: M1 75, economy 13, roster 16, Surge 18. The workflow's test body was
  reproduced; the Mono-only wrapper was not used.
- In an isolated copy, validation rejected 13 injected regressions: old HP,
  disabled scene component, wrong existing script GUID, wrong existing build-scene
  GUID, invalid cadence, corrupted directional PNG, wrong wrap field with matching
  comment text, path-case typo, obsolete package, wrong template, missing loader
  token, missing populated-folder meta and case-colliding PNG. Full CRLF conversion
  of validation inputs passed. Production files were not mutated for these checks.
- Parsed workflow YAML and executed its exact inline combat-configuration check.
  Inspected the five latest GitHub validation runs, all green; their limited static/
  pure-test coverage was verified from the workflow instead of treating green as
  Unity acceptance.
- `git diff --check` and `bash -n ci/deploy-webgl-cloudflare.sh` passed.
- Post-build deployment preparation passed a Linux dry run with a player directory
  containing spaces, Node 24.19.0 and Wrangler 4.148.0. Checked generated gzip/Brotli
  MIME headers. Verified current Wrangler supports `pages project list --json`.
  Dry run calls Wrangler version only; no Pages API operation or upload occurred.

## Previous failure pattern and remaining risk

Inspected commit diffs for the Unity 6 package removal, fixture serialization
updates, CRLF fix and directional path repairs. The user-described failures were
caused by assumptions becoming stale while gameplay/data changed; no instance of
those known blockers remains in the active callback chain. The repaired CI now
covers the current asset changes and preserves the M1 integrity protections.
Post-build script comments document earlier Build #7 missing-NVM and Build #8
Windows Node path failures; the script includes the corresponding portable Node
and cygpath corrections.

Actual historical Unity Cloud logs and the hosted Default WebGL target's current
settings/secrets were not available in this workspace. Failure history conclusions
therefore use repository diffs, script evidence and supplied context, not a claim
to have retrieved Cloud logs.

Still requires Unity: exact Editor API compilation and importer interpretation,
M0 targeting behavioral gate and M1 Sprite identity/cadence gate with real Unity
objects, shader compilation, managed stripping/IL2CPP/WebGL linking, scene lifecycle
and browser rendering/input. Cloud target overrides, build image/editor availability,
Windows-specific post-build execution and actual Cloudflare authorization/deployment
also require their respective environments. The minimal serialized project settings
will be interpreted/defaulted by Unity itself.

## Files changed

- `Assets/Editor/M1Validation.cs`
- `Assets/Art/Characters/Kit/Idle/Front.meta` (new)
- `Assets/Art/Characters/Kit/Basic/Front.meta` (new)
- `Assets/Art/Characters/Kit/Basic/Back.meta` (new)
- `Assets/Art/Characters/Kit/Basic/Side.meta` (new)
- `.github/workflows/validate-crownfall-current.yml`
- `Tools/validate_current_build.py`
- `Tools/validate_m0.py`
- `Tools/validate_m1.py`
- `Tools/requirements-m1-static.txt`
- `Docs/INDEPENDENT_PREBUILD_AUDIT.md` (this report)
