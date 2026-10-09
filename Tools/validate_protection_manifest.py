"""Verify committed protection coverage; never edit protected assets or rewrite the manifest."""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "Docs/CROWNFALL_PROTECTED_SOURCE_PATHS.json"
ROOTS = ["Assets/Scenes", "Assets/Crownfall/Match", "Assets/Crownfall/Presentation",
         "Assets/Crownfall/Gameplay", "Assets/Crownfall/Combat", "Assets/Art/Characters",
         "Assets/Art/Production", "Packages", "ProjectSettings"]

def main():
    value = json.loads(MANIFEST.read_text())
    assert value["schemaVersion"] == 1 and value["roots"] == ROOTS, "Protected roots/schema were weakened"
    paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", "HEAD"], cwd=ROOT, text=True).splitlines()
    protected = sorted(p for p in paths if any(p.startswith(r + "/") or p == r + ".meta" for r in ROOTS))
    assert value["committedPaths"] == protected, "Protection manifest drift; explicitly review/update committed protected paths"
    assert all((ROOT / p).is_file() for p in protected), "Committed protected file missing"
    assert "Assets/Scenes/CrownfallMatch.unity" in protected
    assert "ProjectSettings/ProjectSettings.asset" in protected
    print(f"PASS: {len(protected)} committed protected paths, including {sum(p.endswith('.meta') for p in protected)} metadata files and protected-root metadata")
if __name__ == "__main__":
    main()
