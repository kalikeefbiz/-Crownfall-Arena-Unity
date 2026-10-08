"""Run both actual C# revisions and compare every public authority state per tick.
The baseline is extracted read-only into a temporary directory, never checked out.
"""
from pathlib import Path
from xml.sax.saxutils import escape
import json, os, shutil, subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
BASELINE='c7b681efd36fc0ad4ace7fe6f9d4e0d2a9133498'
DOTNET=os.environ.get('CROWNFALL_DOTNET') or shutil.which('dotnet')
if not DOTNET:raise SystemExit('Requires .NET 8 SDK')
runner=r'''
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using Crownfall.Match;
using Crownfall.Combat;
class Runner {
 static string Dump(object value) {
  if(value==null)return "null";
  var t=value.GetType();
  if(t.IsPrimitive||t.IsEnum||value is string||value is decimal)return Convert.ToString(value,CultureInfo.InvariantCulture);
  if(value is IEnumerable list) {
   var items=new List<string>();foreach(var item in list)items.Add(Dump(item));items.Sort(StringComparer.Ordinal);
   return "["+string.Join("|",items)+"]";
  }
  var parts=new List<string>();
  foreach(var field in t.GetFields(BindingFlags.Public|BindingFlags.Instance).OrderBy(f=>f.Name)) {
   if(field.Name.StartsWith("Presentation"))continue;
   parts.Add(field.Name+"="+Dump(field.GetValue(value)));
  }
  foreach(var p in t.GetProperties(BindingFlags.Public|BindingFlags.Instance).OrderBy(p=>p.Name)) {
   if(p.GetIndexParameters().Length==0&&(p.PropertyType.IsPrimitive||p.PropertyType.IsEnum||p.PropertyType==typeof(string)))parts.Add(p.Name+"="+Dump(p.GetValue(value)));
  }
  return t.Name+"{"+string.Join(";",parts)+"}";
 }
 static void Main() {
  foreach(FirstRosterSummoner roster in Enum.GetValues(typeof(FirstRosterSummoner))) {
   var match=new MatchSimulation(roster);match.Human.Bot=true;
   using(var hash=IncrementalHash.CreateHash(HashAlgorithmName.SHA256)) {
    int frames=0;while(match.Result==null&&frames<60*305) {
     match.Step(null);hash.AppendData(Encoding.UTF8.GetBytes(Dump(match)));frames++;
    }
    Console.WriteLine(roster+" ticks="+frames+" authority SHA256="+Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant());
   }
  }
 }
}'''

with tempfile.TemporaryDirectory(prefix='crownfall-authority-') as temp:
    temp=Path(temp)
    paths=subprocess.check_output(['git','ls-tree','-r','--name-only',BASELINE,'Assets/Crownfall/Combat/Core','Assets/Crownfall/Match/Core'],cwd=ROOT,text=True).splitlines()
    paths=[p for p in paths if p.endswith('.cs')]
    baseline=temp/'baseline';baseline.mkdir()
    for name in paths:
        target=baseline/Path(name).name
        target.write_bytes(subprocess.check_output(['git','show',BASELINE+':'+name],cwd=ROOT))
    def run(name,sources):
        directory=temp/name;directory.mkdir(exist_ok=True)
        (directory/'Runner.cs').write_text(runner)
        (directory/'State.csproj').write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework><OutputType>Exe</OutputType><EnableDefaultCompileItems>false</EnableDefaultCompileItems><TreatWarningsAsErrors>true</TreatWarningsAsErrors></PropertyGroup><ItemGroup><Compile Include="Runner.cs" />'+''.join('<Compile Include="'+escape(str(p))+'" />' for p in sources)+'</ItemGroup></Project>')
        result=subprocess.run([DOTNET,'run','--project',str(directory/'State.csproj'),'--configuration','Release'],capture_output=True,text=True,env={**os.environ,'DOTNET_NOLOGO':'1','DOTNET_CLI_TELEMETRY_OPTOUT':'1'})
        if result.returncode:raise SystemExit(result.stdout+result.stderr)
        return [line for line in result.stdout.splitlines() if 'authority SHA256=' in line]
    before=run('before',list(baseline.glob('*.cs')))
    after=run('after',[ROOT/p for p in paths]+[p for p in (ROOT/'Assets/Crownfall/Match/Core').glob('*.cs') if p.relative_to(ROOT).as_posix() not in paths])
    assert len(before)==3 and before==after,(before,after)
    print('PASS: all public gameplay authority state at every tick matches starting HEAD for three complete bot matches. Only output journal/action metadata excluded.')
    for line in after:print(line)
