"""Prepare a portable packed 2K PBR working copy and a single coherent GLB; input remains unchanged."""
import bpy,sys,json
from pathlib import Path
base=Path(__file__).resolve().parents[1]
textures=base/'working/textures';textures.mkdir(exist_ok=True)
changes=[]
for i in list(bpy.data.images):
    if i.source!='FILE':continue
    before=list(i.size)
    if max(before)>2048:
        factor=2048/max(before);i.scale(round(before[0]*factor),round(before[1]*factor))
    # Save actual pixels, then repack so export never reads stale original compressed payload.
    i.filepath_raw=str(textures/(i.name+'.png'));i.file_format='PNG';i.save()
    # Existing packed bytes survive image.scale()/pack(); load a fresh image from saved pixels.
    old_name=i.name;space=i.colorspace_settings.name
    fresh=bpy.data.images.load(i.filepath_raw,check_existing=False);fresh.colorspace_settings.name=space
    for mat in bpy.data.materials:
        if mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image==i:node.image=fresh
    bpy.data.images.remove(i);i=fresh;i.name=old_name;i.pack()
    i.filepath='//textures/'+old_name+'.png'
    changes.append(dict(name=i.name,before=before,after=list(i.size),colorspace=i.colorspace_settings.name,packed_bytes=i.packed_file.size))
for o in bpy.context.scene.objects:o.select_set(o.type=='MESH')
blend=base/'working/solrahn-three-lane-optimized.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
bpy.ops.export_scene.gltf(filepath=str(base/'runtime/solrahn-three-lane-visual.glb'),export_format='GLB',use_selection=True,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True,export_materials='EXPORT',export_image_format='AUTO',export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
(base/'manifests/texture-preparation.json').write_text(json.dumps(changes,indent=2));print('RUNTIME_READY',flush=True)
