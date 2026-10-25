import json,struct,pathlib,io,hashlib,urllib.request
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2]/'public/assets/environment'
report=[]
for p in (root/'trees').glob('*.glb'):
 b=p.read_bytes(); n=struct.unpack_from('<I',b,12)[0]; g=json.loads(b[20:20+n]); binary=b[28+n:]; out=bytearray(); images={i['bufferView'] for i in g['images']}
 for j,v in enumerate(g['bufferViews']):
  data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  if j in images:
   im=Image.open(io.BytesIO(data)); im=im.resize((512,512),Image.Resampling.LANCZOS); dest=io.BytesIO(); im.save(dest,format='JPEG',quality=95,subsampling=0); data=dest.getvalue()
  while len(out)%4: out.append(0)
  v['byteOffset']=len(out); v['byteLength']=len(data); out.extend(data)
 g['buffers'][0]['byteLength']=len(out)
 while len(out)%4: out.append(0)
 js=json.dumps(g,separators=(',',':')).encode()
 while len(js)%4: js+=b' '
 result=struct.pack('<III',0x46546c67,2,28+len(js)+len(out))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(out),0x004e4942)+out
 target=root/'trees'/'mobile'/p.name; target.parent.mkdir(exist_ok=True); target.write_bytes(result)
 report.append({'source':p.name,'sourceBytes':len(b),'runtimeBytes':len(result),'sourceSha256':hashlib.sha256(b).hexdigest(),'runtimeSha256':hashlib.sha256(result).hexdigest(),'triangles':sum(g['accessors'][q['indices']]['count']//3 for m in g['meshes'] for q in m['primitives']),'bounds':g['accessors'][g['meshes'][0]['primitives'][0]['attributes']['POSITION']]})
(root/'trees'/'mobile'/'preparation.json').write_text(json.dumps(report,indent=4)+'\n')
for a in ['sparse_grass','forest_leaves_02']:
 g=json.load(urllib.request.urlopen('https://api.polyhaven.com/files/'+a)); ims={}
 for k in ['Diffuse','nor_gl','AO','Rough']:
  item=g[k]['1k']['jpg']; data=urllib.request.urlopen(item['url']).read(); assert hashlib.md5(data).hexdigest()==item['md5']; ims[k]=Image.open(io.BytesIO(data)).resize((512,512),Image.Resampling.LANCZOS)
 d=root/'polyhaven'
 ims['Diffuse'].save(d/(a+'_albedo_512.webp'),quality=92,method=6)
 ims['nor_gl'].save(d/(a+'_normal_512.webp'),quality=96,method=6)
 Image.merge('RGB',(ims['AO'].convert('L'),ims['Rough'].convert('L'),Image.new('L',(512,512)))).save(d/(a+'_ar_512.png'))
print(json.dumps(report,indent=2))
