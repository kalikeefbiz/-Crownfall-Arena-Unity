"""Authored formation recipe; deterministic source data, never runtime scattering.
Run deliberately to reconstruct M15.1 composition. Clearance failures stop authoring.
"""
import json,math
from pathlib import Path
from validate_wilderness import bounds,ISLANDS
from m15_presentation import terrain_height
ROOT=Path(__file__).resolve().parents[1]
models={m['id']:m for m in json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text())['models']}
rows=[]
def put(name,id,x,z,sx=1,sy=None,sz=None,yaw=0,layer='NEAR',shadow=False,y=None):
 sy=sx if sy is None else sy;sz=sx if sz is None else sz
 r=dict(name=name,model=id,layer=layer,role=name.split('_')[0],zone='pocket',position=[x,round(terrain_height(x,z)-.16,3) if y is None else y,z],scale=[sx,sy,sz],yaw=yaw,castShadows=shadow)
 b=bounds(r,models)
 if b[3]<=-34 or b[0]>=34 or b[5]<=-32 or b[2]>=32:r['zone']='exterior'
 assert b[5]<=-12.5 or b[2]>=12.5 or r['zone']=='exterior',(name,'lane',b)
 for cx,cz,radius in [(-22,-22,2.4),(22,-22,2.4),(-18,24,2.4),(18,24,2.4),(-7,-27,2.4),(7,-27,2.4),(0,26,3.5)]:
  dx=max(b[0]-cx,0,cx-b[3]);dz=max(b[2]-cz,0,cz-b[5]);assert dx*dx+dz*dz>=radius*radius,(name,'objective')
 for rx,rz,w,d in [(-22,-17,5,10),(22,-17,5,10),(-18,18,5,12),(18,18,5,12),(-7,-19.5,4,15),(7,-19.5,4,15),(0,19,8,14)]:
  assert not(b[0]<rx+w/2 and b[3]>rx-w/2 and b[2]<rz+d/2 and b[5]>rz-d/2),(name,'route',b)
 if layer=='NEAR' and z<0:assert b[4]<=6.8,(name,'sightline')
 rows.append(r)
# Seven deliberately unequal geological gardens, interrupted by the existing approach corridors.
formations=[('westgrove',-30.8,14.8,1),('rosecloister',-10.7,15.0,1),('aetherwood',10.4,15.3,1),('eastcrag',30.6,15.6,1),('westforeground',-31.4,-15.5,-1),('southroots',-13.5,-14.9,-1),('southruin',13.4,-15.2,-1),('watchglen',-24.4,14.8,1),('brokenarcade',24.2,15.0,1),('eastforeground',31.2,-15.3,-1)]
for n,x,z,side in formations:
 narrow=.52 if n in ('watchglen','brokenarcade') else 1
 # Bedding planes, upright backstone and smaller toes; rich rocks replace box-shaped backing.
 for i,(dx,dz,sx,sy,sz,rot) in enumerate([(-.8,-side*.7,2.0,1.9 if side>0 else 1.55,.52,-4),(1.1,side*1.1,1.2,2.25 if side>0 else 1.6,.8,12),(-1.3,side*3.6,1.35,1.15,.8,-18)]):
  put(n+'_bedrock_'+str(i),'qn:Rock_Medium_'+str(i%3+1),x+dx*narrow,z+dz,sx*narrow,sy,sz,yaw=rot,shadow=i==1)
 for i,(dx,dz,w,h,depth,rot) in enumerate([(-1.3,-side*.2,1.20,.64,.55,4),(1.2,side*1.3,1.15,.54,.57,-6),(.15,side*3.3,1.08,.58,.68,12)]):
  put(n+'_canopy_'+str(i),'qn:CommonTree_3' if i==0 and side>0 else 'qn:CommonTree_1' if i!=1 or side<0 else 'qn:Pine_5',x+dx*narrow,(13.9 if i==0 and side>0 else z+dz),w*narrow,(.70 if i==0 and side>0 else h if side>0 else h*.65),depth,yaw=rot,shadow=i==0)
 for i,(dx,dz,w,rot) in enumerate([(-1.9,-side*.35,.9,15),(.4,side*.2,1.15,42),(2.0,side*1.7,.8,-28),(-1.0,side*4.5,1.3,80)]):
  put(n+'_understory_'+str(i),'qn:Bush_Common',x+dx*narrow,z+dz,w*narrow,.65,w*.7,yaw=rot)
 for i,dx in enumerate([-2.0,.2,2.2]):put(n+'_fern_'+str(i),'qn:Fern_1',x+dx*narrow,z-side*1.45,.65,.65,.45,yaw=14+i*41)
# Recognizable northern ruins: a buried arch and staggered masonry beside the rose grove.
put('rosecloister_arch','qm:DoorFrame_Round_Brick',-10.6,14.5,2.4,1.65,1.6,yaw=-9,shadow=True)
put('rosecloister_wall','qm:Wall_UnevenBrick_Straight',-12.3,19.2,2.0,1.05,1.3,yaw=12,shadow=True)
put('rosecloister_stair','qm:Stairs_Exterior_Straight',-10.8,22,1.2,.9,1.1,yaw=-5)
put('southruin_arch','qm:DoorFrame_Round_Brick',13.3,-16.5,1.7,1.1,1.1,yaw=8)
# One landmark twisted tree in the Aether grove; broad rock roots anchor its canopy.
put('aetherwood_twisted_landmark','qn:TwistedTree_1',10.4,15.0,.50,.28,.30,yaw=0,layer='NEAR',shadow=True)
# Tall textured forest behind the near groves. No identical tree rows.
for i,(x,z,kind,w,h,yaw) in enumerate([(-31,24,'CommonTree_3',1.0,.82,17),(-11,24,'CommonTree_3',1.12,.79,-28),(11,28,'Pine_1',1.15,1.0,47),(31,25,'CommonTree_3',1.2,.88,83),(-30,-24,'Pine_1',1,.55,-9),(-13,-24,'CommonTree_3',.85,.5,68),(13,-24,'Pine_1',1.1,.6,104),(30,-24,'CommonTree_1',1.1,.55,192)]):
 put('foresttier_'+str(i),'qn:'+kind,x,z,w,h,.85,yaw=yaw,layer='MID')
# Fragmented skyline structures, each partially embedded in rock rather than marching castle walls.
for i,(id,x,z,sc,rot) in enumerate([('kc:tower-square-arch',-29,29,.75,15),('kc:tower-hexagon-top',-10,31,.8,-8),('kc:wall-corner-half-tower',29,29,.7,67),('kc:wall-half-modular',11,32,.8,-18),('kn:statue_columnDamaged',-9,28,.8,27)]):
 put('ruinskyline_'+str(i),id,x,z,sc,sc,sc,yaw=rot,layer='MID')
# Economical distant forms. These silhouettes are backed by terrain and subdued by fog.
for i,(x,z,id,sx,sy,sz,rot) in enumerate([(-31,35,'cliff_large_rock',1.1,.7,.8,-4),(8,37,'cliff_cornerLarge_rock',1.2,.9,1.2,28),(30,36,'rock_tallA',.85,1.15,.8,-16),(-37,22,'rock_tallG',.85,1.5,.85,12),(37,21,'rock_tallG',1,1.2,1,53)]):
 put('geological_horizon_'+str(i),'kn:'+id,x,z,sx,sy,sz,yaw=rot,layer='FAR')
for i,(x,z,id,sc,rot) in enumerate([(-29,32,'tree_pineTallA',.8,11),(-24,33,'tree_pineTallC',.9,42),(-12,34,'tree_pineTallC',.8,-13),(-7,34,'tree_default_dark',.8,37),(3,34,'tree_pineTallA',.9,80),(14,34,'tree_pineTallC',1.0,63),(23,32,'tree_default_dark',.8,-22),(31,32,'tree_pineTallA',.9,44),]):
 put('farforest_'+str(i),'kn:'+id,x,z,sc,sc,sc,yaw=rot,layer='FAR')
layout=dict(schemaVersion=1,compositionVersion=3,requiredUnityVersion='6000.3.10f1',textureTier='Mobile',startingHead='fc359e4ca1ebd00151d0a8618546beb658d3142d',artDirection='Overgrown cloister / ancient forest / Aether bedrock. Authored interrupted geological gardens; no physics.',placements=rows,retiredShippingCandidates=['kn:cliff_block_rock'],qualitySelection='Rich textured near formations; Kenney cones/fortifications confined to skyline; oversized box-shaped cliff retired')
(ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').write_text(json.dumps(layout,indent=2)+'\n');print('Authored',len(rows),'placements')
