"""Type-check all runtime C# against real UnityEngine assemblies, without running Unity.
Set CROWNFALL_UNITY_REFERENCE_DIR to a Unity Managed directory (or reference-only
UnityEngine.Modules package). The reference version must be reported separately.
"""
from pathlib import Path
import os, shutil, subprocess, tempfile
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parents[1]
dotnet=os.environ.get('CROWNFALL_DOTNET') or shutil.which('dotnet')
reference=os.environ.get('CROWNFALL_UNITY_REFERENCE_DIR')
if not dotnet or not reference: raise SystemExit('Requires .NET SDK and CROWNFALL_UNITY_REFERENCE_DIR; fail closed.')
dlls=list(Path(reference).glob('UnityEngine*.dll'))
if not any(p.name=='UnityEngine.CoreModule.dll' for p in dlls): raise SystemExit('Actual UnityEngine reference assemblies missing.')
sources=[p for p in (root/'Assets').rglob('*.cs') if 'Editor' not in p.parts]
with tempfile.TemporaryDirectory(prefix='crownfall-runtime-') as td:
 p=Path(td)/'Runtime.csproj'
 refs=''.join('<Reference Include="'+dll.stem+'"><HintPath>'+escape(str(dll))+'</HintPath></Reference>' for dll in dlls)
 # Unity assigns SerializeField members through serialization, so compiler-only CS0649 is suppressed.
 p.write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>netstandard2.1</TargetFramework><LangVersion>9.0</LangVersion><TreatWarningsAsErrors>true</TreatWarningsAsErrors><EnableDefaultCompileItems>false</EnableDefaultCompileItems><NoWarn>0649</NoWarn></PropertyGroup><ItemGroup>'+''.join('<Compile Include="'+escape(str(s))+'" />' for s in sources)+refs+'</ItemGroup></Project>')
 subprocess.run([dotnet,'build',str(p),'--configuration','Release','--nologo'],check=True,env={**os.environ,'DOTNET_NOLOGO':'1','DOTNET_CLI_TELEMETRY_OPTOUT':'1'})
 print(f'PASS: {len(sources)} runtime C# files type-checked against actual UnityEngine reference assemblies. No Editor, rendering, physics or player execution claimed.')
