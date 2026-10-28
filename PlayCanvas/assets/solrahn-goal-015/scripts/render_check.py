import bpy,sys,json,importlib.util,numpy as np
from pathlib import Path
base=Path(__file__).resolve().parents[1];mode=sys.argv[-1]
if mode=='export':
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(base/'runtime/solrahn-full-quality.glb'))
 objs=[o for o in bpy.context.scene.objects if o.type=='MESH'];o=objs[0];m=o.data;m.calc_loop_triangles()
 p=np.empty(len(m.vertices)*3,np.float32);m.vertices.foreach_get('co',p);p=p.reshape(-1,3)
 (base/'manifests/reimport.json').write_text(json.dumps({'vertices':len(m.vertices),'triangles':len(m.loop_triangles),'bounds':{'min':p.min(axis=0).tolist(),'max':p.max(axis=0).tolist()},'uvs':[u.name for u in m.uv_layers],'materials':[m.name for m in bpy.data.materials],'images':[{'name':i.name,'size':list(i.size)} for i in bpy.data.images]},indent=2))
spec=importlib.util.spec_from_file_location('render',str(base/'scripts/render_views.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
mod.render(base/'previews'/mode,[dict(name='overview',position=[2,-2.4,2.6],target=[0,0,0],ortho=2.8),dict(name='middle-close',position=[.28,-.34,.36],target=[0,0,-.07],ortho=.65)])
