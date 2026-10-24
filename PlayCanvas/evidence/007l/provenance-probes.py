"""Execute the checked-in publication guard in a local nonpublishing sandbox."""
import hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
import yaml
repo=Path('/workspace/crownfall')
ev=Path('/workspace/007l-evidence')
w=yaml.load((repo/'.github/workflows/publish-crownfall-playcanvas.yml').read_text(),Loader=yaml.BaseLoader)
script=next(s['run'] for s in w['jobs']['publish']['steps'] if s['name']=='Verify build provenance and reject stale releases')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
results=[]
with tempfile.TemporaryDirectory() as temporary:
    root=Path(temporary); bundle=root/'bundle'; bundle.mkdir()
    shutil.copytree(repo/'PlayCanvas/dist',bundle/'dist')
    paths=sorted((bundle/'dist').rglob('*'))
    manifest=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p.relative_to(bundle))+'\n' for p in paths if p.is_file())
    (bundle/'dist.sha256').write_text(manifest)
    (bundle/'validated-sha.txt').write_text(sha+'\n')
    bindir=root/'bin'; bindir.mkdir(); gh=bindir/'gh'
    gh.write_text('#!/bin/sh\nprintf "%s\\n" "$PROBE_BRANCH_SHA"\n'); gh.chmod(0o755)
    env=dict(os.environ,PATH=str(bindir)+':'+os.environ['PATH'],EXPECTED_SHA=sha,REPOSITORY='local/nonpublishing',PROBE_BRANCH_SHA=sha,GH_TOKEN='nonpublishing-probe')
    original=(bundle/'dist/index.html').read_bytes()
    for name,expected in [('validated-current',0),('wrong-revision',1),('tampered-build',1),('stale-source',1)]:
        (bundle/'validated-sha.txt').write_text(('0'*40 if name=='wrong-revision' else sha)+'\n')
        (bundle/'dist/index.html').write_bytes(original+(b'tampered' if name=='tampered-build' else b''))
        env['PROBE_BRANCH_SHA']='f'*40 if name=='stale-source' else sha
        p=subprocess.run(['bash','-e','-c',script],cwd=bundle,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        assert (p.returncode==0)==(expected==0), name
        (ev/f'provenance-{name}.txt').write_text(p.stdout)
        results.append({'probe':name,'exit_code':p.returncode,'expected_pass':expected==0})
print(json.dumps(results,indent=2))
