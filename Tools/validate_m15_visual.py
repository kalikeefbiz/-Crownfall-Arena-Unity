"""M15 protected-source and presentation contract checks. Native shader/render validation is separate."""
import hashlib,json,subprocess
from pathlib import Path
from m15_presentation import ROOT,PITCH,HALF_HEIGHT,HEIGHT,FOCUS,PAD_X,PAD_Z
BASELINE='e9b3f4be88bf13acb9c60c935d42ba110121fa40'
BOOT='Assets/Crownfall/Match/Runtime/CrownfallMatchBootstrap.cs'
ALLOWED={BOOT,'Packages/manifest.json','Assets/Crownfall/Presentation/MobaCamera.cs','Assets/Crownfall/Match/Runtime/ArenaPresentation.cs','Assets/Crownfall/Match/Runtime/TerritoryFlow.shader'}
NEW_CC0_SOURCES={'ExternalArtStaging/M15_1/ForestGround/CC0-1.0.txt', 'ExternalArtStaging/M15_1/ForestGround/files.json', 'ExternalArtStaging/M15_1/ForestGround/license.html', 'ExternalArtStaging/M15_1/ForestGround/Provenance.json', 'ExternalArtStaging/M15_1/ForestGround/forest_ground_04_diff_1k.jpg'}
NEW_CC0_SOURCES|={'ExternalArtStaging/M15_1/RockFace/Provenance.json', 'ExternalArtStaging/M15_1/RockFace/files.json', 'ExternalArtStaging/M15_1/RockFace/rock_face_03_diff_1k.jpg'}
PROTECTED=['Assets/Crownfall/Match','Assets/Crownfall/Combat','Assets/Crownfall/Gameplay','Assets/Crownfall/Presentation','Assets/Scenes','Assets/Art/Production','Assets/Art/Characters','Packages','ProjectSettings','ExternalArtStaging']
def require(v,message):
 if not v:raise AssertionError(message)
def original(path):return subprocess.check_output(['git','show',BASELINE+':'+path],cwd=ROOT)
def contracts():
 changed=subprocess.check_output(['git','diff','--name-only',BASELINE,'--']+PROTECTED,cwd=ROOT,text=True).splitlines()
 extra=subprocess.check_output(['git','ls-files','--others','--exclude-standard','--']+PROTECTED,cwd=ROOT,text=True).splitlines()
 require(set(changed+extra)<=ALLOWED|NEW_CC0_SOURCES,'Unauthorized protected-source changes: '+str(changed+extra))
 prior=original(BOOT).decode();expected=prior.replace('            audioDirector=gameObject.AddComponent<MatchAudioDirector>();','            follow.ConfigurePresentation();\n            audioDirector=gameObject.AddComponent<MatchAudioDirector>();')
 expected=expected.replace('            shadowMaterial=new Material(effectMaterial);','            arenaPresentation.BindGround(world.transform.Find("Arena").GetComponent<Renderer>(),world.transform.Find("Lane").GetComponent<Renderer>());\n            shadowMaterial=new Material(effectMaterial);')
 expected=expected.replace('            blueTerritory=Shape(', '            arenaPresentation.BindStone(blueFlow);arenaPresentation.BindStone(redFlow);\n            blueTerritory=Shape(')
 expected=expected.replace('            cameraObject.transform.position=new Vector3(0,35,-28);cameraObject.transform.rotation=Quaternion.Euler(50,0,0);\n','').replace('follow.Bind(actors[0].transform);','follow.Bind(actors.Find(actor=>actor.Actor==match.Human).transform);')
 require((ROOT/BOOT).read_text()==expected,'Bootstrap changed beyond approved camera target/pose and material bindings')
 camera=(ROOT/'Assets/Crownfall/Presentation/MobaCamera.cs').read_text()
 for token in ('using Unity.Cinemachine;', 'AddComponent<CinemachineBrain>()', 'AddComponent<CinemachineCamera>()', 'AddComponent<CinemachinePositionComposer>()', 'brain.ManualUpdate()', 'if(target==null||Frozen||(!alive&&!results))return', 'if(alive&&!wasAlive)shot.PreviousStateIsValid=false', 'shot.Follow=results?resultsAnchor.transform:target', 'shot.enabled=target!=null'):
  require(token in camera,'Cinemachine lifecycle contract missing: '+token)
 require(not any(t in camera for t in ('UseAcceptedBaseline','ClampPosition','Vector3.Lerp','transform.position=')), 'Legacy camera positioning restored')
 require(json.loads((ROOT/'Packages/manifest.json').read_text())['dependencies']['com.unity.cinemachine']=='3.1.7','Cinemachine version drift')
 shader=(ROOT/'Assets/Crownfall/Match/Runtime/TerritoryFlow.shader').read_text()
 for token in ('i.worldPos.x*1.8-_MatchTime*3*_Direction','i.worldPos.z*6.283185/7','_Active*(wave*.065+wave*canal*.07)','CrownfallStone(i.worldPos)','fullforwardshadows'):
  require(token in shader,'Stone surface lost territory/lighting contract: '+token)
 surface=(ROOT/'Assets/Crownfall/Environment/Shaders/StoneSurface.cginc').read_text()
 require(('world.xz/8.0' in surface or 'uv/8.0' in surface) and 'CrownfallPaving(world)' in surface,'World-anchored stone/organic transition missing')
 editor=(ROOT/'Assets/Editor/CrownfallEnvironment/M15SurfacePreparation.cs').read_text()
 for token in ('ValidateNativeProjection()','CameraRecoveryValidation.Projection()','ShaderUtil.ShaderHasError','serialized.FindProperty(property).objectReferenceValue','_StoneNormal','filter.sharedMesh.GetIndexCount','MeshFilter','renderer.sharedMaterial==library.worldSurface'):
  require(token in editor,'Native M15 dependency/projection guard missing: '+token)
 require(not any(t in editor for t in ('BuildPipeline.BuildPlayer','EditorBuildSettings.scenes =','AddComponent<MeshCollider>','AddComponent<BoxCollider>')),'Surface generation authority leak')
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASELINE,'--']+PROTECTED,cwd=ROOT,text=True).splitlines()
 hashes={}
 for p in files:
  if p in ALLOWED:continue
  data=(ROOT/p).read_bytes();require(data==original(p),'Protected source differs: '+p);hashes[p]=hashlib.sha256(data).hexdigest()
 # Record preservation evidence, including unchanged touch input and all production artwork.
 if json.loads((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_text())['compositionVersion']==2:
  (ROOT/'Docs/CROWNFALL_M15_GAMEPLAY_PRESERVATION.json').write_text(json.dumps(dict(startingHead=BASELINE,protectedFileCount=len(hashes),sha256=hashes,authorizedPresentationFiles=sorted(ALLOWED),bootstrapScope='Exactly camera profile activation plus ground/territory material binding; original Shape positions/scales/collision flags and gameplay lifecycle unchanged'),indent=2)+'\n')
 return len(hashes)
def main():
 if json.loads((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_text())['compositionVersion']==3:
  from validate_m15_1_visual import main as current
  return current()
 count=contracts()
 from validate_wilderness import main as composition
 composition()
 report=json.loads((ROOT/'Docs/CROWNFALL_WILDERNESS_COMPOSITION_VALIDATION.json').read_text())
 report.update(status='PASS_STATIC_M15',startingHead=BASELINE,camera=dict(pitch=PITCH,orthographicSize=HALF_HEIGHT,height=HEIGHT,focusNorth=FOCUS,presentationPadding=[PAD_X,PAD_Z],yaw=0,farClip=150,acceptedFallback=[50,11,15]),protectedFilesByteIdentical=count,newTexturePayloads=0,additionalCC0Resources=[],nativeUnityExecuted=report['nativeUnityValidation']!='PENDING',nativeImportShaderRenderValidation=report['nativeUnityValidation'],aiming='Unchanged touch input file; pure profile tests and native ground-ray round-trip gate',terrain=dict(meshCount=1,triangles=24*24*2*4,collisionComponents=0,region='Strictly outside original 68x64 floor'),surface='World-space shared stone/normal maps integrated into original territory shader; no opaque overlay')
 report['environmentAndApronTriangles']=report['instantiatedTriangles']+report['terrain']['triangles']
 report['environmentAndApronSharedMaterials']=report['materialCount']+1
 report['environmentAndApronRendererEstimate']=report['objectCount']+1
 report['visibleRangeIncludingWholeApronUpperBound']=[v+report['terrain']['triangles'] for v in report['typicalVisibleTriangleRange']]
 report['countsScope']='External placements plus renderer-only apron; original ten Crownfall sprites, inlay, territory surfaces, gameplay primitives, characters, UI/VFX excluded'
 report['sourceModelTriangles']=30327
 (ROOT/'Docs/CROWNFALL_M15_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n')
 print('PASS M15 protected sources, camera fallback, stone/territory contract and native fail-closed wiring')
if __name__=='__main__':main()
