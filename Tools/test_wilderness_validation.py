"""Gross-regression fixtures run the real gate; restore authored data byte-for-byte."""
import copy,json
from validate_wilderness import ROOT,LAYOUT,main
path=ROOT/LAYOUT;original=path.read_bytes();base=json.loads(original)
def reject(label,change):
 data=copy.deepcopy(base);change(data)
 try:
  path.write_text(json.dumps(data)+'\n')
  try:main()
  except (AssertionError,KeyError):print('PASS rejected: '+label)
  else:raise AssertionError('Validator accepted regression: '+label)
 finally:path.write_bytes(original)
reject('all near scenery moved to the perimeter',lambda j:[r.update(layer='MID') for r in j['placements'] if r['layer']=='NEAR'])
reject('island tree moved into playable lane',lambda j:j['placements'][0].update(position=[0,0,0]))
reject('permanently invisible perimeter scenery',lambda j:j['placements'][0].update(position=[80,0,80],zone='exterior'))
reject('negative model scale',lambda j:j['placements'][0].update(scale=[-1,1,1]))
reject('unapproved model dependency',lambda j:j['placements'][0].update(model='qn:Unapproved'))
reject('missing distant world',lambda j:[r.update(layer='MID') for r in j['placements'] if r['layer']=='FAR'])
reject('southern crown obscures lane',lambda j:j['placements'][0].update(scale=[.1,3,.1]))
reject('stale generated composition version',lambda j:j.update(compositionVersion=0))
reject('rotation variation collapses to stamped rows',lambda j:[r.update(yaw=0) for r in j['placements']])
assert path.read_bytes()==original
main()
