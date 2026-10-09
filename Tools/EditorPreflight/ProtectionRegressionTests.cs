using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Runtime.Loader;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Crownfall.EnvironmentLab.Editor;

internal static class ProtectionRegressionTests
{
    const string Game = "Assets/Crownfall/Match/Game.cs";
    const string Scene = "Assets/Scenes/CrownfallMatch.unity";
    const string Orphan = "Assets/Crownfall/Match/Orphan.unity";
    const string Identity = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static void Require(bool value, string message)
    { if (!value) throw new InvalidOperationException(message); }
    static T Field<T>(object value, string name) => (T)value.GetType().GetField(name)!.GetValue(value)!;
    static object Invoke(MethodInfo method, object? target, params object?[] args)
    {
        try { return method.Invoke(target, args)!; }
        catch (TargetInvocationException error) when (error.InnerException != null)
        { ExceptionDispatchInfo.Capture(error.InnerException).Throw(); throw; }
    }
    static string Metadata(string guid = Identity, bool folder = false) =>
        "fileFormatVersion: 2\nguid: " + guid + "\n" + (folder ? "folderAsset: yes\n" : "") + "DefaultImporter:\n  externalObjects: {}\n  userData: \n";
    sealed class Fixture : IDisposable
    {
        public readonly string directory = Path.Combine(Path.GetTempPath(), "crownfall-protection-" + Guid.NewGuid().ToString("N"));
        readonly Type api;
        readonly string[] roots = { "Assets/Crownfall/Match", "Assets/Scenes", "Packages", "ProjectSettings" };
        public readonly List<string> committed = new() { Game, Game + ".meta", Scene, Scene + ".meta", "Packages/manifest.json", "ProjectSettings/ProjectSettings.asset" };
        public readonly Dictionary<string, string> registry = new(StringComparer.Ordinal);
        public Fixture(Type implementation)
        {
            api = implementation;
            foreach (string root in roots) Directory.CreateDirectory(Path.Combine(directory, root));
            Set(Game, "class Game {}\n"); Set(Game + ".meta", Metadata("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"));
            Set(Scene, "%YAML 1.1\nscene: unchanged\n"); Set(Scene + ".meta", Metadata("cccccccccccccccccccccccccccccccc"));
            Set("Packages/manifest.json", "{}");
            Set("ProjectSettings/ProjectSettings.asset", "%YAML 1.1\nsettings: unchanged\n");
        }
        public string PathOf(string path) => Path.Combine(directory, path);
        public void Set(string path, string data)
        { Directory.CreateDirectory(Path.GetDirectoryName(PathOf(path))!); File.WriteAllText(PathOf(path), data); }
        public void Delete(string path) => File.Delete(PathOf(path));
        public object Capture()
        {
            Func<string, string?> resolve = path => registry.TryGetValue(path, out string? identity) ? identity : null;
            return Invoke(api.GetMethod("Capture")!, null, directory, roots, committed.ToArray(), resolve);
        }
        public object Assert(object snapshot) => Invoke(api.GetMethod("AssertUnchanged")!, snapshot, "fixture validation");
        public void Dispose() => Directory.Delete(directory, true);
    }
    static object ExpectedFailure(Action action, string name)
    {
        try { action(); }
        catch (Exception error) when (error.GetType().Name == nameof(ProtectedFilesChangedException))
        { return error.GetType().GetField("report")!.GetValue(error)!; }
        throw new InvalidOperationException(name + " did not reject the protected mutation");
    }
    static object Entry(object report, string path)
    {
        var entries = Field<Array>(report, "changes").Cast<object>().ToArray();
        return entries.Single(c => Field<string>(c, "relativePath") == path);
    }
    static void CheckFailure(object report, string path, string classification, string root, bool previous, bool current)
    {
        Require(Field<int>(report, "rejectedCount") > 0, "Failure report lost rejected count");
        object entry = Entry(report, path);
        Require(Field<string>(entry, "classification") == classification, "Wrong change classification for " + path);
        Require(Field<string>(entry, "protectedRoot") == root, "Wrong protected root for " + path);
        Require(Field<string>(entry, "phase") == "fixture validation", "Validation phase not recorded");
        foreach (var pair in new[] { ("previousSha256", previous), ("currentSha256", current) })
        {
            string? hash = Field<string?>(entry, pair.Item1);
            Require(pair.Item2 ? hash != null && hash.Length == 64 : hash == null, "Missing/incorrect SHA-256 evidence for " + path);
        }
    }
    static int Cases(Type implementation)
    {
        int count = 0;
        void Run(string name, Action<Fixture> check)
        {
            using var fixture = new Fixture(implementation); check(fixture); count++;
            Console.WriteLine("PASS protection fixture: " + name);
        }
        Run("unchanged files", f => Require(Field<int>(f.Assert(f.Capture()), "totalChanges") == 0, "Unchanged snapshot rejected"));
        Run("modified gameplay", f => {
            var snapshot = f.Capture(); f.Set(Game, "class Game { int changed; }\n");
            var report = ExpectedFailure(() => f.Assert(snapshot), "Modified gameplay");
            CheckFailure(report, Game, "Modified", "Assets/Crownfall/Match", true, true);
            Require(Field<string>(Entry(report, Game), "previousSha256") != Field<string>(Entry(report, Game), "currentSha256"), "Hashes did not distinguish mutation");
        });
        Run("modified tracked metadata", f => {
            var snapshot = f.Capture(); f.Set(Game + ".meta", Metadata("dddddddddddddddddddddddddddddddd"));
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Tracked metadata"), Game + ".meta", "Modified", "Assets/Crownfall/Match", true, true);
        });
        Run("deleted gameplay", f => {
            var snapshot = f.Capture(); f.Delete(Game);
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Deleted gameplay"), Game, "Removed", "Assets/Crownfall/Match", true, false);
        });
        Run("deleted tracked metadata", f => {
            var snapshot = f.Capture(); f.Delete(Game + ".meta");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Deleted metadata"), Game + ".meta", "Removed", "Assets/Crownfall/Match", true, false);
        });
        Run("new protected source", f => {
            var snapshot = f.Capture(); string path = "Assets/Crownfall/Match/Unexpected.cs"; f.Set(path, "class Unexpected {}");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "New source"), path, "Added", "Assets/Crownfall/Match", false, true);
        });
        Run("modified shipping scene", f => {
            var snapshot = f.Capture(); f.Set(Scene, "changed scene");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Shipping scene"), Scene, "Modified", "Assets/Scenes", true, true);
        });
        Run("modified project settings", f => {
            var snapshot = f.Capture(); string path = "ProjectSettings/ProjectSettings.asset"; f.Set(path, "changed settings");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Project settings"), path, "Modified", "ProjectSettings", true, true);
        });
        Run("modified packages", f => {
            var snapshot = f.Capture(); string path = "Packages/manifest.json"; f.Set(path, "{\"changed\":true}");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Packages"), path, "Modified", "Packages", true, true);
        });
        Run("valid registered new metadata", f => {
            f.Set(Orphan, "unchanged source asset"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata()); var report = f.Assert(snapshot);
            Require(Field<int>(report, "allowedMetadataCount") == 1 && Field<int>(report, "rejectedCount") == 0, "Valid metadata not admitted");
            CheckFailureMetadata(Entry(report, Orphan + ".meta"));
            Require(Field<int>(f.Assert(snapshot), "totalChanges") == 0, "Admitted metadata not adopted");
        });
        Run("admitted metadata later modified", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata()); f.Assert(snapshot);
            f.Set(Orphan + ".meta", Metadata() + "  extra: changed\n");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Admitted metadata modified"), Orphan + ".meta", "Modified", "Assets/Crownfall/Match", true, true);
        });
        Run("admitted metadata later deleted", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata()); f.Assert(snapshot); f.Delete(Orphan + ".meta");
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Admitted metadata deleted"), Orphan + ".meta", "Removed", "Assets/Crownfall/Match", true, false);
        });
        Run("wrong registered GUID", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"));
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Wrong GUID"), Orphan + ".meta", "Added", "Assets/Crownfall/Match", false, true);
        });
        Run("unregistered new metadata", f => {
            f.Set(Orphan, "unchanged source"); var snapshot = f.Capture(); f.Set(Orphan + ".meta", Metadata());
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Unregistered metadata"), Orphan + ".meta", "Added", "Assets/Crownfall/Match", false, true);
        });
        Run("malformed new metadata", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", "not Unity metadata");
            ExpectedFailure(() => f.Assert(snapshot), "Malformed metadata");
        });
        Run("duplicate GUID declaration", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata() + "guid: " + Identity + "\n");
            ExpectedFailure(() => f.Assert(snapshot), "Duplicate GUID");
        });
        foreach (var probe in new[] {
            ("Astra malformed YAML", Metadata() + "  invalid: [unterminated\n"),
            ("Astra whitespace duplicate GUID", "fileFormatVersion: 2\nguid: " + Identity + "\nguid :    " + Identity + "\nDefaultImporter:\n  externalObjects: {}\n"),
            ("Astra unapproved TextureImporter", "fileFormatVersion: 2\nguid: " + Identity + "\nTextureImporter:\n  isReadable: 1\n"),
            ("unapproved DefaultImporter setting", Metadata() + "  executionOrder: 99\n"),
            ("duplicate importer key", Metadata() + "  externalObjects : {}\n"),
            ("metadata alias", Metadata() + "  userData: *alias\n"),
            ("malformed YAML delimiter", Metadata().Replace("guid: ","guid:",StringComparison.Ordinal)),
        }) Run(probe.Item1, f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", probe.Item2);
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), probe.Item1), Orphan + ".meta", "Added", "Assets/Crownfall/Match", false, true);
        });
        Run("unsupported native asset metadata", f => {
            const string path = "Assets/Crownfall/Match/Unsupported.asset";
            f.Set(path, "unchanged source"); f.registry[path] = Identity; var snapshot = f.Capture();
            f.Set(path + ".meta", Metadata()); ExpectedFailure(() => f.Assert(snapshot), "Unsupported importer");
        });
        Run("new source plus its metadata", f => {
            var snapshot = f.Capture(); f.Set(Orphan, "unexpected new source"); f.Set(Orphan + ".meta", Metadata());
            var report = ExpectedFailure(() => f.Assert(snapshot), "New source plus metadata");
            CheckFailure(report, Orphan, "Added", "Assets/Crownfall/Match", false, true);
            CheckFailure(report, Orphan + ".meta", "Added", "Assets/Crownfall/Match", false, true);
        });
        Run("folder metadata", f => {
            string path = "Assets/Crownfall/Match/ExistingFolder"; Directory.CreateDirectory(f.PathOf(path));
            f.registry[path] = Identity; var snapshot = f.Capture(); f.Set(path + ".meta", Metadata(folder: true));
            Require(Field<int>(f.Assert(snapshot), "allowedMetadataCount") == 1, "Valid folder metadata not admitted");
        });
        Run("wrong folder/file metadata type", f => {
            f.Set(Orphan, "unchanged source"); f.registry[Orphan] = Identity; var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata(folder: true)); ExpectedFailure(() => f.Assert(snapshot), "Wrong folder marker");
        });
        Run("protected root metadata", f => {
            string path = "Assets/Scenes.meta"; f.Set(path, Metadata(folder: true)); f.committed.Add(path);
            var snapshot = f.Capture(); f.Set(path, Metadata("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", true));
            CheckFailure(ExpectedFailure(() => f.Assert(snapshot), "Root metadata"), path, "Modified", "Assets/Scenes", true, true);
        });
        Run("already-existing untracked metadata", f => {
            f.Set(Orphan, "unchanged source"); f.Set(Orphan + ".meta", Metadata()); var snapshot = f.Capture();
            f.Set(Orphan + ".meta", Metadata() + "  userData: changed\n");
            ExpectedFailure(() => f.Assert(snapshot), "Existing untracked metadata");
        });
        Run("committed metadata missing before snapshot", f => {
            f.Delete(Game + ".meta"); var report = ExpectedFailure(() => f.Capture(), "Missing committed metadata");
            Require(Field<string>(Entry(report, Game + ".meta"), "phase") == "snapshot baseline", "Baseline missing-file phase not recorded");
        });
        Run("metadata in settings never admitted", f => {
            string path = "ProjectSettings/Extra.asset"; f.Set(path, "existing input"); f.registry[path] = Identity;
            var snapshot = f.Capture(); f.Set(path + ".meta", Metadata()); ExpectedFailure(() => f.Assert(snapshot), "Settings metadata");
        });
        Run("empty protected directory added", f => {
            var snapshot = f.Capture(); Directory.CreateDirectory(f.PathOf("Assets/Scenes/Unexpected"));
            ExpectedFailure(() => f.Assert(snapshot), "Unexpected directory");
        });
        Run("empty protected directory removed", f => {
            string path = "Assets/Scenes/Existing"; Directory.CreateDirectory(f.PathOf(path)); var snapshot = f.Capture();
            Directory.Delete(f.PathOf(path)); ExpectedFailure(() => f.Assert(snapshot), "Deleted directory");
        });
        Run("bounded deterministic diagnostics", f => {
            for (int i = 0; i < 70; i++) f.Set($"Assets/Crownfall/Match/Many{i:D3}.cs", "before");
            var snapshot = f.Capture(); for (int i = 0; i < 70; i++) f.Set($"Assets/Crownfall/Match/Many{i:D3}.cs", "after");
            var report = ExpectedFailure(() => f.Assert(snapshot), "Many mutations");
            var paths = Field<Array>(report, "changes").Cast<object>().Select(c => Field<string>(c, "relativePath")).ToArray();
            Require(Field<int>(report, "rejectedCount") == 70 && paths.Length == 64 && Field<int>(report, "omittedChanges") == 6, "Incorrect diagnostic bounds/count");
            Require(paths.SequenceEqual(paths.OrderBy(p => p, StringComparer.Ordinal)), "Nondeterministic diagnostic order");
        });
        return count;
    }
    static void CheckFailureMetadata(object entry)
    {
        Require(Field<bool>(entry, "allowedGeneratedMetadata") && Field<string>(entry, "classification") == "Added", "Metadata exception not explicitly recorded");
        Require(Field<string?>(entry, "previousSha256") == null && Field<string>(entry, "currentSha256").Length == 64, "Metadata hash evidence missing");
    }
    static string policySourcePath = "";
    static void RejectMutant(string source, string expression, string name, string? selectedGuard = null)
    {
        const string guard = "if (report.rejectedCount != 0) throw new ProtectedFilesChangedException(report);";
        string mutant = source.Replace(selectedGuard ?? guard, expression, StringComparison.Ordinal);
        Require(mutant != source, "Protection mutation did not change native implementation");
        var references = ((string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!).Split(Path.PathSeparator)
            .Select(p => MetadataReference.CreateFromFile(p)).ToArray();
        var compilation = CSharpCompilation.Create("BrokenProtection" + Guid.NewGuid().ToString("N"),
            new[] { CSharpSyntaxTree.ParseText(mutant, new CSharpParseOptions(LanguageVersion.CSharp9)),
                CSharpSyntaxTree.ParseText(File.ReadAllText(policySourcePath), new CSharpParseOptions(LanguageVersion.CSharp9)) },
            references, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
        using var image = new MemoryStream(); var emitted = compilation.Emit(image);
        Require(emitted.Success, "Mutation compile failed: " + string.Join("; ", emitted.Diagnostics));
        image.Position = 0; var context = new AssemblyLoadContext("Protection mutation", isCollectible: true);
        try
        {
            var assembly = context.LoadFromStream(image);
            var type = assembly.GetType(typeof(ProtectedFileSnapshot).FullName!, throwOnError: true)!;
            bool rejected = false;
            try { Cases(type); } catch (InvalidOperationException error) { rejected = error.Message.Contains("did not reject", StringComparison.Ordinal); }
            Require(rejected, "Regression suite accepted intentionally broken protection: " + name);
            Console.WriteLine("PASS protection mutation detected: " + name);
        }
        finally { context.Unload(); }
    }
    public static void Run(string root)
    {
        policySourcePath = Path.Combine(root, "Assets/Editor/CrownfallEnvironment/GraphicsShaderRetentionPolicy.cs");
        int passed = Cases(typeof(ProtectedFileSnapshot));
        var source = File.ReadAllText(Path.Combine(root, "Assets/Editor/CrownfallEnvironment/ProtectedFileSnapshot.cs"));
        RejectMutant(source, "if (false) throw new ProtectedFilesChangedException(report);", "all enforcement disabled");
        RejectMutant(source, "if (report.rejectedCount != 0 && report.changes.Any(c => !c.relativePath.EndsWith(\".meta\", StringComparison.Ordinal))) throw new ProtectedFilesChangedException(report);", "all metadata changes ignored");
        RejectMutant(source, "if (result.ContainsKey(path)) continue;", "whitespace duplicate metadata keys ignored", "if (result.ContainsKey(path)) return null;");
        RejectMutant(source, "if (mapping == null) return true;", "malformed metadata admitted", "if (mapping == null) return false;");
        RejectMutant(source, "if (true) return true;", "unsupported importer section admitted", "if (mapping == null) return false;");
        Console.WriteLine($"PASS: {passed} protected-file fixtures and five compiled enforcement/admission mutation tests; real project assets never modified.");
    }
}
