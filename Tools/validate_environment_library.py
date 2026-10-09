"""Static acquisition-to-production gate. Does not execute native Unity APIs."""
from pathlib import Path
import hashlib
import json
import subprocess
from prepare_environment_library import IDS, BASELINE, ART, CAT

ROOT=Path(__file__).resolve().parents[1]
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def require(value,message):
 if not value:raise AssertionError(message)

def main():
 j=json.loads((ROOT/CAT).read_text());inspection=json.loads((ROOT/'Docs/ENVIRONMENT_ASSET_FBX_INSPECTION.json').read_text())
 require([m['id'] for m in j['models']]==IDS,'Approved 25 identities/order changed')
 require(len(j['textures'])==25 and len(j['materials'])==20,'Dependency/material inventory drift')
 require(len({t['sha256'] for t in j['textures']})==len(j['textures']),'Duplicate production texture payload')
 require(j['nativeValidationStatus']=='PENDING','Prepared catalog cannot claim native validation')
 for f in j['productionCopies']:
  source=ROOT/f['source'];target=ROOT/f['productionPath']
  require(source.read_bytes()==target.read_bytes() and digest(target)==f['sha256'],'Source/copy byte mismatch: '+str(target))
  require(target.stat().st_size==f['bytes'] and f['bytes']<100_000_000,'Payload/file hard-limit mismatch')
 files={f['productionPath'] for f in j['productionCopies']}
 actual={p.relative_to(ROOT).as_posix() for p in (ROOT/ART).rglob('*') if p.is_file() and p.suffix!='.meta' and not p.name.startswith('.')}
 require(actual==files|{ART+'/README.md'},'Extra/missing external production files')
 require(len(list((ROOT/ART).rglob('*.fbx')))==25,'Wrong FBX count')
 require(not any((ROOT/ART).rglob('*.glb')) and not any((ROOT/ART).rglob('*.gltf')),'Duplicate alternate-format imports')
 keys={m['key'] for m in j['materials']};texture_paths={t['path'] for t in j['textures']}
 require(len(keys)==20,'Duplicate shared-material keys')
 for m in j['materials']:
  require(m['metallic']==0 and m['enableInstancing'],'Dielectric/instancing contract')
  for field in ('baseTexture','normalTexture','surfaceTexture'):
   require(not m[field] or m[field] in texture_paths,'Untracked material dependency')
 for row in j['models']:
  require(row['path'] in files and all(b['materialKey'] in keys for b in row['bindings']),'Missing model/binding')
  measured=next(m for m in inspection['models'] if m['id']==row['id'])
  require(measured['triangles']==measured['gltf_reference_triangles']==row['sourceTriangles'],'FBX/glTF triangle mismatch')
  require(all(abs(a*row['importScale']-b)<=max(0.0001,b*0.0001) for a,b in zip(measured['normalized_y_up_bounds_size'],row['expectedSize'])),'Source scale normalization')
  require({b['sourceName'] for b in row['bindings']}=={m['name'] for m in measured['materials']},'Source FBX material names drift')
 require(sum(m['sourceTriangles'] for m in j['models'])==30327,'Triangle total drift')
 require(sum(m['lodCandidate'] for m in j['models'])==6,'LOD planning coverage')
 original=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())
 for f in original['files']:require(digest(ROOT/f['staged_path'])==f['sha256'],'Staged original changed')
 # Existing acquisition documents/scripts/metadata also remain exactly unchanged.
 preserved=['ExternalArtStaging','Assets/Scenes','Assets/Crownfall/Match','Assets/Crownfall/Presentation','Assets/Crownfall/Gameplay',
            'Assets/Art/Characters','Assets/Art/Production','Packages','ProjectSettings','.github','ci',
            'Docs/EXTERNAL_ENVIRONMENT_ASSET_INVENTORY.md','Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json']
 changes=subprocess.check_output(['git','diff','--name-only',BASELINE,'--']+preserved,cwd=ROOT,text=True)
 require(not changes,'Protected baseline changed: '+changes)
 require(subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()=='browser-parity-unity','Wrong branch')
 build=(ROOT/'ProjectSettings/EditorBuildSettings.asset').read_text()
 require('EnvironmentAssetLab' not in build and build.count('enabled: 1')==1,'Lab/build scene separation')
 # Native artifacts must not be fabricated in the Editor-absent fallback.
 native=ROOT/'Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json'
 if not native.exists():
  for root in ('Assets/Crownfall/Environment','Assets/Editor/CrownfallEnvironment'):
   require(not any(p.suffix in ('.prefab','.mat','.unity','.asset','.meta') for p in (ROOT/root).rglob('*')),'Native artifact fabricated before Editor execution')
  require(not list((ROOT/ART).rglob('*.meta')),'Importer/GUID metadata must come from native Editor')
 sources=list((ROOT/'Assets/Editor/CrownfallEnvironment').glob('*.cs'))
 from tree_sitter import Language,Parser
 import tree_sitter_c_sharp
 parser=Parser(Language(tree_sitter_c_sharp.language()))
 for path in sources:require(not parser.parse(path.read_bytes()).root_node.has_error,'C# syntax: '+str(path))
 processor=(ROOT/'Assets/Editor/CrownfallEnvironment/EnvironmentImportProcessor.cs').read_text()
 for token in ('importer.useFileScale = true','importer.bakeAxisConversion = true','importer.isReadable = false','importer.addCollider = false','importer.importAnimation = false','TextureImporterFormat.ASTC_6x6','importer.mipMapsPreserveCoverage = row.hasAlpha'):
  require(token in processor,'Import configuration missing: '+token)
 lab=(ROOT/'Assets/Editor/CrownfallEnvironment/EnvironmentAssetLab.cs').read_text()
 require('NewSceneMode.Additive' in lab and 'PrefabUtility.SaveAsPrefabAsset' in lab and 'EditorSceneManager.SaveScene' in lab,'Native generation wiring')
 require(not any(t in lab for t in ('BuildPipeline.BuildPlayer','EditorBuildSettings.scenes =','CrownfallMatch.unity','MatchSimulation','MatchMap')),'Lab authority/build leak')
 for p in [ROOT/ART,ROOT/'Assets/Crownfall/Environment',ROOT/'Assets/Editor/CrownfallEnvironment']:
  require(all(f.stat().st_size<100_000_000 for f in p.rglob('*') if f.is_file()),'GitHub per-file limit')
 subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
 subprocess.run(['git','diff','--cached','--check'],cwd=ROOT,check=True)
 native_result=json.loads(native.read_text()) if native.exists() else None
 if native_result:require(native_result.get('status')=='PASS_NATIVE_IMPORT' and native_result.get('unityVersion')=='6000.3.10f1','Native validation report is failed/stale/wrong version')
 report={'status':'PASS_STATIC_PREPARATION','startingHead':BASELINE,'nativeUnityAvailability':native_result['unityVersion'] if native_result else 'NOT FOUND','nativeUnityValidation':native_result['status'] if native_result else 'PENDING',
  'blenderBinaryFbxImports':16,'asciiFbxSourceGeometryInspections':9,'approvedModelCount':25,'sourceTriangles':30327,
  'uniqueTexturePayloads':25,'sharedLibraryMaterialsPlanned':20,'materialFamilies':6,'originalsHashVerified':len(original['files']),
  'productionCopiesVerified':len(j['productionCopies']),'sourcePayloadBytes':j['sourcePayloadBytes'],
  'totalAddedAssetsBytes':sum(p.stat().st_size for scope in ('Assets/Art/Environment/External','Assets/Crownfall/Environment','Assets/Editor/CrownfallEnvironment') for p in (ROOT/scope).rglob('*') if p.is_file()),
  'cSharpFilesSyntaxParsed':len(sources),'unityEditorCompilation':'Executed native entry point' if native_result else 'PENDING','shaderCompilation':'See native report; WebGL player variants remain PENDING' if native_result else 'PENDING','generatedNativeScenePrefabsMaterials':'See native report' if native_result else 'PENDING',
  'gameplayShippingScenesCameraTopologyPackagesSettings':'UNCHANGED','colliderPolicy':'Importer false + generator strips + native asserts; native execution PENDING',
  'readyForArenaComposition':False}
 (ROOT/'Docs/ENVIRONMENT_ASSET_INTEGRATION_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
