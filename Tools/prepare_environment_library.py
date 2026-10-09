"""Copy only the approved FBXs/dependencies; no .meta/GUID or native YAML fabrication.
Run after inspect_environment_fbx.py; produces the deterministic Editor catalog.
"""
from pathlib import Path
import hashlib
import json
import re
import struct
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BASELINE='ef735e9d1407a1dd9104f071226ebfd9fff1c3d3'
IDS='qn:CommonTree_1 qn:CommonTree_3 qn:TwistedTree_1 qn:Pine_1 qn:Pine_5 qn:Fern_1 qn:Rock_Medium_1 qn:Rock_Medium_2 qn:Rock_Medium_3 kn:cliff_large_rock kn:cliff_block_rock kn:cliff_cornerLarge_rock kn:rock_tallA kn:rock_tallG kn:tree_pineTallA kn:tree_pineTallC kn:tree_default_dark kn:statue_columnDamaged qm:Wall_UnevenBrick_Straight qm:DoorFrame_Round_Brick qm:Stairs_Exterior_Straight kc:tower-square-arch kc:tower-hexagon-top kc:wall-corner-half-tower kc:wall-half-modular'.split()
ART='Assets/Art/Environment/External'
CAT='Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 inv=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())
 fbx=json.loads((ROOT/'Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json').read_text())
 models={m['id']:m for m in inv['models']};inspected={m['id']:m for m in fbx['models']}
 assert set(IDS)==set(inv['first_pass_model_ids'])==set(inspected)
 files=[];textures=[];materials={};hashes={};references=0
 def copy(source,target,kind):
  b=(ROOT/source).read_bytes();p=ROOT/target;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
  files.append({'source':source,'productionPath':target,'bytes':len(b),'sha256':sha(b),'kind':kind})
 def texture(source,kind,cutoff=0.2):
  nonlocal references
  references+=1;b=(ROOT/source).read_bytes();digest=sha(b)
  if digest in hashes:
   existing=hashes[digest];assert existing['kind']==kind;return existing['path']
  target=ART+'/SharedTextures/'+Path(source).name
  assert not any(t['path']==target for t in textures)
  copy(source,target,'texture');im=Image.open(ROOT/source)
  row={'path':target,'kind':kind,'width':im.width,'height':im.height,'sha256':digest,
       'maxSize':2048,'webglFullMaxSize':2048,'webglMobileMaxSize':1024,'alphaCutoff':cutoff,
       'hasAlpha':kind=='cutout','wrap':'Repeat' if kind!='cutout' and Path(source).name!='colormap.png' else 'Clamp'}
  hashes[digest]=row;textures.append(row);return target
 rows=[]
 for id in IDS:
  m=models[id];s=inspected[id];prefix,name=id.split(':');folder={'qn':'Quaternius/Nature','qm':'Quaternius/Medieval','kn':'Kenney/Nature','kc':'Kenney/Castle'}[prefix]
  path=ART+'/'+folder+'/Models/'+name+'.fbx';copy(s['source_fbx'],path,'model')
  canonical=ROOT/m['staged_path'];b=canonical.read_bytes()
  g=json.loads(b) if canonical.suffix=='.gltf' else json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
  bindings=[]
  gm={x['name']:x for x in g['materials']}
  for original in s['materials']:
   source_name=original['name'];spec=gm[source_name];pbr=spec.get('pbrMetallicRoughness',{})
   key=prefix+'_'+source_name
   family=('bark' if 'Bark' in source_name or source_name=='MI_WoodTrim' else
     'alpha-cutout foliage' if prefix=='qn' and source_name.startswith('Leaves') else
     'masonry' if prefix in ('qm','kc') or source_name in ('stone','stoneDark') else
     'distant vegetation' if source_name=='leafsDark' else
     'opaque foliage' if source_name=='grass' else 'stone')
   alpha=family=='alpha-cutout foliage';main='';normal='';surface='';mode=0
   def image_source(index):
    image=g['images'][g['textures'][index]['source']]
    assert 'uri' in image and not image['uri'].startswith('data:')
    return str((canonical.parent/image['uri']).relative_to(ROOT))
   if 'baseColorTexture' in pbr:main=texture(image_source(pbr['baseColorTexture']['index']),'cutout' if alpha else 'color')
   if 'normalTexture' in spec:
    source=image_source(spec['normalTexture']['index'])
    if prefix=='qm':
     candidates=[f['staged_path'] for f in inv['files'] if f['source_id']==prefix and 'Normals Godot-Unity/' in f['staged_path'] and Path(f['staged_path']).name==Path(source).name]
     assert len(candidates)==1;source=candidates[0]
    normal=texture(source,'normal')
   if 'metallicRoughnessTexture' in pbr:
    surface=texture(image_source(pbr['metallicRoughnessTexture']['index']),'data')
    mode=2 if '_ORM' in surface else 1
   color=pbr.get('baseColorFactor',[1,1,1,1])
   material={'key':key,'family':family,'baseTexture':main,'normalTexture':normal,'surfaceTexture':surface,'surfaceMode':mode,
    'color':color,'cutoff':0.2,'smoothness':0.1,'metallic':0.0,'cull':0 if alpha or prefix in ('qm','kc') else 2,
    'enableInstancing':True}
   if key in materials:assert materials[key]==material
   else:materials[key]=material
   bindings.append({'sourceName':source_name,'materialKey':key})
  ratio=[a/b for a,b in zip(m['bounds']['size'],s['normalized_y_up_bounds_size'])]
  assert max(ratio)-min(ratio)<0.0001,(id,ratio)
  import_scale=0.3125 if name=='Fern_1' else 1
  assert all(abs(r-import_scale)<0.0001 for r in ratio)  # Inventory bounds are rounded.
  scale=(0.6 if name=='Fern_1' else 5 if prefix=='kn' and name.startswith('tree') else
         8 if prefix=='kn' and name.startswith(('cliff','rock')) else 4 if prefix in ('kn','kc') else 1)
  group=('HERO / NEAR' if prefix=='qn' else 'MIDGROUND' if name.startswith('cliff') else
         'DISTANT' if prefix=='kn' and name!='statue_columnDamaged' else 'STRUCTURAL')
  lod=id in set('qn:CommonTree_1 qn:CommonTree_3 qn:TwistedTree_1 qn:Pine_1 qn:Pine_5 qm:DoorFrame_Round_Brick'.split())
  rows.append({'id':id,'path':path,'group':group,'importScale':import_scale,'presentationScale':scale,
    'expectedSize':m['bounds']['size'],'sourceFbxSize':s['normalized_y_up_bounds_size'],'sourceTriangles':s['triangles'],
    'bindings':bindings,'castShadows':group!='DISTANT' and name!='Fern_1','lodDecision':'planned, silhouette-preserving derived LODs pending' if lod else 'LOD0 only; inexpensive or small role; no redundant LOD chain',
    'lodCandidate':lod,'colliders':'presentation only: importer disabled, prefab stripped and asserted empty',
    'scaleStatus':'source normalization measured; presentation scale is a lab proposal; native Unity scale/orientation PENDING'})
 for source in inv['sources']:
  if source['status']!='acquired':continue
  copy(source['license_files'][0],ART+'/Licenses/'+source['id']+'-License.txt','license')
  original=source['staging_path']+'/Provenance/source.json';copy(original,ART+'/Provenance/'+source['id']+'-source.json','provenance')
 catalog={'schemaVersion':1,'requiredUnityVersion':'6000.3.10f1','startingHead':BASELINE,'nativeValidationStatus':'PENDING',
  'models':rows,'textures':textures,'materials':list(materials.values()),
  'productionCopies':files,'textureDependencyReferences':references,'duplicateTextureReferencesEliminated':references-len(textures),
  'totalSourceTriangles':sum(r['sourceTriangles'] for r in rows),'sourcePayloadBytes':sum(f['bytes'] for f in files),
  'foliageAlphaTestedModels':sum(any(materials[b['materialKey']]['family']=='alpha-cutout foliage' for b in r['bindings']) for r in rows)}
 p=ROOT/CAT;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(catalog,indent=2)+'\n')
 print(json.dumps({k:catalog[k] for k in ('sourcePayloadBytes','totalSourceTriangles','textureDependencyReferences','duplicateTextureReferencesEliminated','foliageAlphaTestedModels')}));print('Unique textures',len(textures),'shared materials',len(materials))
if __name__=='__main__':main()
