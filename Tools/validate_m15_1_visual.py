"""M15.1 source preservation, rendering dependencies and current composition evidence.
Visual acceptance is recorded by human/model inspection separately, never inferred from counts.
"""
import hashlib,json,subprocess,re
from pathlib import Path
from m15_presentation import ROOT,PITCH,HALF_HEIGHT,HEIGHT,FOCUS,PAD_X,PAD_Z,terrain_height,clearance
BASELINE='fc359e4ca1ebd00151d0a8618546beb658d3142d'
NEW_CC0_SOURCES={'ExternalArtStaging/M15_1/ForestGround/CC0-1.0.txt', 'ExternalArtStaging/M15_1/ForestGround/files.json', 'ExternalArtStaging/M15_1/ForestGround/license.html', 'ExternalArtStaging/M15_1/ForestGround/Provenance.json', 'ExternalArtStaging/M15_1/ForestGround/forest_ground_04_diff_1k.jpg'}
NEW_CC0_SOURCES|={'ExternalArtStaging/M15_1/RockFace/Provenance.json', 'ExternalArtStaging/M15_1/RockFace/files.json', 'ExternalArtStaging/M15_1/RockFace/rock_face_03_diff_1k.jpg'}
PROTECTED=['Assets/Crownfall/Match','Assets/Crownfall/Combat','Assets/Crownfall/Gameplay','Assets/Crownfall/Presentation','Assets/Scenes','Assets/Art/Production','Assets/Art/Characters','Packages','ProjectSettings','ExternalArtStaging','.github','ci','Docs/M15Previews','Docs/CROWNFALL_M15_VISUAL_DIRECTION.md','Docs/CROWNFALL_M15_VALIDATION.json','Docs/CROWNFALL_M15_TEST_RESULTS.json','Docs/CROWNFALL_M15_GAMEPLAY_PRESERVATION.json','Docs/CROWNFALL_M15_CHANGED_FILES.json']
ALLOWED={'Assets/Crownfall/Match/Runtime/TerritoryFlow.shader'}
def require(v,m):
 if not v:raise AssertionError(m)
def main():
 from validate_m15_visual import contracts
 contracts()
 changed=subprocess.check_output(['git','diff','--name-only',BASELINE,'--']+PROTECTED,cwd=ROOT,text=True).splitlines()
 added=subprocess.check_output(['git','ls-files','--others','--exclude-standard','--']+PROTECTED,cwd=ROOT,text=True).splitlines()
 require(set(changed+added)<=ALLOWED|NEW_CC0_SOURCES,'Locked source changed: '+str(changed+added))
 paths=subprocess.check_output(['git','ls-tree','-r','--name-only',BASELINE,'--']+PROTECTED,cwd=ROOT,text=True).splitlines();hashes={}
 # One Git archive stream avoids hundreds of individual subprocesses.
 import io,tarfile
 archive=subprocess.check_output(['git','archive',BASELINE]+PROTECTED,cwd=ROOT)
 with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
  for p in paths:
   if p in ALLOWED:continue
   original=tar.extractfile(p).read();current=(ROOT/p).read_bytes();require(original==current,'Protected source bytes changed: '+p);hashes[p]=hashlib.sha256(current).hexdigest()
 (ROOT/'Docs/CROWNFALL_M15_1_GAMEPLAY_PRESERVATION.json').write_text(json.dumps(dict(startingHead=BASELINE,protectedFileCount=len(hashes),authorizedPresentationFiles=sorted(ALLOWED),sha256=hashes),indent=2)+'\n')
 surface=(ROOT/'Assets/Crownfall/Environment/Shaders/StoneSurface.cginc').read_text();runtime=(ROOT/'Assets/Crownfall/Environment/ArenaWildernessPresentation.cs').read_text();editor=(ROOT/'Assets/Editor/CrownfallEnvironment/M15SurfacePreparation.cs').read_text()
 for token in ('CrownfallHash(cell)','wornUV','half damage','_GroundTex','CrownfallPaving(world)'):require(token in surface,'M15.1 surface contract missing '+token)
 for token in ('renderer.enabled=false','RenderSettings.fogMode=FogMode.Linear','RenderSettings.fog=previousFog','library.groundDetail','collider.enabled = false'):require(token in runtime,'M15.1 runtime safety/lifecycle missing '+token)
 require('GetComponent<Collider>' not in runtime and 'enabled=false; // Replace engineering cubes visually' in runtime,'Engineering collision was altered')
 require('renderer.sharedMaterial=library.retainingStone' in runtime and 'M15.1 authoritative wall visual material missing/invalid' in editor,'Authoritative walls lost visible retaining markers or dependency validation')
 require('if(IN.worldPos.y>.35) CrownfallWildernessVisibility' in (ROOT/'Assets/Crownfall/Environment/Shaders/WorldSurface.shader').read_text(),'Floor cutaway would expose holes below Summoners')
 require('sourceMaterials.Take(filter.sharedMesh.subMeshCount)' in (ROOT/'Assets/Editor/CrownfallEnvironment/EnvironmentAssetLab.cs').read_text(),'Unused FBX slots can cause duplicate draws or false native rejection')
 for token in ('WorldContinuation.StripCount','M15.1 missing geological/Aether material dependency','M15.1 derived terrain enters protected lane','ValidateNativeProjection()'):require(token in editor,'M15.1 native fail-closed guard missing '+token)
 for x,z in [(-22,-22),(22,-22),(-18,24),(18,24),(-7,-27),(7,-27),(0,26),(0,19)]:require(abs(terrain_height(x,z)+.025)<1e-9,'Raised objective approach')
 provenance=json.loads((ROOT/'ExternalArtStaging/M15_1/ForestGround/Provenance.json').read_text())
 require(provenance['license']=='CC0-1.0' and provenance['licenseUrl']=='https://polyhaven.com/license','New resource licensing/provenance missing')
 for f in provenance['sourceFiles']+json.loads((ROOT/'ExternalArtStaging/M15_1/RockFace/Provenance.json').read_text())['sourceFiles']:require(hashlib.sha256((ROOT/f['path']).read_bytes()).hexdigest()==f['sha256'],'CC0 source bytes changed: '+f['path'])
 from validate_wilderness import main as wilderness
 wilderness()
 report=json.loads((ROOT/'Docs/CROWNFALL_WILDERNESS_COMPOSITION_VALIDATION.json').read_text())
 report.update(status='PASS_STATIC_M15_1',startingHead=BASELINE,camera=dict(pitch=PITCH,orthographicSize=HALF_HEIGHT,height=HEIGHT,focusNorth=FOCUS,presentationPadding=[PAD_X,PAD_Z],yaw=0,farClip=150,acceptedFallback=[50,11,15]),protectedFilesByteIdentical=len(hashes),newTexturePayloads=2,addedStagedModels=['qn:Bush_Common'],internetResources=['Poly Haven forest_ground_04 Diffuse 1K, CC0-1.0','Poly Haven rock_face_03 Diffuse 1K, CC0-1.0'],nativeUnityExecuted=False,terrain=dict(meshCount=1,vertices=49*49*7,triangles=48*48*2*7,collisionComponents=0,region='Banks outside protected +/-12.5m lane and below-floor flat render sheet; original floor collider unchanged; flat protected approaches'),surface='Shared source stone/geological textures, complementary staggered flags/cobble, damage, soil/moss, irregular edges; existing territory shader remains authoritative')
 report['retainedAuthoritativeWallVisuals']=dict(count=10,triangles=120,additionalMaterials=0,physicsChanged=False)
 report['environmentAndTerrainTriangles']=report['instantiatedTriangles']+report['terrain']['triangles']+120;report['environmentAndTerrainSharedMaterials']=report['materialCount']+1
 report['visibleRangeIncludingWholeTerrainUpperBound']=[v+report['terrain']['triangles']+120 for v in report['typicalVisibleTriangleRange']]
 report['sourceModelTriangles']=31227;report['estimatesNotDeviceMeasurements']=True
 (ROOT/'Docs/CROWNFALL_M15_1_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n')
 print('PASS M15.1 locked sources, original M15 evidence, camera/aim semantics, surfaces, presentation-only banks and native gates')
if __name__=='__main__':main()
