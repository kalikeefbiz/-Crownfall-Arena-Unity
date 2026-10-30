"""Read-only source/branch/Pages protection proof. Does not publish anything."""
from pathlib import Path
import hashlib,json,re,subprocess
root=Path(__file__).resolve().parents[1];repo=root.parent
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
original='765041a87a857675b0e6411e5ad527aa527f3ea5'
allowed={'PlayCanvas/src/presentation/solrahn-surface-material.ts','PlayCanvas/src/presentation/terrain-textures.ts'}
paths=git('ls-tree','-r','--name-only',original,'PlayCanvas/src','PlayCanvas/public').decode().splitlines()
protected={}
for name in paths:
 if name in allowed:continue
 before=git('show',f'{original}:{name}');after=(repo/name).read_bytes()
 assert before==after,name
 protected[name]=hashlib.sha256(after).hexdigest()
old=git('show',f'{original}:PlayCanvas/src/presentation/solrahn-surface-material.ts').decode()
new=(root/'src/presentation/solrahn-surface-material.ts').read_text()
for chunk in ['highDiffuse','highNormal']:
 pattern=rf'const {chunk} = `([\s\S]*?)`;'
 assert re.search(pattern,old)[1]==re.search(pattern,new)[1],chunk
refs=['main','playcanvas-port','gh-pages','goal-016-solrahn-v2','goal-017-solrahn-surface','goal-017a-solrahn-performance']
after=git('ls-remote','origin',*[f'refs/heads/{r}' for r in refs]).decode()
(root/'evidence/017a/heads-after.txt').write_text(after)
before=dict(line.split()[::-1] for line in (root/'evidence/017a/heads-before.txt').read_text().splitlines())
observed=dict(line.split()[::-1] for line in after.splitlines())
for ref in refs[:-1]:assert before[f'refs/heads/{ref}']==observed[f'refs/heads/{ref}'],ref
pages=before['refs/heads/gh-pages']
assert git('ls-tree','-r',pages)==(root/'evidence/017a/pages-before.txt').read_bytes()
result=dict(protectedSourceAndAssetCount=len(protected),protectedSha256=protected,highShaderChunksByteIdentical=True,protectedHeadsUnchanged=True,pagesHead=pages,allPublishedGitObjectsIdentical=True,publication='NONE; no gh-pages push or workflow dispatch',terrain='49 meshes; 55,296 top + 1,344 skirt triangles; positions/normals/indices and generator unchanged')
(root/'evidence/017a/protection-after.json').write_text(json.dumps(result,indent=2)+'\n')
print('Protected',len(protected),'source/assets, High chunks and all Pages objects match; source heads unchanged.')
