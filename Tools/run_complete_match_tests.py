"""Compile actual production C# plus regression suites with .NET; no Unity claim."""
from pathlib import Path
import os, shutil, subprocess, tempfile
from xml.sax.saxutils import escape
root = Path(__file__).resolve().parents[1]
dotnet = os.environ.get('CROWNFALL_DOTNET') or shutil.which('dotnet')
if not dotnet: raise SystemExit('Install .NET 8 SDK or set CROWNFALL_DOTNET; fail closed.')
sources = list((root/'Assets/Crownfall/Combat/Core').glob('*.cs')) + list((root/'Assets/Crownfall/Match/Core').glob('*.cs'))
sources += [root/'Assets/Editor'/name for name in ('M1CombatTests.cs','CombatEconomyTests.cs','FirstRosterBalanceTests.cs','TerritorySurgeTests.cs','CompleteMatchTests.cs','ProductionPresentationTests.cs')]
sources += [root/'Assets/Crownfall/Environment'/name for name in ('CameraFraming.cs','WorldContinuation.cs')]
sources += [root/'Assets/Editor/CrownfallEnvironment/M15PresentationTests.cs']
with tempfile.TemporaryDirectory(prefix='crownfall-match-') as td:
 p=Path(td)
 (p/'Tests.csproj').write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><TreatWarningsAsErrors>true</TreatWarningsAsErrors><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup>'+''.join('<Compile Include="'+escape(str(s))+'" />' for s in sources)+'<Compile Include="Runner.cs" /></ItemGroup></Project>')
 (p/'Runner.cs').write_text('using System; using Crownfall.Tests; class Runner { static int Main() { try { Console.WriteLine("M1: "+M1CombatTests.Run()); Console.WriteLine("Economy: "+CombatEconomyTests.Run()); Console.WriteLine("Roster: "+FirstRosterBalanceTests.Run()); Console.WriteLine("Surge: "+TerritorySurgeTests.Run()); Console.WriteLine("Complete match: "+CompleteMatchTests.Run()); Console.WriteLine("Presentation: "+ProductionPresentationTests.Run()); Console.WriteLine("M15 camera/terrain: "+M15PresentationTests.Run()); return 0; } catch(Exception e) { Console.Error.WriteLine(e); return 1; } } }')
 subprocess.run([dotnet,'run','--project',str(p/'Tests.csproj'),'--configuration','Release'],check=True,env={**os.environ,'DOTNET_CLI_TELEMETRY_OPTOUT':'1','DOTNET_NOLOGO':'1'})
