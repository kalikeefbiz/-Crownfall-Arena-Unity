using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace Crownfall.EnvironmentLab.Editor
{
    [Serializable] public sealed class EnvironmentNativeResult
    {
        public string status, unityVersion, utc, textureTier, error;
        public bool unityExecuted, playerBuildExecuted, visualRenderApproved, readyForArenaComposition;
        public int modelCount, textureCount, libraryMaterialCount;
        public long importedTriangles;
        public string[] warningsAndErrors, secondaryReportingFailures;
        public EnvironmentNativeModelResult[] models;
        public ProtectionDiffReport[] protectedFileChecks;
    }
    [Serializable] public sealed class EnvironmentNativeModelResult
    {
        public string id, path;
        public long importedTriangles;
        public Vector3 importedSize, presentationSize;
        public int materialSlots, colliderCount;
    }
    public static class EnvironmentNativeValidation
    {
        static string Hash(byte[] data)
        { using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(data)).Replace("-", "").ToLowerInvariant(); }
        [Serializable] sealed class SourceProtectionManifest
        {
            public int schemaVersion;
            public string[] roots, committedPaths;
        }
        static readonly string[] ProtectedRoots = {
            "Assets/Scenes", "Assets/Crownfall/Match", "Assets/Crownfall/Presentation", "Assets/Crownfall/Gameplay",
            "Assets/Crownfall/Combat", "Assets/Art/Characters", "Assets/Art/Production", "Packages", "ProjectSettings" };
        static EnvironmentNativeResult latestResult;
        static readonly List<ProtectionDiffReport> protectionChecks = new List<ProtectionDiffReport>();
        internal static ProtectionDiffReport[] ProtectionChecks { get { return protectionChecks.ToArray(); } }
        static readonly List<ProtectedFileSnapshot> activeSnapshots = new List<ProtectedFileSnapshot>();
        static readonly List<string> secondaryDiagnostics = new List<string>();
        internal static string[] SecondaryDiagnostics { get { return secondaryDiagnostics.ToArray(); } }
        internal static void RecordSecondary(string message)
        {
            if (message.Length > 4096) message = message.Substring(0,4096) + " [truncated]";
            if (secondaryDiagnostics.Count < 64) secondaryDiagnostics.Add(message);
            string evidence = message;
            DiagnosticSafety.Attempt("secondary log", () => Debug.LogWarning("Crownfall secondary failure: " + evidence), ignored => { });
        }
        internal static void BeginProtectionReporting()
        { if (activeSnapshots.Count == 0) { protectionChecks.Clear(); secondaryDiagnostics.Clear(); } }
        internal static void RunProtected(string name, Action<PreparationSafety> operation, Action cleanup, Action<Exception> failure)
        {
            BeginProtectionReporting();
            ProtectedFileSnapshot baseline = null;
            var guard = new PreparationSafety(phase => { if (baseline != null) AssertProtected(baseline, name + ": " + phase); },
                RecordSecondary,
                error => DiagnosticSafety.Attempt("primary failure log", () => Debug.LogError("Crownfall preparation primary failure: " + error), ignored => { }));
            try
            {
                guard.Run(() => {
                    baseline = ProtectedHashes(); activeSnapshots.Add(baseline);
                    operation(guard);
                }, cleanup, failure);
                if (latestResult != null) Write(latestResult);
            }
            finally { if (baseline != null) activeSnapshots.Remove(baseline); }
        }
        internal static void CompareActiveProtection(string phase)
        { foreach (var snapshot in activeSnapshots) AssertProtected(snapshot, phase); }
        internal static void SaveUiGraphicsSettings(UnityEngine.Object settings, RetainedShaderReference[] expectedShaders)
        {
            EnvironmentPaths.Require(activeSnapshots.Count != 0, "UI graphics saving requires an early protection scope");
            foreach (var snapshot in activeSnapshots) AssertProtected(snapshot, "before UI graphics targeted save");
            string path = EnvironmentPaths.Absolute(GraphicsShaderRetentionPolicy.Path);
            EnvironmentPaths.Require(File.Exists(path), "GraphicsSettings must exist before UI preparation; native initialization required");
            var before = File.ReadAllBytes(path);
            AssetDatabase.SaveAssetIfDirty(settings);
            var after = File.ReadAllBytes(path);
            foreach (var snapshot in activeSnapshots)
            {
                try { RecordProtection(snapshot.AdmitUiShaderRetention(before, after, expectedShaders, "UI owned graphics shader retention")); }
                catch (ProtectedFilesChangedException error) { RecordProtection(error.report); throw; }
            }
        }
        internal static ProtectedFileSnapshot ProtectedHashes()
        {
            const string manifestPath = "Docs/CROWNFALL_PROTECTED_SOURCE_PATHS.json";
            EnvironmentPaths.Require(File.Exists(EnvironmentPaths.Absolute(manifestPath)), "Missing source protection manifest: " + manifestPath);
            var manifest = JsonUtility.FromJson<SourceProtectionManifest>(File.ReadAllText(EnvironmentPaths.Absolute(manifestPath)));
            EnvironmentPaths.Require(manifest != null && manifest.schemaVersion == 1 &&
                manifest.roots != null && manifest.roots.SequenceEqual(ProtectedRoots) && manifest.committedPaths != null,
                "Invalid protected source manifest; run Tools/validate_protection_manifest.py");
            try
            {
                return ProtectedFileSnapshot.Capture(EnvironmentPaths.Absolute(""), ProtectedRoots, manifest.committedPaths,
                    assetPath => AssetDatabase.AssetPathToGUID(assetPath));
            }
            catch (ProtectedFilesChangedException error) { RecordProtection(error.report); throw; }
        }
        internal static void AssertProtected(ProtectedFileSnapshot before, string phase)
        {
            try { RecordProtection(before.AssertUnchanged(phase)); }
            catch (ProtectedFilesChangedException error) { RecordProtection(error.report); throw; }
        }
        static void RecordProtection(ProtectionDiffReport report)
        {
            protectionChecks.Add(report);
            DiagnosticSafety.Attempt("protection log", () => Debug.Log("Crownfall source protection: phase=" + report.phase + ", changes=" + report.totalChanges +
                ", rejected=" + report.rejectedCount + ", permittedMetadata=" + report.allowedMetadataCount +
                ", ownedSettings=" + report.allowedOwnedSettingsCount + ", omitted=" + report.omittedChanges), RecordSecondary);
            // Rejections precede admitted additions; at most 64 records per fixed checkpoint, with hashes only.
            foreach (var change in report.changes)
                DiagnosticSafety.Attempt("protected-file log", () => Debug.Log("Crownfall protected file: " + JsonUtility.ToJson(change)), RecordSecondary);
        }
        public static Bounds LocalBounds(GameObject root, bool includeRootTransform = false)
        {
            bool found = false; Bounds bounds = default(Bounds);
            foreach (var filter in root.GetComponentsInChildren<MeshFilter>(true))
            {
                EnvironmentPaths.Require(filter.sharedMesh != null, "Missing imported mesh");
                var b = filter.sharedMesh.bounds;
                var transform = root.transform.worldToLocalMatrix * filter.transform.localToWorldMatrix;
                if (includeRootTransform) transform = Matrix4x4.TRS(root.transform.localPosition,root.transform.localRotation,root.transform.localScale) * transform;
                for (int i = 0; i < 8; i++)
                {
                    Vector3 point = b.center + Vector3.Scale(b.extents, new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1));
                    point = transform.MultiplyPoint3x4(point);
                    if (!found) { bounds = new Bounds(point,Vector3.zero); found = true; } else bounds.Encapsulate(point);
                }
            }
            EnvironmentPaths.Require(found, "No mesh geometry"); return bounds;
        }
        internal static void CheckSize(EnvironmentModel row, Vector3 actual, float presentationScale)
        {
            for (int axis = 0; axis < 3; axis++)
                EnvironmentPaths.Require(Mathf.Abs(actual[axis] - row.expectedSize[axis]*presentationScale) <= Mathf.Max(0.002f,row.expectedSize[axis]*presentationScale*0.02f),
                    "Scale/orientation mismatch: " + row.id + " expected " + string.Join(",", row.expectedSize.Select(s => s.ToString()).ToArray()) + " got " + actual);
        }
        static long Triangles(GameObject root)
        {
            long triangles = 0;
            foreach (var filter in root.GetComponentsInChildren<MeshFilter>(true))
            {
                var mesh = filter.sharedMesh;
                EnvironmentPaths.Require(mesh != null && !mesh.isReadable, "Imported mesh must release CPU readability");
                for (int submesh = 0; submesh < mesh.subMeshCount; submesh++)
                {
                    EnvironmentPaths.Require(mesh.GetTopology(submesh) == MeshTopology.Triangles, "Unexpected mesh topology");
                    triangles += mesh.GetIndexCount(submesh)/3;
                }
            }
            return triangles;
        }
        public static void Validate() { Validate(new string[0]); }
        internal static void Validate(string[] messages)
        {
            try
            {
                var catalog = EnvironmentPaths.Read();
                EnvironmentPaths.Require(Application.unityVersion == catalog.requiredUnityVersion, "Wrong Unity version");
                EnvironmentPaths.Require(GraphicsSettings.currentRenderPipeline == null, "Expected Built-in renderer");
                EnvironmentPaths.Require(!EditorBuildSettings.scenes.Any(s => s.path == EnvironmentPaths.Lab), "Lab included in build settings");
                foreach (var copy in catalog.productionCopies)
                {
                    var data = File.ReadAllBytes(EnvironmentPaths.Absolute(copy.productionPath));
                    EnvironmentPaths.Require(data.LongLength == copy.bytes && Hash(data) == copy.sha256 &&
                        Hash(File.ReadAllBytes(EnvironmentPaths.Absolute(copy.source))) == copy.sha256, "Source/copy hash mismatch " + copy.productionPath);
                }
                foreach (var row in catalog.textures)
                {
                    var importer = AssetImporter.GetAtPath(row.path) as TextureImporter;
                    var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(row.path);
                    EnvironmentPaths.Require(importer != null && texture != null, "Texture import failed: " + row.path);
                    EnvironmentPaths.Require(!importer.isReadable && importer.mipmapEnabled && !importer.streamingMipmaps &&
                        importer.npotScale == TextureImporterNPOTScale.None && importer.maxTextureSize == row.maxSize,
                        "Texture mip/residency settings: " + row.path);
                    EnvironmentPaths.Require(importer.textureType == (row.kind == "normal" ? TextureImporterType.NormalMap : TextureImporterType.Default) &&
                        importer.sRGBTexture == (row.kind == "color" || row.kind == "cutout"), "Texture type/color-space: " + row.path);
                    EnvironmentPaths.Require(importer.alphaSource == (row.hasAlpha ? TextureImporterAlphaSource.FromInput : TextureImporterAlphaSource.None) &&
                        importer.alphaIsTransparency == row.hasAlpha && importer.mipMapsPreserveCoverage == row.hasAlpha &&
                        Mathf.Abs(importer.alphaTestReferenceValue-row.alphaCutoff) < 0.00001f, "Foliage coverage settings: " + row.path);
                    EnvironmentPaths.Require(importer.wrapMode == (row.wrap == "Repeat" ? TextureWrapMode.Repeat : TextureWrapMode.Clamp) &&
                        importer.filterMode == FilterMode.Trilinear && importer.anisoLevel == 2, "Texture sampling settings: " + row.path);
                    var web = importer.GetPlatformTextureSettings("WebGL");
                    EnvironmentPaths.Require(web.overridden && web.maxTextureSize == EnvironmentPaths.WebSize(row) && web.format == TextureImporterFormat.ASTC_6x6,
                        "WebGL compression policy: " + row.path);
                }
                foreach (var spec in catalog.materials)
                {
                    var material = AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath(spec.key));
                    EnvironmentPaths.Require(material != null && material.shader != null && !ShaderUtil.ShaderHasError(material.shader), "Material shader: " + spec.key);
                    EnvironmentPaths.Require(material.shader.name == (spec.family == "alpha-cutout foliage" ? "Crownfall/Environment/Cutout" : "Crownfall/Environment/Lit") &&
                        material.enableInstancing, "Material family/instancing: " + spec.key);
                    TextureMatches(material, "_MainTex", spec.baseTexture);
                    if (spec.family == "alpha-cutout foliage") EnvironmentPaths.Require(Mathf.Abs(material.GetFloat("_Cutoff")-spec.cutoff)<0.00001f,"Cutoff mismatch");
                    else
                    {
                        TextureMatches(material, "_BumpMap", spec.normalTexture); TextureMatches(material, "_SurfaceMap", spec.surfaceTexture);
                        EnvironmentPaths.Require(material.GetFloat("_SurfaceMode") == spec.surfaceMode && material.GetFloat("_Cull") == spec.cull,"Surface mapping mismatch");
                    }
                }
                var results = new List<EnvironmentNativeModelResult>();
                foreach (var row in catalog.models)
                {
                    var importer = AssetImporter.GetAtPath(row.path) as ModelImporter;
                    EnvironmentPaths.Require(importer != null && !importer.addCollider && !importer.isReadable && !importer.importAnimation &&
                        !importer.importCameras && !importer.importLights && !importer.importBlendShapes && importer.useFileScale && importer.bakeAxisConversion &&
                        importer.animationType == ModelImporterAnimationType.None && importer.importNormals == ModelImporterNormals.Import &&
                        importer.importTangents == ModelImporterTangents.CalculateMikk && importer.meshCompression == ModelImporterMeshCompression.Off &&
                        Mathf.Abs(importer.globalScale-row.importScale)<0.00001f &&
                        importer.materialImportMode == ModelImporterMaterialImportMode.ImportStandard && importer.materialLocation == ModelImporterMaterialLocation.InPrefab,
                        "Model import policy mismatch: " + row.id);
                    var source = AssetDatabase.LoadAssetAtPath<GameObject>(row.path);
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(EnvironmentPaths.PrefabPath(row.id));
                    EnvironmentPaths.Require(source != null && prefab != null, "Native source or prefab missing: " + row.id);
                    CheckSize(row,LocalBounds(source,true).size,1); CheckSize(row,LocalBounds(prefab).size,row.presentationScale);
                    var triangles = Triangles(prefab);
                    EnvironmentPaths.Require(triangles == row.sourceTriangles, "Triangle mismatch: " + row.id);
                    EnvironmentPaths.Require(prefab.GetComponentsInChildren<Collider>(true).Length == 0 && prefab.GetComponentsInChildren<Rigidbody>(true).Length == 0 &&
                        prefab.GetComponentsInChildren<MonoBehaviour>(true).Length == 0, "Presentation physics/script component found");
                    int slots = 0;
                    foreach (var renderer in prefab.GetComponentsInChildren<MeshRenderer>(true))
                    {
                        slots += renderer.sharedMaterials.Length;
                        foreach (var material in renderer.sharedMaterials)
                            EnvironmentPaths.Require(material != null && row.bindings.Any(b => AssetDatabase.GetAssetPath(material) == EnvironmentPaths.MaterialPath(b.materialKey)),
                                "Unapproved prefab material: " + row.id);
                        EnvironmentPaths.Require(renderer.shadowCastingMode == (row.castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off), "Shadow policy mismatch");
                    }
                    results.Add(new EnvironmentNativeModelResult { id=row.id,path=row.path,importedTriangles=triangles,
                        importedSize=LocalBounds(source,true).size,presentationSize=LocalBounds(prefab).size,materialSlots=slots,colliderCount=0 });
                }
                var previous = SceneManager.GetActiveScene();
                var scene = SceneManager.GetSceneByPath(EnvironmentPaths.Lab); bool opened = !scene.isLoaded;
                if (opened) scene = EditorSceneManager.OpenScene(EnvironmentPaths.Lab,OpenSceneMode.Additive);
                var sceneCleanup = new PreparationSafety(phase => CompareActiveProtection("validation scene: " + phase), message =>
                    DiagnosticSafety.Attempt("validation scene cleanup log", () => Debug.LogWarning(message), ignored => { }));
                sceneCleanup.Run(() =>
                {
                    EnvironmentPaths.Require(scene.IsValid() && scene.isLoaded, "Lab import/open failed");
                    foreach (var root in scene.GetRootGameObjects()) EnvironmentPaths.Require(root.GetComponentsInChildren<Collider>(true).Length == 0,"Collider in lab scene");
                    foreach (var row in catalog.models)
                        EnvironmentPaths.Require(scene.GetRootGameObjects().SelectMany(o => o.GetComponentsInChildren<Transform>(true)).Any(t => t.name == row.id.Replace(':','_')), "Lab model missing: " + row.id);
                }
                , () => {
                    if (previous.IsValid() && previous.isLoaded) SceneManager.SetActiveScene(previous);
                    if (opened) EditorSceneManager.CloseScene(scene,true);
                }, error => { });
                Write(new EnvironmentNativeResult { status="PASS_NATIVE_IMPORT", unityExecuted=true,unityVersion=Application.unityVersion,
                    utc=DateTime.UtcNow.ToString("o"),textureTier=EditorPrefs.GetString(EnvironmentPaths.TierKey,"Full"),
                    modelCount=results.Count,textureCount=catalog.textures.Length,libraryMaterialCount=catalog.materials.Length,
                    importedTriangles=results.Sum(r => r.importedTriangles),models=results.ToArray(),warningsAndErrors=messages,
                    visualRenderApproved=false,readyForArenaComposition=false,playerBuildExecuted=false });
            }
            catch (Exception error) { WriteFailure(error.ToString(),messages); throw; }
        }
        static void TextureMatches(Material material, string property, string path)
        {
            var texture = material.GetTexture(property);
            EnvironmentPaths.Require(string.IsNullOrEmpty(path) ? texture == null : texture != null && AssetDatabase.GetAssetPath(texture) == path,
                "Material dependency mismatch: " + material.name + " " + property);
        }
        internal static void WriteFailure(string error, string[] messages)
        {
            // Original failure reaches the log before serialization, file paths or report enrichment.
            DiagnosticSafety.Attempt("primary failure log", () => Debug.LogError("Crownfall native primary failure: " + error), ignored => { });
            var result = new EnvironmentNativeResult { status="FAIL_NATIVE_IMPORT",unityExecuted=true,error=error,warningsAndErrors=messages };
            var secondary = new List<string>();
            DiagnosticSafety.Attempt("failure report header", () => {
                result.unityVersion=Application.unityVersion; result.utc=DateTime.UtcNow.ToString("o");
            }, message => { secondary.Add(message); RecordSecondary(message); });
            Write(result, secondary);
        }
        static void Write(EnvironmentNativeResult result) { Write(result, new List<string>()); }
        static void Write(EnvironmentNativeResult result, List<string> secondary)
        {
            latestResult = result;
            Action<string> record = message => {
                secondary.Add(message);
                RecordSecondary(message);
            };
            DiagnosticSafety.Attempt("protection report enrichment", () => result.protectedFileChecks = ProtectionChecks, record);
            result.secondaryReportingFailures = secondary.Concat(SecondaryDiagnostics).Distinct().Take(64).ToArray();
            DiagnosticSafety.Attempt("native report serialization/output", () =>
                File.WriteAllText(EnvironmentPaths.Absolute(EnvironmentPaths.NativeReport),JsonUtility.ToJson(result,true)+"\n"), record);
        }
    }
}
