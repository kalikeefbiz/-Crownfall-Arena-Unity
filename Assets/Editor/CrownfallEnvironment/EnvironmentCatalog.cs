using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Crownfall.EnvironmentLab.Editor
{
    [Serializable] public sealed class EnvironmentCatalog
    {
        public int schemaVersion;
        public string requiredUnityVersion;
        public EnvironmentModel[] models;
        public EnvironmentTexture[] textures;
        public EnvironmentMaterial[] materials;
        public EnvironmentCopy[] productionCopies;
    }
    [Serializable] public sealed class EnvironmentModel
    {
        public string id, path, group, lodDecision;
        public float importScale, presentationScale;
        public float[] expectedSize;
        public int sourceTriangles;
        public bool castShadows, lodCandidate;
        public EnvironmentBinding[] bindings;
    }
    [Serializable] public sealed class EnvironmentBinding { public string sourceName, materialKey; }
    [Serializable] public sealed class EnvironmentCopy { public string source, productionPath, sha256, kind; public long bytes; }
    [Serializable] public sealed class EnvironmentTexture
    {
        public string path, kind, wrap;
        public int width, height, maxSize, webglFullMaxSize, webglMobileMaxSize;
        public float alphaCutoff;
        public bool hasAlpha;
    }
    [Serializable] public sealed class EnvironmentMaterial
    {
        public string key, family, baseTexture, normalTexture, surfaceTexture;
        public float[] color;
        public int surfaceMode, cull;
        public float cutoff, smoothness, metallic;
        public bool enableInstancing;
    }
    internal static class EnvironmentPaths
    {
        public const string Catalog = "Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json";
        public const string Art = "Assets/Art/Environment/External/";
        public const string Generated = "Assets/Crownfall/Environment/Generated/";
        public const string Lab = "Assets/Editor/CrownfallEnvironment/Generated/EnvironmentAssetLab.unity";
        public const string NativeReport = "Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json";
        public const string TierKey = "Crownfall.EnvironmentLab.TextureTier";
        public static string ProjectRoot { get { return Directory.GetParent(Application.dataPath).FullName; } }
        public static string Absolute(string path) { return Path.Combine(ProjectRoot, path); }
        public static EnvironmentCatalog Read()
        {
            var result = JsonUtility.FromJson<EnvironmentCatalog>(File.ReadAllText(Absolute(Catalog)));
            Require(result != null && result.schemaVersion == 1 && result.models != null && result.models.Length == 26,
                "Expected the prepared 26-model catalog (25 baseline + CC0 understory)");
            Require(result.models.Select(m => m.id).Distinct().Count() == 26, "Duplicate model ID");
            return result;
        }
        public static void Require(bool condition, string message)
        { if (!condition) throw new InvalidOperationException("Environment lab: " + message); }
        public static string MaterialPath(string key) { return Generated + "Materials/" + key + ".mat"; }
        public static string PrefabPath(string id) { return Generated + "Prefabs/" + id.Replace(':', '_') + ".prefab"; }
        public static string CleanMaterialName(string name)
        { return name.Replace(" (Instance)", "").Replace("Material::", ""); }
        public static int WebSize(EnvironmentTexture row)
        { return EditorPrefs.GetString(TierKey, "Full") == "Mobile" ? row.webglMobileMaxSize : row.webglFullMaxSize; }
    }
}
