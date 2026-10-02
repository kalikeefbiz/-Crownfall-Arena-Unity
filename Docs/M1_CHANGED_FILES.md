# Exact M1 patch files

Baseline: `af88eaed1cb0408873dbe1e692ae6a9254510bef`. No deletions. All pre-existing meta/GUID files preserved.

## Modified (4)

- `Assets/Crownfall/M0/M0Diagnostics.cs`
- `Assets/Crownfall/Presentation/KitSpritePresentation.cs`
- `Assets/Scenes/M0.unity`
- `Tools/validate_m0.py`

## Added (46)

- `Assets/Art/Characters/Kit/Basic.meta`
- `Assets/Art/Characters/Kit/Basic/000.png`
- `Assets/Art/Characters/Kit/Basic/000.png.meta`
- `Assets/Art/Characters/Kit/Basic/001.png`
- `Assets/Art/Characters/Kit/Basic/001.png.meta`
- `Assets/Art/Characters/Kit/Basic/002.png`
- `Assets/Art/Characters/Kit/Basic/002.png.meta`
- `Assets/Art/Characters/Kit/Basic/003.png`
- `Assets/Art/Characters/Kit/Basic/003.png.meta`
- `Assets/Art/Characters/Kit/Basic/004.png`
- `Assets/Art/Characters/Kit/Basic/004.png.meta`
- `Assets/Crownfall/Combat.meta`
- `Assets/Crownfall/Combat/BasicAttackDefinition.cs`
- `Assets/Crownfall/Combat/BasicAttackDefinition.cs.meta`
- `Assets/Crownfall/Combat/BasicAttackExecutor.cs`
- `Assets/Crownfall/Combat/BasicAttackExecutor.cs.meta`
- `Assets/Crownfall/Combat/Combatant.cs`
- `Assets/Crownfall/Combat/Combatant.cs.meta`
- `Assets/Crownfall/Combat/Core.meta`
- `Assets/Crownfall/Combat/Core/AttackTimeline.cs`
- `Assets/Crownfall/Combat/Core/AttackTimeline.cs.meta`
- `Assets/Crownfall/Combat/Core/CombatState.cs`
- `Assets/Crownfall/Combat/Core/CombatState.cs.meta`
- `Assets/Crownfall/Combat/Core/CombatWorld.cs`
- `Assets/Crownfall/Combat/Core/CombatWorld.cs.meta`
- `Assets/Crownfall/Combat/Core/ConeHitQuery.cs`
- `Assets/Crownfall/Combat/Core/ConeHitQuery.cs.meta`
- `Assets/Crownfall/Configuration/KitBasicAttack.asset`
- `Assets/Crownfall/Configuration/KitBasicAttack.asset.meta`
- `Assets/Crownfall/Configuration/KitBasicSprites.asset`
- `Assets/Crownfall/Configuration/KitBasicSprites.asset.meta`
- `Assets/Crownfall/M1.meta`
- `Assets/Crownfall/M1/M1CombatFixture.cs`
- `Assets/Crownfall/M1/M1CombatFixture.cs.meta`
- `Assets/Crownfall/Presentation/BasicSpriteSet.cs`
- `Assets/Crownfall/Presentation/BasicSpriteSet.cs.meta`
- `Assets/Editor/M1CombatTests.cs`
- `Assets/Editor/M1CombatTests.cs.meta`
- `Assets/Editor/M1Validation.cs`
- `Assets/Editor/M1Validation.cs.meta`
- `Docs/KitBasicSourceManifest.json`
- `Docs/M1_CHANGED_FILES.md`
- `Docs/M1_COMBAT_FOUNDATION.md`
- `Tools/requirements-m1-static.txt`
- `Tools/run_m1_tests.py`
- `Tools/validate_m1.py`

The separate new delivery workflow is `.github/workflows/import-unity-m1.yml`; the patch ZIP belongs at repository root. Neither is an extracted project file.
