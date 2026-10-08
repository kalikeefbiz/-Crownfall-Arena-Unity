"""Fail-closed checks for the exact Unity Cloud prebuild contract on current main.
Does not claim to execute Unity. It mirrors every serialized/path invariant that our
IPreprocessBuildWithReport validators depend on so Cloud builds are not used to discover
stale repository assumptions.
"""
from pathlib import Path
import json, re, struct
from PIL import Image
import yaml

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

def documents(path):
    # Unity document tags encode class IDs; remove only those tags for SafeLoader.
    source = re.sub(r"^%.*\n", "", text(path), flags=re.M)
    source = re.sub(r"^--- !u!\d+ &-?\d+.*$", "---", source, flags=re.M)
    return list(yaml.safe_load_all(source))

def integration_checks(guid_to_asset):
    """Check actual fields and reference types, not unrelated matching substrings."""
    folded = {}
    for path in ASSETS.rglob("*"):
        name = path.relative_to(ROOT).as_posix()
        require(name.casefold() not in folded, "Case-insensitive path collision: " + name)
        folded[name.casefold()] = name

    def reference(value, expected_path, file_id):
        require(value == {"fileID": file_id, "guid": guid_for(expected_path),
                          "type": 3 if file_id in (11500000, 21300000) else 2},
                "Wrong serialized reference to " + expected_path)

    config_paths = {
        "KitSpriteSet": "Presentation/KitSpriteSet.cs",
        "KitBasicSprites": "Presentation/BasicSpriteSet.cs",
        "KitBasicAttack": "Combat/BasicAttackDefinition.cs",
        "M0SummonerTuning": "Gameplay/SummonerTuning.cs",
    }
    configs = {}
    for name, script in config_paths.items():
        value = documents(f"Assets/Crownfall/Configuration/{name}.asset")[0]["MonoBehaviour"]
        reference(value["m_Script"], "Assets/Crownfall/" + script, 11500000)
        configs[name] = value

    kit = configs["KitSpriteSet"]
    require(kit["framesPerSecond"] > 0 and kit["runThreshold"] > 0,
            "Invalid M0 presentation tuning")
    tuning = configs["M0SummonerTuning"]
    require(tuning["moveSpeed"] == 5.2 and tuning["gravity"] < 0 and tuning["previewRange"] > 0,
            "Invalid M0 movement/targeting tuning")

    basic = configs["KitBasicSprites"]
    require(basic["framesPerSecond"] == 12, "M1 presentation cadence drift")
    for field, count, suffix in (("front", 5, "png"), ("back", 4, "PNG"), ("side", 3, "PNG")):
        frames = basic[field]
        expected = [f"Assets/Art/Characters/Kit/Basic/{field.title()}/{i:03}.{suffix}"
                    for i in range(count)]
        if field == "front":
            expected.append("Assets/Art/Characters/Kit/Idle/Front/idle.png")
        require(len(frames) == len(expected), "Directional sequence length: " + field)
        for value, path in zip(frames, expected):
            reference(value, path, 21300000)
        if field == "front":
            require(frames == basic["frames"], "Legacy/front sequence mismatch")

    # Decode every imported Kit texture, including uppercase directional assets.
    for path in (ASSETS / "Art/Characters/Kit").rglob("*"):
        if path.suffix.lower() != ".png":
            continue
        relative = path.relative_to(ROOT).as_posix()
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            require(image.format == "PNG" and image.mode == "RGBA" and
                    image.size == (1254, 1254) and image.getchannel("A").getextrema() == (0, 255),
                    "Invalid Kit PNG/alpha: " + relative)
        importer = documents(relative + ".meta")[0]["TextureImporter"]
        for key, value in {"spriteMode": 1, "spritePixelsToUnits": 500, "nPOTScale": 0,
                           "isReadable": 0, "textureType": 8, "alphaUsage": 1,
                           "alphaIsTransparency": 1}.items():
            require(importer[key] == value, f"Importer {key}: {relative}")
        require(all(importer["textureSettings"][key] == 1 for key in ("wrapU", "wrapV", "wrapW")),
                "Texture wrap drift: " + relative)
        platforms = {p["buildTarget"]: p for p in importer["platformSettings"]}
        default = platforms["DefaultTexturePlatform"]
        require(default["textureCompression"] == 0 and default["maxTextureSize"] >= 1254,
                "Default importer compression/size: " + relative)
        web = platforms.get("WebGL")
        if web and web["overridden"]:
            require(web["textureCompression"] == 0 and web["maxTextureSize"] == 512 and
                    web["textureFormat"] == 4,
                    "WebGL importer override: " + relative)

    scene_path = "Assets/Scenes/M0.unity"
    scene_docs = documents(scene_path)
    components = [d["MonoBehaviour"] for d in scene_docs if "MonoBehaviour" in d]
    require(len(components) == 2, "M0 composition component count drift")
    for component, script, bindings in (
        (components[0], "M0/M0Bootstrap.cs", {"kit": "KitSpriteSet", "tuning": "M0SummonerTuning"}),
        (components[1], "M1/M1CombatFixture.cs", {"basic": "KitBasicAttack", "basicSprites": "KitBasicSprites"}),
    ):
        reference(component["m_Script"], "Assets/Crownfall/" + script, 11500000)
        require(component["m_Enabled"] == 1 and component["m_GameObject"] == {"fileID": 100},
                "Disabled/detached M0 component")
        for field, asset in bindings.items():
            reference(component[field], f"Assets/Crownfall/Configuration/{asset}.asset", 11400000)
        reference(component["solidMaterial"], "Assets/Materials/PipelineCube.mat", 2100000)
        reference(component["previewMaterial"], "Assets/Crownfall/Presentation/TargetPreview.mat", 2100000)
    reference(components[0]["spriteMaterial"], "Assets/Crownfall/Presentation/KitSprite.mat", 2100000)
    require({key: components[1][key] for key in ("kitHealth", "targetHealth", "targetRadius")} ==
            {"kitHealth": 950, "targetHealth": 1000, "targetRadius": 0.52}, "M1 component data drift")
    game_object = scene_docs[0]["GameObject"]
    require(game_object["m_IsActive"] == 1 and game_object["m_Component"] ==
            [{"component": {"fileID": i}} for i in (101, 102, 103)], "M0 root composition drift")
    require(scene_docs[-1]["SceneRoots"]["m_Roots"] == [{"fileID": 101}], "M0 scene root drift")

    build = documents("ProjectSettings/EditorBuildSettings.asset")[0]["EditorBuildSettings"]
    require(build["m_Scenes"] == [{"enabled": 1, "path": "Assets/Scenes/CrownfallMatch.unity", "guid": guid_for("Assets/Scenes/CrownfallMatch.unity")}],
            "Build scene path/GUID drift")
    match_docs = documents("Assets/Scenes/CrownfallMatch.unity")
    match_components = [d["MonoBehaviour"] for d in match_docs if "MonoBehaviour" in d]
    require(len(match_components) == 1, "Complete match must have one composition root")
    match_root = match_components[0]
    reference(match_root["m_Script"], "Assets/Crownfall/Match/Runtime/CrownfallMatchBootstrap.cs", 11500000)
    require(match_root["m_Enabled"] == 1 and match_root["m_GameObject"] == {"fileID": 100}, "Complete match root disabled or detached")
    for field, asset in (("kit", "KitSpriteSet"), ("kitBasic", "KitBasicAttack"), ("kitBasicSprites", "KitBasicSprites")):
        reference(match_root[field], f"Assets/Crownfall/Configuration/{asset}.asset", 11400000)
    for field, path in (("solidMaterial", "Assets/Materials/PipelineCube.mat"), ("spriteMaterial", "Assets/Crownfall/Presentation/KitSprite.mat"), ("effectMaterial", "Assets/Crownfall/Match/Runtime/MatchOverlay.mat"), ("territoryMaterial", "Assets/Crownfall/Match/Runtime/TerritoryFlow.mat")):
        reference(match_root[field], path, 2100000)
    require(match_docs[0]["GameObject"]["m_Component"] == [{"component": {"fileID": i}} for i in (101, 102)], "Complete match scene contains fixture scaffolding")
    pipeline = text("Assets/Editor/PipelineBuild.cs")
    require(pipeline.count('"Assets/Scenes/CrownfallMatch.unity"') == 2 and 'CompleteMatchValidation.Validate()' in pipeline, "Build hook must launch and validate complete match")
    settings = documents("ProjectSettings/ProjectSettings.asset")[0]["PlayerSettings"]
    for key, value in {"activeInputHandler": 0, "stripEngineCode": 1,
                       "webGLTemplate": "PROJECT:PipelineTest", "webGLCompressionFormat": 1,
                       "webGLDecompressionFallback": 1, "webGLDataCaching": 0,
                       "webGLThreadsSupport": 0}.items():
        require(settings[key] == value, "PlayerSettings drift: " + key)
    require(settings["scriptingBackend"]["WebGL"] == 1, "WebGL requires IL2CPP")
    require(0 < settings["webGLInitialMemorySize"] <= settings["webGLMaximumMemorySize"],
            "WebGL memory configuration")
    template = text("Assets/WebGLTemplates/PipelineTest/index.html")
    for token in ("LOADER_FILENAME", "DATA_FILENAME", "FRAMEWORK_FILENAME", "CODE_FILENAME"):
        require("{{{ " + token + " }}}" in template, "Missing WebGL template token: " + token)

    # Resolve every serialized external reference, including settings and shaders.
    for base in (ASSETS, ROOT / "ProjectSettings"):
        for path in base.rglob("*"):
            if path.suffix not in (".unity", ".asset", ".mat"):
                continue
            for guid in referenced_guids(path.read_text()):
                require(guid.startswith("0000000000000000") or guid in guid_to_asset,
                        "Unresolved GUID in " + str(path) + ": " + guid)

def main():
    manifest = json.loads(text("Packages/manifest.json"))
    require(manifest["dependencies"] == {
        "com.unity.modules.imgui": "1.0.0",
        "com.unity.modules.jsonserialize": "1.0.0",
        "com.unity.modules.physics": "1.0.0",
        "com.unity.modules.audio": "1.0.0",
        "com.unity.modules.ui": "1.0.0",
        "com.unity.modules.uielements": "1.0.0",
    }, "Unity package manifest drift")
    require(text("ProjectSettings/ProjectVersion.txt").strip() == "m_EditorVersion: 6000.3.10f1",
            "Unity editor version drift")

    build_settings = text("ProjectSettings/EditorBuildSettings.asset")
    require(build_settings.count("enabled: 1") == 1 and "Assets/Scenes/CrownfallMatch.unity" in build_settings,
            "The complete match must be the sole enabled build scene")
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
    required_import_settings = (
        "spriteMode: 1", "spritePixelsToUnits: 500", "nPOTScale: 0",
        "textureCompression: 0", "isReadable: 0", "textureType: 8",
        "alphaUsage: 1", "alphaIsTransparency: 1", "wrapU: 1", "wrapV: 1", "wrapW: 1"
    )

    for path in locomotion_paths:
        require((ROOT / path).is_file(), "Missing M0 presentation asset: " + path)
        png_rgba(path)
        meta_text = Path(str(ROOT / path) + ".meta").read_text()
        for setting in required_import_settings:
            require(setting in meta_text, f"M0 importer drift {setting}: {path}")

    basic_front = [f"Assets/Art/Characters/Kit/Basic/Front/{i:03}.png" for i in range(5)]
    for path in basic_front:
        require((ROOT / path).is_file(), "Missing front basic asset: " + path)
        png_rgba(path)
        meta_text = Path(str(ROOT / path) + ".meta").read_text()
        for setting in required_import_settings:
            require(setting in meta_text, f"M1 importer drift {setting}: {path}")

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
    require('System.IO.Path.Combine(Application.dataPath, "Scenes/M0.unity")' in m1_validator,
            "M1 scene validator must resolve from the project, not the process working directory")

    integration_checks(guid_to_asset)

    # Include all Editor sources, so a newly added validator cannot evade path checks.
    for source_file in (ASSETS / "Editor").rglob("*.cs"):
        source_name = source_file.relative_to(ROOT).as_posix()
        source = source_file.read_text()
        for path in re.findall(r'AssetDatabase\.LoadAssetAtPath<[^>]+>\("([^"]+)"\)', source):
            require((ROOT / path).exists(), f"{source_name} references missing asset: {path}")

    print("PASS: current Unity Cloud prebuild contract, serialized balance, asset paths, GUIDs, and WebGL template.")

if __name__ == "__main__":
    main()
