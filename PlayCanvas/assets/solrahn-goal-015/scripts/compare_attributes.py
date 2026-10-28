"""Compare source triangle corners to exported attributes in bounded chunks."""
import bpy,numpy as np,json,struct
from pathlib import Path
base=Path(__file__).resolve().parents[1];p=base/'runtime/solrahn-full-quality.glb'
f=p.open('rb');f.seek(12);n=struct.unpack('<I',f.read(4))[0];f.seek(20);g=json.loads(f.read(n));offset=28+n
prim=g['meshes'][0]['primitives'][0]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];c={'VEC3':3,'VEC2':2,'VEC4':4,'SCALAR':1}[a['type']]
 return np.memmap(p,mode='r',dtype={5126:'<f4',5125:'<u4'}[a['componentType']],offset=offset+v.get('byteOffset',0)+a.get('byteOffset',0),shape=(a['count'],c))
idx=acc(prim['indices']).reshape(-1);pos=acc(prim['attributes']['POSITION']);nor=acc(prim['attributes']['NORMAL']);uv=acc(prim['attributes']['TEXCOORD_0'])
m=next(o.data for o in bpy.context.scene.objects if o.type=='MESH')
assert all(p.loop_total==3 for p in m.polygons)
v=np.empty(len(m.vertices)*3,np.float32);m.vertices.foreach_get('co',v);v=v.reshape(-1,3)[:,[0,2,1]];v[:,2]*=-1
loops=np.empty(len(m.loops),np.int32);m.loops.foreach_get('vertex_index',loops)
normal=np.empty(len(m.corner_normals)*3,np.float32);m.corner_normals.foreach_get('vector',normal);normal=normal.reshape(-1,3)[:,[0,2,1]];normal[:,2]*=-1
uvs=np.empty(len(m.uv_layers[0].data)*2,np.float32);m.uv_layers[0].data.foreach_get('uv',uvs);uvs=uvs.reshape(-1,2);uvs[:,1]=1-uvs[:,1]
err=np.zeros(3)
for start in range(0,len(idx),200000):
 end=min(len(idx),start+200000);ii=idx[start:end]
 err=np.maximum(err,[np.abs(v[loops[start:end]]-pos[ii]).max(),np.abs(normal[start:end]-nor[ii]).max(),np.abs(uvs[start:end]-uv[ii]).max()])
r={'sourceVertices':len(m.vertices),'sourceTriangles':len(m.polygons),'exportTriangles':len(idx)//3,'comparedTriangleCorners':len(idx),'maxAbsoluteError':dict(zip(['position','normal','uv'],map(float,err))),'status':'PASS' if err[0]==0 and err[2]==0 and err[1]<1e-4 else 'FAIL','normalTolerance':1e-4,'normalPrecisionNote':'Blender glTF exporter rounds source normals to four decimal places then normalizes; no authored normal edits.','method':'Source triangle corners compared in order after required glTF Y-up/UV-V conversion; exported vertex splits permitted.'}
(base/'manifests/attribute-comparison.json').write_text(json.dumps(r,indent=2));print(r,flush=True)
assert r['status']=='PASS'
