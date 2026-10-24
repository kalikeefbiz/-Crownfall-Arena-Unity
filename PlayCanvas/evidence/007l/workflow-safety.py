"""Static contract and trigger probes for the exact checked-in workflow.
Requires environment PyYAML and the existing npm-installed picomatch, no project dependency.
These are offline assertions, not a substitute for hosted Actions run evidence.
"""
import json, subprocess
from pathlib import Path
import yaml
repo=Path('/workspace/crownfall')
w=yaml.load((repo/'.github/workflows/publish-crownfall-playcanvas.yml').read_text(), Loader=yaml.BaseLoader)
v=w['jobs']['validate']; p=w['jobs']['publish']; out=[]
def check(name, result):
    assert result, name
    out.append({'check':name, 'passed':True})
check('publication depends on successful validation', p['needs']=='validate' and 'always()' not in p['if'])
check('publication restricted to source-branch push or authorized dispatch', p['if']=="${{ github.ref == 'refs/heads/playcanvas-port' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch') }}")
check('read permission by default; write only in publish', w['permissions']=={'contents':'read'} and 'permissions' not in v and p['permissions']=={'contents':'write'})
check('serial production releases; PR supersession only', w['concurrency']['cancel-in-progress']=="${{ github.event_name == 'pull_request' }}" and "'crownfall-playcanvas-preview'" in w['concurrency']['group'])
required=['npm ci', 'npm test', 'npm run typecheck', 'npm run lint', 'npm run fmt', 'npm run build']
commands=[s.get('run') for s in v['steps']]
check('all required checks exist and fail closed', all(c in commands for c in required) and not any('continue-on-error' in s for s in v['steps']))
for job in (v,p):
    checkout=next(s for s in job['steps'] if s.get('uses','').startswith('actions/checkout@'))
    check('immutable checkout for '+('validate' if job is v else 'publish'), checkout['with']['ref']=='${{ github.sha }}' and checkout['with']['persist-credentials']=='false')
browser=next(s for s in v['steps'] if s['name']=='Complete production browser suite')
check('full discovery, one worker, explicit no retries, no test exclusion', browser['run']=='npm run test:browser -- --workers=1 --retries=0 --forbid-only --global-timeout=3600000 --reporter=line,html --trace=retain-on-failure')
check('browser failure evidence unconditional', next(s for s in v['steps'] if s['name']=='Preserve browser evidence even on failure')['if']=='${{ always() }}')
up=next(s for s in v['steps'] if s['name']=='Upload validated production build')
down=next(s for s in p['steps'] if s['name']=="Download this run's validated build")
check('same run/attempt immutable artifact, no publication rebuild', up['with']['name']==down['with']['name'] and 'github.sha' in up['with']['name'] and 'github.run_attempt' in up['with']['name'] and not any('npm ' in s.get('run','') for s in p['steps']))
check('build identity, checksums and source freshness checked before publish', all(x in p['steps'][-2]['run'] for x in ['sha256sum --check dist.sha256', 'cat validated-sha.txt', 'git/ref/heads/playcanvas-port', 'exit 1']))
settings=p['steps'][-1]['with']
check('existing gh-pages subtree and root preservation', all(settings[k]==val for k,val in {'publish_dir':'./validated-build/dist','publish_branch':'gh-pages','destination_dir':'playcanvas','keep_files':'true','force_orphan':'false','enable_jekyll':'false'}.items()))
cases=[
('source',['PlayCanvas/src/main.ts'],True),
('unit tests',['PlayCanvas/tests/runtime-contracts.test.ts'],True),
('browser tests',['PlayCanvas/tests/browser/riven-model.spec.ts'],True),
('dependencies',['PlayCanvas/package-lock.json'],True),
('build config',['PlayCanvas/vite.config.ts'],True),
('workflow config',['.github/workflows/publish-crownfall-playcanvas.yml'],True),
('other workflow config',['.github/workflows/validate-crownfall-current.yml'],True),
('root report',['PlayCanvas/TASK_007L_VERIFICATION.md'],False),
('nested documentation',['PlayCanvas/docs/guide.md'],False),
('historical evidence',['PlayCanvas/evidence/007l/log.txt'],False),
('audit',['PlayCanvas/CODE_HEALTH_AUDIT.md'],False),
('mixed docs/source',['PlayCanvas/TASK_007L_VERIFICATION.md','PlayCanvas/src/main.ts'],True),
('Unity unrelated',['Assets/Test.cs'],False)]
js='''const pm=require('picomatch'); const input=JSON.parse(process.argv[1]); const result=input.cases.map(([label,paths,expected])=>{ const actual=paths.some(path=>{let match=false;for(const pattern of input.patterns){const negative=pattern.startsWith('!');if(pm(negative?pattern.slice(1):pattern,{dot:true})(path))match=!negative;}return match;});return {label,paths,expected,actual};});console.log(JSON.stringify(result));'''
for event in ['push','pull_request']:
    r=subprocess.run(['node','-e',js,json.dumps({'patterns':w['on'][event]['paths'],'cases':cases})],cwd=repo/'PlayCanvas',capture_output=True,text=True,check=True)
    results=json.loads(r.stdout)
    for result in results: check(event+' trigger: '+result['label'], result['actual']==result['expected'])
check('push source branch filter', w['on']['push']['branches']==['playcanvas-port'])
check('PR sources/targets unrestricted for validation', 'branches' not in w['on']['pull_request'])
check('manual validation available without path filters', 'workflow_dispatch' in w['on'])
print(json.dumps({'assertions':out, 'count':len(out)},indent=2))
