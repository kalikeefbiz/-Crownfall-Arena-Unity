using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

internal static class AuditCallerContracts
{
    static void Require(bool ok,string message){if(!ok)throw new InvalidOperationException(message);}
    static void Validate(Dictionary<string,string> code)
    {
        static string Executable(string source) => CSharpSyntaxTree.ParseText(source).GetRoot().WithoutTrivia().ToFullString();
        static bool Calls(string source,string name) => CSharpSyntaxTree.ParseText(source).GetRoot()
            .DescendantNodes().OfType<InvocationExpressionSyntax>().Any(i=>i.Expression.ToString().EndsWith(name,StringComparison.Ordinal));
        var pipeline=code["PipelineBuild.cs"];var ui=code["ProductionUiDependencies.cs"];var native=code["EnvironmentNativeValidation.cs"];
        Require(Calls(pipeline,"WildernessBuildPreparation.PrepareAndValidate"),"Shipping native preparation call missing");
        Require(Calls(pipeline,"EnvironmentNativeValidation.RunProtected"),"Prebuild early protection scope missing");
        Require(pipeline.IndexOf("RunProtected(\"player prebuild\"",StringComparison.Ordinal)<pipeline.IndexOf("Configure(report.summary.platform)",StringComparison.Ordinal),"Configuration precedes early protection");
        Require(Calls(ui,"EnvironmentNativeValidation.RunProtected")&&Calls(ui,"AssetDatabase.SaveAssetIfDirty")&&
            Calls(ui,"EnvironmentNativeValidation.SaveUiGraphicsSettings")&&Calls(ui,"GraphicsShaderRetentionPolicy.ReadPanelReference"),"UI owned protected saves missing");
        Require(!Calls(ui,"AssetDatabase.SaveAssets"),"Global UI saving reintroduced");
        Require(native.IndexOf("baseline = ProtectedHashes()",StringComparison.Ordinal)>=0 && native.IndexOf("baseline = ProtectedHashes()",StringComparison.Ordinal)<native.IndexOf("operation(guard)",StringComparison.Ordinal),"Caller recaptures baseline after operation");
        Require(Calls(native,"guard.Run")&&Calls(native,"snapshot.AdmitUiShaderRetention")&&Calls(native,"AssetDatabase.SaveAssetIfDirty"),"Tested lifecycle/owned-settings policy not bound to native caller");
        Require(Calls(native,"applyChanges") && native.IndexOf("var before = File.ReadAllBytes(path)",StringComparison.Ordinal)<native.IndexOf("applyChanges();",StringComparison.Ordinal) &&
            native.IndexOf("applyChanges();",StringComparison.Ordinal)<native.IndexOf("var after = File.ReadAllBytes(path)",StringComparison.Ordinal),"Graphics apply occurs outside captured ownership evidence");
        Require(native.Contains("foreach (var snapshot in activeSnapshots) AssertProtected(snapshot, \"before UI graphics targeted save\")",StringComparison.Ordinal),"UI ignores early outer snapshot");
        foreach(var name in new[]{"EnvironmentAssetLab.cs","WildernessBuildPreparation.cs"})
            Require(Calls(code[name],"EnvironmentNativeValidation.RunProtected")&&Calls(code[name],"guard.Step"),"Exceptional-exit lifecycle missing: "+name);
        foreach(var name in new[]{"EnvironmentNativeValidation.cs","WildernessBuildPreparation.cs"})
        {
            Require(Calls(code[name],"DiagnosticSafety.Attempt"),"Best-effort diagnostics not invoked: "+name);
            Require(Executable(code[name]).Contains("secondaryReportingFailures",StringComparison.Ordinal),"Secondary diagnostic report field missing: "+name);
        }
    }
    public static void Check(string root)
    {
        var code=new Dictionary<string,string>();
        foreach(var name in new[]{"EnvironmentNativeValidation.cs","EnvironmentAssetLab.cs","WildernessBuildPreparation.cs"})
            code[name]=File.ReadAllText(Path.Combine(root,"Assets/Editor/CrownfallEnvironment",name));
        foreach(var name in new[]{"PipelineBuild.cs","ProductionUiDependencies.cs"})code[name]=File.ReadAllText(Path.Combine(root,"Assets/Editor",name));
        Validate(code);int caught=0;
        foreach(var item in new[]{("PipelineBuild.cs","EnvironmentNativeValidation.RunProtected"),
            ("PipelineBuild.cs","WildernessBuildPreparation.PrepareAndValidate"),
            ("ProductionUiDependencies.cs","EnvironmentNativeValidation.SaveUiGraphicsSettings"),
            ("EnvironmentNativeValidation.cs","baseline = ProtectedHashes()"),
            ("EnvironmentNativeValidation.cs","applyChanges();"),
            ("EnvironmentAssetLab.cs","EnvironmentNativeValidation.RunProtected"),
            ("WildernessBuildPreparation.cs","EnvironmentNativeValidation.RunProtected")})
        {
            var broken=new Dictionary<string,string>(code);broken[item.Item1]=broken[item.Item1].Replace(item.Item2,"RemovedByRegression",StringComparison.Ordinal);
            try{Validate(broken);}catch(InvalidOperationException){caught++;continue;}
            throw new InvalidOperationException("Native caller contract accepted removed "+item.Item2);
        }
        Console.WriteLine($"PASS: native protection/saving/diagnostic caller contracts and {caught} negative source mutations.");
    }
}
