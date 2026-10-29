"""Assert material-only source isolation and all protected live published bundles.
Use before publication (default) and after (--after). Never writes remote data.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'PlayCanvas/evidence/017'
baseline=json.loads((OUT/'baseline.json').read_text())
for path,sha in baseline['files'].items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==sha,path
# Every gameplay, input, camera and map source file must remain identical.
changed=subprocess.check_output(['git','diff','7e193f87b4821470b5697c00034036fe8ced0a6f','--name-only','--','PlayCanvas/src'],cwd=ROOT).decode().splitlines()
allowed={'PlayCanvas/src/presentation/lane-environment.ts','PlayCanvas/src/presentation/solrahn-v2-environment.ts','PlayCanvas/src/presentation/solrahn-surface-material.ts','PlayCanvas/src/presentation/terrain-textures.ts'}
assert set(changed)<=allowed,changed
refs=subprocess.check_output(['git','ls-remote','origin','refs/heads/playcanvas-port','refs/heads/goal-016-solrahn-v2'],cwd=ROOT).decode()
assert baseline['production']+'\trefs/heads/playcanvas-port' in refs
assert baseline['source']+'\trefs/heads/goal-016-solrahn-v2' in refs
before=json.loads((OUT/'live-protected-before.json').read_text())
def verify(item):
    raw=subprocess.check_output(['curl','-fsSL','--retry','2','https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/'+item['path']])
    sha=hashlib.sha256(raw).hexdigest()
    assert sha==item['sha256'],item['path']
    return dict(path=item['path'],bytes=len(raw),sha256=sha)
with ThreadPoolExecutor(max_workers=4) as pool: live=list(pool.map(verify,before))
name='after' if '--after' in sys.argv else 'before'
(OUT/f'protection-{name}.json').write_text(json.dumps(dict(sourceFilesIdentical=True,onlyMaterialPresentationChanges=True,protectedBranches=refs.splitlines(),protectedLiveBundles=live),indent=2)+'\n')
print(len(live),'live bundles identical; protected branches and terrain/gameplay source unchanged')
