"""Disposable fragment diagnostics, derived from the current production build.
No runtime diagnostic URL flags or camera/workload changes are shipped.
Serve the resulting directories on distinct ports (e.g. 4178 and 4179).
"""
from pathlib import Path
import hashlib,json,shutil
root=Path(__file__).resolve().parents[1]
receipt={}
for name,replacement in [('atlas-only','dAlbedo=colorRough.rgb;'),('constant','dAlbedo=vec3(.4);')]:
 dest=root/'.audit'/name
 shutil.copytree(root/'dist',dest,dirs_exist_ok=True)
 paths=list((dest/'assets').glob('game-*.js'));assert len(paths)==1
 path=paths[0];text=path.read_text();target='dAlbedo=colorRough.rgb*modulation;'
 assert text.count(target)==1
 path.write_text(text.replace(target,replacement))
 receipt[name]=dict(target=target,replacement=replacement,sourceSha256=hashlib.sha256(next((root/'dist/assets').glob('game-*.js')).read_bytes()).hexdigest(),diagnosticSha256=hashlib.sha256(path.read_bytes()).hexdigest(),note='Texture resources retained to isolate fragment work, same gameplay/camera/countdown and HTTP cache semantics.')
(root/'evidence/017a/diagnostic-builds.json').write_text(json.dumps(receipt,indent=2)+'\n')
