"""Deterministic V2 uint16 -> shared chunked heightfield + eroded navigation.
Run from PlayCanvas with Python 3, Pillow, NumPy, SciPy. No contrast/filter/flatten.
"""
import hashlib
import io
import json
from pathlib import Path
import zipfile
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, label

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/solrahn-v2'
SOURCE = ROOT / 'assets/solrahn-v2/source/crownfall_terrain_v2_review.zip'
SHA = '17efa4455d942e565cdc35e1f0fe9c981d59c1a3bc759ff72e1d32d0dd8b6db8'
HEIGHT_SHA = 'd7d55c029cc3ba2822afdccc0ff4d730adbcbdd8868ed334d265fdba6acb8054'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
with zipfile.ZipFile(SOURCE) as archive:
    raw = archive.read('heightmap_16bit.png')
    assert hashlib.sha256(raw).hexdigest() == HEIGHT_SHA
    assert raw[24:26] == bytes([16, 0]), 'PNG must be 16-bit grayscale'
    image = Image.open(io.BytesIO(raw))
    assert image.size == (1200, 900) and image.mode == 'I;16'
    source = np.array(image, dtype=np.uint16)
    lane = np.array(Image.open(io.BytesIO(archive.read('lane_mask.png'))))
    study = np.array(Image.open(io.BytesIO(archive.read('3v3_study_region_mask.png'))))
# Image west->east is world +Z->-Z. North->south is world -X->+X.
# Keep Blue behind its existing competitive camera (+Z), no rules-axis change.
NX, NZ, WIDTH, DEPTH, SCALE = 145, 193, 120, 160, 8

def raster(a, x, z):
    u = np.clip((.5-z/DEPTH)*1199, 0, 1199)
    v = np.clip((.5+x/WIDTH)*899, 0, 899)
    i, j = np.floor(u).astype(int), np.floor(v).astype(int)
    du, dv = u-i, v-j
    return (a[j,i]*(1-du)+a[j,np.minimum(i+1,1199)]*du)*(1-dv)+(a[np.minimum(j+1,899),i]*(1-du)+a[np.minimum(j+1,899),np.minimum(i+1,1199)]*du)*dv

x, z = np.meshgrid(np.linspace(-60,60,NX), np.linspace(-80,80,NZ))
heights = np.rint(raster(source,x,z)).astype('<u2')
metres = heights.astype(float)*SCALE/65535
# The exact two rendered triangle planes; never a different bilinear collision floor.
def floor(x,z):
    fx, fz = np.clip((x+60)*1.2,0,NX-1.000001), np.clip((z+80)*1.2,0,NZ-1.000001)
    ix, iz = np.floor(fx).astype(int), np.floor(fz).astype(int)
    a,b=fx-ix,fz-iz
    h00,h10,h01,h11=metres[iz,ix],metres[iz,ix+1],metres[iz+1,ix],metres[iz+1,ix+1]
    return np.where(a+b<=1,h00+(h10-h00)*a+(h01-h00)*b,h11+(h01-h11)*(1-a)+(h10-h11)*(1-b))

xx,zz = np.meshgrid(np.linspace(-60,60,241),np.linspace(-80,80,321))
# Conservative footprint: max gradient of all triangle planes touching each nav cell.
hx=np.stack([(metres[:-1,1:]-metres[:-1,:-1])/(5/6),(metres[1:,1:]-metres[1:,:-1])/(5/6)])
hz=np.stack([(metres[1:,:-1]-metres[:-1,:-1])/(5/6),(metres[1:,1:]-metres[:-1,1:])/(5/6)])
tri_slope=np.max(np.sqrt(hx*hx+hz*hz),axis=0)
slopes=np.zeros(xx.shape)
for dx in [-.25,.25]:
    for dz in [-.25,.25]:
        ix=np.clip(((xx+dx+60)*1.2).astype(int),0,NX-2)
        iz=np.clip(((zz+dz+80)*1.2).astype(int),0,NZ-2)
        slopes=np.maximum(slopes,tri_slope[iz,ix])
raw_walk=(slopes<=np.tan(np.deg2rad(35)))
raw_walk[[0,-1],:]=False;raw_walk[:,[0,-1]]=False
# Validate/interpret study mask as continuous two-Wilderness envelope. Authored gates
# match its unambiguous central stripe, with radius + half-cell diagonal safety.
mode=raw_walk & (raster(study,xx,zz)>254)
full=raw_walk.copy()
walks=[]
for mask in [mode,full]:
    safe=distance_transform_edt(mask)*.5 >= .45+np.sqrt(2)*.25
    components,_=label(safe)
    safe &= components==components[160,120]
    walks.append(safe.astype('u1'))
OUT.mkdir(parents=True,exist_ok=True)
(ROOT/'evidence/016').mkdir(parents=True,exist_ok=True)
(OUT/'height.u16').write_bytes(heights.tobytes())
(OUT/'walk.bin').write_bytes(walks[0].tobytes()+walks[1].tobytes())
# Debug lane field is tiny semantic data, never used as collision.
(OUT/'lane.bin').write_bytes((raster(lane,x,z)>127).astype('u1').tobytes())
landmarks=[('north-mobility','mobility',.16,.34),('north-cooldown','cooldown',.59,.33),('north-defense','defense',.85,.335),('south-defense','defense',.16,.67),('south-cooldown','cooldown',.50,.675),('south-mobility','mobility',.84,.67),('major','major',.375,.315)]
marks=[dict(id=id,type=t,x=round((v-.5)*120,3),z=round((.5-u)*160,3),radius=3 if t!='major' else 4,active=t=='mobility') for id,t,u,v in landmarks]
# Error at every original source pixel, not just a favourable sample.
sx,sz=np.meshgrid((np.arange(900)/899-.5)*120,(.5-np.arange(1200)/1199)*160,indexing='ij')
error=np.abs(floor(sx,sz)-source.astype(float)*SCALE/65535)
meta=dict(version=2,sourceSha256=SHA,heightmapSha256=HEIGHT_SHA,sourceSize=[1200,900],sourceRange=[int(source.min()),int(source.max())],normalization='unsigned16 / 65535 * 8 metres; no autocontrast',mapping='x=(v/899-.5)*120; z=(.5-u/1199)*160; Y up',width=WIDTH,depth=DEPTH,nx=NX,nz=NZ,verticalScale=SCALE,navWidth=241,navDepth=321,navStep=.5,radius=.45,erosion=.45+np.sqrt(2)*.25,maxSlopeDegrees=35,maxStepMetres=.3,modeX=[-28.8,28.8],chunkCells=24,topTriangles=144*192*2,edgeTriangles=2*(144+192)*2,totalTriangles=56640,landmarks=marks,errorMetres=dict(max=float(error.max()),p95=float(np.percentile(error,95)),mean=float(error.mean())),files={n:dict(bytes=(OUT/n).stat().st_size,sha256=hashlib.sha256((OUT/n).read_bytes()).hexdigest()) for n in ['height.u16','walk.bin','lane.bin']})
(OUT/'terrain.json').write_text(json.dumps(meta,indent=2)+'\n')
# Engineering evidence uses original blueprint orientation (north at top).
for name,data in [('height',floor(xx,zz)/12),('slope',np.minimum(slopes/np.tan(np.deg2rad(35)),1)),('walkability',walks[0])]:
    a=data.T[:, ::-1]
    rgb=np.stack([a*100+35,a*145+40,a*110+45],axis=-1).astype('u1')
    im=Image.fromarray(rgb).resize((960,720))
    draw=ImageDraw.Draw(im); draw.text((12,12),'GOAL 016 / '+name.upper()+' / ORIGINAL V2 DATA',fill='white')
    for m in marks:
        px=(.5-m['z']/160)*960;py=(m['x']/120+.5)*720
        draw.ellipse((px-8,py-8,px+8,py+8),outline='white',width=2);draw.text((px+10,py),m['id']+(' (existing Mobility)' if m['active'] else ' (inactive)'),fill='white')
    im.save(ROOT/'evidence/016'/f'{name}.png')
print(json.dumps(meta,indent=2))
