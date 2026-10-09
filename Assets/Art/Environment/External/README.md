# Prepared Crownfall environment input library

Exactly 25 approved original FBX files, 25 unique shared textures, four original CC0 license files and four source provenance records. These files are prepared for native import; Unity 6000.3.10f1 was unavailable during preparation.

Models live under `Quaternius/Nature/Models`, `Quaternius/Medieval/Models`, `Kenney/Nature/Models` and `Kenney/Castle/Models`. Texture payloads live only in `SharedTextures/`. Production copies match the preserved staged originals byte-for-byte.

Use the Editor menu **Crownfall → Environment Lab → Generate and validate (full textures)** with Unity 6000.3.10f1. The path-scoped postprocessor configures these inputs. The generator creates deliberate shared materials and sanitized presentation prefabs, then saves an additive inspection scene under `Assets/Editor/CrownfallEnvironment/Generated/EnvironmentAssetLab.unity`. It never adds that scene to build settings.

Catalog: `Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json`.
Integration report: `Docs/ENVIRONMENT_ASSET_UNITY_INTEGRATION.md`.

No native `.meta`, GUID, scene, material or prefab data was hand-authored to imitate a completed Unity import. Native import, shader compilation and visual approval remain pending. The shipping arena does not reference this library.
