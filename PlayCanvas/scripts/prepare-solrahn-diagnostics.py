"""Disposable fragment diagnostics, derived from the current production build.
No runtime diagnostic URL flags or camera/workload changes are shipped.
Serve the resulting directories on distinct ports (e.g. 4178 and 4179).
"""
from pathlib import Path
import argparse,hashlib,json,shutil
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--input',type=Path,default=root/'.audit/iteration1')
args=parser.parse_args()
receipt={}
for name,replacement in [('atlas-only','dAlbedo=colorRough.rgb;'),('constant','dAlbedo=vec3(.4);'),('isotropic','anisotropy:Math.min(1,'),('no-debug','')]:
 dest=root/'.audit'/name
 shutil.copytree(args.input,dest,dirs_exist_ok=True)
 paths=list((dest/'assets').glob('game-*.js'));assert len(paths)==1
 path=paths[0];text=path.read_text();target='dAlbedo=colorRough.rgb*modulation;'
 assert text.count(target)==1
 if name=='isotropic':
  target='anisotropy:Math.min(4,';assert text.count(target)==1
  result=text.replace(target,replacement)
 elif name=='no-debug':
  a=text.index('            if(surfaceDebug>.5) {');b=text.index('            vec2 auv=',a)
  target=text[a:b];result=text[:a]+text[b:]
 else: result=text.replace(target,replacement)
 path.write_text(result)
 receipt[name]=dict(target=target,replacement=replacement,sourceSha256=hashlib.sha256(next((args.input/'assets').glob('game-*.js')).read_bytes()).hexdigest(),diagnosticSha256=hashlib.sha256(path.read_bytes()).hexdigest(),note='Texture resources retained to isolate fragment work, same gameplay/camera/countdown and HTTP cache semantics.')
(root/'evidence/017a/diagnostic-builds.json').write_text(json.dumps(receipt,indent=2)+'\n')
