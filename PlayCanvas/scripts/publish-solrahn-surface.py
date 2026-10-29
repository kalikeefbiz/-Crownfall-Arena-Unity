"""Manual, compare-and-swap publication of ONLY /solrahn-goal-017/.
Run after validation: python3 scripts/publish-solrahn-surface.py COMMIT_SHA
Uses Git transport; never changes playcanvas-port or a production workflow.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / 'PlayCanvas/dist'
DEST = 'solrahn-goal-017'

def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()

source = sys.argv[1]
assert git('rev-parse', source) == source and len(source) == 40
assert git('branch', '--show-current') == 'goal-017-solrahn-surface'
assert (DIST/'index.html').is_file()
# Tag the build, not production. Caller must build this exact source revision.
assert git('rev-parse', 'HEAD') == source
# Review evidence is opt-in navigation, never requested by the game loader.
review = DIST/'review'
review.mkdir(exist_ok=True)
for evidence in (ROOT/'PlayCanvas/evidence/017').glob('*.png'):
    shutil.copy2(evidence, review/evidence.name)
shutil.copy2(ROOT/'PlayCanvas/evidence/017/review.html', review/'index.html')
shutil.copy2(ROOT/'PlayCanvas/GOAL_017_VERIFICATION.md', review/'report.md')
for manifest in ['materials.json', 'weights.json', 'low-atlas.json']:
    shutil.copy2(ROOT/'PlayCanvas/public/assets/solrahn-surface'/manifest, review/manifest)

assert not git('diff', source, '--', 'PlayCanvas/src', 'PlayCanvas/public', 'PlayCanvas/scripts', 'PlayCanvas/vite.config.ts')
(DIST/'preview-source.json').write_text(json.dumps(dict(source=source, map='solrahn-v2',surface='goal017', productionReplaced=False))+'\n')
git('fetch', '--filter=blob:none', 'origin', 'gh-pages:refs/remotes/origin/gh-pages')
base = git('rev-parse', 'origin/gh-pages')
before = git('ls-tree', '-r', base)
original = (ROOT/'PlayCanvas/evidence/017/pages-before.txt').read_text().strip()
protected = lambda rows: [r for r in rows.splitlines() if not r.split('\t')[1].startswith(DEST+'/')]
assert protected(original) == protected(before), 'Protected Pages tree changed since initial baseline'
(ROOT/'PlayCanvas/evidence/017/pages-before-publish.txt').write_text(before+'\n')
with tempfile.TemporaryDirectory(prefix='goal017-pages-') as temp:
    path=Path(temp)/'pages'
    git('worktree','add','--detach','--no-checkout',str(path),base)
    git('sparse-checkout','init','--cone',cwd=path)
    git('sparse-checkout','set',DEST,cwd=path)
    git('checkout',base,cwd=path)
    try:
        target=path/DEST
        if target.exists(): shutil.rmtree(target)
        shutil.copytree(DIST,target)
        git('add','--',DEST,cwd=path)
        changed=git('diff','--cached','--name-only',cwd=path).splitlines()
        assert changed and all(p.startswith(DEST+'/') for p in changed)
        tree=git('write-tree',cwd=path)
        assert protected(before)==protected(git('ls-tree','-r',tree,cwd=path)), 'Protected Pages objects changed'
        git('commit','-m',f'Publish isolated GOAL 017 V2 preview from {source}',cwd=path)
        commit=git('rev-parse','HEAD',cwd=path)
        (ROOT/'PlayCanvas/evidence/017/pages-after.txt').write_text(git('ls-tree','-r',commit,cwd=path)+'\n')
        # Explicit lease prevents overwriting concurrent Pages publication.
        git('push',f'--force-with-lease=refs/heads/gh-pages:{base}','origin','HEAD:refs/heads/gh-pages',cwd=path)
        receipt=dict(source=source,pagesBefore=base,pagesAfter=commit,protectedGitObjectsIdentical=True,changedPaths=changed,files={str(p.relative_to(DIST)):dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(DIST.rglob('*')) if p.is_file()})
        (ROOT/'PlayCanvas/evidence/017/publication.json').write_text(json.dumps(receipt,indent=2)+'\n')
    finally:
        git('worktree','remove','--force',str(path))
