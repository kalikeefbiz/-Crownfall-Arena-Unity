import json,numpy as np,sys,hashlib
from pathlib import Path
r=Path(sys.argv[1]);p=np.load(r/'working/source-topology/positions.npy',mmap_mode='r');f=np.load(r/'working/source-topology/faces.npy',mmap_mode='r');uv=np.load(r/'working/source-topology/uv.npy',mmap_mode='r')
counts=dict(degenerate_triangles_area_below_1e_16=0,upward_triangles_normal_z_above_085=0,downward_triangles_normal_z_below_minus085=0);area=0.;up_area=0.
for start in range(0,len(f),100000):
 t=p[f[start:start+100000]];n=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);mag=np.linalg.norm(n,axis=1);nz=n[:,2]/np.maximum(mag,1e-30);area+=mag.sum()/2;up_area+=mag[nz>.85].sum()/2
 counts['degenerate_triangles_area_below_1e_16']+=int((mag<2e-16).sum());counts['upward_triangles_normal_z_above_085']+=int((nz>.85).sum());counts['downward_triangles_normal_z_below_minus085']+=int((nz<-.85).sum())
dictout=dict(**counts,surface_area_native_units2=float(area),upward_surface_area_native_units2=float(up_area),uv_min=uv.min(0).tolist(),uv_max=uv.max(0).tolist(),uv_nonfinite=int((~np.isfinite(uv)).sum()),uv_corners_outside_0_1=int(((uv<0)|(uv>1)).any(1).sum()),note='Upward normals include tree canopy, rocks, roofs and decorative surfaces. These are not validated walkable terrain.')
(r/'manifests/surface-audit.json').write_text(json.dumps(dictout,indent=2));print(dictout)
src=r/'source/export_Meshy_AI_2026-10-26_4debfa.blend';h=hashlib.file_digest(src.open('rb'),'sha256').hexdigest();assert h=='626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f';assert src.stat().st_size==506928885
(r/'manifests/source-verification.json').write_text(json.dumps(dict(file=src.name,bytes=src.stat().st_size,sha256=h,release='https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-source-v1',excluded='export_Meshy_AI_2026-10-26_7d27be.blend',repository_base='761b8b294d7adf417947fa5c6d23c191825d74ef',blender='4.5.15 LTS',autoexec=False),indent=2))
