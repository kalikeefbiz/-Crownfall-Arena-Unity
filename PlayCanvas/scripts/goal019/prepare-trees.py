"""Palette derivatives only. Preserve approved original GLBs, geometry and maps."""
import struct,json,io,hashlib
from pathlib import Path
from PIL import Image,ImageEnhance
root=Path(__file__).resolve().parents[2]
src=root/'public/assets/environment/trees/mobile';outdir=root/'public/assets/environment/trees/goal019';outdir.mkdir(exist_ok=True)
receipt=[]
for p in src.glob('*.glb'):
 if 'Red_oak' in p.name:continue
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:];out=bytearray()
 colorimages={g['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]['source'] for m in g['materials']}
 colorviews={g['images'][i]['bufferView'] for i in colorimages}
 for i,v in enumerate(g['bufferViews']):
  b=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if i in colorviews:
   im=Image.open(io.BytesIO(b)).convert('RGB');im=ImageEnhance.Color(im).enhance(.47);im=ImageEnhance.Brightness(im).enhance(1.15 if 'Pine' in p.name else .90)
   temp=io.BytesIO();im.save(temp,format='JPEG',quality=90);b=temp.getvalue()
   for image in g['images']:
    if image.get('bufferView')==i:image['mimeType']='image/jpeg'
  while len(out)%4:out.append(0)
  v['byteOffset']=len(out);v['byteLength']=len(b);out.extend(b)
 g['buffers'][0]['byteLength']=len(out)
 while len(out)%4:out.append(0)
 j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 dest=outdir/p.name;dest.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(out))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(out),0x004e4942)+out)
 receipt.append(dict(source=str(p.relative_to(root)),sourceSha256=hashlib.sha256(raw).hexdigest(),runtime=str(dest.relative_to(root)),sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size,geometry='unchanged buffer bytes',rights='Existing founder-approved Meshy assets; no CC0 relicense'))
(root/'evidence/019/tree-processing.json').write_text(json.dumps(receipt,indent=2)+'\n')
