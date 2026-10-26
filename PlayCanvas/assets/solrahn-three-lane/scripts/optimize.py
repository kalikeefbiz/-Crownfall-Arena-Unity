"""Selective weighted collapse of the verified continuous Meshy surface; no remesh, cuts or repositioning.
Run Blender --disable-autoexec SOURCE --python optimize.py -- RATIO OUTPUT_BLEND.
Weights express permission to reduce (small = protected), not semantic segmentation.
"""
import bpy,numpy as np,sys,json,time,hashlib
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];ratio=float(args[0]);out=Path(args[1]).resolve();base=Path(__file__).resolve().parents[1]
source=base/'manifests/source-audit.json';a=json.loads(source.read_text());o=bpy.context.scene.objects.get('Mesh_0')
assert hashlib.file_digest(open(bpy.data.filepath,'rb'),'sha256').hexdigest()=='626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f'
assert Path(bpy.data.filepath).resolve()!=out
assert o and len(o.data.vertices)==2782049 and len(o.data.polygons)==5568924
assert len([x for x in bpy.context.scene.objects if x.type=='MESH'])==1
bpy.context.view_layer.objects.active=o;o.select_set(True)
m=o.data;p=np.empty(len(m.vertices)*3,np.float32);m.vertices.foreach_get('co',p);p=p.reshape(-1,3)
# Broad masks measured on the actual top view. Middle route x~0, side routes follow authored rim.
# No mask moves, deletes or generates terrain. Heights are Blender Z in unchanged native units.
x,y,z=p.T;ay=np.abs(y);side=np.interp(ay,[0,.35,.72,.86],[.655,.56,.22,0])
lane=((np.abs(x)<.065)|(np.abs(np.abs(x)-side)<.065))&(z>-.105)&(z<-.055)
architecture=(ay>.73)&(z>.015)
rocks=(z>-.025)
weights=np.ones(len(p),np.float32);weights[rocks]=.7;weights[lane]=.35;weights[architecture]=.2
# Protect extreme world-space silhouette anchors as hard constraints.
anchors=np.unique(np.concatenate([np.argmin(p,axis=0),np.argmax(p,axis=0)]));weights[anchors]=0
vg=o.vertex_groups.new(name='ReductionPermission_LanesStructuresProtected')
for w in np.unique(weights):vg.add(np.flatnonzero(weights==w).tolist(),float(w),'REPLACE')
mod=o.modifiers.new('Selective_QEM_Runtime','DECIMATE');mod.decimate_type='COLLAPSE';mod.ratio=ratio;mod.use_collapse_triangulate=True;mod.vertex_group=vg.name;mod.vertex_group_factor=.00005
record=dict(input_sha256='626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f',ratio=ratio,method='Blender weighted quadric edge collapse; UV-aware custom-data interpolation; no remesh/weld/cuts',weight_factor=mod.vertex_group_factor,permission_histogram={str(float(w)):int((weights==w).sum()) for w in np.unique(weights)},protected_extrema=anchors.tolist(),native_transform=[list(r) for r in o.matrix_world],started=time.time())
del p,x,y,z,ay,side,lane,architecture,rocks,weights
print('OPTIMIZE_START',json.dumps(record),flush=True)
bpy.ops.object.modifier_apply(modifier=mod.name)
# Keep the original shader graph and packed texture payloads unchanged in this candidate.
c=bpy.data.collections.new('SolRahn_Continuous_AuthoredEnvironment');bpy.context.scene.collection.children.link(c)
for old in list(o.users_collection):old.objects.unlink(o)
c.objects.link(o)
o['source_asset']='export_Meshy_AI_2026-10-26_4debfa.blend';o['preparation_only']=True
o['semantic_groups']='Continuous surface: lane/Wilderness/structure categories documented in reports; no destructive slicing.'
record.update(vertices=len(m.vertices),triangles=len(m.polygons),finished=time.time())
# Access mesh again after modifier replaces object data.
record['vertices']=len(o.data.vertices);record['triangles']=len(o.data.polygons)
out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
(base/'manifests'/('optimization-'+out.stem+'.json')).write_text(json.dumps(record,indent=2))
print('OPTIMIZE_DONE',json.dumps(record),flush=True)
