"""Camera-matched OFFLINE approximation, never a Unity gameplay screenshot.
blender --background --python Tools/render_m15_1_preview.py -- --views center-lane
Uses preserved reference glTF meshes, original PNGs and the runtime camera constants.
"""
import argparse,json,math,sys,hashlib
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'Tools'))
from m15_presentation import PITCH,HALF_HEIGHT,HEIGHT,center,terrain_height
args=argparse.ArgumentParser();args.add_argument('--views',nargs='*');args.add_argument('--samples',type=int,default=24);args.add_argument('--output',default='Docs/M15_1Previews/Iteration1')
args=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
cat=json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text());models={m['id']:m for m in cat['models']}
manifest=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text());sources={m['id']:m for m in manifest['models']}
composition_bytes=(ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_bytes();layout=json.loads(composition_bytes);shader_bytes=(ROOT/'Assets/Crownfall/Environment/Shaders/StoneSurface.cginc').read_bytes()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.cycles.use_denoising=False
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.30,.32,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
parts={}; shared_materials={};specs={m['key']:m for m in cat['materials']}
for id in sorted(set(r['model'] for r in layout['placements'])):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/sources[id]['staged_path']));objects=set(bpy.data.objects)-before;meshes=[o for o in objects if o.type=='MESH']
 points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(v[a] for v in points) for a in range(3)));hi=Vector(tuple(max(v[a] for v in points) for a in range(3)));offset=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));parts[id]=[]
 for o in meshes:
  mesh=o.data.copy();mesh.transform(Matrix.Diagonal((1,-1,1,1))@Matrix.Translation(-offset)@o.matrix_world);mesh.flip_normals();parts[id].append(mesh)
  for slot,original in enumerate(list(mesh.materials)):
   if not original:continue
   name=original.name.split('.')[0]
   binding=next((b for b in models[id]['bindings'] if b['sourceName']==name),None)
   assert binding,('Unmapped preview material',id,name)
   key=binding['materialKey']
   if key in shared_materials:mesh.materials[slot]=shared_materials[key];continue
   material=original.copy();material.name=key;mesh.materials[slot]=material;shared_materials[key]=material
   shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');shader.inputs['Metallic'].default_value=0;shader.inputs['Roughness'].default_value=.92
   color=(.69,.73,.76,1)
   if specs[key]['family']=='bark':color=(.70,.65,.60,1)
   if specs[key]['family']=='alpha-cutout foliage':color=(.76,.86,.66,1)
   if key=='qn_Leaves_TwistedTree':color=(.62,.76,.66,1)
   overrides={'kn_dirt':(.28,.30,.28,1),'kn_grass':(.20,.29,.24,1),'kn_woodBarkDark':(.23,.21,.20,1),'kn_leafsDark':(.18,.28,.25,1),'kn_stoneDark':(.38,.43,.46,1),'kn_stone':(.38,.43,.46,1),'kn__defaultMat':(.38,.43,.46,1)}
   nodes=material.node_tree.nodes;links=material.node_tree.links
   if key in overrides:
    for link in list(shader.inputs['Base Color'].links):links.remove(link)
    shader.inputs['Base Color'].default_value=overrides[key]
   elif shader.inputs['Base Color'].links:
    source=shader.inputs['Base Color'].links[0].from_socket
    tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=color;links.new(source,tint.inputs[1])
    if specs[key]['family']!='alpha-cutout foliage':
     bw=nodes.new('ShaderNodeRGBToBW');links.new(tint.outputs[0],bw.inputs[0]);mix=nodes.new('ShaderNodeMixRGB');mix.inputs[0].default_value=.35 if key=='kc_colormap' else .75;links.new(bw.outputs[0],mix.inputs[1]);links.new(tint.outputs[0],mix.inputs[2]);source=mix.outputs[0]
    else:source=tint.outputs[0]
    links.new(source,shader.inputs['Base Color'])
   if key=='qn_Rocks' or key.startswith('kn_') and key not in ('kn_leafsDark','kn_woodBarkDark'):
    geometry=nodes.new('ShaderNodeNewGeometry');triplanar=nodes.new('ShaderNodeTexNoise')
    # Box projection implements the same world-axis geological blend, without UV stretch on cliffs.
    mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1/3.5,1/3.5,1/3.5);links.new(geometry.outputs['Position'],mapping.inputs[0])
    rocktex=nodes.new('ShaderNodeTexImage');rocktex.image=bpy.data.images.load(str(ROOT/'Assets/Art/Environment/External/SharedTextures/T_RockFace03_Color.jpg'),check_existing=True);rocktex.projection='BOX';rocktex.projection_blend=.25;rocktex.extension='REPEAT';links.new(mapping.outputs[0],rocktex.inputs[0])
    tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=color if key=='qn_Rocks' else overrides[key];links.new(rocktex.outputs[0],tint.inputs[1])
    old=shader.inputs['Base Color'].links[0].from_socket if shader.inputs['Base Color'].links else None
    mix=nodes.new('ShaderNodeMixRGB');mix.inputs[0].default_value=.82 if key=='qn_Rocks' else .8
    if old:links.new(old,mix.inputs[1])
    else:mix.inputs[1].default_value=shader.inputs['Base Color'].default_value
    links.new(tint.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],shader.inputs['Base Color'])
   if key=='qn_Rocks':
    geo=nodes.new('ShaderNodeNewGeometry');coords=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Position'],coords.inputs[0])
    def mathnode(op,a,b):
     n=nodes.new('ShaderNodeMath');n.operation=op
     for i,v in enumerate((a,b)):
      if isinstance(v,(int,float)):n.inputs[i].default_value=v
      else:links.new(v,n.inputs[i])
     return n.outputs[0]
    dx=mathnode('ABSOLUTE',mathnode('SUBTRACT',coords.outputs['X'],10.4),0);field=mathnode('MULTIPLY',mathnode('LESS_THAN',dx,6),mathnode('MULTIPLY',mathnode('GREATER_THAN',coords.outputs['Y'],12),mathnode('LESS_THAN',coords.outputs['Y'],28)))
    crack=mathnode('POWER',mathnode('SUBTRACT',1,mathnode('ABSOLUTE',mathnode('SINE',mathnode('ADD',mathnode('MULTIPLY',coords.outputs['Z'],3.5),mathnode('ADD',mathnode('SINE',mathnode('MULTIPLY',coords.outputs['X'],1.3),0),mathnode('SINE',mathnode('MULTIPLY',coords.outputs['Y'],.8),0))),0),0)),18)
    shader.inputs['Emission Color'].default_value=(.12,.58,.55,1);links.new(mathnode('MULTIPLY',.32,mathnode('MULTIPLY',field,crack)),shader.inputs['Emission Strength'])
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
for material in shared_materials.values():
 nodes=material.node_tree.nodes;links=material.node_tree.links;shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');targets=[link.to_socket for link in list(shader.outputs[0].links)]
 depth=nodes.new('ShaderNodeCameraData');factor=nodes.new('ShaderNodeMapRange');factor.clamp=True;factor.inputs['From Min'].default_value=38;factor.inputs['From Max'].default_value=105;links.new(depth.outputs['View Z Depth'],factor.inputs['Value'])
 emission=nodes.new('ShaderNodeEmission');emission.inputs[0].default_value=(.12,.19,.21,1)
 coverage=nodes.new('ShaderNodeMath');coverage.operation='MULTIPLY';links.new(factor.outputs[0],coverage.inputs[0]);
 if shader.inputs['Alpha'].links:links.new(shader.inputs['Alpha'].links[0].from_socket,coverage.inputs[1])
 else:coverage.inputs[1].default_value=shader.inputs['Alpha'].default_value
 fog=nodes.new('ShaderNodeMixShader');links.new(coverage.outputs[0],fog.inputs[0]);links.new(shader.outputs[0],fog.inputs[1]);links.new(emission.outputs[0],fog.inputs[2])
 for target in targets:links.new(fog.outputs[0],target)
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
 bw=nodes.new('ShaderNodeRGBToBW');links.new(image.outputs['Color'],bw.inputs[0]);cobble=mul(mix(bw.outputs[0],image.outputs[0],.28),(.66,.70,.66))
 rockcoords=nodes.new('ShaderNodeVectorMath');rockcoords.operation='MULTIPLY';rockcoords.inputs[1].default_value=(1/2.3,1/2.3,0);links.new(geo.outputs['Position'],rockcoords.inputs[0]);rock=nodes.new('ShaderNodeTexImage');rock.image=bpy.data.images.load(str(ROOT/next(m for m in cat['materials'] if m['key']=='qn_Rocks')['baseTexture']),check_existing=True);rock.extension='REPEAT';links.new(rockcoords.outputs[0],rock.inputs[0])
 def weather(x,y,f=1):
  return calc('ADD',.5,calc('ADD',calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',x,.73*f),calc('MULTIPLY',2,calc('SINE',calc('MULTIPLY',y,.39*f)))))),calc('MULTIPLY',.25,calc('SINE',calc('ADD',calc('MULTIPLY',y,.91*f),calc('MULTIPLY',x,.27*f))))))
 # Same world cell size and irregular paving silhouette as the Built-in shader.
 wx=calc('ADD',x,calc('MULTIPLY',.12,calc('SINE',calc('ADD',calc('MULTIPLY',y,.31),calc('MULTIPLY',x,.19)))));wy=calc('ADD',y,calc('MULTIPLY',.12,calc('SINE',calc('MULTIPLY',x,.28))));cx=calc('ADD',calc('DIVIDE',wx,1.7),calc('MULTIPLY',.5,calc('FLOOR',calc('DIVIDE',wy,1.25))));cy=calc('DIVIDE',wy,1.25);lx=calc('FRACT',cx);ly=calc('FRACT',cy)
 seed=calc('FRACT',calc('MULTIPLY',43758.5453,calc('SINE',calc('ADD',calc('MULTIPLY',calc('FLOOR',cx),127.1),calc('MULTIPLY',calc('FLOOR',cy),311.7)))))
 seam=calc('MINIMUM',calc('MINIMUM',lx,calc('SUBTRACT',1,lx)),calc('MINIMUM',ly,calc('SUBTRACT',1,ly)));joint=smooth(seam,.025,.065)
 flags=mix((.22,.245,.24),(.36,.355,.31),seed)
 multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;links.new(flags,multiply.inputs[1]);links.new(mix((.78,.78,.78),image.outputs[0],.55),multiply.inputs[2]);flags=multiply.outputs[0]
 stone=mix(cobble,flags,calc('MULTIPLY',.78,smooth(weather(x,y,.31),.30,.68)))
 mult=nodes.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1;links.new(stone,mult.inputs[1]);links.new(calc('SUBTRACT',1,calc('MULTIPLY',calc('MULTIPLY',calc('SUBTRACT',1,joint),.28),calc('MULTIPLY',.85,smooth(weather(x,y,.31),.30,.68)))),mult.inputs[2]);stone=mult.outputs[0]
 fracture=calc('SUBTRACT',1,smooth(calc('ABSOLUTE',calc('SINE',calc('ADD',calc('MULTIPLY',x,.61),calc('MULTIPLY',2.5,calc('SINE',calc('MULTIPLY',y,.33)))))),.02,.05))
 stone=mix(stone,(.11,.16,.095),calc('ADD',calc('MULTIPLY',calc('SUBTRACT',1,joint),.32),calc('MULTIPLY',fracture,.10)))
 forestcoords=nodes.new('ShaderNodeVectorMath');forestcoords.operation='MULTIPLY';forestcoords.inputs[1].default_value=(1/4,1/4,0);links.new(geo.outputs['Position'],forestcoords.inputs[0]);forest=nodes.new('ShaderNodeTexImage');forest.image=bpy.data.images.load(str(ROOT/'Assets/Art/Environment/External/SharedTextures/T_ForestGround04_Color.jpg'),check_existing=True);forest.extension='REPEAT';links.new(forestcoords.outputs[0],forest.inputs[0]);soil=mul(forest.outputs[0],(.56,.62,.52));soil=mix(soil,(.075,.15,.085),calc('MULTIPLY',.22,smooth(weather(x,y,.53),.52,.82)))
 edge=calc('ADD',8.8,calc('ADD',calc('SINE',calc('MULTIPLY',x,.23)),calc('MULTIPLY',.45,calc('SINE',calc('ADD',calc('MULTIPLY',x,.67),2)))))
 paving=calc('MULTIPLY',calc('SUBTRACT',1,smooth(calc('ABSOLUTE',y),edge,calc('ADD',edge,2.4))),calc('SUBTRACT',1,smooth(calc('ABSOLUTE',x),27,32)))
 damage=calc('MULTIPLY',calc('GREATER_THAN',seed,.86),calc('MULTIPLY',smooth(calc('ABSOLUTE',y),3,10),calc('SUBTRACT',1,calc('MULTIPLY',joint,.72))))
 final=mix(soil,mix(stone,soil,damage),paving)
 if team:final=mix(final,mul(final,tuple(c*3.5 for c in team)),calc('MULTIPLY',.42,paving))
 links.new(final,shader.inputs['Base Color'])
 bump=nodes.new('ShaderNodeBump');links.new(calc('MULTIPLY',.25,paving),bump.inputs['Strength']);bump.inputs['Distance'].default_value=.12;links.new(bw.outputs[0],bump.inputs['Height']);links.new(bump.outputs[0],shader.inputs['Normal']);return m
ground=surface('Approximate shared world-space stone and organic moss');blue=surface('Approximate blue territory',(.22,.255,.27));red=surface('Approximate red territory',(.275,.23,.225));gold=material('Existing territorial front',(.83,.78,.57),True)
def cube(name,p,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],p[2],p[1]));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);o.data.materials.append(m);return o
# Original box floor renderer is hidden; authoritative floor collision remains outside this offline render.
# The ten existing authoritative wall renderers remain as low textured retaining markers.
from validate_wilderness import ISLANDS
for i,(x,z,w,d) in enumerate(ISLANDS):
 h=.75 if i<4 else .65
 cube('Existing authoritative wall visual '+str(i),(x,h/2,z),(w,h,d),shared_materials['qn_Rocks']).visible_shadow=False
cube('Blue territory',(-14,.015,0),(28,.01,24),blue).visible_shadow=False;cube('Red territory',(14,.015,0),(28,.01,24),red).visible_shadow=False;cube('Front',(0,.04,0),(.09,.035,24),gold).visible_shadow=False
vertices=[];faces=[]
for side,(x0,z0,x1,z1) in enumerate([(-58,-54,-34,54),(34,-54,58,54),(-34,32,34,54),(-34,-54,34,-32),(-34,12.5,34,32),(-34,-32,34,-12.5),(-34,-32,34,32)]):
 base=len(vertices)
 for iz in range(49):
  for ix in range(49):
   x=x0+(x1-x0)*ix/48;z=z0+(z1-z0)*iz/48;vertices.append((x,z,-.06 if side==6 else terrain_height(x,z)))
   if ix<48 and iz<48:
    i=base+iz*49+ix;faces.extend([(i,i+1,i+49),(i+1,i+50,i+49)])
mesh=bpy.data.meshes.new('Same exterior apron topology');mesh.from_pydata(vertices,[],faces);mesh.materials.append(ground);obj=bpy.data.objects.new('Renderer-only world continuation',mesh);scene.collection.objects.link(obj)
for polygon in mesh.polygons:polygon.use_smooth=True
bpy.ops.object.light_add(type='SUN');bpy.context.object.rotation_euler=Vector((-math.sin(math.radians(48))*math.cos(math.radians(36)),math.cos(math.radians(48))*math.cos(math.radians(36)),-math.sin(math.radians(36)))).to_track_quat('-Z','Y').to_euler();bpy.context.object.data.energy=2.6;bpy.context.object.data.color=(1,.88,.70);bpy.context.object.data.angle=.02
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.clip_start=.1;camera.data.clip_end=150;camera.data.ortho_scale=HALF_HEIGHT*16/9*2;scene.camera=camera
def png(name,path,position,height=None,width=None,pivot=.04,grounded=False):
 image=bpy.data.images.load(str(ROOT/path),check_existing=True);w,h=image.size;sy=height if height else width*h/w;sx=sy*w/h
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(-sx/2,-sy*pivot,0),(sx/2,-sy*pivot,0),(sx/2,sy*(1-pivot),0),(-sx/2,sy*(1-pivot),0)],[],[(0,1,2,3)])
 uv=mesh.uv_layers.new();
 for i,value in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=value
 obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.location=(position[0],position[2],position[1]);obj.rotation_euler=(0,0,0) if grounded else camera.rotation_euler
 m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes.clear();nodes=m.node_tree.nodes;links=m.node_tree.links
 tex=nodes.new('ShaderNodeTexImage');tex.image=image;em=nodes.new('ShaderNodeEmission');
 if name.startswith('Forest ') or name.startswith('Waterfall '):
  tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.75,.80,.76,1);links.new(tex.outputs['Color'],tint.inputs[1]);links.new(tint.outputs[0],em.inputs[0])
 else:links.new(tex.outputs['Color'],em.inputs[0])
 transparent=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');links.new(tex.outputs['Alpha'],mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(em.outputs[0],mix.inputs[2]);out=nodes.new('ShaderNodeOutputMaterial');links.new(mix.outputs[0],out.inputs[0]);mesh.materials.append(m);obj.visible_shadow=False;return obj
views=[('blue-combat',-25,0),('center-lane',0,0),('red-combat',25,0),('objective',0,26)]
out=ROOT/args.output;out.mkdir(parents=True,exist_ok=True);(out/'COMPOSITION_SNAPSHOT.json').write_bytes(composition_bytes);(out/'SURFACE_SNAPSHOT.cginc').write_bytes(shader_bytes);(out/'CAMERA_SNAPSHOT.cs').write_bytes((ROOT/'Assets/Crownfall/Environment/CameraFraming.cs').read_bytes());(out/'MATERIAL_SNAPSHOT.shader').write_bytes((ROOT/'Assets/Crownfall/Environment/Shaders/EnvironmentLit.shader').read_bytes())
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
 text=bpy.data.curves.new('Offline label','FONT');text.body='M15.1 OFFLINE BLENDER APPROXIMATION  |  '+name+'  |  Unity import/render PENDING';text.size=.31
 label=bpy.data.objects.new('Offline label',text);scene.collection.objects.link(label);label.parent=camera;label.location=(-HALF_HEIGHT*16/9+.5,HALF_HEIGHT-.7,-1);label.data.materials.append(material('Label white',(.85,.9,.92),True));temporary.append(label)
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
 allViews.append(dict(name=name,actor=[actorX,actorZ],cameraGroundCenter=[cx,cz],cameraPositionUnity=[cx,HEIGHT,cz-HEIGHT/math.tan(math.radians(PITCH))],pitch=PITCH,orthographicSize=HALF_HEIGHT,aspect=16/9))
 for obj in temporary:bpy.data.objects.remove(obj,do_unlink=True)
report=dict(engine='Blender '+bpy.app.version_string,unityExecuted=False,sourceShaderSha256=hashlib.sha256(shader_bytes).hexdigest(),compositionSha256=hashlib.sha256(composition_bytes).hexdigest(),cameraSource='Assets/Crownfall/Environment/CameraFraming.cs',coordinateMapping='Unity (X,Y,Z) to Blender (X,Z,Y); source glTF reference mesh Y reflected; authored yaw sign converted',projectionAssertions=len(allViews)*4,views=allViews,limitations=['Not Unity rendering or live gameplay; preserved glTF references approximate native FBX meshes','Built-in shader, alpha mip coverage, ASTC fallback and GPU shadows remain native/device PENDING','Approximate stone/lighting and static original character PNG scale references; no HUD or combat effects','Bounded six-Summoner Unity cutaway not simulated; geometry overlap is conservatively visible'])
(out/'OFFLINE_PREVIEW_REPORT.json').write_text(json.dumps(report,indent=2)+'\n')
