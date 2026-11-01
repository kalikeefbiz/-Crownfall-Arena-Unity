import json
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'evidence/019'
rows=json.loads((out/'performance.json').read_text());assert len(rows)==6
summary=[]
lines=['One sequential 12-second sample per engine/build, 844×390 DPR1 Low, after a','three-second warmup. Fixed six-actor scene, real wall rendering. No other','browser jobs run during sampling. This is a diagnostic comparison, not a','repeated statistical study or live-combat benchmark.','', '`017b-equivalent` is the immutable GOAL 018A baseline with its enclosure disabled;','the underlying GOAL 017B terrain, actors and monitor are retained, with dormant','enclosure code present. It is not claimed to be a newly built exact-source 017B.','', '| Engine | Build | Frames | Mean FPS | Mean ms | p95 ms | Draws | Textures MiB | Geometry MiB |','|---|---|---:|---:|---:|---:|---:|---:|---:|']
for r in rows:
 assert not r['errors']
 assert len(r['last']['summonerModels'])==6 and all(m['state']=='loaded' for m in r['last']['summonerModels'])
 a=r['last']['environment']['allocations']
 row=dict(engine=r['engine'],build=r['build'],samples=len(r['intervals']),meanFps=r['meanFps'],meanMs=r['meanFrameMs'],p95Ms=r['p95'],draws=r['last']['environment']['drawCalls'],textures=a['textures'],geometry=a['vertexBuffers']+a['indexBuffers'],jsHeap=r['jsHeap'])
 summary.append(row)
 lines.append(f"| {row['engine']} | {row['build']} | {row['samples']} | {row['meanFps']:.2f} | {row['meanMs']:.1f} | {row['p95Ms']:.1f} | {row['draws']} | {row['textures']/1048576:.2f} | {row['geometry']/1048576:.2f} |")
lines+=['','Small sample counts make tails particularly uncertain. GPU figures are engine','allocation accounting, not native residency. JS heap is available only in','Chromium and is not an allocation-rate or native-memory measurement. Raw frame','intervals, snapshots and heap observations are retained in `performance.json`.','']
for engine in ['chromium','webkit']:
 a=next(r for r in summary if r['engine']==engine and r['build']=='018a');b=next(r for r in summary if r['engine']==engine and r['build']=='019')
 lines.append(f"{engine}: mean frame-time change versus 018A **{(b['meanMs']/a['meanMs']-1)*100:+.1f}%**; draws **{a['draws']} → {b['draws']}**. A one-run software result cannot establish device performance parity.")
(out/'performance-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
report=out.parents[1]/'GOAL_019_REPORT.md';s=report.read_text().replace('<!-- PERFORMANCE -->','\n'.join(lines));report.write_text(s)
print(json.dumps(summary,indent=2))
