"""Publish only /solrahn-goal-017b/ from an immutable, validated source commit.
Uses a separate Git index; protects every prior Pages object and leases the push.
"""
from pathlib import Path
import hashlib,json,os,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'PlayCanvas'
OUT=PROJECT/'evidence/017b'
DEST='solrahn-goal-017b'
BASE_SOURCE='9f20e5bc666bfc3f9afedad53573b63c05d4068b'
def git(*args,env=None,input=None):
 return subprocess.check_output(['git',*args],cwd=ROOT,env=env,input=input).decode().strip()
source=sys.argv[1]
assert len(source)==40 and git('rev-parse',source)==source
assert git('branch','--show-current')=='goal-017b-device-preview'
assert git('rev-parse','HEAD')==source
assert not git('diff',source,'--','PlayCanvas/src','PlayCanvas/public','PlayCanvas/scripts','PlayCanvas/vite.config.ts')
build_env=dict(os.environ,VITE_DEVICE_PREVIEW='1')
subprocess.run(['npm','run','build'],cwd=PROJECT,env=build_env,check=True)
dist=PROJECT/'dist'
(dist/'preview-source.json').write_text(json.dumps(dict(source=source,baseSource=BASE_SOURCE,goal='017b',branch='goal-017b-device-preview',map='solrahn-v2',surface='goal017',productionReplaced=False,buildFlag='VITE_DEVICE_PREVIEW=1'))+'\n')
git('fetch','origin','gh-pages:refs/remotes/origin/gh-pages')
base=git('rev-parse','origin/gh-pages')
before=git('ls-tree','-r',base)
protected=lambda data:[r for r in data.splitlines() if not r.split('\t')[1].startswith(DEST+'/')]
original=(OUT/'pages-before.txt').read_text().strip()
assert protected(before)==protected(original),'Protected Pages objects changed since baseline'
existing=[r.split('\t')[1] for r in before.splitlines() if r.split('\t')[1].startswith(DEST+'/')]
if existing:
 previous=json.loads((OUT/'publication.json').read_text())
 assert previous['pagesAfter']==base and previous['baseSource']==BASE_SOURCE,'Unrecognized preview revision'
 (OUT/'publication-initial.json').write_text(json.dumps(previous,indent=2)+'\n')
with tempfile.TemporaryDirectory(prefix='goal017b-index-',dir=PROJECT/'.audit') as temp:
 env=dict(os.environ,GIT_INDEX_FILE=str(Path(temp)/'index'),GIT_AUTHOR_NAME='Codex',GIT_AUTHOR_EMAIL='codex@openai.com',GIT_COMMITTER_NAME='Codex',GIT_COMMITTER_EMAIL='codex@openai.com')
 git('read-tree',base,env=env)
 if existing: git('update-index','--force-remove','-z','--stdin',env=env,input=('\0'.join(existing)+'\0').encode())
 entries=[];files={}
 for p in sorted(dist.rglob('*')):
  if not p.is_file():continue
  relative=p.relative_to(dist).as_posix();assert '\t' not in relative and '\n' not in relative
  blob=git('hash-object','-w',str(p))
  entries.append(f'100644 {blob}\t{DEST}/{relative}\n')
  files[relative]=dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),gitBlob=blob)
 git('update-index','--index-info',env=env,input=''.join(entries).encode())
 tree=git('write-tree',env=env)
 after=git('ls-tree','-r',tree)
 assert protected(before)==protected(after),'Pre-existing Pages objects changed'
 commit=git('commit-tree',tree,'-p',base,'-m',f'Publish isolated GOAL 017B iPhone preview from {source}',env=env)
 changed=git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines()
 assert changed and all(p.startswith(DEST+'/') for p in changed)
 receipt=dict(source=source,baseSource=BASE_SOURCE,pagesBefore=base,pagesAfter=commit,protectedGitObjectsIdentical=True,protectedObjectCount=len(protected(original)),changedPaths=changed,files=files,url=f'https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/{DEST}/')
 (OUT/'publication-prepush.json').write_text(json.dumps(receipt,indent=2)+'\n')
 git('push',f'--force-with-lease=refs/heads/gh-pages:{base}','origin',f'{commit}:refs/heads/gh-pages')
 (OUT/'publication.json').write_text(json.dumps(receipt,indent=2)+'\n')
 (OUT/'pages-after.txt').write_text(after+'\n')
 print(json.dumps({k:receipt[k] for k in ['source','pagesBefore','pagesAfter','protectedObjectCount','url']},indent=2))
