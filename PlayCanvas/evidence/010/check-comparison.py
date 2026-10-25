import json,pathlib
root=pathlib.Path(__file__).parent
before=json.loads((root/'before-all.json').read_text())
after=json.loads((root/'after-all.json').read_text())
for name in ['match','ability']:
 b=next(v['snapshot'] for v in before['views'] if v['name']==name)
 a=next(v['snapshot'] for v in after['views'] if v['name']==name)
 assert a['match']==b['match'],name+' match state'
 assert a['combat']==b['combat'],name+' combat state'
 for key in ['camera','lookTarget','follow']:
  for axis in a['territory'][key]: assert abs(a['territory'][key][axis]-b['territory'][key][axis])<0.00001
 print(name,'matched authoritative state and camera')
report={'matchedState':True,'cameraToleranceMetres':0.00001,'views':['match','ability'],'viewport':after['viewport'],'deviceScaleFactor':2}
(root/'comparison.json').write_text(json.dumps(report,indent=4)+'\n')
