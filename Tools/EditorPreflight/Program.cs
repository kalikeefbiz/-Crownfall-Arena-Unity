using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

internal static class EditorPreflight
{
    // These are real Roslyn syntax/binding checks, not an exact Unity assembly compile.
    // Unknown UnityEngine/UnityEditor symbols are expected without Unity assemblies.
    private static readonly HashSet<string> IndependentErrors = new(StringComparer.Ordinal)
    {
        "CS0136", // Nested/outer local shadowing (Build #15)
        "CS0128", // Duplicate local in a scope
        "CS0111", // Duplicate member signatures
        "CS0102"  // Duplicate type members
    };
    private static readonly CSharpParseOptions ParseOptions =
        new(languageVersion: LanguageVersion.CSharp9,
            preprocessorSymbols: new[] { "UNITY_EDITOR", "UNITY_6000_3_OR_NEWER", "UNITY_6000_3", "UNITY_CLOUD_BUILD" });

    private static void Require(bool ok, string message)
    {
        if (!ok) throw new InvalidOperationException(message);
    }

    private static CSharpCompilation Compile(IEnumerable<SyntaxTree> trees) =>
        CSharpCompilation.Create("CrownfallLicenseFreePreflight", trees,
            new[]
            {
                MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location)
            }, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

    private static void CheckSceneContract(string lab, string generator)
    {
        var batchGuard = lab.IndexOf("if (Application.isBatchMode && string.IsNullOrEmpty(previous.path))", StringComparison.Ordinal);
        var singleScene = lab.IndexOf("EditorSceneManager.OpenScene(shippingScene, OpenSceneMode.Single)", StringComparison.Ordinal);
        var additiveLab = lab.IndexOf("EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive)", StringComparison.Ordinal);
        Require(batchGuard >= 0 && singleScene > batchGuard && additiveLab > singleScene,
            "Batch editor scene bootstrap is missing or occurs after additive scene creation (Build #16 regression).");
        Require(generator.Contains("EnvironmentAssetLab.GenerateAndValidateMobile()", StringComparison.Ordinal) &&
                generator.IndexOf("GenerateComposition(layout)", StringComparison.Ordinal) >
                generator.IndexOf("EnvironmentAssetLab.GenerateAndValidateMobile()", StringComparison.Ordinal),
                "Shipping wilderness creation is no longer ordered after saved-scene lab bootstrap.");
    }

    private static void SelfTest()
    {
        // Prove the semantic error filter detects the exact class of Build #15 failure.
        var broken = CSharpSyntaxTree.ParseText(
            "class Regression { void M() { foreach (var renderer in new int[]{1}) { } var renderer = 3; } }",
            ParseOptions, "regression.cs");
        Require(Compile(new[] { broken }).GetDiagnostics().Any(d => d.Id == "CS0136"),
            "Roslyn gate did not detect the nested local collision regression.");
    }

    public static int Main(string[] args)
    {
        try
        {
            var root = Path.GetFullPath(args.Length == 0 ? "." : args[0]);
            SelfTest();
            var lab = File.ReadAllText(Path.Combine(root, "Assets/Editor/CrownfallEnvironment/EnvironmentAssetLab.cs"));
            var generator = File.ReadAllText(Path.Combine(root, "Assets/Editor/CrownfallEnvironment/WildernessBuildPreparation.cs"));
            CheckSceneContract(lab, generator);
            Require(!lab.Contains("AssetDatabase.SaveAssets()", StringComparison.Ordinal) && !generator.Contains("AssetDatabase.SaveAssets()", StringComparison.Ordinal),
                "Environment generation must not flush unrelated dirty protected assets.");
            Require(lab.Contains("AssetDatabase.SaveAssetIfDirty(asset)", StringComparison.Ordinal) &&
                generator.Contains("AssetDatabase.SaveAssetIfDirty(library)", StringComparison.Ordinal), "Owned generated saves missing");
            Require(lab.Contains("AssertProtected(preserved, \"lab saved-scene bootstrap\")", StringComparison.Ordinal) &&
                generator.Contains("AssertProtected(preserved, \"wilderness composition save\")", StringComparison.Ordinal),
                "Protection checkpoints missing around scene bootstrap/shipping composition");
            ProtectionRegressionTests.Run(root);
            // Mutation test: make sure the batch bootstrap contract actually rejects the old error.
            var brokenLab = lab.Replace("EditorSceneManager.OpenScene(shippingScene, OpenSceneMode.Single)",
                                        "EditorSceneManager.OpenScene(shippingScene, OpenSceneMode.Additive)", StringComparison.Ordinal);
            Require(brokenLab != lab, "Batch bootstrap mutation test did not change the source.");
            bool caught = false;
            try { CheckSceneContract(brokenLab, generator); }
            catch (InvalidOperationException) { caught = true; }
            Require(caught, "Batch bootstrap gate failed its negative regression test.");

            var sourceFiles = Directory.GetFiles(Path.Combine(root, "Assets"), "*.cs", SearchOption.AllDirectories)
                .OrderBy(p => p, StringComparer.Ordinal).ToArray();
            Require(sourceFiles.Length > 0, "No C# sources found under Assets.");
            var trees = sourceFiles.Select(p => CSharpSyntaxTree.ParseText(File.ReadAllText(p), ParseOptions,
                Path.GetRelativePath(root, p))).ToArray();
            var errors = trees.SelectMany(t => t.GetDiagnostics())
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Concat(Compile(trees).GetDiagnostics().Where(d =>
                    d.Severity == DiagnosticSeverity.Error && IndependentErrors.Contains(d.Id)))
                .GroupBy(d => d.Id + ":" + d.Location.GetLineSpan().ToString())
                .Select(g => g.First()).Take(60).ToArray();
            foreach (var error in errors) Console.Error.WriteLine(error);
            Require(errors.Length == 0, "Roslyn Unity-independent C# source preflight failed.");
            Console.WriteLine($"PASS: {sourceFiles.Length} C# files parsed at language version 9; CS0136/CS0128/CS0111/CS0102 absent.");
            Console.WriteLine("PASS: batch-mode saved-scene initialization order and two negative regression fixtures.");
            Console.WriteLine("LIMITATION: Exact Unity 6000.3.10f1 import, Editor API compilation, prebuild and WebGL are NOT tested.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("FAIL: " + ex.Message);
            return 1;
        }
    }
}
