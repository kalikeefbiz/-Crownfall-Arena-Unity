"""Run with Blender 4.3: inspect approved FBX exports without modifying sources.
blender -b -t 4 -P Tools/inspect_environment_fbx.py
"""
import bpy
from pathlib import Path
import json
import re
from mathutils import Vector
from io_scene_fbx import parse_fbx

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())
results=[]
for model in manifest['models']:
 if not model['first_integration_pass_recommended']:continue
 source=next(p for p in model['original_model_variants'] if p.endswith('.fbx'))
 raw=(ROOT/source).read_bytes()
 if not raw.startswith(b'Kaydara FBX Binary'):
  # Blender's importer rejects ASCII FBX. Inspect these simple static Kenney
  # exports directly instead; never rewrite their format to hide the limitation.
  text=raw.decode();fields={}
  for name in ('UpAxis','UpAxisSign','FrontAxis','FrontAxisSign','CoordAxis','CoordAxisSign','UnitScaleFactor','OriginalUnitScaleFactor'):
   p=re.search(r'P: "'+name+r'"[^\n]+',text)
   fields[name]=float(p[0].rsplit(',',1)[1])
  assert fields['UpAxis']==1 and fields['UpAxisSign']==1
  def array(name):
   match=re.search(name+r': \*\d+\s*\{\s*a:\s*([^}]+)',text)
   return [float(v) for v in match[1].strip().split(',')]
  verts=array('Vertices');points=[verts[i:i+3] for i in range(0,len(verts),3)]
  indices=[int(i) for i in array('PolygonVertexIndex')];triangles=0;polygon=0
  for i in indices:
   assert 0 <= (-i-1 if i<0 else i) < len(points)
   polygon+=1
   if i<0:triangles+=polygon-2;polygon=0
  assert polygon==0
  rotations=re.findall(r'P: "Lcl Rotation"[^\n]+',text)
  scales=re.findall(r'P: "Lcl Scaling"[^\n]+',text)
  assert all([float(v) for v in r.rsplit(',',3)[1:]]==[0,0,0] for r in rotations)
  assert all([float(v) for v in r.rsplit(',',3)[1:]]==[1,1,1] for r in scales)
  size=[(max(p[i] for p in points)-min(p[i] for p in points))*fields['UnitScaleFactor']/100 for i in range(3)]
  mats=[]
  for chunk in re.split(r'\n\s*Material: ',text)[1:]:
   name=re.search(r'"Material::([^"]+)"',chunk)[1]
   color=re.search(r'P: "DiffuseColor"[^\n]+',chunk)
   rgb=[float(v) for v in color[0].rsplit(',',3)[1:]]
   mats.append({'name':name,'diffuse_rgba':rgb+[1],'image_nodes':[]})
  assert not re.search(r'\n\s*Texture: ',text)
  results.append({'id':model['id'],'source_fbx':source,'fbx_version':7300,'global_settings':fields,'mesh_count':1,
   'source_control_point_count':len(points),'triangles':triangles,'gltf_reference_triangles':model['scene_triangle_count'],
   'normalized_y_up_bounds_size':size,'max_bounds_delta_from_gltf':max(abs(a-b) for a,b in zip(size,model['bounds']['size'])),
   'mesh_material_slots':[{'mesh':model['name'],'materials':[m['name'] for m in mats]}], 'materials':mats,
   'status':'ASCII FBX source arrays inspected; Blender does not support this FBX format; Unity import PENDING'})
  print('ASCII_FBX_INSPECTED',model['id'],triangles,size,flush=True)
  continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.fbx(filepath=str(ROOT/source),use_image_search=False)
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 points=[];triangles=0;vertices=0;slots=[]
 for o in objects:
  o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);vertices+=len(o.data.vertices)
  points.extend(o.matrix_world@v.co for v in o.data.vertices)
  slots.append({'mesh':o.name,'materials':[s.material.name if s.material else None for s in o.material_slots]})
 lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
 size=[hi[0]-lo[0],hi[2]-lo[2],hi[1]-lo[1]]
 expected=model['bounds']['size']
 mats=[]
 for m in bpy.data.materials:
  nodes=[]
  if m.use_nodes:
   for n in m.node_tree.nodes:
    if n.type=='TEX_IMAGE' and n.image:nodes.append({'node':n.name,'image_name':n.image.name,'reference':n.image.filepath,'packed':bool(n.image.packed_file)})
  mats.append({'name':m.name,'diffuse_rgba':list(m.diffuse_color),'image_nodes':nodes})
 tree,version=parse_fbx.parse(str(ROOT/source))
 settings=next((e for e in tree.elems if e.id==b'GlobalSettings'),None)
 props=next((e for e in settings.elems if e.id==b'Properties70'),None) if settings else None
 axes={}
 if props:
  for p in props.elems:
   name=p.props[0].decode()
   if name in ('UpAxis','UpAxisSign','FrontAxis','FrontAxisSign','CoordAxis','CoordAxisSign','UnitScaleFactor','OriginalUnitScaleFactor'):
    axes[name]=p.props[-1]
 results.append({'id':model['id'],'source_fbx':source,'fbx_version':version,'global_settings':axes,
  'mesh_count':len(objects),'blender_vertices':vertices,'triangles':triangles,'gltf_reference_triangles':model['scene_triangle_count'],
  'normalized_y_up_bounds_size':size,'max_bounds_delta_from_gltf':max(abs(a-b) for a,b in zip(size,expected)),
  'mesh_material_slots':slots,'materials':mats,'objects':[{'name':o.name,'type':o.type} for o in bpy.context.scene.objects],
  'status':'Blender FBX import completed; Unity import PENDING'})
 print('FBX_INSPECTED',model['id'],triangles,size,flush=True)
path=ROOT/'Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json'
path.write_text(json.dumps({'blender_version':bpy.app.version_string,'native_unity_executed':False,'models':results},indent=2)+'\n')
print('Wrote',path,flush=True)
