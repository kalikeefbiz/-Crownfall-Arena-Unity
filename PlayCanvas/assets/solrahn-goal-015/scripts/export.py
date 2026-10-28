"""Full-quality export from checksum-verified immutable original. Never save the source."""
import bpy,sys,hashlib,json
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]);output=Path(args[1])
assert source.stat().st_size==506928885
assert hashlib.sha256(source.read_bytes()).hexdigest()=='626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f'
bpy.ops.wm.open_mainfile(filepath=str(source))
for o in bpy.context.scene.objects:o.select_set(o.type=='MESH')
# Original node graph is already glTF metallic/roughness-compatible. No material edits.
# Do not save, decimate, resize images, alter UVs, normals or transforms.
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True,export_materials='EXPORT',export_image_format='AUTO',export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
print('FULL_QUALITY_EXPORT_FINISHED',flush=True)
