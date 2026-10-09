"""Blender-only composition preview from preserved glTF reference geometry. Not native Unity rendering.
blender --background --python Tools/render_wilderness_preview.py
"""
from pathlib import Path
import json,math
import bpy
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
cat=json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text());manifest=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text());layout=json.loads((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_text());source={m['id']:m for m in manifest['models']};models={m['id']:m for m in cat['models']}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.25,.28,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.view_settings.view_transform='Standard'
parts={};mesh_count=0;renderer_count=0;casters=0
for id in sorted(set(r['model'] for r in layout['placements'])):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/source[id]['staged_path']));objects=set(bpy.data.objects)-before;meshes=[o for o in objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(v[a] for v in points) for a in range(3)));hi=Vector(tuple(max(v[a] for v in points) for a in range(3)));offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 parts[id]=[]
 for o in meshes:
  mesh=o.data.copy();mesh.transform(Matrix.Translation(-offset)@o.matrix_world);parts[id].append(mesh);mesh_count+=1
  for material in mesh.materials:
   if not material or not material.use_nodes:continue
   shader=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if not shader:continue
   shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.92
   # Use restrained source-compatible tints, with explicit Kenney palette replacement.
   name=material.name.split('.')[0];color=(.69,.73,.76,1)
   if 'Bark' in name or 'Wood' in name:color=(.56,.53,.49,1)
   if 'Leaves' in name:color=(.54,.68,.59,1)
   overrides={'dirt':(.28,.30,.28,1),'grass':(.20,.29,.24,1),'woodBarkDark':(.23,.21,.20,1),'leafsDark':(.18,.28,.25,1),'stoneDark':(.38,.43,.46,1),'stone':(.38,.43,.46,1),'_defaultMat':(.38,.43,.46,1)}
   if name in overrides:shader.inputs['Base Color'].default_value=overrides[name]
   else:
    links=list(shader.inputs['Base Color'].links)
    if links:
     multiply=material.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=color;material.node_tree.links.new(links[0].from_socket,multiply.inputs[1]);material.node_tree.links.new(multiply.outputs[0],shader.inputs['Base Color'])
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
for row in layout['placements']:
 x,y,z=row['position'];root=bpy.data.objects.new(row['name'],None);scene.collection.objects.link(root);root.location=(x,-z,y);root.rotation_euler[2]=math.radians(row['yaw']);sc=row['scale'];s=models[row['model']]['presentationScale'];root.scale=(sc[0]*s,sc[2]*s,sc[1]*s)
 for mesh in parts[row['model']]:
  o=bpy.data.objects.new(row['name']+' mesh',mesh);scene.collection.objects.link(o);o.parent=root;o.visible_shadow=row['castShadows'];renderer_count+=1;casters+=row['castShadows']
def mat(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes.clear();out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');emission=m.node_tree.nodes.new('ShaderNodeEmission');emission.inputs[0].default_value=(*color,1);m.node_tree.links.new(emission.outputs[0],out.inputs[0]);return m
ground=mat('Reference existing wilderness floor',(.105,.14,.12));lane=mat('Reference playable lane',(.24,.23,.21));wall=mat('Reference authoritative walls',(.19,.20,.19));marker=mat('Reference 1.8m Summoner',(.2,.65,.9))
def cube(name,p,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);o.data.materials.append(m)
cube('Existing ground',(0,-.5,0),(68,1,64),ground);cube('Existing lane',(0,.006,0),(56,.012,24),lane)
for x,z,w,d,h in [(-12,-18,4,3,.75),(12,-18,4,3,.75),(-12,18,4,3,.75),(12,18,4,3,.75),(-28,-25,3,6,.65),(28,-25,3,6,.65),(-28,25,3,6,.65),(28,25,3,6,.65),(0,30,8,1,.65),(0,-30,18,1,.65)]:cube('Existing collision island',(x,h/2,z),(w,h,d),wall)
for x in (-15,0,15):cube('Scale reference',(x,.9,0),(.65,1.8,.65),marker)
bpy.ops.object.light_add(type='SUN',location=(0,0,40));bpy.context.object.rotation_euler=(math.radians(48),math.radians(-30),0);bpy.context.object.data.energy=2
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
out=ROOT/'Docs/WildernessPreviews';out.mkdir(exist_ok=True)
views=[('overview',0,5,155),('lane-center',0,0,11*16/9*2),('lane-north',0,6,11*16/9*2),('lane-south',0,-6,11*16/9*2),('major',0,17.64,11*16/9*2)]
for name,x,z,width in views:
 h=65 if name=='overview' else 15;offset=h/math.tan(math.radians(50));cam.location=(x,-z+offset,h);target=Vector((x,-z,0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=width;cam.data.clip_end=150;scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
report=dict(engine='Blender '+bpy.app.version_string,unityExecuted=False,source='Preserved glTF references; native FBX scale/orientation validation remains pending',uniqueSourceMeshObjects=mesh_count,instantiatedMeshObjects=renderer_count,shadowEligibleMeshObjects=casters,views=[v[0] for v in views],limitations=['No shipping Unity sprite artwork/HUD/VFX reproduced','Reference geometry and approximate palette; Unity shader/alpha/shadow behavior not certified','Six-Summoner Unity shader cutaway not simulated','Reference ground uses fixed color without realtime shadows, approximating ProductionStone; native floor shader differs'])
(out/'BLENDER_PREVIEW_REPORT.json').write_text(json.dumps(report,indent=2)+'\n')
