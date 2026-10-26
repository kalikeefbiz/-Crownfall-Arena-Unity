"""Audit native collision topology; remove unused source textures from collision-only copy."""
import bpy,numpy as np,json
from pathlib import Path
base=Path(__file__).resolve().parents[1];records=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 m=o.data;edges=np.empty(len(m.edges)*2,np.int32);m.edges.foreach_get('vertices',edges);edges=edges.reshape(-1,2)
 parent=np.arange(len(m.vertices))
 def find(v):
  while parent[v]!=v:parent[v]=parent[parent[v]];v=parent[v]
  return v
 for u,v in edges:parent[find(u)]=find(v)
 components=len(set(find(i) for i in range(len(parent))))
 vi=np.empty(len(m.loops),np.int32);m.loops.foreach_get('vertex_index',vi);f=vi.reshape(-1,3);te=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]);te.sort(1);_,counts=np.unique(te,axis=0,return_counts=True)
 records.append(dict(object=o.name,components=components,boundary_edges=int((counts==1).sum()),nonmanifold_edges_over_two_faces=int((counts>2).sum()),note='Open fragmented candidate surfaces. Not a closed solid or complete lane collision.'))
for mat in list(bpy.data.materials):
 if mat.users==0:bpy.data.materials.remove(mat)
for image in list(bpy.data.images):
 if image.users==0:bpy.data.images.remove(image)
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
(base/'manifests/collision-topology.json').write_text(json.dumps(records,indent=2))
# Small isolated top view of the candidate geometry, no visual mesh loaded.
import importlib.util
spec=importlib.util.spec_from_file_location('rv',base/'scripts/render_views.py');rv=importlib.util.module_from_spec(spec);spec.loader.exec_module(rv)
rv.render(base/'previews/collision',[dict(name='lane-cores-top-plan',position=[0,0,3],target=[0,0,0],ortho=2.6)])
print(records,flush=True)
