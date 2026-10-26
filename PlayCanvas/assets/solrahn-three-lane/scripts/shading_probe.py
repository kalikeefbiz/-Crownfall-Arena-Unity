import bpy,numpy as np,json,sys
from pathlib import Path
records=[]
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  m=o.data;a=np.empty(len(m.polygons),np.bool_);m.polygons.foreach_get('use_smooth',a)
  records.append(dict(object=o.name,smooth_faces=int(a.sum()),flat_faces=int((~a).sum()),has_custom_normals=m.has_custom_normals))
images=[]
for i in bpy.data.images:
 if i.packed_file:images.append(dict(name=i.name,packed_magic_hex=bytes(i.packed_file.data[:32]).hex()))
samplers=[]
for m in bpy.data.materials:
 if m.node_tree:
  for n in m.node_tree.nodes:
   if n.type=='TEX_IMAGE':samplers.append(dict(node=n.name,image=n.image.name if n.image else None,extension=n.extension,interpolation=n.interpolation,projection=n.projection))
Path(sys.argv[sys.argv.index('--')+1]).write_text(json.dumps(dict(shading=records,samplers=samplers,images=images),indent=2))
