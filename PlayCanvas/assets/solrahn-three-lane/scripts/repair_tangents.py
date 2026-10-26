"""Repair only zero/invalid glTF tangent vectors with an orthonormal fallback.
No position, UV, normal, material, index or placement edits. Degenerate UV corners have no unique tangent.
"""
import sys,json,struct,numpy as np
from pathlib import Path
p=Path(sys.argv[1]);out=Path(sys.argv[2]);data=bytearray(p.read_bytes());size,kind=struct.unpack_from('<II',data,12);j=json.loads(data[20:20+size]);bo=20+size+8;records=[]
def attr(idx,components):
 a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];assert a['componentType']==5126
 return np.ndarray((a['count'],components),dtype='<f4',buffer=data,offset=bo+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',components*4),4))
for mi,m in enumerate(j['meshes']):
 for pi,prim in enumerate(m['primitives']):
  if 'TANGENT' not in prim['attributes']:continue
  t=attr(prim['attributes']['TANGENT'],4);n=attr(prim['attributes']['NORMAL'],3);norm=np.linalg.norm(t[:,:3],axis=1);bad=np.flatnonzero((norm<1e-8)|(~np.isfinite(norm)))
  for i in bad:
   normal=n[i];axis=np.eye(3)[np.argmin(np.abs(normal))];v=np.cross(axis,normal);v/=np.linalg.norm(v);t[i,:3]=v
   if abs(t[i,3])!=1:t[i,3]=1
  records.append(dict(mesh=mi,primitive=pi,repaired_count=len(bad),vertex_indices=bad.tolist()))
p.write_bytes(data);out.write_text(json.dumps(dict(method='Deterministic orthogonal tangent for zero-vector output at degenerate UV corners; all other bytes unchanged.',records=records),indent=2));print(records)
