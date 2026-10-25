import bpy, math, sys
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[2] / 'public/assets'
for key,src in [('kit','summoners/kit/Kit_20K_Animated.glb'),('set','summoners/set/Set_Animated.glb'),('riven','summoners/riven/Riven_Animated.glb')]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/src))
 scene=bpy.context.scene
 # Use the authored bind pose, actual imported materials, no character edits.
 meshes=[o for o in scene.objects if o.type=='MESH']
 pts=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in pts) for i in range(3))); hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
 h=hi.z-lo.z; center=(lo+hi)/2; target=center+Vector((0,0,h*.12))
 bpy.ops.object.camera_add(location=target+Vector((h*.10,-h*1.8,h*.10)))
 camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=h*.82;scene.camera=camera
 for loc,power,size in [((h,-h,h*1.5),60, h),((-h,-h*.5,h),40,h),((0,h,h*1.3),80,h)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));l=bpy.context.object;l.data.energy=power*h*h;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
 scene.world=bpy.data.worlds.new('Portrait studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.27,.36,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.film_transparent=True
 scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.filepath=str(root/f'frontend/portraits/{key}.png')
 bpy.ops.render.render(write_still=True)

# Convert generated PNGs to transparent WebP (Pillow in a regular Python process).
