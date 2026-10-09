using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace Crownfall.EnvironmentLab.Editor
{
    public static class EnvironmentAssetLab
    {
        [MenuItem("Crownfall/Environment Lab/Generate and validate (full textures)")]
        public static void GenerateAndValidate() { Generate("Full"); }
        [MenuItem("Crownfall/Environment Lab/Generate and validate (mobile texture limits)")]
        public static void GenerateAndValidateMobile() { Generate("Mobile"); }
        [MenuItem("Crownfall/Environment Lab/Validate generated library")]
        public static void ValidateGenerated() { EnvironmentNativeValidation.Validate(); }

        static void Generate(string tier)
        {
            var catalog = EnvironmentPaths.Read();
            EnvironmentPaths.Require(Application.unityVersion == catalog.requiredUnityVersion, "Required Editor " + catalog.requiredUnityVersion);
            EnvironmentPaths.Require(GraphicsSettings.currentRenderPipeline == null, "Built-in Render Pipeline required");
            EnvironmentPaths.Require(!EditorApplication.isPlayingOrWillChangePlaymode, "Run in edit mode");
            var messages = new List<string>();
            bool hasErrors = false;
            Application.LogCallback logger = (message, stack, type) =>
            {
                if (type == LogType.Warning || type == LogType.Error || type == LogType.Exception || type == LogType.Assert)
                    messages.Add(type + ": " + message);
                if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert) hasErrors = true;
            };
            Application.logMessageReceived += logger;
            var previous = SceneManager.GetActiveScene();
            Scene lab = default(Scene);
            EnvironmentNativeValidation.RunProtected("environment lab", guard =>
            {
                guard.Step("lab saved-scene bootstrap", () => {
                // Cloud Build starts in an untitled scene. Unity 6 rejects additive scenes until
                // that scene is replaced with a saved scene; never discard a user's Editor scene.
                if (Application.isBatchMode && string.IsNullOrEmpty(previous.path))
                {
                    const string shippingScene = "Assets/Scenes/CrownfallMatch.unity";
                    EnvironmentPaths.Require(SceneManager.sceneCount == 1 &&
                        AssetDatabase.LoadAssetAtPath<SceneAsset>(shippingScene) != null,
                        "Batch environment preparation requires a single untitled scene and the saved Crownfall match scene");
                    var opened = EditorSceneManager.OpenScene(shippingScene, OpenSceneMode.Single);
                    EnvironmentPaths.Require(opened.IsValid() && opened.isLoaded && opened.path == shippingScene,
                        "Could not establish saved shipping scene before additive environment generation");
                    previous = opened;
                }
                });
                guard.Step("lab synchronous refresh", () => {
                EditorPrefs.SetString(EnvironmentPaths.TierKey, tier);
                Directory.CreateDirectory(EnvironmentPaths.Absolute(EnvironmentPaths.Generated + "Materials"));
                Directory.CreateDirectory(EnvironmentPaths.Absolute(EnvironmentPaths.Generated + "Prefabs"));
                Directory.CreateDirectory(Path.GetDirectoryName(EnvironmentPaths.Absolute(EnvironmentPaths.Lab)));
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                });
                guard.Step("lab texture import", () => {
                foreach (var texture in catalog.textures)
                    AssetDatabase.ImportAsset(texture.path, ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
                });
                guard.Step("lab generated material save", () => {
                foreach (var spec in catalog.materials) CreateMaterial(spec);
                SaveGeneratedAssets();
                });
                guard.Step("lab FBX remap/reimport", () => {
                foreach (var row in catalog.models)
                {
                    var importer = AssetImporter.GetAtPath(row.path) as ModelImporter;
                    EnvironmentPaths.Require(importer != null, "FBX importer unavailable: " + row.path);
                    foreach (var binding in row.bindings)
                        importer.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material), binding.sourceName),
                            AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath(binding.materialKey)));
                    importer.SaveAndReimport();
                }
                });
                guard.Step("lab scene/prefab save", () => {
                // All temporary objects live in an additive lab scene, never in the active shipping scene.
                var existingLab = SceneManager.GetSceneByPath(EnvironmentPaths.Lab);
                if (existingLab.IsValid() && existingLab.isLoaded) EditorSceneManager.CloseScene(existingLab, true);
                lab = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
                SceneManager.SetActiveScene(lab);
                foreach (var row in catalog.models) CreatePresentationPrefab(row);
                PopulateLab(catalog);
                // Keep an additive inspection camera well away from any loaded arena.
                foreach (var root in lab.GetRootGameObjects()) root.transform.position += new Vector3(1000,0,1000);
                EnvironmentPaths.Require(!EditorBuildSettings.scenes.Any(s => s.path == EnvironmentPaths.Lab), "Lab cannot enter build settings");
                EnvironmentPaths.Require(EditorSceneManager.SaveScene(lab, EnvironmentPaths.Lab), "Could not save lab scene");
                SaveGeneratedAssets();
                });
                guard.Step("lab native validation", () => {
                EnvironmentPaths.Require(!hasErrors, "Import/generation errors; see native report");
                EnvironmentNativeValidation.Validate(messages.ToArray());
                });
                Debug.Log("Environment lab generated and validated with " + tier + " texture limits. No player build executed.");
            }, () => {
                Application.logMessageReceived -= logger;
                if (previous.IsValid() && previous.isLoaded) SceneManager.SetActiveScene(previous);
                if (Application.isBatchMode && lab.IsValid() && lab.isLoaded) EditorSceneManager.CloseScene(lab, true);
            }, error => EnvironmentNativeValidation.WriteFailure(error.ToString(), messages.ToArray()));
        }

        // Save only owned generated assets, never unrelated dirty gameplay/art/settings.
        internal static void SaveGeneratedAssets()
        {
            foreach (string guid in AssetDatabase.FindAssets("", new[] { EnvironmentPaths.Generated.TrimEnd('/') }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (AssetDatabase.IsValidFolder(path)) continue;
                EnvironmentPaths.Require(path.StartsWith(EnvironmentPaths.Generated, StringComparison.Ordinal),
                    "Unexpected generated save path: " + path);
                var asset = AssetDatabase.LoadMainAssetAtPath(path);
                EnvironmentPaths.Require(asset != null, "Generated asset cannot be loaded for save: " + path);
                AssetDatabase.SaveAssetIfDirty(asset);
            }
        }

        static void CreateMaterial(EnvironmentMaterial spec)
        {
            bool cutout = spec.family == "alpha-cutout foliage";
            var shader = Shader.Find(cutout ? "Crownfall/Environment/Cutout" : "Crownfall/Environment/Lit");
            EnvironmentPaths.Require(shader != null && !ShaderUtil.ShaderHasError(shader), "Shader missing or has compile errors: " + spec.key);
            var path = EnvironmentPaths.MaterialPath(spec.key);
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(shader); AssetDatabase.CreateAsset(material, path); }
            material.shader = shader;
            material.name = spec.key;
            material.color = new Color(spec.color[0], spec.color[1], spec.color[2], spec.color[3]);
            material.enableInstancing = spec.enableInstancing;
            SetTexture(material, "_MainTex", spec.baseTexture);
            if (cutout) material.SetFloat("_Cutoff", spec.cutoff);
            else
            {
                SetTexture(material, "_BumpMap", spec.normalTexture);
                SetTexture(material, "_SurfaceMap", spec.surfaceTexture);
                material.SetFloat("_SurfaceMode", spec.surfaceMode);
                material.SetFloat("_Glossiness", spec.smoothness);
                material.SetFloat("_Cull", spec.cull);
            }
            EditorUtility.SetDirty(material);
        }
        static void SetTexture(Material material, string property, string path)
        {
            if (string.IsNullOrEmpty(path)) { material.SetTexture(property, null); return; }
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            EnvironmentPaths.Require(texture != null, "Missing shared texture: " + path);
            material.SetTexture(property, texture);
        }

        static void CreatePresentationPrefab(EnvironmentModel row)
        {
            var source = AssetDatabase.LoadAssetAtPath<GameObject>(row.path);
            EnvironmentPaths.Require(source != null, "Native FBX import failed: " + row.id);
            var root = new GameObject(row.id.Replace(':', '_'));
            var temporary = new PreparationSafety(phase => EnvironmentNativeValidation.CompareActiveProtection("presentation prefab: " + phase), message =>
                DiagnosticSafety.Attempt("prefab cleanup log", () => Debug.LogWarning(message), ignored => { }));
            temporary.Run(() =>
            {
                var scale = new GameObject("PresentationScale"); scale.transform.SetParent(root.transform, false);
                var visual = (GameObject)PrefabUtility.InstantiatePrefab(source);
                visual.transform.SetParent(scale.transform, false);
                PrefabUtility.UnpackPrefabInstance(visual, PrefabUnpackMode.Completely, InteractionMode.AutomatedAction);
                visual.SetActive(false);
                // FBX static presentation has no permitted gameplay/physics/script components.
                EnvironmentPaths.Require(visual.GetComponentsInChildren<SkinnedMeshRenderer>(true).Length == 0, "Unexpected skinned mesh: " + row.id);
                foreach (var component in visual.GetComponentsInChildren<Component>(true))
                    if (!(component is Transform) && !(component is MeshFilter) && !(component is MeshRenderer))
                        UnityEngine.Object.DestroyImmediate(component);
                foreach (var renderer in visual.GetComponentsInChildren<MeshRenderer>(true))
                {
                    var filter = renderer.GetComponent<MeshFilter>();
                    EnvironmentPaths.Require(filter != null && filter.sharedMesh != null && filter.sharedMesh.subMeshCount > 0,
                        "Missing rendered mesh: " + row.id);
                    var sourceMaterials = renderer.sharedMaterials;
                    EnvironmentPaths.Require(sourceMaterials.Length >= filter.sharedMesh.subMeshCount,
                        "FBX has fewer material slots than submeshes: " + row.id);
                    // Some FBX importers retain an unused default slot. Extra slots redraw the last submesh;
                    // discard only that surplus, never invent a material for a required submesh.
                    renderer.sharedMaterials = sourceMaterials.Take(filter.sharedMesh.subMeshCount).Select(material =>
                    {
                        EnvironmentPaths.Require(material != null, "Null source material: " + row.id);
                        var mapped = row.bindings.FirstOrDefault(b => b.materialKey == material.name ||
                            b.sourceName == EnvironmentPaths.CleanMaterialName(material.name));
                        EnvironmentPaths.Require(mapped != null, "Unmapped FBX material " + material.name + " in " + row.id);
                        var result = AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath(mapped.materialKey));
                        EnvironmentPaths.Require(result != null, "Shared material unavailable: " + mapped.materialKey);
                        return result;
                    }).ToArray();
                    renderer.shadowCastingMode = row.castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
                    renderer.receiveShadows = row.group != "DISTANT";
                }
                visual.SetActive(true);
                var bounds = EnvironmentNativeValidation.LocalBounds(root);
                EnvironmentNativeValidation.CheckSize(row, bounds.size, 1);
                visual.transform.localPosition -= new Vector3(bounds.center.x, bounds.min.y, bounds.center.z);
                scale.transform.localScale = Vector3.one * row.presentationScale;
                EnvironmentPaths.Require(root.GetComponentsInChildren<Collider>(true).Length == 0, "Collider survived presentation sanitization");
                EnvironmentPaths.Require(PrefabUtility.SaveAsPrefabAsset(root, EnvironmentPaths.PrefabPath(row.id)) != null, "Prefab save failed");
            }, () => UnityEngine.Object.DestroyImmediate(root), error => { });
        }

        static GameObject Primitive(string name, PrimitiveType type, Vector3 position, Vector3 scale, Material material)
        {
            var result = GameObject.CreatePrimitive(type);
            result.name = name;
            foreach (var collider in result.GetComponents<Collider>()) UnityEngine.Object.DestroyImmediate(collider);
            result.transform.position = position; result.transform.localScale = scale;
            result.GetComponent<Renderer>().sharedMaterial = material;
            return result;
        }
        static Material LabMaterial(string key, Color color)
        {
            var path = EnvironmentPaths.MaterialPath(key);
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null) { material = new Material(Shader.Find("Crownfall/Environment/Lit")); AssetDatabase.CreateAsset(material, path); }
            material.color = color; material.SetFloat("_Glossiness", 0); EditorUtility.SetDirty(material);
            return material;
        }
        static void PopulateLab(EnvironmentCatalog catalog)
        {
            var ground = LabMaterial("__lab_ground", new Color(0.32f, 0.34f, 0.36f));
            var reference = LabMaterial("__lab_reference", new Color(0.8f, 0.8f, 0.8f));
            Primitive("Neutral reference ground", PrimitiveType.Cube, new Vector3(0,-0.1f,30), new Vector3(240,0.2f,220), ground);
            var lightObject = new GameObject("Neutral directional light");
            var light = lightObject.AddComponent<Light>(); light.type = LightType.Directional;
            light.color = Color.white; light.intensity = 1; light.shadows = LightShadows.Soft;
            lightObject.transform.rotation = Quaternion.Euler(50,-30,0);
            RenderSettings.ambientMode = AmbientMode.Flat; RenderSettings.ambientLight = new Color(0.45f,0.45f,0.45f);
            RenderSettings.skybox = null; RenderSettings.fog = false;
            var cameraObject = new GameObject("Lab camera: 50 degree elevated view");
            var camera = cameraObject.AddComponent<Camera>(); camera.orthographic = true; camera.orthographicSize = 130;
            camera.nearClipPlane = 0.3f; camera.farClipPlane = 600;
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(0.18f,0.20f,0.23f);
            cameraObject.transform.position = new Vector3(0,175,-115);
            cameraObject.transform.rotation = Quaternion.Euler(50,0,0);
            string[] groups = {"HERO / NEAR", "MIDGROUND", "DISTANT", "STRUCTURAL"};
            for (int group = 0; group < groups.Length; group++)
            {
                var parent = new GameObject(groups[group]);
                Vector3 origin = new Vector3(group % 2 == 0 ? -55 : 55,0,group < 2 ? -45 : 65);
                var rows = catalog.models.Where(m => m.group == groups[group]).ToArray();
                for (int i = 0; i < rows.Length; i++)
                {
                    var position = origin + new Vector3((i%3-1)*24,0,(i/3)*24);
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(EnvironmentPaths.PrefabPath(rows[i].id));
                    var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                    instance.transform.SetParent(parent.transform,false); instance.transform.position = position;
                    var marker = Primitive("1.8 m reference: " + rows[i].id, PrimitiveType.Capsule,
                        position + new Vector3(-8,0.9f,0), new Vector3(0.5f,0.9f,0.5f), reference);
                    marker.transform.SetParent(parent.transform,true);
                    var labelObject = new GameObject(rows[i].id + " label"); labelObject.transform.SetParent(parent.transform,false);
                    labelObject.transform.position = position + new Vector3(-8,0.15f,-6);
                    var label = labelObject.AddComponent<TextMesh>(); label.text = rows[i].id + "\n" + rows[i].group;
                    label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); label.fontSize = 48; label.characterSize = 0.35f;
                    label.color = Color.white; label.anchor = TextAnchor.MiddleCenter;
                    label.GetComponent<MeshRenderer>().sharedMaterial = label.font.material;
                    labelObject.transform.rotation = Quaternion.LookRotation(labelObject.transform.position-cameraObject.transform.position,Vector3.up);
                }
            }
            foreach (var root in SceneManager.GetActiveScene().GetRootGameObjects())
                EnvironmentPaths.Require(root.GetComponentsInChildren<Collider>(true).Length == 0, "Lab contains collider: " + root.name);
        }
    }
}
