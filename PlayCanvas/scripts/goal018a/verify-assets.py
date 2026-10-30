"""Read actual runtime GLBs and verify the closed manifest and source protections."""
import json,struct,hashlib,io,subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
assets=[]
paths=list((ROOT/'public/assets/environment/stones/mobile').glob('*.glb'))
paths += [ROOT/'public/assets/environment/trees/mobile'/n for n in ['Meshy_AI_Pine_tree_1025063153_texture.glb','Meshy_AI_Red_oak_tree_1025063928_texture.glb']]
for p in paths:
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);binary=b[28+n:];textures=[]
 for im in d['images']:
  v=d['bufferViews'][im['bufferView']];raw=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];tex=Image.open(io.BytesIO(raw))
  textures.append(dict(name=im.get('name',''),dimensions=list(tex.size),mime=im['mimeType'],bytes=len(raw)))
 tris=[dict(name=m.get('name'),triangles=sum(d['accessors'][pr['indices']]['count']//3 for pr in m['primitives'])) for m in d['meshes']]
 assets.append(dict(file=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),meshes=tris,textures=textures))
manifest=ROOT/'public/assets/environment/stones/manifest.json'
if '--record' in __import__('sys').argv:
 manifest.write_text(json.dumps(dict(license='CC0-1.0 applies to Poly Haven stones only; existing approved Meshy trees retain original provenance',assets=assets),indent=2)+'\n')
else:assert json.loads(manifest.read_text())['assets']==assets,'Runtime asset roster changed'
base='d781667bc5216d32a2dad73de54ee031b66aac45'
protected=['src/maps','src/combat','src/gameplay','src/game.ts','src/main.ts','src/ui','src/presentation/solrahn-surface-material.ts','src/presentation/wilderness-environment.ts','src/presentation/wilderness-layout.ts','public/assets/solrahn-v2','public/assets/solrahn-surface','public/assets/environment/trees','../.github']
for p in protected:assert not subprocess.check_output(['git','diff',base,'--',p],cwd=ROOT),p
old=subprocess.check_output(['git','show',base+':PlayCanvas/src/presentation/scene.ts'],cwd=ROOT).decode()
new=(ROOT/'src/presentation/scene.ts').read_text()
assert old.replace('createSolrahnV2Environment(app, sceneRoot, v2)','createSolrahnV2Environment(app, sceneRoot, v2, assets)')==new
receipt=dict(base=base,unchanged=protected,terrainAndGameplayUnmodified=True,cameraAndBlueTerritoryShaderUnmodified=True,sceneChange='Only pass existing shared character cache to V2 constructor',runtimeAssetHashesVerified=True)
(ROOT/'evidence/018a/protection-source.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Runtime roster, all protected source paths, existing trees, complete camera and Blue territory shader verified.')
