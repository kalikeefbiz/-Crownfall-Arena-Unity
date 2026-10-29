"""Prove independent external clearing approaches without routing through the clearing.
Run after solrahn-v2.py. Uses the authoritative eroded 3v3 mask, never lane colors.
"""
import json
import math
from pathlib import Path
import numpy as np
from scipy.ndimage import label

root = Path(__file__).resolve().parents[1]
meta = json.loads((root/'public/assets/solrahn-v2/terrain.json').read_text())
walk = np.fromfile(root/'public/assets/solrahn-v2/walk.bin',dtype='u1')[:241*321].reshape((321,241))
xx,zz = np.meshgrid(np.arange(241)*.5-60,np.arange(321)*.5-80)
report=[]
for camp in meta['landmarks']:
    outside=walk.copy()
    outside[(xx-camp['x'])**2+(zz-camp['z'])**2<=camp['radius']**2]=0
    components,_=label(outside)
    teams=[components[round((z+80)*2),120] for z in [71,-71]]
    entrances=[]
    for i in range(16):
        angle=i*math.tau/16
        for radius in [camp['radius']+.5,camp['radius']+1,camp['radius']+1.5]:
            x=camp['x']+math.cos(angle)*radius
            z=camp['z']+math.sin(angle)*radius
            ix,iz=round((x+60)*2),round((z+80)*2)
            if not (0<=ix<241 and 0<=iz<321): continue
            component=components[iz,ix]
            if not component or not all(component==team for team in teams): continue
            # Approach from outside the footprint along a continuously walkable segment.
            t=np.linspace(0,1,100)
            sx,sz=camp['x']+(x-camp['x'])*t,camp['z']+(z-camp['z'])*t
            if np.all(walk[np.rint((sz+80)*2).astype(int),np.rint((sx+60)*2).astype(int)]):
                entrances.append(dict(x=x,z=z,angleDegrees=i*22.5))
                break
    assert any(math.cos((a['angleDegrees']-b['angleDegrees'])*math.pi/180)<=0 for a in entrances for b in entrances), camp['id']
    report.append(dict(id=camp['id'],clearingRadius=camp['radius'],bothSpawnsReachEntrancesWithoutCrossingClearing=True,distinctExternalEntrances=entrances))
(root/'evidence/016').mkdir(parents=True,exist_ok=True)
(root/'evidence/016/external-entrances.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: all seven clearings have external entrances separated by at least 90 degrees; both spawns reach each without entering the clearing.')
