using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Crownfall.EnvironmentLab.Editor
{
    // All callbacks are path scoped. No shipping importer or project setting is changed.
    public sealed class EnvironmentImportProcessor : AssetPostprocessor
    {
        public override uint GetVersion() { return 1; }
        void OnPreprocessModel()
        {
            if (!assetPath.StartsWith(EnvironmentPaths.Art, System.StringComparison.Ordinal) || !assetPath.EndsWith(".fbx")) return;
            var row = EnvironmentPaths.Read().models.SingleOrDefault(m => m.path == assetPath);
            EnvironmentPaths.Require(row != null, "Unapproved external model: " + assetPath);
            var importer = (ModelImporter)assetImporter;
            importer.globalScale = row.importScale;
            importer.useFileScale = true;
            importer.bakeAxisConversion = true;
            importer.importNormals = ModelImporterNormals.Import;
            importer.importTangents = ModelImporterTangents.CalculateMikk;
            importer.isReadable = false;
            importer.meshCompression = ModelImporterMeshCompression.Off;
            importer.importAnimation = false;
            importer.animationType = ModelImporterAnimationType.None;
            importer.importBlendShapes = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.addCollider = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            importer.materialLocation = ModelImporterMaterialLocation.InPrefab;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
        }
        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(EnvironmentPaths.Art + "SharedTextures/", System.StringComparison.Ordinal)) return;
            var row = EnvironmentPaths.Read().textures.SingleOrDefault(t => t.path == assetPath);
            EnvironmentPaths.Require(row != null, "Unapproved texture: " + assetPath);
            var importer = (TextureImporter)assetImporter;
            importer.textureType = row.kind == "normal" ? TextureImporterType.NormalMap : TextureImporterType.Default;
            importer.sRGBTexture = row.kind == "color" || row.kind == "cutout";
            importer.maxTextureSize = row.maxSize;
            importer.isReadable = false;
            importer.mipmapEnabled = true;
            importer.streamingMipmaps = false;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.alphaSource = row.hasAlpha ? TextureImporterAlphaSource.FromInput : TextureImporterAlphaSource.None;
            importer.alphaIsTransparency = row.hasAlpha;
            importer.mipMapsPreserveCoverage = row.hasAlpha;
            importer.alphaTestReferenceValue = row.alphaCutoff;
            importer.wrapMode = row.wrap == "Repeat" ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 2;
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            importer.SetPlatformTextureSettings(new TextureImporterPlatformSettings
            {
                name = "WebGL", overridden = true, maxTextureSize = EnvironmentPaths.WebSize(row),
                format = TextureImporterFormat.ASTC_6x6, compressionQuality = 50
            });
        }
        Material OnAssignMaterialModel(Material source, Renderer renderer)
        {
            if (!assetPath.StartsWith(EnvironmentPaths.Art, System.StringComparison.Ordinal)) return null;
            var row = EnvironmentPaths.Read().models.SingleOrDefault(m => m.path == assetPath);
            if (row == null) return null;
            var binding = row.bindings.SingleOrDefault(b => b.sourceName == EnvironmentPaths.CleanMaterialName(source.name));
            return binding == null ? null : AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath(binding.materialKey));
        }
        void OnPostprocessModel(GameObject model)
        {
            if (!assetPath.StartsWith(EnvironmentPaths.Art, System.StringComparison.Ordinal)) return;
            foreach (var collider in model.GetComponentsInChildren<Collider>(true)) Object.DestroyImmediate(collider);
            foreach (var body in model.GetComponentsInChildren<Rigidbody>(true)) Object.DestroyImmediate(body);
        }
    }
}
