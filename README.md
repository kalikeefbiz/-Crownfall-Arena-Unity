# Crownfall Arena — complete Unity 3v3 match

Open **Assets/Scenes/CrownfallMatch.unity** in Unity **6000.3.10f1** and press Play. This is the only enabled shipping scene. The existing project uses the built-in render pipeline, true X/Z gameplay, native CharacterControllers and an orthographic MOBA camera.

Menu → Kit/Set/Riven selection → countdown → human Blue Summoner plus five bots → Crownfall match → victory/defeat/draw → results → replay or menu.

Move with WASD/arrows or the left touch pad. Aim independently with the right touch pad or right mouse. Space is basic, Q/E are skills, R ultimate, and F Riven stance/Kit's earned Expellant Blast. Aim an ability by holding/dragging; release commits and dragging beyond the cancellation radius cancels. Kit/Set basics repeat while held; Riven basics commit on release and preserve the confirmed direction for the cadence-driven second blade. Escape/Pause opens pause and the control-layout editor.

The 68×64 arena includes the Crownfall Lane, Wilderness islands, six minor camp sites and Major Damage. Territory, retained CP, tickets, personal final respawns, protection, camps, buffs and one-time 70% Surges run under one fixed-step local authority. Canals never attack or grant rewards. The HUD includes a minimap, timer, score, team life states, health, ultimate meter, cooldowns, stance and buffs.

Current Unity combat/economy/roster/Surge decisions take precedence over V21 tuning. See [migration map](Docs/BROWSER_PARITY_MIGRATION_MAP.md) for explicit choices and [validation report](Docs/COMPLETE_MATCH_VALIDATION.md) for executed checks and runtime limits.

Kit uses the unchanged supplied idle/run and front/back/side basic artwork. Set/Riven authored image bytes and Kit ability artwork are absent from this checkout and all its archives; distinct temporary native visuals and geometric effects keep their complete kits playable. No production PNGs are altered.

Validation:

```sh
python3 -m pip install -r Tools/requirements-m1-static.txt
python3 Tools/validate_current_build.py
python3 Tools/validate_m0.py
python3 Tools/validate_m1.py
# .NET 8 SDK (or CROWNFALL_DOTNET=/path/to/dotnet):
python3 Tools/run_complete_match_tests.py
# Actual UnityEngine reference assemblies; type-check only, no engine execution:
CROWNFALL_UNITY_REFERENCE_DIR=/path/to/Unity/Managed python3 Tools/compile_match_runtime.py
```

The Unity prebuild hook also runs the complete-match assertions. `Crownfall/Validate Complete Match` runs them locally in the Editor. M0 and PipelineTest scenes remain available as historical regression fixtures, outside the shipping scene list. No Cloud Build or deployment is required by these scripts.
