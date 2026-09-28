# M0 change report

Baseline: `main` at `da70f7285e9bb6507a2f44e0426328b3ca83c999`.
Editor pin: `6000.3.10f1`. No GitHub push or Unity execution was performed.

## Created files

- `Assets/Art.meta`
- `Assets/Art/Characters.meta`
- `Assets/Art/Characters/Kit.meta`
- `Assets/Art/Characters/Kit/Idle.meta`
- `Assets/Art/Characters/Kit/Idle/Kit_Idle.jpeg`
- `Assets/Art/Characters/Kit/Idle/Kit_Idle.jpeg.meta`
- `Assets/Art/Characters/Kit/Run.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_01.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_01.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_02.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_02.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_03.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_03.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_04.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_04.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_05.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_05.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_06.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_06.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_07.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_07.jpeg.meta`
- `Assets/Art/Characters/Kit/Run/Kit_Run_08.jpeg`
- `Assets/Art/Characters/Kit/Run/Kit_Run_08.jpeg.meta`
- `Assets/Crownfall.meta`
- `Assets/Crownfall/Configuration.meta`
- `Assets/Crownfall/Configuration/KitSpriteSet.asset`
- `Assets/Crownfall/Configuration/KitSpriteSet.asset.meta`
- `Assets/Crownfall/Configuration/M0SummonerTuning.asset`
- `Assets/Crownfall/Configuration/M0SummonerTuning.asset.meta`
- `Assets/Crownfall/Gameplay.meta`
- `Assets/Crownfall/Gameplay/SummonerContracts.cs`
- `Assets/Crownfall/Gameplay/SummonerContracts.cs.meta`
- `Assets/Crownfall/Gameplay/SummonerRoot.cs`
- `Assets/Crownfall/Gameplay/SummonerRoot.cs.meta`
- `Assets/Crownfall/Gameplay/SummonerTuning.cs`
- `Assets/Crownfall/Gameplay/SummonerTuning.cs.meta`
- `Assets/Crownfall/Gameplay/TargetingSession.cs`
- `Assets/Crownfall/Gameplay/TargetingSession.cs.meta`
- `Assets/Crownfall/Input.meta`
- `Assets/Crownfall/Input/PointerSummonerInput.cs`
- `Assets/Crownfall/Input/PointerSummonerInput.cs.meta`
- `Assets/Crownfall/M0.meta`
- `Assets/Crownfall/M0/M0Bootstrap.cs`
- `Assets/Crownfall/M0/M0Bootstrap.cs.meta`
- `Assets/Crownfall/M0/M0Diagnostics.cs`
- `Assets/Crownfall/M0/M0Diagnostics.cs.meta`
- `Assets/Crownfall/Presentation.meta`
- `Assets/Crownfall/Presentation/KitSprite.mat`
- `Assets/Crownfall/Presentation/KitSprite.mat.meta`
- `Assets/Crownfall/Presentation/KitSprite.shader`
- `Assets/Crownfall/Presentation/KitSprite.shader.meta`
- `Assets/Crownfall/Presentation/KitSpritePresentation.cs`
- `Assets/Crownfall/Presentation/KitSpritePresentation.cs.meta`
- `Assets/Crownfall/Presentation/KitSpriteSet.cs`
- `Assets/Crownfall/Presentation/KitSpriteSet.cs.meta`
- `Assets/Crownfall/Presentation/MobaCamera.cs`
- `Assets/Crownfall/Presentation/MobaCamera.cs.meta`
- `Assets/Crownfall/Presentation/PresentationSwitcher.cs`
- `Assets/Crownfall/Presentation/PresentationSwitcher.cs.meta`
- `Assets/Crownfall/Presentation/PrimitivePresentation.cs`
- `Assets/Crownfall/Presentation/PrimitivePresentation.cs.meta`
- `Assets/Crownfall/Presentation/TargetPreview.mat`
- `Assets/Crownfall/Presentation/TargetPreview.mat.meta`
- `Assets/Crownfall/Presentation/TargetingPreview.cs`
- `Assets/Crownfall/Presentation/TargetingPreview.cs.meta`
- `Assets/Crownfall/link.xml`
- `Assets/Crownfall/link.xml.meta`
- `Assets/Editor/M0Validation.cs`
- `Assets/Editor/M0Validation.cs.meta`
- `Assets/Scenes/M0.unity`
- `Assets/Scenes/M0.unity.meta`
- `Docs/KIT_ASSETS.md`
- `Docs/KitSourceManifest.json`
- `Docs/M0_DELIVERY.md`
- `Tools/requirements-static.txt`
- `Tools/validate_m0.py`
- `Docs/M0_CHANGE_REPORT.md` (this report)

## Modified files

- `.github/workflows/unpack-unity.yml`
- `Assets/Editor/PipelineBuild.cs`
- `Assets/WebGLTemplates/PipelineTest/index.html`
- `ProjectSettings/EditorBuildSettings.asset`
- `ProjectSettings/ProjectSettings.asset`
- `README.md`

## Static validation performed

- Parsed all 16 C# source files with the C# grammar; no syntax errors. This does not establish type correctness.
- Parsed serialized Unity YAML and workflow YAML/embedded Python.
- Checked 54 unique asset GUIDs, meta coverage, and scene/config/material/sprite references.
- Independently compared every imported image against its supplied source bytes: 9/9 identical.
- Checked nine distinct SHA-256 hashes, exact attachment order and all eight run references.
- Checked shared pixels-per-unit, pivots, source dimensions, uncompressed import and no NPOT resizing.
- Checked sole M0 build scene, unchanged Unity version and proven package manifest.
- Checked presentation/gameplay dependency guards and absence of platform-specific runtime code.
- Reviewed tap/hold/drag/release/cancel transitions, pointer capture, independent aim and presentation-only swap.
- Passed git diff whitespace checks.
- Exercised ZIP extraction and validation against a clean copy of the baseline; archive entries verified against the local commit.

Editor state-machine behavioral gates were added, but have not run.
Unity compilation, import, shaders, cloud build and every device acceptance item are pending.
See `M0_DELIVERY.md` for the exact cloud/device checklist, `KIT_ASSETS.md` for the image mapping, and the root README for architecture/tuning.
