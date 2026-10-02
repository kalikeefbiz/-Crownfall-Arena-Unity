"""M1 source/data/integrity checks, complementary to compiled core and Unity prebuild checks."""
from pathlib import Path
from io import BytesIO
import hashlib, json, re, subprocess
from PIL import Image
from validate_m0 import main as validate_m0

ROOT = Path(__file__).resolve().parents[1]
BASE = 'af88eaed1cb0408873dbe1e692ae6a9254510bef'
MODIFIED = {
    'Assets/Crownfall/Presentation/KitSpritePresentation.cs',
    'Assets/Crownfall/M0/M0Diagnostics.cs',
    'Assets/Scenes/M0.unity',
    'Tools/validate_m0.py',
}
HASHES = [
    'd5918960e4f5341ec72ea3cbcf2798fdb97f104f519865521262826b11c07896',
    '956f9cc4619f6135ecba9d4dc6f519418ec005eaca2f5cd1c03a621a0351ccfc',
    'dfb1f7b508cfa64c8a9729b87c529837773b4ebca279dd5cbe66bc2b3f5140fa',
    '92100d6ed6cb41eee6a3c26fe7c770091b0851847f2d083a4b2063f9028b1cd8',
    '2c38d635f7655bad152d3276623f3e8d6acee4f35fe003b3703fb1312dc55ecb',
    '4f3410f8cb66d8b3a4bcc48502092fcff9c8accf19160a3fea7eb7a4d47bc243',
]
def require(condition, message):
    if not condition: raise AssertionError(message)
def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def main():
    validate_m0()
    preserved = 0
    baseline = git('ls-tree', '-r', '--name-only', BASE, '--', 'Assets', 'Packages', 'ProjectSettings', 'Tools', 'Docs', 'README.md').decode().splitlines()
    for path in baseline:
        if path in MODIFIED: continue
        require((ROOT/path).is_file() and (ROOT/path).read_bytes() == git('show', BASE+':'+path), 'Baseline changed: '+path)
        preserved += 1
    old_scene = git('show', BASE+':Assets/Scenes/M0.unity').decode()
    scene = (ROOT/'Assets/Scenes/M0.unity').read_text()
    stripped = scene.replace('  - component: {fileID: 103}\n', '')
    stripped = re.sub(r'--- !u!114 &103\n.*?(?=--- !u!1660057539)', '', stripped, flags=re.S)
    require(stripped == old_scene, 'Scene modification beyond M1 fixture attachment')
    require('  kitHealth: 650\n  targetHealth: 1800\n  targetRadius: 0.52\n' in scene, 'Authored fixture health/radius')
    manifest = json.loads((ROOT/'Docs/KitBasicSourceManifest.json').read_text())
    rows = manifest['images']+[manifest['finalFrame']]
    require(len(rows) == 6, 'Logical frame count')
    guids = []
    idle_meta = (ROOT/'Assets/Art/Characters/Kit/Idle/idle.png.meta').read_text()
    for i,row in enumerate(rows):
        expected = 'Assets/Art/Characters/Kit/'+('Idle/idle.png' if i == 5 else f'Basic/{i:03}.png')
        require(row['source'] == f'kit-asher/basic/{i:03}.png.PNG' and row['asset'] == expected, 'Exact source mapping')
        data = (ROOT/expected).read_bytes()
        require(data[:8] == b'\x89PNG\r\n\x1a\n', 'PNG signature')
        require(hashlib.sha256(data).hexdigest() == row['sha256'] == HASHES[i], 'Source art modified: '+expected)
        image = Image.open(BytesIO(data)); image.load()
        require(image.format == 'PNG' and image.size == (1254,1254) and image.mode == 'RGBA', 'PNG dimensions/type')
        require(image.getchannel('A').getextrema() == (0,255), 'Actual alpha range')
        meta = (ROOT/(expected+'.meta')).read_text()
        guid = re.search(r'^guid: (\w+)', meta, re.M)[1]
        require(guid == row['guid'], 'GUID source mapping')
        guids.append(guid)
        # New frames inherit every proven idle import setting/pivot; only IDs differ.
        scrub = lambda text: re.sub(r'(guid: |spriteID: )[a-f0-9]{32}', r'\1ID', text)
        require(scrub(meta) == scrub(idle_meta), 'Unexpected new import/pivot differences')
    require(len(set(guids)) == 6, 'Duplicate basic frame reference')
    basic_dir = ROOT/'Assets/Art/Characters/Kit/Basic'
    require(sorted(p.name for p in basic_dir.iterdir()) == sorted([f'{i:03}.png{s}' for i in range(5) for s in ('','.meta')]), 'Extra basic artwork/metadata')
    require(len(list((ROOT/'Assets/Art/Characters/Kit').rglob('*.png'))) == 10, 'Only five additional textures permitted')
    clip = (ROOT/'Assets/Crownfall/Configuration/KitBasicSprites.asset').read_text()
    require(re.findall(r'fileID: 21300000, guid: (\w+)',clip) == guids and 'framesPerSecond: 12' in clip, 'Six frame cadence/order/idle reference')
    attack = (ROOT/'Assets/Crownfall/Configuration/KitBasicAttack.asset').read_text()
    require('  range: 2.8\n  coneDegrees: 117\n  cooldown: 0.55\n  comboWindow: 1.25\n  comboDamage:\n  - 110\n  - 150\n  hitTimes:\n  - 0\n' in attack, 'Authoritative V21 definition')
    for file in (ROOT/'Assets/Crownfall/Combat').rglob('*.cs'):
        code = file.read_text()
        require(not any(word in code for word in ('SpriteRenderer','AnimationEvent','BasicSpriteSet','KitSpritePresentation','Rigidbody','AddForce','Input.Get')), 'Rendering/input authority leaked into combat')
        if 'Core' in file.parts: require('UnityEngine' not in code, 'Pure core dependency')
    sprite = (ROOT/'Assets/Crownfall/Presentation/KitSpritePresentation.cs').read_text()
    require('Combat.IAttackViewState' in sprite and 'basic.AtTime(attack.Elapsed)' in sprite, 'Simulation-driven presentation')
    require(not any(x in sprite for x in ('DamageRequest', '.Receive(', '.TryStart(', '.Advance(', '.Interrupt(')), 'Sprite drives combat')
    require('hit(i, spec.Damage(ComboStep))' in (ROOT/'Assets/Crownfall/Combat/Core/AttackTimeline.cs').read_text(), 'Scheduled query path missing')
    print(f'PASS: M1 art hashes/alpha, six logical frames, data, references, separation; {preserved} baseline files byte-identical.')
    print('Unity compilation/import, actual scene lifecycle, Cloud build and iPhone visuals/input remain pending.')

if __name__ == '__main__': main()
