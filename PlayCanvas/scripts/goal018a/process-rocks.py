import bpy,json,pathlib
from mathutils import Vector
root=pathlib.Path(str(pathlib.Path(__file__).resolve().parents[2] / '.audit/018a/polyhaven'));out=root/'mobile';out.mkdir(exist_ok=True)
report={}
for a in ['rock_face_02','rock_moss_set_02']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/a/(a+'.gltf')))
 keep=[]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH' or (a=='rock_moss_set_02' and not o.name.endswith(('rock09','rock11','rock13'))):
   bpy.data.objects.remove(o,do_unlink=True);continue
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  # Preserve scan shape and UVs; put each library variant at origin with a centred foot pivot.
  bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
  lo=Vector(tuple(min(v.co[i] for v in o.data.vertices) for i in range(3)))
  hi=Vector(tuple(max(v.co[i] for v in o.data.vertices) for i in range(3)))
  pivot=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  for v in o.data.vertices:v.co-=pivot
  o.location=(0,0,0)
  tris=sum(len(p.vertices)-2 for p in o.data.polygons)
  m=o.modifiers.new('Mobile silhouette reduction','DECIMATE');m.ratio=(3000 if a=='rock_face_02' else 1000)/tris
  bpy.ops.object.modifier_apply(modifier=m.name)
  keep.append(o)
  o.select_set(False)
 # Blender exports PNG images; recompress lossily in subsequent GLB packaging step.
 bpy.ops.export_scene.gltf(filepath=str(out/(a+'.glb')),export_format='GLB',export_yup=True,export_image_format='JPEG',export_jpeg_quality=85,export_materials='EXPORT',export_cameras=False,export_lights=False)
 report[a]=[{'name':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'dimensions_blender_z_up':list(o.dimensions)} for o in keep]
json.dump(report,open(out/'processing-report.json','w'),indent=2)
