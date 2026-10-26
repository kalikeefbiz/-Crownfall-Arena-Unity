"""Clean GLB reimport, per-part audit and protected bounds/count checks."""
import bpy,sys,json,importlib.util,numpy as np
from pathlib import Path
base=Path(__file__).resolve().parents[1];filename=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(base/'runtime'/filename))
spec=importlib.util.spec_from_file_location('audit',base/'scripts/audit.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
mod.audit(str(base/'manifests'/('reimport-'+Path(filename).stem+'.json')))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];bounds=[];bad_uv=0
for o in meshes:
 m=o.data;bounds.append(mod.bounds(o,m))
 for layer in m.uv_layers:
  a=np.empty(len(layer.data)*2,np.float32);layer.data.foreach_get('uv',a);bad_uv+=int((~np.isfinite(a)).sum())
result=dict(file=filename,objects=len(meshes),triangles=sum(mod.counts(o.data)['triangles'] for o in meshes),bounds=dict(min=np.min([b['min'] for b in bounds],axis=0).tolist(),max=np.max([b['max'] for b in bounds],axis=0).tolist()),uv_nonfinite=bad_uv)
if 'visual' in filename:
 a=json.loads((base/'manifests/optimized-audit.json').read_text());expected=next(o for o in a['objects'] if o['type']=='MESH')['bounds'];result['triangle_count_matches']=result['triangles']==a['totals']['evaluated']['triangles'];result['bounds_max_absolute_error']=max(float(np.max(np.abs(np.array(expected[k])-result['bounds'][k]))) for k in ['min','max']);result['status']='PASS' if result['triangle_count_matches'] and result['bounds_max_absolute_error']<1e-6 and bad_uv==0 else 'FAIL'
 # Material render with the same overview setup as source/optimized.
 spec=importlib.util.spec_from_file_location('render_views',base/'scripts/render_views.py');rv=importlib.util.module_from_spec(spec);spec.loader.exec_module(rv);v=json.loads((base/'manifests/comparison-cameras.json').read_text())[:1];rv.render(base/'previews/reimport',v)
else:result['status']='PASS' if len(meshes)==3 and bad_uv==0 else 'FAIL'
(base/'manifests'/('check-'+Path(filename).stem+'.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
assert result['status']=='PASS'
