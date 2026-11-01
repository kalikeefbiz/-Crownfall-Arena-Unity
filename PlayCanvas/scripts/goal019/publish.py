"""Add only /solrahn-goal-019/ to gh-pages; exact protected blob equality."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parents[3]
PROJECT=ROOT/'PlayCanvas';OUT=PROJECT/'evidence/019';DEST='solrahn-goal-019'
BASE_SOURCE='8ad97bbafe010036d88234776cf1fa399066bb7a'
def git(*args,env=None,input=None):return subprocess.check_output(['git',*args],cwd=ROOT,env=env,input=input).decode().strip()
source=sys.argv[1]
assert len(source)==40 and git('rev-parse',source)==source
assert git('branch','--show-current')=='goal-019-solrahn-environment-transformation'
assert git('rev-parse','HEAD')==source
assert not git('diff',source,'--','PlayCanvas/src','PlayCanvas/public','PlayCanvas/scripts','PlayCanvas/vite.config.ts')
subprocess.run(['npm','run','build'],cwd=PROJECT,env=dict(os.environ,VITE_DEVICE_PREVIEW='1',VITE_LANE_ENCLOSURE='1'),check=True)
dist=PROJECT/'dist'
import shutil
review=dist/'review';review.mkdir(exist_ok=True)
for p in (OUT/'review.html',):shutil.copy2(p,review/'index.html')
for p in OUT.glob('before-*.png'):shutil.copy2(p,review/p.name)
for p in OUT.glob('after-*.png'):shutil.copy2(p,review/p.name)
shutil.copy2(PROJECT/'GOAL_019_REPORT.md',review/'GOAL_019_REPORT.md')
(PROJECT/'.audit').mkdir(exist_ok=True)
(dist/'preview-source.json').write_text(json.dumps(dict(source=source,baseSource=BASE_SOURCE,goal='019',branch='goal-019-solrahn-environment-transformation',map='solrahn-v2',surface='goal017',productionReplaced=False,buildFlags=['VITE_DEVICE_PREVIEW=1','VITE_LANE_ENCLOSURE=1']))+'\n')
git('fetch','--depth=1','--filter=blob:none','origin','gh-pages:refs/remotes/origin/gh-pages')
base=git('rev-parse','origin/gh-pages');before=git('ls-tree','-r',base)
assert not any(r.split('\t')[1].startswith(DEST+'/') for r in before.splitlines()),'Destination already exists'
(OUT/'pages-before.txt').write_text(before+'\n')
with tempfile.TemporaryDirectory(prefix='goal019-index-',dir=PROJECT/'.audit') as temp:
 env=dict(os.environ,GIT_INDEX_FILE=str(Path(temp)/'index'),GIT_AUTHOR_NAME='Codex',GIT_AUTHOR_EMAIL='codex@openai.com',GIT_COMMITTER_NAME='Codex',GIT_COMMITTER_EMAIL='codex@openai.com')
 git('read-tree',base,env=env);entries=[];files={}
 for p in sorted(dist.rglob('*')):
  if not p.is_file():continue
  relative=p.relative_to(dist).as_posix();assert '\t' not in relative and '\n' not in relative
  blob=git('hash-object','-w',str(p));entries.append(f'100644 {blob}\t{DEST}/{relative}\n')
  files[relative]=dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),gitBlob=blob)
 git('update-index','--index-info',env=env,input=''.join(entries).encode());tree=git('write-tree',env=env);after=git('ls-tree','-r',tree)
 protected=[r for r in after.splitlines() if not r.split('\t')[1].startswith(DEST+'/')]
 assert before.splitlines()==protected,'Existing Pages objects changed'
 commit=git('commit-tree',tree,'-p',base,'-m',f'Publish isolated GOAL 019 enclosure from {source}',env=env)
 changed=git('diff-tree','--no-commit-id','--name-only','-r',commit).splitlines();assert changed and all(p.startswith(DEST+'/') for p in changed)
 receipt=dict(source=source,baseSource=BASE_SOURCE,pagesBefore=base,pagesAfter=commit,protectedGitObjectsIdentical=True,protectedObjectCount=len(protected),changedPaths=changed,files=files,url=f'https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/{DEST}/')
 (OUT/'publication-prepush.json').write_text(json.dumps(receipt,indent=2)+'\n')
 git('push',f'--force-with-lease=refs/heads/gh-pages:{base}','origin',f'{commit}:refs/heads/gh-pages')
 (OUT/'publication.json').write_text(json.dumps(receipt,indent=2)+'\n');(OUT/'pages-after.txt').write_text(after+'\n');print(json.dumps({k:receipt[k] for k in ['source','pagesBefore','pagesAfter','protectedObjectCount','url']},indent=2))
