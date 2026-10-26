"""Read-only Blender scene inventory. Run with --disable-autoexec, file, --python this.py -- OUTPUT."""
import bpy, sys, json, os, hashlib
import numpy as np
from mathutils import Vector
from pathlib import Path

def counts(m):
    n=np.empty(len(m.polygons),dtype=np.int32); m.polygons.foreach_get('loop_total',n)
    return dict(vertices=len(m.vertices),edges=len(m.edges),polygons=len(m.polygons),triangles=int(np.maximum(n-2,0).sum()),loops=len(m.loops))
def bounds(o,m):
    a=np.empty(len(m.vertices)*3,dtype=np.float32);m.vertices.foreach_get('co',a);a=a.reshape(-1,3)
    mat=np.array(o.matrix_world); a=a@mat[:3,:3].T+mat[:3,3]
    return dict(min=a.min(0).tolist(),max=a.max(0).tolist()) if len(a) else None
def audit(out):
    dg=bpy.context.evaluated_depsgraph_get(); objects=[];seen={};dupes=[]
    for o in bpy.context.scene.objects:
        d=dict(name=o.name,type=o.type,collections=[c.name for c in o.users_collection],parent=o.parent.name if o.parent else None,matrix_world=[list(r) for r in o.matrix_world],location=list(o.location),rotation_mode=o.rotation_mode,rotation_euler=list(o.rotation_euler),scale=list(o.scale),hide_render=o.hide_render,hide_viewport=o.hide_viewport,modifiers=[dict(name=x.name,type=x.type,show_render=x.show_render,show_viewport=x.show_viewport) for x in o.modifiers])
        if o.type=='MESH':
            m=o.data; d.update(mesh=m.name,mesh_users=m.users,source=counts(m),bounds=bounds(o,m),uv_maps=[dict(name=u.name,active_render=u.active_render) for u in m.uv_layers],materials=[x.name if x else None for x in m.materials],attributes=[dict(name=a.name,domain=a.domain,data_type=a.data_type) for a in m.attributes])
            ev=o.evaluated_get(dg);em=ev.to_mesh(); d['evaluated']=counts(em); ev.to_mesh_clear()
            h=hashlib.sha256()
            for prop,attr,dtype,size in [('vertices','co',np.float32,3),('loops','vertex_index',np.int32,1),('polygons','material_index',np.int32,1)]:
                a=np.empty(len(getattr(m,prop))*size,dtype=dtype);getattr(m,prop).foreach_get(attr,a);h.update(a.tobytes())
            d['geometry_material_hash']=h.hexdigest()
            if d['geometry_material_hash'] in seen:dupes.append([seen[d['geometry_material_hash']],o.name])
            else:seen[d['geometry_material_hash']]=o.name
        objects.append(d)
    images=[]
    for i in bpy.data.images:
        packed=bool(i.packed_file or i.packed_files);path=bpy.path.abspath(i.filepath)
        images.append(dict(name=i.name,source=i.source,filepath=i.filepath,resolved_path=path,exists=os.path.exists(path),packed=packed,packed_bytes=sum(p.packed_file.size for p in i.packed_files),size=list(i.size),channels=i.channels,colorspace=i.colorspace_settings.name,has_data=i.has_data,float_buffer=i.is_float,gpu_rgba8_mips_bytes=int(i.size[0]*i.size[1]*4*4/3)))
    mats=[]
    for m in bpy.data.materials:
        nodes=[];links=[]
        if m.node_tree:
            for n in m.node_tree.nodes:
                inputs={}
                for s in n.inputs:
                    if hasattr(s,'default_value'):
                        v=s.default_value
                        try:v=list(v)
                        except TypeError:pass
                        if isinstance(v,(str,float,int,list,bool)):inputs[s.name]=v
                nodes.append(dict(name=n.name,type=n.bl_idname,image=n.image.name if hasattr(n,'image') and n.image else None,inputs=inputs))
            links=[dict(from_node=l.from_node.name,from_socket=l.from_socket.name,to_node=l.to_node.name,to_socket=l.to_socket.name) for l in m.node_tree.links]
        mats.append(dict(name=m.name,users=m.users,use_nodes=m.use_nodes,nodes=nodes,links=links))
    ms=[x for x in objects if x['type']=='MESH']
    result=dict(blender=bpy.app.version_string,source=bpy.data.filepath,autoexec_enabled=bpy.context.preferences.filepaths.use_scripts_auto_execute,units=dict(system=bpy.context.scene.unit_settings.system,scale_length=bpy.context.scene.unit_settings.scale_length),collections=[dict(name=c.name,objects=[o.name for o in c.objects],children=[x.name for x in c.children]) for c in bpy.data.collections],objects=objects,materials=mats,images=images,external_paths=list(bpy.utils.blend_paths(absolute=True,packed=False)),libraries=[dict(name=l.name,filepath=l.filepath) for l in bpy.data.libraries],text_blocks=[dict(name=t.name,use_module=t.use_module) for t in bpy.data.texts],duplicates=dupes,totals=dict(scene_objects=len(objects),mesh_objects=len(ms),unique_meshes=len({x['mesh'] for x in ms}),materials=len(mats),**{s:{k:sum(x[s][k] for x in ms) for k in ['vertices','triangles','polygons','loops']} for s in ['source','evaluated']}))
    Path(out).write_text(json.dumps(result,indent=2)); print('AUDIT',json.dumps(result['totals']),flush=True)
if __name__=='__main__': audit(sys.argv[sys.argv.index('--')+1])
