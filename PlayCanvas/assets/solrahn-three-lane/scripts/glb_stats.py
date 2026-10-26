"""Independent binary GLB inventory, embedded PNG/JPEG sizes, buffers and accessor budgets."""
import json,struct,sys,hashlib,io
from pathlib import Path
from PIL import Image
p=Path(sys.argv[1]);out=Path(sys.argv[2]);data=p.read_bytes();magic,version,total=struct.unpack_from('<III',data);assert magic==0x46546c67 and version==2 and total==len(data)
offset=12;chunks={}
while offset<len(data):
 size,kind=struct.unpack_from('<II',data,offset);chunks[kind]=data[offset+8:offset+8+size];offset+=size+8
j=json.loads(chunks[0x4e4f534a]);buf=chunks[0x004e4942];ims=[]
for i in j.get('images',[]):
 v=j['bufferViews'][i['bufferView']];start=v.get('byteOffset',0);raw=buf[start:start+v['byteLength']];im=Image.open(io.BytesIO(raw));ims.append(dict(name=i.get('name'),mimeType=i.get('mimeType'),width=im.width,height=im.height,bytes=len(raw),rgba8_mips_bytes=int(im.width*im.height*4*4/3)))
primitives=[p for m in j.get('meshes',[]) for p in m['primitives']];a=j['accessors'];bv=j['bufferViews'];views=set();verts=tris=0
for prim in primitives:
 verts+=a[prim['attributes']['POSITION']]['count'];tris+=a[prim['indices']]['count']//3
 for idx in list(prim['attributes'].values())+[prim['indices']]:views.add(a[idx]['bufferView'])
r=dict(file=p.name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),meshes=len(j.get('meshes',[])),nodes=j.get('nodes'),primitives=len(primitives),materials=j.get('materials',[]),samplers=j.get('samplers',[]),exported_vertices_including_uv_normal_tangent_splits=verts,triangles=tris,geometry_buffer_bytes=sum(bv[i]['byteLength'] for i in views),images=ims,texture_rgba8_mips_bytes=sum(i['rgba8_mips_bytes'] for i in ims),extensions_used=j.get('extensionsUsed',[]),extensions_required=j.get('extensionsRequired',[]),external_uris=[x['uri'] for k in ['images','buffers'] for x in j.get(k,[]) if 'uri' in x],accessors=a)
out.write_text(json.dumps(r,indent=2));print(json.dumps({k:r[k] for k in ['file','bytes','exported_vertices_including_uv_normal_tangent_splits','triangles','geometry_buffer_bytes','texture_rgba8_mips_bytes','primitives','extensions_required']},indent=2))
