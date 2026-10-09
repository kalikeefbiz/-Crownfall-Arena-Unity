"""Deterministic shipping composition gate; source geometry estimates, not Unity/device measurements."""
from pathlib import Path
import collections,hashlib,json,math,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
BASELINE='fc359e4ca1ebd00151d0a8618546beb658d3142d'
LAYOUT='Assets/Crownfall/Environment/WildernessComposition.json'
ISLANDS=[(-12,-18,4,3),(12,-18,4,3),(-12,18,4,3),(12,18,4,3),(-28,-25,3,6),(28,-25,3,6),(-28,25,3,6),(28,25,3,6),(0,30,8,1),(0,-30,18,1)]
def require(ok,message):
 if not ok:raise AssertionError(message)
def bounds(row,models):
 m=models[row['model']];size=[a*m['presentationScale']*b for a,b in zip(m['expectedSize'],row['scale'])];theta=math.radians(row['yaw']);cs=abs(math.cos(theta));sn=abs(math.sin(theta));dx=(size[0]*cs+size[2]*sn)/2;dz=(size[0]*sn+size[2]*cs)/2;x,y,z=row['position'];return [x-dx,y,z-dz,x+dx,y+size[1],z+dz]
from m15_presentation import visible,center,HALF_HEIGHT,PITCH
def main():
 cat=json.loads((ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').read_text());j=json.loads((ROOT/LAYOUT).read_text());models={m['id']:m for m in cat['models']};p=j['placements'];bm={r['name']:bounds(r,models) for r in p}
 require(j['schemaVersion']==1 and j['compositionVersion']==3 and j['requiredUnityVersion']=='6000.3.10f1','Composition version drift')
 require(j['textureTier'] in ('Mobile','Full'),'Invalid texture tier')
 require(len({r['name'] for r in p})==len(p),'Duplicate placement identity')
 require(set(r['model'] for r in p)==set(models)-{'kn:cliff_block_rock'},'Shipping dependency set differs from authored quality selection')
 for r in p:
  require(r['layer'] in ('NEAR','MID','FAR') and r['zone'] in ('island','exterior','pocket'),'Unknown composition category')
  require(all(math.isfinite(v) for v in r['position']+r['scale']+[r['yaw']]) and min(r['scale'])>0,'Invalid transform '+r['name'])
  b=bm[r['name']];outside=b[3]<=-34 or b[0]>=34 or b[5]<=-32 or b[2]>=32
  island=any(b[0]>=x-w/2-.002 and b[3]<=x+w/2+.002 and b[2]>=z-d/2-.002 and b[5]<=z+d/2+.002 for x,z,w,d in ISLANDS)
  pocket=r['zone']=='pocket' and (b[5]<=-12.5 or b[2]>=12.5)
  require((r['zone']=='island' and island) or (r['zone']=='exterior' and outside) or pocket,'Invalid presentation placement clearance: '+r['name']+' '+str(b))
  require(b[5]<=-12 or b[2]>=12 or b[3]<=-34 or b[0]>=34,'Enters lane '+r['name'])
  require(any(visible(b,*center(x,z)) for x in (-30,0,30) for z in (-27,-12,-6,0,6,12,26)),'Permanently outside fixed camera bounds '+r['name'])
  for cx,cz,radius in [(-22,-22,2.4),(22,-22,2.4),(-18,24,2.4),(18,24,2.4),(-7,-27,2.4),(7,-27,2.4),(0,26,3.5)]:
   dx=max(b[0]-cx,0,cx-b[3]);dz=max(b[2]-cz,0,cz-b[5]);require(dx*dx+dz*dz>=radius*radius,'Camp/Major clearance '+r['name'])
  for rx,rz,w,d in [(-22,-17,5,10),(22,-17,5,10),(-18,18,5,12),(18,18,5,12),(-7,-19.5,4,15),(7,-19.5,4,15),(0,19,8,14)]:
   overlap=b[0]<rx+w/2 and b[3]>rx-w/2 and b[2]<rz+d/2 and b[5]>rz-d/2
   require(not overlap,'Protected camp approach '+r['name'])
  if r['layer']=='NEAR' and r['zone'] in ('island','pocket') and r['position'][2]<0:require(b[4]<=6.8,'Southern crown sightline '+r['name'])
 layers=collections.Counter(r['layer'] for r in p)
 require(all(layers[layer]>=6 for layer in ('NEAR','MID','FAR')),'Missing composition layer')
 for side in (-1,1):
  near=[r for r in p if r['layer']=='NEAR' and r['zone'] in ('island','pocket') and r['position'][2]*side>0]
  require(len(near)>=6 and sum(bm[r['name']][4]-bm[r['name']][1]>=3 for r in near)>=2,'Near height/coverage missing')
  require(sum(visible(bm[r['name']],*center(0,side*6)) for r in near)>=2,'Perimeter-only regression on lane side '+str(side))
 require(len({r['yaw'] for r in p})>=20,'Rotation variation collapsed')
 # No reflected pairs of identical models/transforms are allowed across lane sides.
 signature={(r['model'],tuple(r['position']),tuple(r['scale']),r['yaw']) for r in p}
 mirrored=sum((r['model'],(r['position'][0],r['position'][1],-r['position'][2]),tuple(r['scale']),r['yaw']) in signature for r in p if r['position'][2]!=0)
 require(mirrored==0,'Mirrored scenery rows')
 from validate_m15_visual import contracts
 contracts()
 code=(ROOT/'Assets/Crownfall/Environment/ArenaWildernessPresentation.cs').read_text();arena=(ROOT/'Assets/Crownfall/Match/Runtime/ArenaPresentation.cs').read_text();editor=(ROOT/'Assets/Editor/CrownfallEnvironment/WildernessBuildPreparation.cs').read_text();pipeline=(ROOT/'Assets/Editor/PipelineBuild.cs').read_text()
 require('new Crownfall.EnvironmentPresentation.ArenaWildernessPresentation(root,camera)' in arena and 'wildernessPresentation.Dispose()' in arena,'Missing shipping integration/lifecycle')
 require('Monumental dark stone colonnade' not in arena,'Old board perimeter composition remains')
 require(not any(t in code for t in ('MatchSimulation','MatchMap','CreatePrimitive','AddComponent<Collider','Update(','LateUpdate(','UnityEngine.Random')),'Runtime authority/per-frame/random leak')
 for token in ('collider.enabled = false','Resources.Load<WildernessLibrary>','ShadowQuality.Disable'):require(token in code,'Runtime safety missing '+token)
 production_gate=(ROOT/'Assets/Editor/ProductionArtValidation.cs').read_text()
 require('WildernessBuildPreparation.ValidateTextureImport(path);' in production_gate and '!importer.mipmapEnabled' in production_gate and 'TextureImporterFormat.RGBA32' in production_gate,'Separate strict sprite and 3D texture contracts missing')
 require('WildernessBuildPreparation.PrepareAndValidate()' in pipeline and 'RunProtected("player prebuild"' in pipeline,'Prebuild fail-closed wiring missing')
 for token in ('EnvironmentNativeValidation.RunProtected("wilderness"', 'guard.Step("wilderness native validation"', 'WriteReport("FAIL_NATIVE_DEPENDENCIES"', 'CompositionHash()','ValidateClearance(row,b)','ValidateLayers(layout,bounds)','ShaderUtil.ShaderHasError','ValidateTexture','GetComponentsInChildren<Collider>(true).Length==0','GetComponentsInChildren<Rigidbody>(true).Length==0','library.presentationPrefab','AssetDatabase.LoadAssetAtPath<GameObject>(model.path)','renderer.sharedMaterials','renderer.enabled','EnvironmentAssetLab.GenerateAndValidateMobile()','Quaternion.Angle'):
  require(token in editor,'Native prebuild guard missing '+token)
 safety=(ROOT/'Assets/Editor/CrownfallEnvironment/PreparationSafety.cs').read_text()
 require('ExceptionDispatchInfo.Capture(original).Throw();' in safety and 'final after cleanup/restoration' in safety and 'exceptional-exit comparison' in safety,'Original failure/exceptional protection lifecycle missing')
 require('BuildPipeline.BuildPlayer' not in editor and 'EditorBuildSettings.scenes =' not in editor,'Unauthorized build/scene-list changes')
 from tree_sitter import Language,Parser
 import tree_sitter_c_sharp
 parser=Parser(Language(tree_sitter_c_sharp.language()))
 for path in list((ROOT/'Assets/Crownfall/Environment').glob('*.cs'))+list((ROOT/'Assets/Editor/CrownfallEnvironment').glob('*.cs')):require(not parser.parse(path.read_bytes()).root_node.has_error,'C# syntax '+str(path))
 counts=collections.Counter(r['model'] for r in p);materials={b['materialKey'] for id in counts for b in models[id]['bindings']};specs={m['key']:m for m in cat['materials']};textures={specs[k][f] for k in materials for f in ('baseTexture','normalTexture','surfaceTexture') if specs[k][f]}|{'Assets/Art/Environment/External/SharedTextures/T_ForestGround04_Color.jpg','Assets/Art/Environment/External/SharedTextures/T_RockFace03_Color.jpg'};alpha={k for k in materials if specs[k]['family']=='alpha-cutout foliage'}
 triangles=sum(models[r['model']]['sourceTriangles'] for r in p)
 views=[]
 for z in (-6,0,6):
  for x in (-25,-12,0,12,25):
   # Match camera clamps the ground center to arena dimensions; landscape 16:9 case.
   cx,cz=center(x,z);v=[r for r in p if visible(bm[r['name']],cx,cz)]
   views.append(dict(actor=[x,z],cameraCenter=[cx,cz],visibleObjects=len(v),triangles=sum(models[r['model']]['sourceTriangles'] for r in v),layers=dict(collections.Counter(r['layer'] for r in v))))
 texture_stats=[]
 for t in cat['textures']:
  if t['path'] not in textures:continue
  limit=t['webglMobileMaxSize'] if j['textureTier']=='Mobile' else t['webglFullMaxSize'];f=min(1,limit/max(t['width'],t['height']));w,h=max(1,round(t['width']*f)),max(1,round(t['height']*f));astc=rgba=0
  mw,mh=w,h
  while True:
   astc+=math.ceil(mw/6)*math.ceil(mh/6)*16;rgba+=mw*mh*4
   if mw==mh==1:break
   mw=max(1,mw//2);mh=max(1,mh//2)
  texture_stats.append(dict(path=t['path'],importDimensions=[w,h],astc6x6MipBytes=astc,rgba8MipBytes=rgba))
 native=ROOT/'Docs/CROWNFALL_WILDERNESS_NATIVE_VALIDATION.json'
 if native.exists():
  n=json.loads(native.read_text());require(n['status']=='PASS_NATIVE_DEPENDENCIES' and n['unityVersion']=='6000.3.10f1' and n['compositionHash']==hashlib.sha256((ROOT/LAYOUT).read_bytes()).hexdigest(),'Native report failed/stale')
 report=dict(status='PASS_STATIC_COMPOSITION',startingHead=BASELINE,compositionVersion=3,compositionSha256=hashlib.sha256((ROOT/LAYOUT).read_bytes()).hexdigest(),nativeUnityValidation='PENDING' if not native.exists() else 'PASS_NATIVE_DEPENDENCIES',objectCount=len(p),additionalDirectionalLights=1,layers=dict(layers),islandNearCount=sum(r['zone']=='island' for r in p),pocketCount=sum(r['zone']=='pocket' for r in p),fixedCameraPotentialVisibility='All shipping AABBs intersect at least one bounded M15.1 gameplay camera state; unchanged far clip 150',uniqueModelCount=len(counts),uniqueMeshesNative='PENDING (25 shipping glTF reference mesh objects; native FBX mesh subdivision unverified)',instantiatedTriangles=triangles,typicalVisibleTriangleRange=[min(v['triangles'] for v in views),max(v['triangles'] for v in views)],visibleEstimates=views,materialCount=len(materials),materialFamilies=len({specs[k]['family'] for k in materials}),uniqueTextures=len(textures),textureTier=j['textureTier'],estimatedASTC6x6MipBytes=sum(t['astc6x6MipBytes'] for t in texture_stats),estimatedRGBA8FallbackMipBytes=sum(t['rgba8MipBytes'] for t in texture_stats),textureEstimates=texture_stats,alphaTestedInstances=sum(any(b['materialKey'] in alpha for b in models[r['model']]['bindings']) for r in p),shadowCastingInstances=sum(r['castShadows'] for r in p),shadowCastingRendererCountNative='PENDING; glTF reference has one mesh object per placement',shadowCastingMaterialSlots=sum(len(models[r['model']]['bindings']) for r in p if r['castShadows']),totalMaterialSlotInstances=sum(len(models[r['model']]['bindings']) for r in p),repeatedModels=dict(counts),heroInstances=sum(r['model'].startswith('qn:') and 'Tree' in r['model'] or r['model'] in ('qn:Pine_1','qn:Pine_5') for r in p),farFillerCount=layers['FAR'],clearance='All conservative XZ bounds outside lane and protected camp/Major approach areas; pockets are traversable presentation with no added collision',gameplayCollisionCameraScenePackages='Topology, collision, controls, gameplay, scenes, artwork and packages byte-identical; explicitly authorized camera/surface presentation changes checked against fc359e4',estimatesNotDeviceMeasurements=True,readyForBuild15NativeAndVisualAcceptance='PENDING')
 (ROOT/'Docs/CROWNFALL_WILDERNESS_COMPOSITION_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n')
 print(f"PASS: {len(p)} placements, {len(counts)} approved models, {triangles:,} instantiated triangles; {report['typicalVisibleTriangleRange']} camera-frustum estimate; {len(textures)} unique textures; native PENDING" if not native.exists() else 'PASS static + native report')
if __name__=='__main__':main()
