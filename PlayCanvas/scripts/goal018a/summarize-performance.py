import json,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'evidence/018a'
rows=json.loads((OUT/'performance-raw.json').read_text());assert len(rows)==12
summary={'physicalIPhone':'NOT VERIFIED','method':'3 alternating AB/BA rounds per engine; 844x390 DPR1 Low; frozen matching six-actor scene, real-time rendering; 4s warmup, 12s sample','engines':{}}
lines=['| Software browser | Median FPS before → after | Mean frame ms before → after | p95 ms before → after | Frame-time change |','|---|---:|---:|---:|---:|']
for engine in ['chromium','webkit']:
 sides={}
 for name in ['before','after']:
  r=[x for x in rows if x['engine']==engine and x['name']==name];assert len(r)==3
  assert all(not x['errors'] for x in r)
  assert all(len(x['final']['summonerModels'])==6 and all(m['state']=='loaded' for m in x['final']['summonerModels']) for x in r)
  if name=='after':assert all(x['final']['environment']['enclosure']['rocks']==9 and x['final']['environment']['enclosure']['trees']==3 for x in r)
  med=lambda key:statistics.median(x[key] for x in r)
  alloc={key:statistics.median(x['final']['environment']['allocations'][key] for x in r) for key in ['textures','vertexBuffers','indexBuffers']}
  heap=[next((m['value'] for m in x.get('cdpMetrics') or [] if m['name']=='JSHeapUsedSize'),None) for x in r];heap=[v for v in heap if v is not None]
  sides[name]=dict(fps=med('meanFps'),fpsRange=[min(x['meanFps'] for x in r),max(x['meanFps'] for x in r)],meanFrameMs=med('meanFrameMs'),p95FrameMs=med('p95FrameMs'),renderedFps=med('renderedFps'),gpuAccounting=alloc,drawCalls=statistics.median(x['final']['environment']['drawCalls'] for x in r),jsHeapBytes=statistics.median(heap) if heap else None,renderer=r[0]['renderer'])
 a,b=sides['before'],sides['after'];sides['delta']={'fpsPercent':(b['fps']/a['fps']-1)*100,'meanFrameTimePercent':(b['meanFrameMs']/a['meanFrameMs']-1)*100,'gpuBytes':{k:b['gpuAccounting'][k]-a['gpuAccounting'][k] for k in a['gpuAccounting']},'drawCalls':b['drawCalls']-a['drawCalls']}
 summary['engines'][engine]=sides
 lines.append(f"| {engine} | {a['fps']:.2f} → {b['fps']:.2f} | {a['meanFrameMs']:.1f} → {b['meanFrameMs']:.1f} | {a['p95FrameMs']:.1f} → {b['p95FrameMs']:.1f} | {sides['delta']['meanFrameTimePercent']:+.1f}% |")
(OUT/'performance-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
c=summary['engines']['chromium'];a,b=c['before'],c['after']
lines+=['',f"Matched Chromium draw calls: **{a['drawCalls']:g} → {b['drawCalls']:g}**. PlayCanvas texture accounting: **{a['gpuAccounting']['textures']/1048576:.2f} → {b['gpuAccounting']['textures']/1048576:.2f} MiB**. Vertex buffers: **{a['gpuAccounting']['vertexBuffers']/1048576:.3f} → {b['gpuAccounting']['vertexBuffers']/1048576:.3f} MiB**; index buffers: **{a['gpuAccounting']['indexBuffers']/1048576:.3f} → {b['gpuAccounting']['indexBuffers']/1048576:.3f} MiB**.",'']
if a['jsHeapBytes'] is not None:lines += [f"Chromium median JS heap observation: **{a['jsHeapBytes']/1048576:.2f} → {b['jsHeapBytes']/1048576:.2f} MiB**. WebKit JS heap/native memory are unavailable; GPU accounting is not physical residency.",'']
lines += ['**Performance acceptance remains open.** The software-renderer regression is measurable; this report does not claim GOAL 017B performance parity or physical iPhone performance. The smaller candidate reduced asset bytes, GPU memory and draw submissions, but did not eliminate all comparative rendering cost. Actual iPhone Safari testing is required before approving expansion.','', 'Three-round ranges, renderer strings, all intervals and memory observations: [summary](evidence/018a/performance-summary.json) / [raw samples](evidence/018a/performance-raw.json). The benchmark is a matched scene presentation test; functional combat is verified separately.']
report=ROOT/'GOAL_018A_REPORT.md';s=report.read_text();assert '<!-- PERFORMANCE_RESULTS -->' in s;s=s.replace('<!-- PERFORMANCE_RESULTS -->','\n'.join(lines));report.write_text(s)
print(json.dumps(summary,indent=2))
