"""Seeded bidirectional nearest-surface samples, not a maximum Hausdorff guarantee."""
import bpy,numpy as np,json,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
base=Path(__file__).resolve().parents[1];opt=next(o for o in bpy.context.scene.objects if o.type=='MESH');dg=bpy.context.evaluated_depsgraph_get();obvh=BVHTree.FromObject(opt,dg)
# Load only the actual original mesh datablock; automatic execution stays disabled.
with bpy.data.libraries.load(str(base/'source/export_Meshy_AI_2026-10-26_4debfa.blend'),link=False) as (src,dst):dst.meshes=[src.meshes[0]]
smesh=dst.meshes[0];so=bpy.data.objects.new('AuditOriginal',smesh);bpy.context.scene.collection.objects.link(so);bpy.context.view_layer.update();sbvh=BVHTree.FromObject(so,bpy.context.evaluated_depsgraph_get())
rng=np.random.default_rng(13)
def probe(mesh,bvh):
 p=np.empty(len(mesh.vertices)*3,np.float32);mesh.vertices.foreach_get('co',p);p=p.reshape(-1,3)
 f=np.empty(len(mesh.loops),np.int32);mesh.loops.foreach_get('vertex_index',f);f=f.reshape(-1,3)
 idx=rng.choice(len(f),min(50000,len(f)),replace=False);points=p[f[idx]].mean(1);errors=np.array([bvh.find_nearest(Vector(v))[3] for v in points])
 x,y,z=points.T;side=np.interp(abs(y),[0,.35,.72,.86],[.655,.56,.22,0]);lane=((abs(x)<.065)|(abs(abs(x)-side)<.065))&(z>-.105)&(z<-.055)
 def stats(e):return dict(samples=len(e),mean=float(e.mean()),rms=float(np.sqrt((e*e).mean())),p50=float(np.percentile(e,50)),p95=float(np.percentile(e,95)),p99=float(np.percentile(e,99)),maximum_sampled=float(e.max()))
 return dict(all=stats(errors),lane_mask=stats(errors[lane]))
r=dict(source_to_optimized=probe(smesh,obvh),optimized_to_source=probe(opt.data,sbvh),method='50,000 seeded triangle-centroid samples in each direction, uniformly by triangle index. Euclidean nearest-surface distances in unchanged native Blender units; not area-weighted and not a Hausdorff bound.',seed=13,arena_long_axis=1.9015929698944092)
(base/'manifests/geometric-deviation.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2),flush=True)
