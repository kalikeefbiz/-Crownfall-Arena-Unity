"""Bake a 1K Low-tier color/roughness atlas from the SAME four PBR families.
Linear blending, original V2 endpoints, repeat UV metres and anti-aliased sampling.
High retains the original tiled PBR maps. No terrain/gameplay outputs are written.
"""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/solrahn-surface'
W,H=1024,768
v,u=np.meshgrid(np.linspace(0,1,H),np.linspace(0,1,W),indexing='ij')
x,z=(v-.5)*120,(.5-u)*160

def sample(a,px,py,repeat=False):
    ix,iy=np.floor(px).astype(int),np.floor(py).astype(int)
    dx,dy=(px-ix)[...,None],(py-iy)[...,None]
    ny,nx=a.shape[:2]
    if repeat:
        ax,bx=ix%nx,(ix+1)%nx;ay,by=iy%ny,(iy+1)%ny
    else:
        ax,bx=np.clip(ix,0,nx-1),np.clip(ix+1,0,nx-1);ay,by=np.clip(iy,0,ny-1),np.clip(iy+1,0,ny-1)
    return (a[ay,ax]*(1-dx)+a[ay,bx]*dx)*(1-dy)+(a[by,ax]*(1-dx)+a[by,bx]*dx)*dy

weights=np.asarray(Image.open(OUT/'weights.png'),dtype=np.float32)/255
blend=sample(weights,u*1199,v*899)
blend/=blend.sum(-1,keepdims=True)
result=np.zeros((H,W,4),dtype=np.float64)
manifest=json.loads((OUT/'materials.json').read_text())
sources=[]
for i,item in enumerate(manifest['sources']):
    path=OUT/(item['asset']+'_color.webp')
    a=np.asarray(Image.open(path).convert('RGBA'),dtype=np.float32)/255
    rgb=a[:,:,:3]
    a[:,:,:3]=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    if i==0:mean=float((a[:,:,:3]@np.asarray([.2126,.7152,.0722])).mean())
    # Filter before downsampling; sigma is in source tile pixels, not world space.
    a=gaussian_filter(a,sigma=(8,8,0),mode='wrap')
    tile=sample(a,(-z/6)*1024-.5,(1-x/6)*1024-.5,True)
    result+=tile*blend[:,:,i:i+1]
    sources.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
rgb=np.clip(result[:,:,:3],0,1)
result[:,:,:3]=np.where(rgb<=.0031308,rgb*12.92,1.055*rgb**(1/2.4)-.055)
result[:,:,3]=np.clip(np.rint(result[:,:,3]*32)/32,.64,.98)
dest=OUT/'low_atlas.webp'
Image.fromarray(np.rint(np.clip(result,0,1)*255).astype('uint8')).save(dest,quality=90,method=6)
meta=dict(size=[W,H],encoding='RGB sRGB / A linear roughness; alpha is data',mapping='u=.5-worldZ/160; v=.5+worldX/120; exact source endpoints',tileMetres=6,sourceWeightsSha256=hashlib.sha256((OUT/'weights.png').read_bytes()).hexdigest(),sourceColors=sources,sourcePrefilterSigma=8,detailMeanLuminance=mean,detailStrength=.8,detailClamp=[.5,1.5],lowReads=2,debugReads=1,file=dict(path=dest.name,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
(OUT/'low-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
