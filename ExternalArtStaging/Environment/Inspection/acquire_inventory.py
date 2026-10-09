"""Reproduce staging from the four official archives in a supplied cache directory.

Run with Python 3 + numpy + Pillow. Never writes into Unity Assets/.
Original selected members are copied byte-for-byte; archives remain outside Git.
"""
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import struct
import sys
import zipfile
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
STAGE = ROOT / 'ExternalArtStaging/Environment'
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/crownfall-acquisition')
BASELINE = '489e81588d1a9876132625ba65a180b749bb1d61'
SOURCES = {
 'qn': ('Quaternius/Nature', 'Stylized Nature MegaKit — Standard', 'https://quaternius.com/packs/stylizednaturemegakit.html'),
 'qm': ('Quaternius/Medieval', 'Medieval Village MegaKit — Standard', 'https://quaternius.com/packs/medievalvillagemegakit.html'),
 'kn': ('Kenney/Nature', 'Nature Kit 2.1', 'https://kenney.nl/assets/nature-kit'),
 'kc': ('Kenney/Castle', 'Castle Kit 2.0', 'https://kenney.nl/assets/castle-kit'),
}
MEDIEVAL = set('Corner_ExteriorWide_Brick Corner_Exterior_Brick DoorFrame_Flat_Brick DoorFrame_Round_Brick Floor_Brick Floor_UnevenBrick Prop_Brick1 Prop_Brick2 Prop_Brick3 Prop_Brick4 Prop_ExteriorBorder_Corner Prop_ExteriorBorder_Straight1 Prop_ExteriorBorder_Straight2 Stairs_Exterior_Platform Stairs_Exterior_Platform45Clean Stairs_Exterior_Straight Stairs_Exterior_Straight_Center Stairs_Exterior_Sides Wall_Arch Wall_UnevenBrick_Straight Wall_UnevenBrick_Door_Round'.split())
CASTLE = set('ground-hills rocks-large rocks-small stairs-stone stairs-stone-square tower-base tower-hexagon-base tower-hexagon-mid tower-hexagon-top tower-square-arch tower-square-base tower-square-mid tower-square-mid-open-simple tower-square-top tower-top wall-corner-half-tower wall-corner-half wall-corner-slant wall-corner wall-doorway wall-half-modular wall-half wall-narrow-corner wall-narrow-gate wall-narrow-stairs wall-narrow wall-pillar wall-to-narrow wall'.split())
NATURE = set('cliff_block_rock cliff_blockHalf_rock cliff_blockSlope_rock cliff_blockDiagonal_rock cliff_large_rock cliff_rock cliff_top_rock cliff_corner_rock cliff_cornerInner_rock cliff_cornerLarge_rock cliff_steps_rock cliff_cave_rock rock_largeA rock_largeB rock_largeC rock_largeD rock_largeE rock_largeF rock_tallA rock_tallB rock_tallC rock_tallD rock_tallE rock_tallF rock_tallG rock_tallH rock_tallI rock_tallJ plant_bush plant_bushLarge plant_bushSmall plant_bushLargeTriangle tree_default_dark tree_detailed_dark tree_oak_dark tree_fat_darkh tree_pineDefaultA tree_pineDefaultB tree_pineRoundA tree_pineRoundB tree_pineRoundC tree_pineRoundD tree_pineTallA tree_pineTallB tree_pineTallC tree_pineTallD tree_pineSmallA tree_pineSmallB tree_simple_dark tree_tall_dark statue_columnDamaged statue_obelisk statue_ring hanging_moss'.split())

def selected(k, name):
 if k == 'qn':
  return name.startswith(('CommonTree_', 'TwistedTree_', 'Pine_', 'DeadTree_', 'Bush_', 'Fern_', 'Grass_', 'Plant_', 'Rock_Medium_', 'Pebble_Square_'))
 return name in {'qm': MEDIEVAL, 'kn': NATURE, 'kc': CASTLE}[k]

def classify(k, n):
 if k == 'qm' and n == 'Wall_Arch': return 'REJECT', 'Visual inspection: timber arch, not stone; retained only as an audited rejected candidate'
 if k == 'qm': return 'STRUCTURAL', 'Selective stone architecture: off-lane foundations, arches and elevated remains'
 if k == 'kc': return ('MIDGROUND', 'Distant landform/rock silhouette') if n.startswith(('rocks','ground')) else ('STRUCTURAL', 'Backdrop fortification silhouette; architecture only, never a gameplay tower')
 if k == 'kn':
  if n.startswith('statue'): return 'STRUCTURAL', 'Ancient marker or damaged column'
  if n.startswith('cliff'): return 'MIDGROUND', 'Repeated cliff courses and elevated wilderness shelves'
  if n.startswith('rock'): return 'DISTANT FILLER', 'Clustered tall outcrops or distant mountain/rock mass proxy'
  return 'DISTANT FILLER', 'Low-cost distant forest or vegetation repetition'
 if n.startswith(('CommonTree_', 'TwistedTree_')): return 'HERO', 'Individual boundary landmark tree; selective foreground placement'
 if n.startswith('Pine_'): return 'NEAR WILDERNESS', 'Tall conifer boundary and layered forest masses'
 if n.startswith('DeadTree_'): return 'MIDGROUND', 'Sparse dead-tree silhouette near ancient remains'
 if n.startswith('Rock_'): return 'NEAR WILDERNESS', 'Textured boulder clusters and irregular boundary footing'
 if n.startswith('Pebble_'): return 'MIDGROUND', 'Secondary rock accent; too small to form the enclosure alone'
 return 'NEAR WILDERNESS', 'Bush/undergrowth mass; keep clear of combat readability'

def digest(b): return hashlib.sha256(b).hexdigest()

def load_gltf(path):
 b=path.read_bytes(); binary=None
 if path.suffix == '.glb':
  magic,version,length=struct.unpack_from('<III',b)
  assert magic == 0x46546C67 and version == 2 and length == len(b)
  pos=12; j=None
  while pos < len(b):
   size,kind=struct.unpack_from('<II',b,pos);chunk=b[pos+8:pos+8+size];pos+=8+size
   if kind == 0x4E4F534A: j=json.loads(chunk)
   if kind == 0x004E4942: binary=chunk
 else: j=json.loads(b)
 def uri(u):
  if u.startswith('data:'): return base64.b64decode(u.split(',',1)[1])
  assert not '://' in u and '..' not in PurePosixPath(u).parts
  return (path.parent/u).read_bytes()
 buffers=[uri(x['uri']) if 'uri' in x else binary for x in j.get('buffers',[])]
 for spec,data in zip(j.get('buffers',[]),buffers): assert len(data)>=spec['byteLength']
 return j,buffers,uri

def accessor(j,buffers,i):
 a=j['accessors'][i];assert 'sparse' not in a
 v=j['bufferViews'][a['bufferView']];dtype={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
 width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 size=np.dtype(dtype).itemsize;offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.ndarray((a['count'],width),dtype=dtype,buffer=buffers[v['buffer']],offset=offset,strides=(v.get('byteStride',size*width),size)).copy()

def matrix(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4)
 m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]))
 m[:3,3]=n.get('translation',[0,0,0]);return m

def metrics(path):
 j,buffers,uri=load_gltf(path);positions={};tris={};mats=set();primitives=0;position_accessors=set()
 for mi,m in enumerate(j.get('meshes',[])):
  positions[mi]=[];tris[mi]=0
  for p in m['primitives']:
   ai=p['attributes']['POSITION'];position_accessors.add(ai)
   a=accessor(j,buffers,ai);positions[mi].append(a);primitives+=1
   ids=accessor(j,buffers,p['indices']).ravel() if 'indices' in p else np.arange(len(a))
   assert not len(ids) or ids.max()<len(a)
   mode=p.get('mode',4);assert mode in (4,5,6)
   if mode==4:assert len(ids)%3==0
   tris[mi]+=len(ids)//3 if mode==4 else max(0,len(ids)-2)
   if 'material' in p:mats.add(p['material'])
 nodes=j.get('nodes',[]);scene=j.get('scenes',[{'nodes':list(range(len(nodes)))}])[j.get('scene',0)]
 transformed=[];scene_tris=0
 def walk(i,parent):
  nonlocal scene_tris
  n=nodes[i];world=parent@matrix(n)
  if 'mesh' in n:
   mi=n['mesh'];scene_tris+=tris[mi]
   for a in positions[mi]:transformed.append((np.c_[a,np.ones(len(a))]@world.T)[:,:3])
  for child in n.get('children',[]):walk(child,world)
 for n in scene['nodes']:walk(n,np.eye(4))
 points=np.concatenate(transformed);lo=points.min(0);hi=points.max(0)
 images=[]
 for i,x in enumerate(j.get('images',[])):
  if 'uri' in x:b=uri(x['uri']);ref=x['uri']
  else:
   v=j['bufferViews'][x['bufferView']];b=buffers[v['buffer']][v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];ref='embedded:'+str(i)
  im=Image.open(io.BytesIO(b));w,h=im.size
  images.append({'reference':ref,'width':w,'height':h,'encoded_bytes':len(b),'sha256':digest(b),'rgba8_mip_chain_estimate_bytes':round(w*h*4*4/3)})
 used=[j['materials'][i] for i in sorted(mats)]
 names=[n.get('name','') for n in nodes]+[m.get('name','') for m in j.get('meshes',[])]
 return {'format':'glTF 2.0 binary' if path.suffix=='.glb' else 'glTF 2.0','file_size_bytes':path.stat().st_size,
  'mesh_vertex_count':sum(j['accessors'][i]['count'] for i in position_accessors),'triangle_count':sum(tris.values()),'scene_triangle_count':scene_tris,
  'material_count':len(mats),'primitive_count':primitives,'texture_count':len(images),'textures':images,
  'bounds':{'coordinate_system':'source glTF Y-up, scene transforms applied; units nominally metres, Unity scale unverified','min':lo.round(5).tolist(),'max':hi.round(5).tolist(),'size':(hi-lo).round(5).tolist()},
  'materials':[{'name':m.get('name',''),'alpha_mode':m.get('alphaMode','OPAQUE'),'double_sided':m.get('doubleSided',False),'metallic_factor':m.get('pbrMetallicRoughness',{}).get('metallicFactor',1),'roughness_factor':m.get('pbrMetallicRoughness',{}).get('roughnessFactor',1)} for m in used],
  'lods':{'status':'detected' if any('lod' in n.lower() for n in names) or 'MSFT_lod' in j.get('extensionsUsed',[]) else 'not_detected','method':'glTF node/mesh names and extensions; no generated LODs'},
  'collider_data':{'status':'name_marker_detected' if any(any(x in n.lower() for x in ('collider','collision','ucx_')) for n in names) else 'not_detected','method':'glTF names; engine physics data is not established by glTF; FBX not independently inspected'},
  'inspection':'Measured from original glTF; FBX is an alternate original export, not independently counted.'}

def main():
 records=[];files=[];sources=[];excluded=[]
 for k,(folder,title,url) in SOURCES.items():
  pack=STAGE/folder;archive=CACHE/(k+'.zip');z=zipfile.ZipFile(archive);names=z.namelist()
  modelnames=[n for n in names if n.endswith(('.gltf','.glb'))]
  picked=[n for n in modelnames if selected(k,PurePosixPath(n).stem)]
  keep=set();deps=set()
  for n in picked:
   keep.add(n);stem=PurePosixPath(n).stem
   # One original FBX variant, avoiding Nature's additional Unity-specific export.
   fs=[f for f in names if PurePosixPath(f).name==stem+'.fbx' and '/Unity/' not in f and not f.startswith('Unity/')]
   fs=sorted(fs,key=lambda f:(len(PurePosixPath(f).parts),len(f)))
   if fs:keep.add(fs[0])
   b=z.read(n)
   j=json.loads(b) if n.endswith('.gltf') else json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
   for x in j.get('buffers',[])+j.get('images',[]):
    if 'uri' in x and not x['uri'].startswith('data:'):
     dep=str(PurePosixPath(n).parent/x['uri']);keep.add(dep);deps.add(PurePosixPath(dep).name)
  for n in names:
   if 'license' in n.lower() and n.endswith('.txt'):keep.add(n)
   if '/Textures/' in '/'+n and PurePosixPath(n).name in deps:keep.add(n)
   if k=='kc' and n=='Models/FBX format/Textures/colormap.png':keep.add(n)
  for n in sorted(keep):
   rel=PurePosixPath(n);assert not rel.is_absolute() and '..' not in rel.parts
   b=z.read(n);target=pack/'Original'/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
   files.append({'source_id':k,'original_path':n,'staged_path':str(target.relative_to(ROOT)),'file_size_bytes':len(b),'sha256':digest(b)})
  evidence=pack/'Provenance';evidence.mkdir(parents=True,exist_ok=True)
  # Official page preserved as evidence; not a model or executable dependency.
  page=(CACHE/(k+'.html')).read_bytes();(evidence/'official-source-page.html').write_bytes(page)
  source={'id':k,'name':title,'official_page':url,'license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/',
   'acquired_utc_date':'2026-10-09','status':'acquired','archive_sha256':digest(archive.read_bytes()),'archive_bytes':archive.stat().st_size,
   'archive_model_count_single_format':len(modelnames),'staged_unique_model_count':len(picked),'staging_path':str(pack.relative_to(ROOT)),
   'license_files':[f['staged_path'] for f in files if f['source_id']==k and 'license' in f['original_path'].lower()]}
  if k in ('qn','qm'):source.update(json.loads((CACHE/(k+'-download-provenance.json')).read_text()))
  else:
   import re
   source['download_url']=re.search(r'href=[\"\']([^\"\']+\.zip)',page.decode())[1]
  source['original_archive_name']={'qn':'Stylized Nature MegaKit[Standard].zip','qm':'Medieval Village MegaKit[Standard].zip','kn':'kenney_nature-kit.zip','kc':'kenney_castle-kit.zip'}[k]
  (evidence/'source.json').write_text(json.dumps(source,indent=2)+'\n');sources.append(source)
  for n in picked:
   name=PurePosixPath(n).stem;path=pack/'Original'/n;classification,role=classify(k,name)
   variants=[f['staged_path'] for f in files if f['source_id']==k and PurePosixPath(f['original_path']).stem==name and f['original_path'].endswith(('.fbx','.gltf','.glb'))]
   records.append({'id':k+':'+name,'name':name,'source_id':k,'source':title,'original_path':n,'staged_path':str(path.relative_to(ROOT)),
    'license':'CC0-1.0','classification':classification,'likely_crownfall_role':role,'original_model_variants':variants,**metrics(path)})
  for n in modelnames:
   if n not in picked:excluded.append({'source_id':k,'original_path':n,'classification':'REJECT','staged':False,'reason':'Outside this acquisition shortlist: settlement props, alternate biome/palette, small decorative detail, duplicate role, or roof/wood architecture.'})
 ruins=STAGE/'Quaternius/Ruins/Provenance';ruins.mkdir(parents=True,exist_ok=True)
 (ruins/'official-source-page.html').write_bytes((CACHE/'qr.html').read_bytes())
 (ruins/'quota-exceeded-response.html').write_bytes((CACHE/'qr-response.html').read_bytes())
 sources.append({'id':'qr','name':'Ultimate Modular Ruins','official_page':'https://quaternius.com/packs/ultimatemodularruins.html','license':'CC0-1.0 (official page)','status':'blocked','reason':'Public Google Drive download endpoint returned HTML Quota exceeded for selected model files, original license and usage notes. No asset bytes or original license acquired.',
  'public_download_folder':'https://drive.google.com/drive/folders/1ETp2ldaHaP0BkS4FBmkT-g9Yf88T_cIX','staged_unique_model_count':0,'staging_path':'ExternalArtStaging/Environment/Quaternius/Ruins'})
 manifest={'schema_version':1,'starting_head':BASELINE,'branch':'browser-parity-unity','acquired_utc_date':'2026-10-09','scope':'Unmodified external CC0 staging only; no Unity import, integration or build',
  'counting':'Unique model counted once from canonical glTF/GLB. FBX is an alternate original export, not an additional model. Vertices include attribute seam splits; triangles sum mesh primitives; scene count includes instances. Texture count is image resources, not sampler/texture slots. Bounds are transformed source scene AABB. Null/unknown is not zero.',
  'sources':sources,'models':records,'files':files,'excluded_candidates':excluded}
 (ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'models':len(records),'files':len(files),'staged_bytes':sum(f['file_size_bytes'] for f in files),'sources':[(s['id'],s['staged_unique_model_count']) for s in sources]}))

if __name__=='__main__':main()
