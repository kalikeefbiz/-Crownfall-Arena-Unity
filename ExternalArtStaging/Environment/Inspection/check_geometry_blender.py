"""Independent triangle/bounds checks using Blender's glTF importer, no exports."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
j=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())
keys=['qn:CommonTree_1','qn:TwistedTree_5','qn:Rock_Medium_3','qm:DoorFrame_Round_Brick','qm:Wall_UnevenBrick_Straight','kn:tree_detailed_dark','kn:cliff_steps_rock','kc:wall-corner-half-tower']
checks=[]
for key in keys:
 m=next(m for m in j['models'] if m['id']==key)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/m['staged_path']))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];triangles=0;points=[]
 for o in meshes:
  o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
  points.extend(o.matrix_world@v.co for v in o.data.vertices)
 size=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
 # glTF Y-up -> Blender Z-up; only size needs axis permutation.
 expected=m['bounds']['size'];size_gltf=[size[0],size[2],size[1]]
 error=max(abs(a-b) for a,b in zip(size_gltf,expected))
 assert triangles==m['scene_triangle_count'],(key,triangles,m['scene_triangle_count'])
 assert error<0.0001,(key,error)
 checks.append({'id':key,'blender_triangles':triangles,'manifest_triangles':m['scene_triangle_count'],'max_bounds_axis_error':error,'result':'pass'})
(HERE/'blender-geometry-checks.json').write_text(json.dumps({'blender_version':bpy.app.version_string,'checks':checks,'result':'pass'},indent=2)+'\n')
print('PASS: independent Blender triangle counts and transformed bounds for 8 representative models')
