import json,struct,io,pathlib
from PIL import Image
for p in (pathlib.Path(__file__).resolve().parents[2] / '.audit/018a/polyhaven/mobile').glob('*.glb'):
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);bin=raw[28+n:];out=bytearray()
 for i,v in enumerate(d['bufferViews']):
  b=bin[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if any(im.get('bufferView')==i for im in d.get('images',[])):
   im=Image.open(io.BytesIO(b)).convert('RGB');limit = 1024 if p.stem == 'rock_face_02' and any(x.get('bufferView') == i and 'diff' in x.get('name', '') for x in d['images']) else 512;im.thumbnail((limit,limit));tmp=io.BytesIO();im.save(tmp,format='JPEG',quality=85,optimize=True);b=tmp.getvalue()
  while len(out)%4:out.append(0)
  v['byteOffset']=len(out);v['byteLength']=len(b);out.extend(b)
 for m in d['materials']:m['doubleSided']=False
 d['asset']['copyright']='Poly Haven CC0; https://polyhaven.com/a/'+p.stem
 d['buffers'][0]['byteLength']=len(out)
 while len(out)%4:out.append(0)
 j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(out))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(out),0x004e4942)+out)
 print(p.name,p.stat().st_size)
