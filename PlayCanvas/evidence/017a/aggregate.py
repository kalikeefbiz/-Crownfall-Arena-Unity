"""Aggregate independent runs; never pool frames across runs for acceptance."""
from pathlib import Path
import json, statistics as st
root=Path(__file__).parent
out=[]
for path in sorted(root.glob('*.json')):
 if path.name.endswith('-progress.json') or path.name=='summary.json': continue
 data=json.loads(path.read_text())
 if not isinstance(data,dict) or 'results' not in data: continue
 groups={}
 for r in data['results']:
  if 'medianFrameMs' in r: groups.setdefault((r['name'],r['warmth']),[]).append(r)
 for (name,warmth),rs in groups.items():
  med=[r['medianFrameMs'] for r in rs];p95=[r['p95FrameMs'] for r in rs]
  env=[r['samples'][-1]['state']['environment'] for r in rs]
  draws=[s['estimatedWebGLDrawsPerFrame'] for r in rs for s in r['samples']]
  row=dict(file=path.name,name=name,warmth=warmth,runs=len(rs),runMedians=med,runP95s=p95,medianMs=st.median(med),p95Ms=st.median(p95),medianRange=[min(med),max(med)],medianMAD=st.median(abs(v-st.median(med)) for v in med),frameSamples=sum(sum(len(s['intervals']) for s in r['samples']) for r in rs),readyMedianMs=st.median(r['readyMs'] for r in rs),textureMiB=[e['allocations']['textures']/1048576 for e in env],drawMedian=st.median(draws),heapMBRange=[min(s['jsHeapUsed'] for r in rs for s in r['samples'])/1e6,max(s['jsHeapUsed'] for r in rs for s in r['samples'])/1e6],errors=[e for r in rs for e in r['errors']],modelCounts=[len(r['samples'][-1]['state']['summonerModels']) for r in rs])
  for r in rs:
   states=[s['state']['match'] for s in r['samples']]
   assert all(s['phase']=='active' and len(s['actors'])==6 for s in states)
   assert all(m['state']=='loaded' for m in r['samples'][-1]['state']['summonerModels'])
  actors=[a for r in rs for sample in r['samples'] for a in sample['state']['match']['actors']]
  living=[sum(not a['dead'] for a in sample['state']['match']['actors']) for r in rs for sample in r['samples']]
  row['livingActorRange']=[min(living),max(living)]
  row['drawRange']=[min(draws),max(draws)]
  row['humanPositionRange']={axis:[min(a[axis] for a in actors if a['human']),max(a[axis] for a in actors if a['human'])] for axis in ['x','z']}
  row['botDamageGrowth']=[{a['id']:a['damage']-r['samples'][0]['state']['match']['actors'][i]['damage'] for i,a in enumerate(r['samples'][-1]['state']['match']['actors']) if not a['human']} for r in rs]
  out.append(row)
base={r['warmth']:r for r in out if r['name']=='goal016' and r['file']=='baseline.json'}
for r in out:
 if r['warmth'] not in base:continue
 b=next((x for x in out if x['name']=='goal016' and x['file']==r['file'] and x['warmth']==r['warmth']),base[r['warmth']]);r['ratioTo016']=r['medianMs']/b['medianMs'];r['p95RatioTo016']=r['p95Ms']/b['p95Ms']
 r['visualAcceptanceEligible']=r['name'] in ['goal016','goal017','goal017a']
 r['gate']='PASS' if r['runs']>=3 and r['ratioTo016']<=1.15 and r['p95RatioTo016']<=1.2 else 'FAIL'
print(json.dumps(out,indent=2))
(root/'summary.json').write_text(json.dumps(out,indent=2)+'\n')
