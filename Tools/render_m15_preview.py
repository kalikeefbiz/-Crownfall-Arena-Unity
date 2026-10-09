"""Camera-matched OFFLINE approximation, never a Unity gameplay screenshot.
blender --background --python Tools/render_m15_preview.py -- --views center-lane
Uses preserved reference glTF meshes, original PNGs and the runtime camera constants.
"""
import argparse,json,math,sys,hashlib
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'Tools'))
from m15_presentation import PITCH,HALF_HEIGHT,HEIGHT,center,terrain_height
args=argparse.ArgumentParser();args.add_argument('--views',nargs='*');args.add_argument('--samples',type=int,default=24)
args=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
cat=json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text());models={m['id']:m for m in cat['models']}
manifest=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text());sources={m['id']:m for m in manifest['models']}
layout=json.loads((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.cycles.use_denoising=False
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.34,.37,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
parts={}
for id in sorted(set(r['model'] for r in layout['placements'])):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/sources[id]['staged_path']));objects=set(bpy.data.objects)-before;meshes=[o for o in objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(v[a] for v in points) for a in range(3)));hi=Vector(tuple(max(v[a] for v in points) for a in range(3)));offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));parts[id]=[]
 for o in meshes:
  mesh=o.data.copy();mesh.transform(Matrix.Diagonal((1,-1,1,1))@Matrix.Translation(-offset)@o.matrix_world);mesh.flip_normals();parts[id].append(mesh)
  for material in mesh.materials:
   if not material or not material.use_nodes:continue
   shader=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if not shader:continue
   shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.92
   name=material.name.split('.')[0];color=(.69,.73,.76,1)
   if 'Bark' in name or 'Wood' in name:color=(.70,.65,.60,1)
   if 'Leaves' in name:color=(.66,.77,.66,1)
   if name=='Leaves_TwistedTree':color=(.53,.64,.72,1)
   overrides={'dirt':(.28,.30,.28,1),'grass':(.20,.29,.24,1),'woodBarkDark':(.23,.21,.20,1),'leafsDark':(.18,.28,.25,1),'stoneDark':(.38,.43,.46,1),'stone':(.38,.43,.46,1),'_defaultMat':(.38,.43,.46,1)}
   if name in overrides:shader.inputs['Base Color'].default_value=overrides[name]
   else:
    links=list(shader.inputs['Base Color'].links)
    if links:
     multiply=material.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=color;material.node_tree.links.new(links[0].from_socket,multiply.inputs[1]);material.node_tree.links.new(multiply.outputs[0],shader.inputs['Base Color'])
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
for row in layout['placements']:
 x,y,z=row['position'];root=bpy.data.objects.new(row['name'],None);scene.collection.objects.link(root);root.location=(x,z,y);root.rotation_euler[2]=-math.radians(row['yaw']);sc=row['scale'];s=models[row['model']]['presentationScale'];root.scale=(sc[0]*s,sc[2]*s,sc[1]*s)
 for mesh in parts[row['model']]:
  o=bpy.data.objects.new(row['name']+' mesh',mesh);scene.collection.objects.link(o);o.parent=root;o.visible_shadow=row['castShadows']
def material(name,color,emission=False):
 m=bpy.data.materials.new(name);m.use_nodes=True
 if emission:
  m.node_tree.nodes.clear();out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');shader=m.node_tree.nodes.new('ShaderNodeEmission');shader.inputs[0].default_value=(*color,1);m.node_tree.links.new(shader.outputs[0],out.inputs[0])
 else:
  shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(*color,1);shader.inputs['Roughness'].default_value=.94
 return m
contact=material('Shared contact overlay',(.015,.015,.02),True)
nodes=contact.node_tree.nodes;links=contact.node_tree.links;output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');emission=next(n for n in nodes if n.type=='EMISSION');transparent=nodes.new('ShaderNodeBsdfTransparent');blend=nodes.new('ShaderNodeMixShader');blend.inputs[0].default_value=.25;links.new(transparent.outputs[0],blend.inputs[1]);links.new(emission.outputs[0],blend.inputs[2]);links.new(blend.outputs[0],output.inputs[0])
def surface(name,team=None):
 m=material(name,(.25,.27,.26));nodes=m.node_tree.nodes;links=m.node_tree.links;shader=nodes.get('Principled BSDF')
 geo=nodes.new('ShaderNodeNewGeometry');split=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Position'],split.inputs[0]);x,y=split.outputs['X'],split.outputs['Y']
 def calc(op,a,b=None):
  n=nodes.new('ShaderNodeMath');n.operation=op
  for i,v in enumerate((a,b)):
   if v is None:continue
   if isinstance(v,(float,int)):n.inputs[i].default_value=v
   else:links.new(v,n.inputs[i])
  return n.outputs[0]
 def smooth(a,low,high):
  n=nodes.new('ShaderNodeMapRange');n.interpolation_type='SMOOTHSTEP';n.clamp=True;links.new(a,n.inputs['Value'])
  for i,v in [('From Min',low),('From Max',high)]:
   if isinstance(v,(float,int)):n.inputs[i].default_value=v
   else:links.new(v,n.inputs[i])
  return n.outputs[0]
 def mix(a,b,f):
  n=nodes.new('ShaderNodeMixRGB')
  for slot,val in [(0,f),(1,a),(2,b)]:
   if isinstance(val,(float,int)):n.inputs[slot].default_value=val
   elif isinstance(val,tuple):n.inputs[slot].default_value=(*val,1)
   else:links.new(val,n.inputs[slot])
  return n.outputs[0]
 def mul(a,b):
  n=nodes.new('ShaderNodeMixRGB');n.blend_type='MULTIPLY';n.inputs[0].default_value=1;links.new(a,n.inputs[1]);n.inputs[2].default_value=(*b,1);return n.outputs[0]
 coords=nodes.new('ShaderNodeVectorMath');coords.operation='MULTIPLY';coords.inputs[1].default_value=(1/8,1/8,0);links.new(geo.outputs['Position'],coords.inputs[0])
 image=nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(ROOT/'Assets/Art/Environment/External/SharedTextures/T_UnevenBrick_BaseColor.png'),check_existing=True);image.extension='REPEAT';links.new(coords.outputs[0],image.inputs[0])
 bw=nodes.new('ShaderNodeRGBToBW');links.new(image.outputs['Color'],bw.inputs[0]);stone=mul(mix(bw.outputs[0],image.outputs[0],.35),(.70,.76,.79))
 weather=calc('ADD',.5,calc('ADD',calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',x,.73),calc('MULTIPLY',2,calc('SINE',calc('MULTIPLY',y,.39)))))),calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',y,.91),calc('MULTIPLY',x,.27))))))
 worn=calc('ADD',.5,calc('ADD',calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',x,.73*.8),calc('MULTIPLY',2,calc('SINE',calc('MULTIPLY',y,.39*.8)))))),calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',y,.91*.8),calc('MULTIPLY',x,.27*.8))))))
 edge=calc('SUBTRACT',1,smooth(calc('ABSOLUTE',y),calc('ADD',9.8,calc('MULTIPLY',worn,2)),calc('ADD',12.8,calc('MULTIPLY',worn,2))));paving=calc('MULTIPLY',edge,calc('SUBTRACT',1,smooth(calc('ABSOLUTE',x),26.5,29.5)))
 stone=mix(stone,(.12,.18,.115),calc('MULTIPLY',calc('SUBTRACT',1,smooth(bw.outputs[0],.18,.32)),calc('MULTIPLY',weather,.42)))
 soil=mul(image.outputs[0],(.065,.065,.065));soil=mix(soil,(.10,.135,.11),.85);final=mix(soil,stone,paving)
 if team:final=mul(final,tuple(.58+.42*c*3.5 for c in team))
 links.new(final,shader.inputs['Base Color'])
 bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25;bump.inputs['Distance'].default_value=.12;links.new(bw.outputs[0],bump.inputs['Height']);links.new(bump.outputs[0],shader.inputs['Normal']);return m
ground=surface('Approximate shared world-space stone and organic moss');blue=surface('Approximate blue territory',(.22,.255,.27));red=surface('Approximate red territory',(.275,.23,.225));gold=material('Existing territorial front',(.83,.78,.57),True)
def cube(name,p,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],p[2],p[1]));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);o.data.materials.append(m);return o
cube('Existing ground',(0,-.5,0),(68,1,64),ground)
cube('Blue territory',(-14,.015,0),(28,.01,24),blue);cube('Red territory',(14,.015,0),(28,.01,24),red);cube('Front',(0,.04,0),(.09,.035,24),gold)
for x,z,w,d,h in [(-12,-18,4,3,.75),(12,-18,4,3,.75),(-12,18,4,3,.75),(12,18,4,3,.75),(-28,-25,3,6,.65),(28,-25,3,6,.65),(-28,25,3,6,.65),(28,25,3,6,.65),(0,30,8,1,.65),(0,-30,18,1,.65)]:cube('Existing collision island',(x,h/2,z),(w,h,d),ground).visible_shadow=False
for p,scale in [((-34.5,1,0),(1,2,65)),((34.5,1,0),(1,2,65)),((0,1,32.5),(68,2,1)),((0,1,-32.5),(68,2,1))]:cube('Existing boundary',p,scale,ground).visible_shadow=False
vertices=[];faces=[]
for x0,z0,x1,z1 in [(-58,-54,-34,54),(34,-54,58,54),(-34,32,34,54),(-34,-54,34,-32)]:
 base=len(vertices)
 for iz in range(25):
  for ix in range(25):
   x=x0+(x1-x0)*ix/24;z=z0+(z1-z0)*iz/24;vertices.append((x,z,terrain_height(x,z)))
   if ix<24 and iz<24:
    i=base+iz*25+ix;faces.extend([(i,i+1,i+25),(i+1,i+26,i+25)])
mesh=bpy.data.meshes.new('Same exterior apron topology');mesh.from_pydata(vertices,[],faces);mesh.materials.append(ground);obj=bpy.data.objects.new('Renderer-only world continuation',mesh);scene.collection.objects.link(obj)
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=Vector((-math.sin(math.radians(35))*math.cos(math.radians(42)),math.cos(math.radians(35))*math.cos(math.radians(42)),-math.sin(math.radians(42)))).to_track_quat('-Z','Y').to_euler();bpy.context.object.data.energy=2;bpy.context.object.data.angle=.02
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.clip_start=.1;camera.data.clip_end=150;camera.data.ortho_scale=HALF_HEIGHT*16/9*2;scene.camera=camera
def png(name,path,position,height=None,width=None,pivot=.04,grounded=False):
 image=bpy.data.images.load(str(ROOT/path),check_existing=True);w,h=image.size;sy=height if height else width*h/w;sx=sy*w/h
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(-sx/2,-sy*pivot,0),(sx/2,-sy*pivot,0),(sx/2,sy*(1-pivot),0),(-sx/2,sy*(1-pivot),0)],[],[(0,1,2,3)])
 uv=mesh.uv_layers.new();
 for i,value in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=value
 obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.location=(position[0],position[2],position[1]);obj.rotation_euler=(0,0,0) if grounded else camera.rotation_euler
 m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes.clear();nodes=m.node_tree.nodes;links=m.node_tree.links
 tex=nodes.new('ShaderNodeTexImage');tex.image=image;em=nodes.new('ShaderNodeEmission');links.new(tex.outputs['Color'],em.inputs[0]);transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');links.new(tex.outputs['Alpha'],mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(em.outputs[0],mix.inputs[2]);out=nodes.new('ShaderNodeOutputMaterial');links.new(mix.outputs[0],out.inputs[0]);mesh.materials.append(m);obj.visible_shadow=False;return obj
views=[('blue-combat',-25,0),('center-lane',0,0),('red-combat',25,0),('objective',0,26)]
out=ROOT/'Docs/M15Previews';out.mkdir(exist_ok=True)
allViews=[]
for name,actorX,actorZ in views:
 if args.views and name not in args.views:continue
 cx,cz=center(actorX,actorZ);camera.location=(cx,cz-HEIGHT/math.tan(math.radians(PITCH)),HEIGHT);camera.rotation_euler=(Vector((cx,cz,0))-camera.location).to_track_quat('-Z','Y').to_euler()
 bpy.context.view_layer.update()
 for dx,dz,dy in [(0,0,0),(3,4,0),(-4,-3,0),(2,5,3)]:
  pixel=world_to_camera_view(scene,camera,Vector((cx+dx,cz+dz,dy)))
  expected=(.5+dx/(HALF_HEIGHT*16/9*2),.5+(dz*math.sin(math.radians(PITCH))+dy*math.cos(math.radians(PITCH)))/(HALF_HEIGHT*2))
  assert abs(pixel.x-expected[0])<1e-5 and abs(pixel.y-expected[1])<1e-5,('Offline camera handedness/projection drift',pixel,expected)
 temporary=[]
 temporary.append(png('Preserved center insignia','Assets/Art/Production/Environment/Arena Center Floor Logo.PNG',(0,.06,0),width=8,pivot=.5,grounded=True))
 for label,path,point,width in [('Forest west','Mountain-Forest.PNG',(-25,1,27.5),10),('Forest center','Mountain-Forest.PNG',(-7,0,28),11),('Forest east','Mountain-Forest.PNG',(25,1,26.5),10),('Waterfall west','Mountain - Waterfall.PNG',(-30,3,29),9),('Waterfall east','Mountain - Waterfall.PNG',(28,3,29.5),9),('Major Aether landmark','Aether Mound.PNG',(0,0,29.5),4),('Saint Rose west','Saint Rose.PNG',(-26,0,20),2.5),('Saint Rose east','Saint Rose.PNG',(24,0,-20),2.5),('Saint Rose north','Saint Rose.PNG',(9,0,28),2.5)]:
  temporary.append(png(label,'Assets/Art/Production/Environment/'+path,point,width=width,pivot=.04))
 for roster,dx,dz in [('Kit',-2,-1),('Set',3,3),('Riven',0,0)]:
  paths={'Kit':'Assets/Art/Characters/Kit/Idle/Front/idle.png','Set':'Assets/Art/Production/Set/Run/000.png','Riven':'Assets/Art/Production/Riven/Idle/000.png'}
  temporary.append(png('Original '+roster+' scale reference',paths[roster],(actorX+dx,.04,actorZ+dz),height=2.5 if roster=='Set' else 2.8))
  bpy.ops.mesh.primitive_circle_add(vertices=32,radius=1,fill_type='NGON',location=(actorX+dx,actorZ+dz,.075));disc=bpy.context.object;disc.name='Approximate grounding contact';disc.scale=(1.2,.72,1);disc.data.materials.append(contact);disc.visible_shadow=False;temporary.append(disc)
 text=bpy.data.curves.new('Offline label','FONT');text.body='OFFLINE BLENDER APPROXIMATION  |  '+name+'  |  Unity import/render PENDING';text.size=.31
 label=bpy.data.objects.new('Offline label',text);scene.collection.objects.link(label);label.parent=camera;label.location=(-HALF_HEIGHT*16/9+.5,HALF_HEIGHT-.7,-1);label.data.materials.append(material('Label white',(.85,.9,.92),True));temporary.append(label)
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 allViews.append(dict(name=name,actor=[actorX,actorZ],cameraGroundCenter=[cx,cz],cameraPositionUnity=[cx,HEIGHT,cz-HEIGHT/math.tan(math.radians(PITCH))],pitch=PITCH,orthographicSize=HALF_HEIGHT,aspect=16/9))
 for obj in temporary:bpy.data.objects.remove(obj,do_unlink=True)
report=dict(engine='Blender '+bpy.app.version_string,unityExecuted=False,compositionSha256=hashlib.sha256((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_bytes()).hexdigest(),cameraSource='Assets/Crownfall/Environment/CameraFraming.cs',coordinateMapping='Unity (X,Y,Z) to Blender (X,Z,Y); source glTF reference mesh Y reflected; authored yaw sign converted',projectionAssertions=len(allViews)*4,views=allViews,limitations=['Not Unity rendering or live gameplay; preserved glTF references approximate native FBX meshes','Built-in shader, alpha mip coverage, ASTC fallback and GPU shadows remain native/device PENDING','Approximate stone/lighting and static original character PNG scale references; no HUD or combat effects','Bounded six-Summoner Unity cutaway not simulated; geometry overlap is conservatively visible'])
(out/'OFFLINE_PREVIEW_REPORT.json').write_text(json.dumps(report,indent=2)+'\n')
