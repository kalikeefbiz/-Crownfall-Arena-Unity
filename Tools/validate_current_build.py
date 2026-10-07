"""Fail-closed checks for the exact Unity Cloud prebuild contract on current main.
Does not claim to execute Unity. It mirrors every serialized/path invariant that our
IPreprocessBuildWithReport validators depend on so Cloud builds are not used to discover
stale repository assumptions.
"""
from pathlib import Path
import json, re, struct

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "Assets"

def require(value, message):
    if not value:
        raise AssertionError(message)

def text(path):
    return (ROOT / path).read_text()

def guid_for(path):
    meta = Path(str(ROOT / path) + ".meta")
    require(meta.is_file(), f"Missing meta: {path}")
    match = re.search(r"^guid: ([a-f0-9]{32})$", meta.read_text(), re.M)
    require(match, f"Missing GUID: {path}")
    return match.group(1)

def referenced_guids(asset_text):
    return re.findall(r"guid: ([a-f0-9]{32})", asset_text)

def png_rgba(path):
    data = (ROOT / path).read_bytes()
    require(data[:8] == b"\x89PNG\r\n\x1a\n", f"Not PNG: {path}")
    require(data[12:16] == b"IHDR", f"Missing IHDR: {path}")
    width, height = struct.unpack(">II", data[16:24])
    color_type = data[25]
    require(width > 0 and height > 0 and color_type in (4, 6), f"PNG has no alpha channel: {path}")

def main():
    manifest = json.loads(text("Packages/manifest.json"))
    require(manifest["dependencies"] == {
        "com.unity.modules.imgui": "1.0.0",
        "com.unity.modules.physics": "1.0.0",
    }, "Unity package manifest drift")
    require(text("ProjectSettings/ProjectVersion.txt").strip() == "m_EditorVersion: 6000.3.10f1",
            "Unity editor version drift")

    build_settings = text("ProjectSettings/EditorBuildSettings.asset")
    require(build_settings.count("enabled: 1") == 1 and "Assets/Scenes/M0.unity" in build_settings,
            "M0 must remain the sole enabled build scene")
    require((ROOT / "Assets/WebGLTemplates/PipelineTest/index.html").is_file(),
            "PipelineTest WebGL template missing")

    scene = text("Assets/Scenes/M0.unity").replace("\r\n", "\n")
    for needle in ("  kitHealth: 950\n", "  targetHealth: 1000\n", "  targetRadius: 0.52\n"):
        require(needle in scene, "M1 fixture serialized values drift")

    attack = text("Assets/Crownfall/Configuration/KitBasicAttack.asset")
    for needle in (
        "  range: 2.6\n", "  coneDegrees: 117\n", "  cooldown: 0.85\n",
        "  comboWindow: 1.25\n", "  - 85\n  - 105\n", "  hitTimes:\n  - 0\n"
    ):
        require(needle in attack, "Kit basic serialized data drift: " + repr(needle))

    tuning = text("Assets/Crownfall/Configuration/M0SummonerTuning.asset")
    require("  moveSpeed: 5.2\n" in tuning, "Kit movement tuning drift")

    # Build the actual GUID map Unity will import.
    guid_to_asset = {}
    for meta in ASSETS.rglob("*.meta"):
        m = re.search(r"^guid: ([a-f0-9]{32})$", meta.read_text(), re.M)
        if not m:
            continue
        target = Path(str(meta)[:-5])
        require(m.group(1) not in guid_to_asset, "Duplicate Unity GUID: " + m.group(1))
        guid_to_asset[m.group(1)] = target.relative_to(ROOT).as_posix()

    locomotion_paths = [
        "Assets/Art/Characters/Kit/Idle/Front/idle.png",
        "Assets/Art/Characters/Kit/Run/000.png",
        "Assets/Art/Characters/Kit/Run/001.png",
        "Assets/Art/Characters/Kit/Run/002.png",
        "Assets/Art/Characters/Kit/Run/003.png",
    ]
    for path in locomotion_paths:
        require((ROOT / path).is_file(), "Missing M0 presentation asset: " + path)
        png_rgba(path)

    basic_front = [f"Assets/Art/Characters/Kit/Basic/Front/{i:03}.png" for i in range(5)]
    for path in basic_front:
        require((ROOT / path).is_file(), "Missing front basic asset: " + path)
        png_rgba(path)

    kit_set = text("Assets/Crownfall/Configuration/KitSpriteSet.asset")
    expected_locomotion_guids = [guid_for(p) for p in locomotion_paths]
    actual_locomotion = referenced_guids(kit_set)
    # Ignore the ScriptableObject script GUID; texture refs follow it.
    actual_locomotion = [g for g in actual_locomotion if g in guid_to_asset]
    for g in expected_locomotion_guids:
        require(g in actual_locomotion, "KitSpriteSet missing expected locomotion GUID: " + g)

    basic_set = text("Assets/Crownfall/Configuration/KitBasicSprites.asset")
    for g in referenced_guids(basic_set):
        if g.startswith("0000000000000000"):
            continue
        # Script GUIDs are valid metas too; every serialized GUID must resolve.
        require(g in guid_to_asset, "KitBasicSprites unresolved GUID: " + g)

    # The legacy/front six-frame sequence must be five front attack frames + front idle.
    frames_block = basic_set.split("  frames:\n", 1)[1].split("  front:\n", 1)[0]
    frame_guids = re.findall(r"guid: ([a-f0-9]{32})", frames_block)
    expected_frames = [guid_for(p) for p in basic_front] + [guid_for(locomotion_paths[0])]
    require(frame_guids == expected_frames, "KitBasicSprites legacy frame sequence drift")

    front_block = basic_set.split("  front:\n", 1)[1].split("  back:\n", 1)[0]
    front_guids = re.findall(r"guid: ([a-f0-9]{32})", front_block)
    require(front_guids == expected_frames, "KitBasicSprites front sequence drift")

    # Mirror the exact path assumptions used by Unity prebuild validators.
    m0_validator = text("Assets/Editor/M0Validation.cs")
    require('"Idle/Front/idle.png"' in m0_validator, "M0 validator still targets old idle path")
    m1_validator = text("Assets/Editor/M1Validation.cs")
    require('"Basic/Front/"' in m1_validator, "M1 validator still targets old basic path")
    require('.Replace("\\r\\n", "\\n")' in m1_validator, "M1 scene validator is not Windows line-ending safe")

    # All explicit AssetDatabase paths in the two asset validators must exist.
    for source_name in ("Assets/Editor/M0Validation.cs", "Assets/Editor/M1Validation.cs"):
        source = text(source_name)
        for path in re.findall(r'AssetDatabase\.LoadAssetAtPath<[^>]+>\("([^"]+)"\)', source):
            require((ROOT / path).exists(), f"{source_name} references missing asset: {path}")

    print("PASS: current Unity Cloud prebuild contract, serialized balance, asset paths, GUIDs, and WebGL template.")

if __name__ == "__main__":
    main()
