"""Type-check all runtime C# against real UnityEngine assemblies, without running Unity.
Set CROWNFALL_UNITY_REFERENCE_DIR to a Unity Managed directory (or reference-only
UnityEngine.Modules package). The reference version must be reported separately.
"""
from pathlib import Path
import json, os, shutil, subprocess, tempfile, hashlib
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parents[1]
dotnet=os.environ.get('CROWNFALL_DOTNET') or shutil.which('dotnet')
reference=os.environ.get('CROWNFALL_UNITY_REFERENCE_DIR')
if not dotnet or not reference: raise SystemExit('Requires .NET SDK and CROWNFALL_UNITY_REFERENCE_DIR; fail closed.')
manifest=Path(os.environ.get('CROWNFALL_PACKAGE_MANIFEST',root/'Packages/manifest.json'))
dependencies=json.loads(manifest.read_text())['dependencies']
# Match the project's enabled modules, rather than referencing every available DLL.
# Core and legacy input are implicit engine references; IMGUI requires text rendering.
module_names={'UnityEngine.CoreModule','UnityEngine.SharedInternalsModule',
              'UnityEngine.InputLegacyModule','UnityEngine.InputModule'}
package_modules={
 'com.unity.modules.imgui': {'UnityEngine.IMGUIModule','UnityEngine.TextRenderingModule'},
 'com.unity.modules.audio': {'UnityEngine.AudioModule'},
 'com.unity.modules.ui': {'UnityEngine.UIModule'},
 'com.unity.modules.uielements': {'UnityEngine.UIElementsModule','UnityEngine.UIElementsNativeModule','UnityEngine.TextCoreFontEngineModule','UnityEngine.TextCoreTextEngineModule'},
 'com.unity.modules.physics': {'UnityEngine.PhysicsModule'},
 'com.unity.modules.jsonserialize': {'UnityEngine.JSONSerializeModule'},
}
if 'com.unity.modules.uielements' in dependencies and 'com.unity.modules.ui' not in dependencies:
 raise SystemExit('UI Toolkit runtime requires declared com.unity.modules.ui dependency')
for package in dependencies:
 if package not in package_modules:
  raise SystemExit('Unmapped package for runtime type-check: '+package)
 module_names.update(package_modules[package])
dlls=[Path(reference)/(name+'.dll') for name in sorted(module_names)]
missing=[str(p) for p in dlls if not p.is_file()]
if missing: raise SystemExit('Actual enabled UnityEngine reference assemblies missing: '+', '.join(missing))
required_apis={'UnityEngine.UIElements':'com.unity.modules.uielements','AudioSource':'com.unity.modules.audio','AudioListener':'com.unity.modules.audio','ParticleSystem':'com.unity.modules.particlesystem','JsonUtility':'com.unity.modules.jsonserialize','CharacterController':'com.unity.modules.physics'}
for source in (root/'Assets').rglob('*.cs'):
 if 'Editor' in source.parts: continue
 code=source.read_text()
 for api,package in required_apis.items():
  if api in code and package not in dependencies: raise SystemExit('Runtime API '+api+' requires '+package+' in manifest')
version=os.environ.get('CROWNFALL_UNITY_REFERENCE_VERSION')
if not version: raise SystemExit('Set CROWNFALL_UNITY_REFERENCE_VERSION; fail closed on unidentified references.')
inventory=os.environ.get('CROWNFALL_UNITY_REFERENCE_INVENTORY')
if not inventory and version=='2021.3.33': inventory=str(root/'Tools/unity_reference_2021_3_33.json')
if not inventory: raise SystemExit('Reference version has no verified assembly fingerprint: '+version+'. Supply CROWNFALL_UNITY_REFERENCE_INVENTORY from the actual Editor before claiming compatibility.')
pinned=json.loads(Path(inventory).read_text())
if pinned['version']!=version: raise SystemExit('Reference inventory version mismatch')
for dll in dlls:
 if hashlib.sha256(dll.read_bytes()).hexdigest()!=pinned['assemblies'].get(dll.name): raise SystemExit('Reference version/hash mismatch: '+dll.name)
# Inspect actual assembly identities/versions using reflection in an isolated .NET process.
# The reference bundle may be older than the Editor; disclose this rather than claiming exact-version compatibility.
with tempfile.TemporaryDirectory(prefix='crownfall-reference-') as identity_dir:
 ip=Path(identity_dir)
 (ip/'Identity.csproj').write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>')
 (ip/'Program.cs').write_text('using System; using System.Reflection; class P { static void Main(string[] paths){foreach(var path in paths){var a=AssemblyName.GetAssemblyName(path);Console.WriteLine(a.Name+" assembly version "+a.Version);}}}')
 subprocess.run([dotnet,'run','--project',str(ip/'Identity.csproj'),'--']+[str(p) for p in dlls],check=True,env={**os.environ,'DOTNET_NOLOGO':'1'})
print('Reference package version (required disclosure): '+os.environ.get('CROWNFALL_UNITY_REFERENCE_VERSION','UNSPECIFIED'))
if not os.environ.get('CROWNFALL_UNITY_REFERENCE_VERSION'):raise SystemExit('Set CROWNFALL_UNITY_REFERENCE_VERSION; fail closed on unidentified reference bundle.')
sources=[p for p in (root/'Assets').rglob('*.cs') if 'Editor' not in p.parts]
with tempfile.TemporaryDirectory(prefix='crownfall-runtime-') as td:
 p=Path(td)/'Runtime.csproj'
 refs=''.join('<Reference Include="'+dll.stem+'"><HintPath>'+escape(str(dll))+'</HintPath></Reference>' for dll in dlls)
 # Unity assigns SerializeField members through serialization, so compiler-only CS0649 is suppressed.
 p.write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>netstandard2.1</TargetFramework><LangVersion>9.0</LangVersion><TreatWarningsAsErrors>true</TreatWarningsAsErrors><EnableDefaultCompileItems>false</EnableDefaultCompileItems><NoWarn>0649</NoWarn></PropertyGroup><ItemGroup>'+''.join('<Compile Include="'+escape(str(s))+'" />' for s in sources)+refs+'</ItemGroup></Project>')
 subprocess.run([dotnet,'build',str(p),'--configuration','Release','--nologo'],check=True,env={**os.environ,'DOTNET_NOLOGO':'1','DOTNET_CLI_TELEMETRY_OPTOUT':'1'})
 print(f'PASS: {len(sources)} runtime C# files type-checked against actual manifest-enabled UnityEngine reference assemblies. No Editor, rendering, physics or player execution claimed.')
