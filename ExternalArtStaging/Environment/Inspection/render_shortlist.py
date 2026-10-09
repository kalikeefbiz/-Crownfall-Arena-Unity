"""Blender 4.3: read-only glTF inspection renders; does not export or alter models.
blender -b -t 4 -P ExternalArtStaging/Environment/Inspection/render_shortlist.py
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
models={m['id']:m for m in json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())['models']}
shortlist=json.loads((HERE/'shortlist.json').read_text())
shortlist['qm:Wall_Arch']='Audited rejected candidate: timber arch'
out=HERE/'Previews';out.mkdir(exist_ok=True)
for index, key in enumerate(shortlist):
 target=out/(key.replace(':','_')+'.png')
 if target.exists():continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/models[key]['staged_path']))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 points=[o.matrix_world@Vector(p) for o in meshes for p in o.bound_box]
 lo=Vector([min(p[i] for p in points) for i in range(3)])
 hi=Vector([max(p[i] for p in points) for i in range(3)])
 center=(lo+hi)/2;size=max(hi-lo)
 scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=12
 scene.cycles.use_denoising=False
 scene.cycles.max_bounces=4;scene.cycles.transparent_max_bounces=12
 scene.render.resolution_x=320;scene.render.resolution_y=320;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Inspection neutral studio');scene.world.use_nodes=True
 scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.21,0.24,0.28,1)
 scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.7
 bpy.ops.object.camera_add(location=center+Vector((1.3,-2.2,1.1)).normalized()*size*3)
 camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 camera.data.type='ORTHO';camera.data.ortho_scale=size*1.4;camera.data.clip_end=max(1000,size*10);scene.camera=camera
 bpy.ops.object.light_add(type='AREA',location=center+Vector((1,-2,3))*size)
 light=bpy.context.object;light.data.energy=150*size*size;light.data.shape='DISK';light.data.size=size*2
 light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
 scene.view_settings.view_transform='Standard'
 scene.render.image_settings.file_format='PNG';scene.render.filepath=str(target)
 bpy.ops.render.render(write_still=True)
 print('INSPECTED',index+1,len(shortlist),key,flush=True)
