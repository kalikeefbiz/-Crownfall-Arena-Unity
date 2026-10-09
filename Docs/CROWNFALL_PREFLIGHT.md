# Crownfall license-free GitHub preflight

Runs automatically on pushes to `browser-parity-unity` through `.github/workflows/validate-crownfall-current.yml` (and can be dispatched manually).

- Existing production, M1 and current-build checks.
- Roslyn C# 9 parser plus compiler diagnostics that do not need Unity reference assemblies (notably CS0136 shadowing from Build #15); includes a negative-fixture self-test.
- Regression check for the saved-scene bootstrap before additive scene generation (Build #16), with a negative-fixture self-test.
- Environment asset integrity, wilderness placement/clearance and negative layout fixtures.
- Existing .NET complete-match gameplay suite and Unity runtime reference compilation.

No Unity Editor is launched and no Cloud Build minutes or Unity activation secrets are used. This gate does **not** prove that Unity 6000.3.10f1 imports FBXs, compiles UnityEditor APIs, generates shaders/prefabs, or exports WebGL.

A fully native Unity 6000.3.10f1 preflight is still a separate setup: it requires a licensed/activated Unity Editor runner and execution of `Crownfall.EnvironmentLab.Editor.WildernessBuildPreparation.PrepareAndValidate`, without building the WebGL player. Do not interpret a green license-free workflow as final Build #17 acceptance.
