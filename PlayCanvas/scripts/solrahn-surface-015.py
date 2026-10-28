"""Derive sampled surface from the verified GLB; never edit its geometry."""
import struct,json,hashlib,io
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'evidence/015'
EVIDENCE.mkdir(parents=True,exist_ok=True)
p=ROOT/'assets/solrahn-goal-015/runtime/solrahn-full-quality.glb'
data=p.read_bytes()
assert hashlib.sha256(data).hexdigest()=='f1be971167f316e505c95fdff8145d2e500e53a574121f8a56ed6cb5e7600e79'
n=struct.unpack_from('<I',data,12)[0]; g=json.loads(data[20:20+n]); buf=data[28+n:]
def acc(i):
 a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; return np.frombuffer(buf,dtype={5126:'<f4',5125:'<u4'}[a['componentType']],count=a['count']*{'VEC3':3,'VEC2':2,'VEC4':4,'SCALAR':1}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1)
prim=g['meshes'][0]['primitives'][0]; pos=acc(prim['attributes']['POSITION'])*80; uv=acc(prim['attributes']['TEXCOORD_0']); faces=acc(prim['indices']).reshape(-1,3)
# World y translation +8. Uniform scale only. No original vertex is changed.
pos[:,1]+=8
step=.25; xmin=-63; zmin=-77; nx=505; nz=617
height=np.full((nz,nx),-999.0); colors=np.zeros((nz,nx,3),dtype=np.uint8)
im=g['images'][g['textures'][g['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]; v=g['bufferViews'][im['bufferView']]; tex=np.asarray(Image.open(io.BytesIO(buf[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB'))
# Reject triangles that contain no grid point before Python rasterization; no geometry edits.
t=pos[faces]; lo=np.ceil((t[:,:,[0,2]].min(axis=1)-[xmin,zmin])/step); hi=np.floor((t[:,:,[0,2]].max(axis=1)-[xmin,zmin])/step)
candidates=faces[np.all(lo<=hi,axis=1)]; del t,lo,hi
print('candidate triangles',len(candidates),flush=True)
for f in candidates:
 t=pos[f]; x=t[:,0]; z=t[:,2]
 lo=np.ceil([(x.min()-xmin)/step,(z.min()-zmin)/step]).astype(int); hi=np.floor([(x.max()-xmin)/step,(z.max()-zmin)/step]).astype(int)
 lo=np.maximum(lo,0); hi=np.minimum(hi,[nx-1,nz-1])
 if np.any(lo>hi): continue
 den=(z[1]-z[2])*(x[0]-x[2])+(x[2]-x[1])*(z[0]-z[2])
 if abs(den)<1e-10: continue
 xx,zz=np.meshgrid(xmin+np.arange(lo[0],hi[0]+1)*step,zmin+np.arange(lo[1],hi[1]+1)*step)
 a=((z[1]-z[2])*(xx-x[2])+(x[2]-x[1])*(zz-z[2]))/den; b=((z[2]-z[0])*(xx-x[2])+(x[0]-x[2])*(zz-z[2]))/den; c=1-a-b
 yy=a*t[0,1]+b*t[1,1]+c*t[2,1]; sl=np.s_[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
 mask=(a>=-1e-6)&(b>=-1e-6)&(c>=-1e-6)&(yy>height[sl]); height[sl][mask]=yy[mask]
 tuv=uv[f].mean(axis=0); col=tex[int(tuv[1]*(tex.shape[0]-1))%tex.shape[0],int(tuv[0]*(tex.shape[1]-1))%tex.shape[1]]; colors[sl][mask]=col
np.savez(EVIDENCE/'surface.npz',height=height)
Image.fromarray(colors).save(EVIDENCE/'surface-plan.png')
print('center samples',[(z,round(height[round((z-zmin)/step),round(-xmin/step)],3)) for z in range(-60,61,5)])
print('bounds',pos.min(axis=0),pos.max(axis=0))

import numpy as np
from scipy import ndimage as nd
from PIL import Image
from pathlib import Path
h=height; smooth=nd.median_filter(h,size=3)
span=nd.maximum_filter(smooth,size=3)-nd.minimum_filter(smooth,size=3)
zz,xx=np.mgrid[0:h.shape[0],0:h.shape[1]]; x=-63+xx*.25; z=-77+zz*.25
valid=(h>-10)&(h<4)&(span<.65)&(abs(x)<29)&(abs(z)<52)
valid=nd.distance_transform_edt(valid)>.55/.25
labels,_=nd.label(valid); valid=labels==labels[308,252]
print('walk cells',valid.sum(),'lane',[(zv,valid[int((zv+77)*4),252]) for zv in range(-50,51,5)])
img=np.asarray(Image.open(EVIDENCE/'surface-plan.png')).copy(); img[valid]=img[valid]*.5+np.array([20,100,180])*.5
Image.fromarray(img).save(EVIDENCE/'walkable-overlay.png')
# Trim heightfield; mask already accounts for character radius .45 plus .1 margin.
hh=h[100:517,132:373]; vv=valid[100:517,132:373]
meta={'version':1,'sourceSha256':'f1be971167f316e505c95fdff8145d2e500e53a574121f8a56ed6cb5e7600e79','scale':80,'translation':[0,8,0],'rotation':[0,0,0],'xMin':-30,'zMin':-52,'step':.25,'width':241,'depth':417,'walkableCells':int(vv.sum()),'method':'Topmost visual-mesh triangle ray sample; local span <0.65m across 0.5m; ceiling 4m; 0.55m edge clearance; connected middle-lane component. Outer lanes inactive.'}
import json
out=ROOT/'public/assets/solrahn';out.mkdir(parents=True,exist_ok=True)
(out/'surface.json').write_text(json.dumps(meta,indent=4)+'\n'); (out/'surface.bin').write_bytes(np.round(hh*1000).clip(-32768,32767).astype('<i2').tobytes()+vv.astype('u1').tobytes())

(EVIDENCE/'surface.npz').unlink()
