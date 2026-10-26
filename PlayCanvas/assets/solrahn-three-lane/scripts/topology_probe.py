"""Extract numeric topology for read-only connected-component and duplicate analysis."""
import bpy,numpy as np,sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
m=next(o.data for o in bpy.context.scene.objects if o.type=='MESH')
for name,coll,attr,size,dtype in [('positions',m.vertices,'co',3,np.float32),('edges',m.edges,'vertices',2,np.int32),('faces',m.loops,'vertex_index',3,np.int32),('uv',m.uv_layers.active.data,'uv',2,np.float32)]:
    count=len(coll) if name!='faces' else len(m.polygons)
    a=np.empty(count*size,dtype=dtype);coll.foreach_get(attr,a);np.save(out/(name+'.npy'),a.reshape(-1,size))
