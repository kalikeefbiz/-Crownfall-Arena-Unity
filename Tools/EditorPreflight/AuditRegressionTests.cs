using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Runtime.Loader;
using System.Text;
using Crownfall.EnvironmentLab.Editor;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

internal static class AuditRegressionTests
{
    static void Require(bool ok, string message) { if (!ok) throw new InvalidOperationException(message); }
    static object? Invoke(MethodInfo method, object? instance, params object?[] args)
    {
        try { return method.Invoke(instance, args); }
        catch (TargetInvocationException e) when (e.InnerException != null)
        { ExceptionDispatchInfo.Capture(e.InnerException).Throw(); throw; }
    }
    sealed class Fixture : IDisposable
    {
        public readonly string root = Path.Combine(Path.GetTempPath(), "crownfall-audit-" + Guid.NewGuid().ToString("N"));
        public const string Source = "Assets/Crownfall/Match/Locked.cs";
        public Fixture() { Set(Source, "original"); }
        public void Set(string path, string data)
        { string target = Path.Combine(root, path); Directory.CreateDirectory(Path.GetDirectoryName(target)!); File.WriteAllText(target, data); }
        public ProtectedFileSnapshot Capture() => ProtectedFileSnapshot.Capture(root,
            new[] { "Assets/Crownfall/Match", "ProjectSettings" }, new[] { Source }, _ => null!);
        public void Dispose() => Directory.Delete(root, true);
    }
    static int LifecycleCases(Type type)
    {
        int count = 0;
        void Case(string name, Action<Fixture> test) { using var f = new Fixture(); test(f); count++; Console.WriteLine("PASS audit lifecycle: " + name); }
        object Guard(Action<string> compare, List<string> diagnostics, List<Exception> originals) =>
            Activator.CreateInstance(type, compare, (Action<string>)diagnostics.Add, (Action<Exception>)originals.Add)!;
        void Step(object guard, string phase, Action action) => Invoke(type.GetMethod("Step")!, guard, phase, action);
        void Run(object guard, Action action, Action cleanup, Action<Exception> report) => Invoke(type.GetMethod("Run")!, guard, action, cleanup, report);
        Case("normal success and final comparison", f => {
            var snapshot=f.Capture(); var phases=new List<string>(); var d=new List<string>(); var originals=new List<Exception>();
            var guard=Guard(phase => { phases.Add(phase); Require(snapshot.AssertUnchanged(phase).totalChanges==0,"False mutation report"); },d,originals);
            Run(guard,()=>Step(guard,"import",()=>{}),()=>{},_=>throw new Exception("Unexpected failure"));
            Require(phases.Count==2 && phases.Last().StartsWith("final after cleanup",StringComparison.Ordinal),"Final comparison missing");
            Require(originals.Count==0 && d.Count==0,"False failure report");
        });
        Case("mutation before UI preparation uses early baseline", f => {
            var snapshot=f.Capture(); f.Set(Fixture.Source,"unauthorized before UI");
            var guard=Guard(phase=>snapshot.AssertUnchanged(phase),new(),new()); Exception? reported=null;
            try { Run(guard,()=>Step(guard,"before UI preparation",()=>{}),()=>{},e=>reported=e); throw new Exception("Accepted early mutation"); }
            catch(ProtectedFilesChangedException e) {
                Require(ReferenceEquals(e,reported),"Primary protection failure lost");
                Require(e.report.changes[0].relativePath==Fixture.Source,"Early mutation path lost");
            }
        });
        Case("mutation then import exception retains original and evidence", f => {
            var snapshot=f.Capture(); var changes=new List<ProtectionDiffReport>(); var d=new List<string>(); var originals=new List<Exception>();
            var primary=new IOException("original importer failure"); Exception? reported=null;
            var guard=Guard(phase=> { try { snapshot.AssertUnchanged(phase); } catch(ProtectedFilesChangedException e){changes.Add(e.report);throw;} },d,originals);
            try { Run(guard,()=>Step(guard,"FBX import",()=>{f.Set(Fixture.Source,"changed");throw primary;}),()=>{},e=>reported=e); throw new Exception("Exception disappeared"); }
            catch(IOException e) { Require(ReferenceEquals(e,primary)&&ReferenceEquals(reported,primary),"Original exception replaced"); }
            Require(ReferenceEquals(originals.Single(),primary),"Original was not recorded first");
            Require(changes.Count==2&&changes[0].phase=="exception during FBX import"&&changes[1].phase.StartsWith("final after cleanup",StringComparison.Ordinal),"Exception/final evidence missing");
            Require(changes.All(r=>r.changes.Single().relativePath==Fixture.Source),"Mutation path missing");
        });
        Case("scene restoration mutation is detected", f => {
            var snapshot=f.Capture(); var guard=Guard(phase=>snapshot.AssertUnchanged(phase),new(),new());
            try { Run(guard,()=>{},()=>f.Set(Fixture.Source,"cleanup mutation"),_=>{}); throw new Exception("Cleanup mutation accepted"); }
            catch(ProtectedFilesChangedException e) { Require(e.report.phase.StartsWith("final after cleanup",StringComparison.Ordinal),"Cleanup attribution lost"); }
        });
        Case("cleanup throw preserves prior operation failure", f => {
            var original=new InvalidDataException("original scene failure"); var d=new List<string>(); var guard=Guard(_=>{},d,new());
            try { Run(guard,()=>throw original,()=>throw new IOException("cleanup secondary"),_=>{}); throw new Exception("Exception disappeared"); }
            catch(InvalidDataException e) { Require(ReferenceEquals(e,original),"Cleanup replaced primary"); }
            Require(d.Any(m=>m.Contains("cleanup secondary",StringComparison.Ordinal)),"Cleanup failure lost");
        });
        Case("report write failure preserves original", f => {
            var original=new InvalidDataException("primary generation failure"); var d=new List<string>(); var guard=Guard(_=>{},d,new());
            try { Run(guard,()=>throw original,()=>{},_=>throw new IOException("secondary report output")); throw new Exception("Exception disappeared"); }
            catch(InvalidDataException e) { Require(ReferenceEquals(e,original),"Report failure replaced primary"); }
            Require(d.Any(m=>m.Contains("secondary report output",StringComparison.Ordinal)),"Reporting failure lost");
        });
        Case("primary recorder failure still rescans", f => {
            var snapshot=f.Capture(); int comparisons=0; var original=new IOException("original");
            var guard=Activator.CreateInstance(type,(Action<string>)(phase=>{comparisons++;snapshot.AssertUnchanged(phase);}),
                (Action<string>)(_=>{}),(Action<Exception>)(_=>throw new IOException("log sink")))!;
            try { Run(guard,()=>throw original,()=>{},_=>{}); }
            catch(IOException e) { Require(ReferenceEquals(e,original),"Recorder masked original"); }
            Require(comparisons==2,"Recorder prevented exception/final comparison");
        });
        Case("cleanup mutation plus throw retains both", f => {
            var snapshot=f.Capture(); var primary=new IOException("cleanup primary"); var reports=new List<ProtectionDiffReport>();
            var guard=Guard(phase=>{try{snapshot.AssertUnchanged(phase);}catch(ProtectedFilesChangedException e){reports.Add(e.report);throw;}},new(),new());
            try { Run(guard,()=>{},()=>{f.Set(Fixture.Source,"cleanup changed");throw primary;},_=>{}); }
            catch(IOException e) { Require(ReferenceEquals(e,primary),"Final protection masked cleanup primary"); }
            Require(reports.Count==1&&reports[0].changes[0].relativePath==Fixture.Source,"Cleanup change evidence lost");
        });
        return count;
    }
    static byte[] Bytes(string value) => Encoding.UTF8.GetBytes(value);
    const string FixtureGuid = "11111111111111111111111111111111";
    static readonly RetainedShaderReference[] Required = Enumerable.Range(1,7)
        .Select(id=>new RetainedShaderReference(FixtureGuid,id)).ToArray();
    static string Graphics(IEnumerable<int> ids, bool dirty=false) => "%YAML 1.1\nGraphicsSettings:\n  m_Fog: "+(dirty?"1":"0")+"\n  m_AlwaysIncludedShaders:\n"+
        string.Concat(ids.Select(id=>"  - {fileID: "+id+", guid: "+FixtureGuid+", type: 0}\n"))+"  m_Lights: 1\n";
    static void Rejected(Action operation, string name)
    { bool rejected=false;try{operation();}catch(InvalidOperationException){rejected=true;}Require(rejected,"Settings policy accepted "+name); }
    static int SettingsCases()
    {
        int count=0; void Case(string name,Action test){test();count++;Console.WriteLine("PASS audit settings: "+name);}
        Case("native panel-derived shader reference type",()=>{
            const string field="m_DefaultShader";
            var identity=new RetainedShaderReference(FixtureGuid,123);
            var reference=GraphicsShaderRetentionPolicy.ReadPanelReference(Bytes("PanelSettings:\n  "+field+": {fileID: 123, guid: "+FixtureGuid+", type: 3}\n"),field,identity);
            Require(reference.referenceType==3&&reference.guid==identity.guid&&reference.fileId==identity.fileId,"Native reference type not preserved");
        });
        Case("panel reference mismatching actual shader rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.ReadPanelReference(
            Bytes("PanelSettings:\n  m_DefaultShader: {fileID: 999, guid: "+FixtureGuid+", type: 3}\n"),"m_DefaultShader",new RetainedShaderReference(FixtureGuid,123)),"mismatched panel reference"));
        Case("duplicate native panel shader field rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.ReadPanelReference(
            Bytes(string.Concat(Enumerable.Repeat("  m_DefaultShader: {fileID: 123, guid: "+FixtureGuid+", type: 3}\n",2))),"m_DefaultShader",new RetainedShaderReference(FixtureGuid,123)),"duplicate panel binding"));
        Case("exact seven UI shader additions",()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7})),Required));
        Case("idempotent required shaders",()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(Enumerable.Range(1,7))),Bytes(Graphics(Enumerable.Range(1,7))),Required));
        Case("unrelated dirty graphics field rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7},true)),Required),"unrelated field"));
        Case("unapproved shader rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7,99})),Required),"new shader"));
        Case("removed or reordered original shaders rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8,9})),Bytes(Graphics(new[]{9,8,1,2,3,4,5,6,7})),Required),"reordered shaders"));
        Case("unsupported built-in identity rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7})),Required.Take(6).ToArray()),"missing verified identity"));
        Case("duplicate settings key rejected",()=>Rejected(()=>GraphicsShaderRetentionPolicy.Validate(Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7})+"  m_AlwaysIncludedShaders: []\n"),Required),"duplicate shader section"));
        Case("production snapshot adopts only validated owned settings",()=>{
            using var f=new Fixture(); string path=GraphicsShaderRetentionPolicy.Path;
            var before=Bytes(Graphics(new[]{8}));var after=Bytes(Graphics(new[]{8,1,2,3,4,5,6,7}));f.Set(path,Encoding.UTF8.GetString(before));
            var snapshot=f.Capture();f.Set(path,Encoding.UTF8.GetString(after));
            var report=snapshot.AdmitUiShaderRetention(before,after,Required,"UI persistence");
            Require(report.rejectedCount==0&&report.changes.Single().allowedOwnedSettings,"Owned settings not explicitly reported");
            Require(snapshot.AssertUnchanged("after UI").totalChanges==0,"Owned settings not adopted");
            f.Set(Fixture.Source,"unrelated");
            try{snapshot.AssertUnchanged("after UI");throw new Exception("Source mutation accepted");}catch(ProtectedFilesChangedException){}
        });
        Case("owned settings admission cannot adopt another dirty source",()=>{
            using var f=new Fixture();var before=Bytes(Graphics(new[]{8}));var after=Bytes(Graphics(new[]{8,1,2,3,4,5,6,7}));
            f.Set(GraphicsShaderRetentionPolicy.Path,Encoding.UTF8.GetString(before));var snapshot=f.Capture();
            f.Set(GraphicsShaderRetentionPolicy.Path,Encoding.UTF8.GetString(after));f.Set(Fixture.Source,"unauthorized");
            try{snapshot.AdmitUiShaderRetention(before,after,Required,"UI persistence");throw new Exception("Dirty source adopted");}
            catch(ProtectedFilesChangedException e){Require(e.report.changes.Any(c=>c.relativePath==Fixture.Source&&!c.Allowed),"Unauthorized source evidence missing");}
        });
        Case("late recapture cannot authorize earlier graphics mutation",()=>{
            using var f=new Fixture();f.Set(GraphicsShaderRetentionPolicy.Path,Graphics(new[]{8}));var snapshot=f.Capture();
            var changed=Bytes(Graphics(new[]{8},true));f.Set(GraphicsShaderRetentionPolicy.Path,Encoding.UTF8.GetString(changed));
            Rejected(()=>snapshot.AdmitUiShaderRetention(changed,changed,Required,"late baseline"),"late baseline");
        });
        return count;
    }
    static void Mutant(string source, string needle, string replacement, Action<Type> exercise, string name, string typeName)
    {
        string broken=source.Replace(needle,replacement,StringComparison.Ordinal);Require(broken!=source,"Mutant did not change "+name);
        var refs=((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!).Split(Path.PathSeparator).Select(p=>MetadataReference.CreateFromFile(p));
        var compilation=CSharpCompilation.Create("AuditMutant"+Guid.NewGuid().ToString("N"),
            new[]{CSharpSyntaxTree.ParseText(broken,new CSharpParseOptions(LanguageVersion.CSharp9))},refs,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
        using var image=new MemoryStream();var result=compilation.Emit(image);Require(result.Success,"Mutant compilation failed: "+string.Join(";",result.Diagnostics));
        image.Position=0;var context=new AssemblyLoadContext("audit mutation",true);
        try { var type=context.LoadFromStream(image).GetType(typeName,true)!;bool caught=false;
            try{exercise(type);}catch(Exception){caught=true;}Require(caught,"Suite accepted weakened "+name);Console.WriteLine("PASS audit mutant detected: "+name);
        }finally{context.Unload();}
    }
    public static void Run(string root)
    {
        int lifecycle=LifecycleCases(typeof(PreparationSafety)),settings=SettingsCases();
        var source=File.ReadAllText(Path.Combine(root,"Assets/Editor/CrownfallEnvironment/PreparationSafety.cs"));
        Mutant(source,"compare(\"final after cleanup/restoration; last operation=\" + Phase);","",
            type=>LifecycleCases(type),"final cleanup phase removed",typeof(PreparationSafety).FullName!);
        Mutant(source,"ExceptionDispatchInfo.Capture(original).Throw();","throw new Exception(\"primary replaced\");",
            type=>LifecycleCases(type),"primary exception replaced",typeof(PreparationSafety).FullName!);
        Mutant(source,"BestEffort(\"exceptional-exit comparison\", () => compare(\"exception during \" + Phase));","BestEffort(\"exceptional-exit comparison\", () => { });",
            type=>LifecycleCases(type),"exceptional comparison removed",typeof(PreparationSafety).FullName!);
        var graphics=File.ReadAllText(Path.Combine(root,"Assets/Editor/CrownfallEnvironment/GraphicsShaderRetentionPolicy.cs"));
        Mutant(graphics,"if (a.prefix != b.prefix || a.suffix != b.suffix)","if (false)",type=>{
            bool rejected=false;
            var refType=type.Assembly.GetType(typeof(RetainedShaderReference).FullName!)!;var refs=Array.CreateInstance(refType,7);
            for(int i=0;i<7;i++)refs.SetValue(Activator.CreateInstance(refType,FixtureGuid,(long)i+1),i);
            rejected=false;try{Invoke(type.GetMethod("Validate")!,null,Bytes(Graphics(new[]{8})),Bytes(Graphics(new[]{8,1,2,3,4,5,6,7},true)),refs);}catch(InvalidOperationException){rejected=true;}
            Require(rejected,"Unrelated setting bypass accepted");
        },"graphics unrelated fields ignored",typeof(GraphicsShaderRetentionPolicy).FullName!);
        Console.WriteLine($"PASS: {lifecycle} audit lifecycle fixtures, {settings} owned-settings fixtures, four compiled audit mutants.");
    }
}
