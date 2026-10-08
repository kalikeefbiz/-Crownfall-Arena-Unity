"""Static source/asset checks only; does not compile or execute Unity."""
from pathlib import Path
import hashlib, json, re, struct, zlib
import xml.etree.ElementTree as ET
from tree_sitter import Language, Parser
import tree_sitter_c_sharp

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'Assets'

def check(ok, message):
    if not ok: raise AssertionError(message)

def main():
    images = json.loads((ROOT/'Docs/KitSourceManifest.json').read_text())['images']
    check(len(images) == 5, 'Five approved images required')
    guids = {}
    for meta in ASSETS.rglob('*.meta'):
        guid = re.search(r'^guid: ([a-f0-9]{32})$', meta.read_text(), re.M)[1]
        check(guid not in guids, 'Duplicate GUID: '+guid)
        target = Path(str(meta)[:-5])
        check(target.exists(), 'Orphan meta: '+str(meta))
        guids[guid] = target
    for path in ASSETS.rglob('*'):
        # Empty staging folders may generate metas; populated folders need stable GUIDs.
        if path.is_dir() and any(p.is_file() and p.suffix != '.meta' and
                                 not p.name.startswith('.') for p in path.rglob('*')):
            check(Path(str(path)+'.meta').exists(), 'Missing populated folder meta: '+str(path))
        if path.is_file() and path.suffix != '.meta' and path.name != '.gitkeep':
            check(Path(str(path)+'.meta').exists(), 'Missing meta: '+str(path))
    kit_files = list((ASSETS/'Art/Characters/Kit').rglob('*'))
    check(not any(p.suffix.lower() in ('.jpeg', '.jpg') for p in kit_files), 'Stale Kit JPEG')
    # Additional directional production art may coexist with the original M0 locomotion set.
    # The five authoritative M0 locomotion sources are verified individually from the manifest below.
    check(not any('__MACOSX' in p.parts or p.name.startswith('._') for p in ASSETS.rglob('*')), 'Apple metadata imported')
    ordered, hashes = [], set()
    for i, entry in enumerate(images):
        expected = 'Assets/Art/Characters/Kit/'+('Idle/Front/idle.png' if i == 0 else f'Run/{i-1:03}.png')
        check(entry['attachment'] == i+1 and entry['asset'] == expected, 'Attachment mapping/order')
        path = ROOT/expected
        data = path.read_bytes()
        check(data[:8] == b'\x89PNG\r\n\x1a\n', 'PNG signature: '+expected)
        check(data[12:16] == b'IHDR' and struct.unpack('>II',data[16:24]) == (1254,1254) and data[25] == 6, 'PNG RGBA/dimensions: '+expected)
        offset = 8
        while offset < len(data):
            length = struct.unpack('>I', data[offset:offset+4])[0]
            chunk = data[offset+4:offset+8+length]
            crc = struct.unpack('>I', data[offset+8+length:offset+12+length])[0]
            check(zlib.crc32(chunk) & 0xffffffff == crc, 'PNG chunk CRC: '+expected)
            offset += length+12
        check(offset == len(data), 'PNG chunk bounds')
        digest = hashlib.sha256(data).hexdigest()
        check(digest == entry['sha256'] and digest not in hashes, 'Source bytes/duplicate: '+expected)
        hashes.add(digest)
        meta = Path(str(path)+'.meta').read_text()
        for setting in ('spriteMode: 1', 'spritePixelsToUnits: 500', 'alignment: 9', 'spriteMeshType: 0', 'nPOTScale: 0', 'textureCompression: 0', 'maxTextureSize: 2048', 'isReadable: 0', 'textureType: 8', 'alphaUsage: 1', 'alphaIsTransparency: 1', 'wrapU: 1', 'wrapV: 1', 'wrapW: 1'):
            check(setting in meta, setting+' missing: '+expected)
        pivot = re.search(r'spritePivot: \{x: ([0-9.]+), y: ([0-9.]+)\}', meta)
        x,y = entry['anchorFromTopLeft']
        check(pivot and abs(float(pivot[1])-x/entry['width']) < 1e-8 and abs(float(pivot[2])-(entry['height']-y)/entry['height']) < 1e-8, 'Pivot mapping')
        ordered.append(re.search(r'^guid: (\w+)', meta, re.M)[1])
    config = (ASSETS/'Crownfall/Configuration/KitSpriteSet.asset').read_text()
    check(re.findall(r'fileID: 21300000, guid: ([a-f0-9]{32})', config) == ordered, 'Sprite sequence mismatch')
    check('framesPerSecond: 12' in config and 'runThreshold: 0.12' in config, 'Initial tuning changed')
    for path in list(ASSETS.rglob('*.unity'))+list(ASSETS.rglob('*.asset'))+list(ASSETS.rglob('*.mat')):
        for guid in re.findall(r'guid: ([a-f0-9]{32})', path.read_text()):
            check(guid.startswith('0000000000000000') or guid in guids, 'Broken reference: '+str(path))
    parser = Parser(Language(tree_sitter_c_sharp.language()))
    sources = list(ASSETS.rglob('*.cs'))
    for path in sources:
        check(not parser.parse(path.read_bytes()).root_node.has_error, 'C# syntax error: '+str(path))
    for path in (ASSETS/'Crownfall').rglob('*.cs'):
        code = path.read_text()
        check(not any(t in code for t in ('UNITY_WEBGL', 'DllImport', 'Application.External', 'UnityEngine.UI')), 'Platform/HUD coupling: '+str(path))
        if 'Presentation' in path.parts:
            check(not any(t in code for t in ('CharacterController', 'UnityEngine.Input', 'motor.Move', 'transform.parent.position', 'transform.root.')), 'Presentation authority leak: '+str(path))
    root = (ASSETS/'Crownfall/Gameplay/SummonerRoot.cs').read_text()
    check(not any(t in root for t in ('KitSprite', 'SpriteRenderer', 'PresentationSwitcher')), 'Concrete presentation dependency')
    check('motor.Move(' in root and 'transform.position =' not in root, 'Collision bypass')
    check('Vector3.ProjectOnPlane(transform.position - before' in root, 'Resolved movement state missing')
    sprite = (ASSETS/'Crownfall/Presentation/KitSpritePresentation.cs').read_text()
    check('visual.flipX = facing == PresentationFacing.Left' in sprite and 'localScale' not in sprite, 'Mirror/scale invariant')
    check('Mathf.Repeat' in sprite and 'art.run.Length' in sprite, 'Loop missing')
    build = (ROOT/'ProjectSettings/EditorBuildSettings.asset').read_text()
    check(build.count('enabled: 1') == 1 and 'Assets/Scenes/CrownfallMatch.unity' in build, 'Build scene')
    check(json.loads((ROOT/'Packages/manifest.json').read_text())['dependencies'] == {'com.unity.modules.imgui':'1.0.0','com.unity.modules.jsonserialize':'1.0.0','com.unity.modules.physics':'1.0.0'}, 'Match package manifest changed')
    check((ROOT/'ProjectSettings/ProjectVersion.txt').read_text().strip() == 'm_EditorVersion: 6000.3.10f1', 'Editor version changed')
    ET.parse(ASSETS/'Crownfall/link.xml')
    print(f'PASS: {len(sources)} C# files parsed; {len(guids)} unique GUIDs; 5 PNG source hashes; ordered sprites; import/pivots; references; architecture guards; package/editor pins.')
    print('Unity compilation, shader/import execution, Editor behavioral gates, Cloud and device acceptance: PENDING.')

if __name__ == '__main__': main()
