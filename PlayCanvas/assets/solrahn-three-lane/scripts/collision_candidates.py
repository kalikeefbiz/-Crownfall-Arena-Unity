"""Partial lane collision candidates extracted from actual source triangles, not new terrain.
Conservative route cores only. No claim of complete coverage, walkability or closed solids.
"""
import bpy,numpy as np,json
from pathlib import Path
base=Path(__file__).resolve().parents[1];o=next(o for o in bpy.context.scene.objects if o.type=='MESH');m=o.data
p=np.empty(len(m.vertices)*3,np.float32);m.vertices.foreach_get('co',p);p=p.reshape(-1,3)
f=np.empty(len(m.loops),np.int32);m.loops.foreach_get('vertex_index',f);f=f.reshape(-1,3)
selections={n:[] for n in ['UpperLane_Core_CANDIDATE','MiddleLane_Core_CANDIDATE','LowerLane_Core_CANDIDATE']}
for start in range(0,len(f),100000):
 tri=p[f[start:start+100000]];c=tri.mean(1);n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);nz=n[:,2]/np.maximum(np.linalg.norm(n,axis=1),1e-30)
 x,y,z=c.T;side=np.interp(np.abs(y),[0,.35,.72,.86],[.655,.56,.22,0]);valid=(z>-.097)&(z<-.061)&(nz>.45)&(np.abs(y)<.76)
 for name,mask in [('UpperLane_Core_CANDIDATE',(np.abs(x+side)<.03)&(x<-.1)),('MiddleLane_Core_CANDIDATE',np.abs(x)<.027),('LowerLane_Core_CANDIDATE',(np.abs(x-side)<.03)&(x>.1))]:
  selections[name].append(f[start:start+100000][valid&mask].copy())
bpy.data.objects.remove(o,do_unlink=True);bpy.data.meshes.remove(m)
records=[]
for name,parts in selections.items():
 faces=np.concatenate(parts);unique,inv=np.unique(faces,return_inverse=True);verts=p[unique]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts.tolist(),[],inv.reshape(-1,3).tolist());mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 before=len(mesh.polygons);mod=obj.modifiers.new('CollisionSimplify','DECIMATE');mod.ratio=min(1,2500/max(1,before));mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 obj['candidate_only']=True;obj['coverage']='Partial lane cores, authored coordinates. Requires gap, slope, boundary and scale review before later integration.'
 records.append(dict(object=name,source_triangles=before,triangles=len(obj.data.polygons),vertices=len(obj.data.vertices)))
 obj.select_set(False)
for o in bpy.context.scene.objects:o.select_set(o.type=='MESH')
# Collision authoring copy carries no orphaned source textures or materials.
for mat in list(bpy.data.materials):
 if mat.users==0:bpy.data.materials.remove(mat)
for image in list(bpy.data.images):
 if image.users==0:bpy.data.images.remove(image)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'working/solrahn-lane-collision-candidates.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(base/'runtime/solrahn-lane-collision-candidates.glb'),export_format='GLB',use_selection=True,export_yup=True,export_texcoords=False,export_normals=True,export_materials='NONE',export_animations=False,export_extras=True)
(base/'manifests/collision-candidates.json').write_text(json.dumps(dict(status='PARTIAL_NOT_GAMEPLAY_VALIDATED',objects=records,method='Actual upward-facing source triangles in conservative lane cores; extracted then QEM-simplified. No geometry added or moved.',excluded='Wilderness under canopy, cliffs and solid structures cannot be reliably classified from fused scanned surface; not prepared.',labels='Upper = negative Blender X flank; lower = positive Blender X flank. Provisional author review labels.'),indent=2));print('COLLISION_DONE',records,flush=True)
