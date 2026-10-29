"""Material-only weights. Never writes terrain, lane, navigation or game data.
Derives actual triangle-plane slope/curvature + source lane footprint + runtime
landmark radii. Raw raster is 1200x900: x=(v-.5)*120, z=(.5-u)*160.
"""
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZipFile
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/solrahn-surface'
EVIDENCE=ROOT/'evidence/017'
OUT.mkdir(parents=True,exist_ok=True)
EVIDENCE.mkdir(parents=True,exist_ok=True)
terrain=ROOT/'public/assets/solrahn-v2'
meta=json.loads((terrain/'terrain.json').read_text())
source=ROOT/'assets/solrahn-v2/source/crownfall_terrain_v2_review.zip'
assert hashlib.sha256(source.read_bytes()).hexdigest()==meta['sourceSha256']
with ZipFile(source) as archive:
    lane=np.asarray(Image.open(io.BytesIO(archive.read('lane_mask.png'))).convert('L'))>127
heights=np.frombuffer((terrain/'height.u16').read_bytes(),dtype='<u2').reshape(meta['nz'],meta['nx'])*8/65535
W,H=1200,900
v,u=np.meshgrid(np.linspace(0,1,H),np.linspace(0,1,W),indexing='ij')
x,z=(v-.5)*120,(.5-u)*160
fx,fz=np.clip((x+60)*1.2,0,meta['nx']-1.000001),np.clip((z+80)*1.2,0,meta['nz']-1.000001)
ix,iz=np.floor(fx).astype(int),np.floor(fz).astype(int)
a,b=fx-ix,fz-iz
h00,h10,h01,h11=heights[iz,ix],heights[iz,ix+1],heights[iz+1,ix],heights[iz+1,ix+1]
h=np.where(a+b<=1,h00+(h10-h00)*a+(h01-h00)*b,h11+(h01-h11)*(1-a)+(h10-h11)*(1-b))
gx=np.where(a+b<=1,h10-h00,h11-h01)*1.2
gz=np.where(a+b<=1,h01-h00,h11-h10)*1.2
slope=gaussian_filter(np.hypot(gx,gz),5.0)
relief=h-gaussian_filter(h,30)
curvature=gaussian_filter(h,4)-gaussian_filter(h,18)

def smooth(a,b,t):
    q=np.clip((t-a)/(b-a),0,1)
    return q*q*(3-2*q)

sampling=(120/(H-1),160/(W-1))
# Signed distance avoids a binary border at the true lane edge.
inside=distance_transform_edt(lane,sampling=sampling)
outside=distance_transform_edt(~lane,sampling=sampling)
road=smooth(-1.5,1.0,inside-outside)
valley=1-smooth(.7,3.8,gaussian_filter(h,10))
forest=np.clip(.60+.20*smooth(-.3,.45,relief)+.15*smooth(-.1,.25,curvature)-.25*valley,.32,.88)
rock=smooth(.38,.92,slope)*(.75+.25*smooth(1,5,h))
weights=np.stack([np.full_like(h,.035),1-forest,forest,rock],axis=-1)
weights[:,:,:3]*=(1-rock[:,:,None]*.8)
weights/=weights.sum(-1,keepdims=True)
# Road interiors are >=94% dirt; outer shoulders transition without changing width.
dirt=np.asarray([.95,.045,.004,.001])
weights=weights*(1-road[:,:,None])+dirt*road[:,:,None]
for m in meta['landmarks']:
    distance=np.hypot(x-m['x'],z-m['z'])
    clearing=1-smooth(m['radius']-.5,m['radius']+1.5,distance)
    weights=weights*(1-clearing[:,:,None])+dirt*clearing[:,:,None]
# Mild, broad variation comes from existing terrain, not painted arbitrary trails.
weights=np.maximum(weights,0)
weights/=weights.sum(-1,keepdims=True)
scaled=weights*255
encoded=np.floor(scaled).astype('uint8')
# Largest-remainder quantization: every pixel sums to exactly 255.
remainder=255-encoded.sum(-1)
order=np.argsort(-(scaled-encoded),axis=-1,kind='stable')
for rank in range(3):
    np.put_along_axis(encoded,order[:,:,rank:rank+1],np.take_along_axis(encoded,order[:,:,rank:rank+1],axis=-1)+(remainder>rank)[:,:,None],axis=-1)
assert np.isfinite(weights).all() and np.all(encoded.astype('uint16').sum(-1)==255)
Image.fromarray(encoded).save(OUT/'weights.png',optimize=True)
colors=np.asarray([[166,121,80],[128,144,86],[64,103,80],[115,120,120]])
Image.fromarray(np.rint(weights@colors).astype('uint8')).save(EVIDENCE/'weight-zones.png')
for i,name in enumerate(['dirt','grass','forest','rock']):
    Image.fromarray(encoded[:,:,i]).save(EVIDENCE/('weight-'+name+'.png'))
receipt=dict(encoding='R dirt / G grass / B forest / A rock; linear data, alpha is NOT transparency',size=[W,H],mapping=meta['mapping'],sourceSha256=meta['sourceSha256'],runtimeHeightSha256=meta['files']['height.u16']['sha256'],landmarks=meta['landmarks'],sumRange=[int(encoded.sum(-1).min()),int(encoded.sum(-1).max())],slopeRange=[float(slope.min()),float(slope.max())],meanWeights=weights.mean((0,1)).tolist(),laneInteriorMinDirt=float(weights[inside>1,0].min()),files={'weights.png':dict(sha256=hashlib.sha256((OUT/'weights.png').read_bytes()).hexdigest(),bytes=(OUT/'weights.png').stat().st_size)})
(OUT/'weights.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
