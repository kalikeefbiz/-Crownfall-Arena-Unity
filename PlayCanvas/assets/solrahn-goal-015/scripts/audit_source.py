import bpy,json
from pathlib import Path
out={}
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  m=o.data;m.calc_loop_triangles()
  out[o.name]={'vertices':len(m.vertices),'triangles':len(m.loop_triangles),'polygons':len(m.polygons),'uvs':[u.name for u in m.uv_layers],'bounds':[list(v) for v in o.bound_box],'matrix':[list(r) for r in o.matrix_world],'modifiers':[(v.name,v.type) for v in o.modifiers],'smooth':sum(p.use_smooth for p in m.polygons),'customNormals':m.has_custom_normals}
out['images']=[{'name':i.name,'size':list(i.size),'colorspace':i.colorspace_settings.name,'packed':i.packed_file.size if i.packed_file else 0} for i in bpy.data.images]
out['materials']=[]
for m in bpy.data.materials:
 out['materials'].append({'name':m.name,'nodes':[{'name':n.name,'type':n.type,'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None,'inputs':{i.name:str(i.default_value) for i in n.inputs if hasattr(i,'default_value')}} for n in m.node_tree.nodes],'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links]})
(Path(__file__).resolve().parents[1]/'manifests/source-audit.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
