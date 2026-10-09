using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using Crownfall.EnvironmentPresentation;
using Crownfall.Match;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace Crownfall.EnvironmentLab.Editor
{
    public static class WildernessBuildPreparation
    {
        public const string CompositionPath = "Assets/Crownfall/Environment/WildernessComposition.json";
        const string ResourceAsset = "Assets/Crownfall/Environment/Resources/CrownfallEnvironment/ShippingWilderness.asset";
        const string PrefabPath = EnvironmentPaths.Generated + "ArenaWilderness.prefab";
        const string ReportPath = "Docs/CROWNFALL_WILDERNESS_NATIVE_VALIDATION.json";
        public static WildernessLayout ReadLayout()
        {
            var layout = JsonUtility.FromJson<WildernessLayout>(File.ReadAllText(EnvironmentPaths.Absolute(CompositionPath)));
            EnvironmentPaths.Require(layout != null && layout.schemaVersion == 1 && layout.compositionVersion == WildernessLibrary.Version,
                "Shipping wilderness composition missing or stale: " + CompositionPath);
            EnvironmentPaths.Require(layout.placements != null && layout.placements.Length > 0, "Shipping wilderness has no placements");
            foreach(var row in layout.placements)
            {
                EnvironmentPaths.Require(row!=null&&!string.IsNullOrEmpty(row.name)&&!string.IsNullOrEmpty(row.model),"Unnamed/missing shipping placement or model ID");
                EnvironmentPaths.Require(row.position!=null&&row.position.Length==3&&row.scale!=null&&row.scale.Length==3,"Invalid XYZ transform arrays: "+row.name);
                EnvironmentPaths.Require(row.position.Concat(row.scale).Concat(new[]{row.yaw}).All(v=>!float.IsNaN(v)&&!float.IsInfinity(v))&&row.scale.All(v=>v>0),"Nonfinite/negative placement transform: "+row.name);
                EnvironmentPaths.Require(new[]{"NEAR","MID","FAR"}.Contains(row.layer)&&new[]{"island","pocket","exterior"}.Contains(row.zone),"Invalid layer/clearance zone: "+row.name);
            }
            return layout;
        }
        static string CompositionHash()
        {
            using (var hash = SHA256.Create()) return BitConverter.ToString(hash.ComputeHash(File.ReadAllBytes(EnvironmentPaths.Absolute(CompositionPath)))).Replace("-", "").ToLowerInvariant();
        }
        [MenuItem("Crownfall/Wilderness/Prepare and validate")]
        public static void PrepareAndValidate()
        {
            var messages = new List<string>(); bool errors = false;
            Application.LogCallback logger = (message,stack,type) => {
                if (type == LogType.Warning || type == LogType.Error || type == LogType.Exception || type == LogType.Assert) messages.Add(type + ": " + message);
                if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert) errors = true;
            };
            Application.logMessageReceived += logger;
            EnvironmentNativeValidation.RunProtected("wilderness", guard =>
            {
                WildernessLayout layout = null;
                guard.Step("wilderness lab completed", () => {
                layout = ReadLayout();
                EnvironmentPaths.Require(Application.unityVersion == layout.requiredUnityVersion, "Wilderness requires Unity " + layout.requiredUnityVersion);
                EnvironmentPaths.Require(GraphicsSettings.currentRenderPipeline == null, "Wilderness requires Built-in Render Pipeline");
                // Reuse the native import/remap/sanitization pipeline. The additive lab never enters player scene settings.
                if (layout.textureTier == "Mobile") EnvironmentAssetLab.GenerateAndValidateMobile();
                else if (layout.textureTier == "Full") EnvironmentAssetLab.GenerateAndValidate();
                else throw new InvalidOperationException("Unknown wilderness texture tier " + layout.textureTier);
                });
                guard.Step("wilderness palette save", () => ApplyPalette(EnvironmentPaths.Read()));
                guard.Step("wilderness composition save", () => GenerateComposition(layout));
                guard.Step("wilderness native validation", () => Validate());
                EnvironmentPaths.Require(!errors, "Unity logged errors during wilderness generation; inspect " + ReportPath);
            }, () => { Application.logMessageReceived -= logger; }, error => {
                WriteReport("FAIL_NATIVE_DEPENDENCIES", error.ToString(), messages.ToArray());
            });
            WriteReport("PASS_NATIVE_DEPENDENCIES", null, messages.ToArray());
            Debug.Log("Crownfall wilderness prepared and validated. No player build performed. Visual/device acceptance remains pending.");
        }
        static void WriteReport(string status, string error, string[] messages)
        {
            if (error != null) DiagnosticSafety.Attempt("primary failure log", () =>
                Debug.LogError("Crownfall wilderness primary failure: " + error), ignored => { });
            var result = new NativeReport { status=status,error=error,unityExecuted=true,playerBuildExecuted=false,warningsAndErrors=messages };
            var secondary = new List<string>();
            Action<string> record = message => {
                secondary.Add(message);
                EnvironmentNativeValidation.RecordSecondary(message);
            };
            DiagnosticSafety.Attempt("wilderness report header", () => {
                result.unityVersion=Application.unityVersion; result.utc=DateTime.UtcNow.ToString("o");
                result.compositionVersion=WildernessLibrary.Version;
                result.gpuShaderSupportChecked=SystemInfo.graphicsDeviceType!=GraphicsDeviceType.Null;
                result.graphicsDevice=SystemInfo.graphicsDeviceType.ToString();
                result.protectedFileChecks=EnvironmentNativeValidation.ProtectionChecks;
            }, record);
            DiagnosticSafety.Attempt("composition hash enrichment", () =>
                result.compositionHash=File.Exists(EnvironmentPaths.Absolute(CompositionPath))?CompositionHash():"MISSING", record);
            DiagnosticSafety.Attempt("generated prefab inspection", () => {
                var generated=AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath);
                if(generated==null)return;
                var renderers=generated.GetComponentsInChildren<MeshRenderer>(true);
                var meshes=generated.GetComponentsInChildren<MeshFilter>(true).Select(f=>f.sharedMesh).Where(m=>m!=null).ToArray();
                result.uniqueMeshes=meshes.Distinct().Count();result.meshRendererCount=renderers.Length;
                result.shadowCastingRenderers=renderers.Count(r=>r.shadowCastingMode!=ShadowCastingMode.Off);
                var materials=renderers.SelectMany(r=>r.sharedMaterials).Where(m=>m!=null).Distinct().ToArray();
                result.materialCount=materials.Length;
                result.textureCount=materials.SelectMany(m=>m.GetTexturePropertyNames().Select(n=>m.GetTexture(n))).Where(t=>t!=null).Distinct().Count();
                result.instantiatedTriangles=meshes.Sum(m=>Enumerable.Range(0,m.subMeshCount).Sum(i=>(long)m.GetIndexCount(i)/3));
            }, record);
            result.secondaryReportingFailures=secondary.Concat(EnvironmentNativeValidation.SecondaryDiagnostics).Distinct().Take(64).ToArray();
            DiagnosticSafety.Attempt("wilderness report serialization/output", () =>
                File.WriteAllText(EnvironmentPaths.Absolute(ReportPath),JsonUtility.ToJson(result,true)+"\n"), record);
        }
        [Serializable] sealed class NativeReport
        {
            public string status,error,unityVersion,compositionHash,utc,graphicsDevice;
            public int compositionVersion,uniqueMeshes,meshRendererCount,shadowCastingRenderers,materialCount,textureCount;
            public long instantiatedTriangles;
            public bool unityExecuted,playerBuildExecuted,gpuShaderSupportChecked,visualRenderApproved;
            public string[] warningsAndErrors, secondaryReportingFailures;
            public ProtectionDiffReport[] protectedFileChecks;
        }
        static void ApplyPalette(EnvironmentCatalog catalog)
        {
            foreach (var spec in catalog.materials)
            {
                var material = AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath(spec.key));
                EnvironmentPaths.Require(material != null, "Missing wilderness material " + spec.key);
                // Textured materials use multipliers. Kenney untextured colors are explicit replacements of its cyan/orange PBR palette.
                Color color = new Color(.69f,.73f,.76f,1);
                if (spec.family == "bark") color = new Color(.70f,.65f,.60f,1);
                if (spec.family == "alpha-cutout foliage") color = new Color(.76f,.86f,.66f,1);
                if (spec.key == "qn_Leaves_TwistedTree") color = new Color(.62f,.76f,.66f,1);
                if (spec.key == "kn_dirt") color = new Color(.28f,.30f,.28f,1);
                if (spec.key == "kn_grass") color = new Color(.20f,.29f,.24f,1);
                if (spec.key == "kn_woodBarkDark") color = new Color(.23f,.21f,.20f,1);
                if (spec.key == "kn_leafsDark") color = new Color(.18f,.28f,.25f,1);
                if (spec.key == "kn_stone" || spec.key == "kn_stoneDark" || spec.key == "kn__defaultMat") color = new Color(.38f,.43f,.46f,1);
                material.color = color; material.enableInstancing = true;
                if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness",.08f);
                if (material.HasProperty("_GeoTex"))
                {
                    material.SetTexture("_GeoTex",AssetDatabase.LoadAssetAtPath<Texture2D>(M15SurfacePreparation.Ground));
                    material.SetFloat("_GeoDetail",spec.key=="qn_Rocks"?.82f:spec.key.StartsWith("kn_",StringComparison.Ordinal)&&spec.family!="distant vegetation"&&spec.family!="bark"?.8f:0);
                    material.SetFloat("_AetherStrength",spec.key=="qn_Rocks"?.32f:0);
                }
                if (material.HasProperty("_Saturation")) material.SetFloat("_Saturation",spec.key=="kc_colormap"?.35f:.75f);
                EditorUtility.SetDirty(material);
            }
            EnvironmentAssetLab.SaveGeneratedAssets();
        }
        static void GenerateComposition(WildernessLayout layout)
        {
            var previous = SceneManager.GetActiveScene();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            var root = new GameObject("ArenaWilderness");
            var cleanupGuard = new PreparationSafety(phase => EnvironmentNativeValidation.CompareActiveProtection("composition scene: " + phase), message =>
                DiagnosticSafety.Attempt("composition cleanup log", () => Debug.LogWarning(message), ignored => { }));
            cleanupGuard.Run(() =>
            {
                foreach (var row in layout.placements)
                {
                    var source = AssetDatabase.LoadAssetAtPath<GameObject>(EnvironmentPaths.PrefabPath(row.model));
                    EnvironmentPaths.Require(source != null, "Required environment prefab missing: " + row.model);
                    var node = (GameObject)PrefabUtility.InstantiatePrefab(source,root.transform);
                    PrefabUtility.UnpackPrefabInstance(node,PrefabUnpackMode.Completely,InteractionMode.AutomatedAction);
                    node.name = row.name;node.transform.localPosition = row.Position;
                    node.transform.localRotation = Quaternion.Euler(0,row.yaw,0);node.transform.localScale = row.Scale;
                    foreach (var renderer in node.GetComponentsInChildren<MeshRenderer>(true))
                    {
                        renderer.shadowCastingMode = row.castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
                        renderer.receiveShadows = row.layer == "NEAR";
                        // Runtime-created hierarchy uses shared meshes/materials for GPU instancing; avoid CPU static batching/mesh copies.
                        renderer.allowOcclusionWhenDynamic = true;
                    }
                }
                var surface=M15SurfacePreparation.Generate(root.transform);
                var lighting = new GameObject("Wilderness directional key");lighting.transform.SetParent(root.transform,false);
                lighting.transform.localRotation = Quaternion.Euler(36,-48,0);
                var light = lighting.AddComponent<Light>();light.type=LightType.Directional;light.color=new Color(1,.88f,.70f);
                light.intensity=1.18f;light.shadows=LightShadows.Hard;light.shadowStrength=.68f;
                EnvironmentPaths.Require(PrefabUtility.SaveAsPrefabAsset(root,PrefabPath) != null, "Could not save shipping environment prefab");
                Directory.CreateDirectory(Path.GetDirectoryName(EnvironmentPaths.Absolute(ResourceAsset)));
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                var library=AssetDatabase.LoadAssetAtPath<WildernessLibrary>(ResourceAsset);
                if(library==null){library=ScriptableObject.CreateInstance<WildernessLibrary>();AssetDatabase.CreateAsset(library,ResourceAsset);}
                library.compositionVersion=layout.compositionVersion;library.compositionHash=CompositionHash();
                library.presentationPrefab=AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath);
                M15SurfacePreparation.Bind(library,surface);
                EditorUtility.SetDirty(library);AssetDatabase.SaveAssetIfDirty(library);
                EnvironmentAssetLab.SaveGeneratedAssets();
            }, () => {
                UnityEngine.Object.DestroyImmediate(root);
                if(previous.IsValid()&&previous.isLoaded)SceneManager.SetActiveScene(previous);
                EditorSceneManager.CloseScene(scene,true);
            }, error => { });
        }
        [MenuItem("Crownfall/Wilderness/Validate generated shipping composition")]
        public static void Validate()
        {
            var layout=ReadLayout();var catalog=EnvironmentPaths.Read();
            foreach(var texture in catalog.textures)ValidateTextureImport(texture.path);
            EnvironmentPaths.Require(Application.unityVersion==layout.requiredUnityVersion,"Wrong Unity version for shipping wilderness");
            EnvironmentPaths.Require(!EditorBuildSettings.scenes.Any(s=>s.path==EnvironmentPaths.Lab),"Environment lab must not ship");
            var library=AssetDatabase.LoadAssetAtPath<WildernessLibrary>(ResourceAsset);
            EnvironmentPaths.Require(library!=null&&library.compositionVersion==layout.compositionVersion&&library.compositionHash==CompositionHash(),"Generated wilderness catalog is missing/stale; run Prepare and validate");
            EnvironmentPaths.Require(Resources.Load<WildernessLibrary>(ArenaWildernessPresentation.ResourcePath)==library,"Shipping Resources wilderness catalog is missing/ambiguous");
            EnvironmentPaths.Require(AssetDatabase.LoadAssetAtPath<SceneAsset>("Assets/Scenes/CrownfallMatch.unity")!=null,"Shipping match scene cannot import");
            var prefab=library.presentationPrefab;
            EnvironmentPaths.Require(prefab!=null&&AssetDatabase.GetAssetPath(prefab)==PrefabPath,"Shipping wilderness prefab reference is invalid");
            EnvironmentPaths.Require(prefab.GetComponentsInChildren<Collider>(true).Length==0&&prefab.GetComponentsInChildren<Rigidbody>(true).Length==0,"Gameplay physics in presentation prefab " + PrefabPath);
            EnvironmentPaths.Require(prefab.GetComponentsInChildren<MonoBehaviour>(true).Length==0,"Gameplay scripts in wilderness prefab");
            EnvironmentPaths.Require(prefab.GetComponentsInChildren<Transform>(true).All(t=>t.gameObject.activeSelf),"Inactive required wilderness hierarchy");
            var names=new HashSet<string>();var bounds=new Dictionary<string,Bounds>();
            foreach(var row in layout.placements)
            {
                EnvironmentPaths.Require(names.Add(row.name),"Duplicate wilderness placement "+row.name);
                var model=catalog.models.FirstOrDefault(m=>m.id==row.model);
                EnvironmentPaths.Require(model!=null&&AssetDatabase.LoadAssetAtPath<GameObject>(model.path)!=null,"Required production FBX missing "+row.model);
                var node=prefab.transform.Find(row.name);
                EnvironmentPaths.Require(node!=null,"Required placement missing "+row.name);
                EnvironmentPaths.Require(Vector3.Distance(node.localPosition,row.Position)<.001f&&Vector3.Distance(node.localScale,row.Scale)<.001f&&Quaternion.Angle(node.localRotation,Quaternion.Euler(0,row.yaw,0))<.01f,"Placement transform drift "+row.name);
                var filters=node.GetComponentsInChildren<MeshFilter>(true);var renderers=node.GetComponentsInChildren<MeshRenderer>(true);
                EnvironmentPaths.Require(filters.Length>0&&renderers.Length>0,"No rendered meshes "+row.name);
                foreach(var filter in filters)EnvironmentPaths.Require(filter.sharedMesh!=null,"Missing mesh "+row.name);
                foreach(var renderer in renderers)
                {
                    EnvironmentPaths.Require(renderer.enabled&&renderer.sharedMaterials.Length==renderer.GetComponent<MeshFilter>().sharedMesh.subMeshCount,"Invalid renderer/material slots "+row.name);
                    foreach(var material in renderer.sharedMaterials)
                    {
                        EnvironmentPaths.Require(material!=null&&material.shader!=null&&(SystemInfo.graphicsDeviceType==GraphicsDeviceType.Null||material.shader.isSupported)&&!ShaderUtil.ShaderHasError(material.shader),"Missing/invalid environment material or shader "+row.name);
                        var spec=catalog.materials.FirstOrDefault(m=>EnvironmentPaths.MaterialPath(m.key)==AssetDatabase.GetAssetPath(material));
                        EnvironmentPaths.Require(spec!=null,"Untracked material "+row.name);
                        ValidateTexture(material,"_MainTex",spec.baseTexture,row.name);
                        if(spec.family!="alpha-cutout foliage"){ValidateTexture(material,"_BumpMap",spec.normalTexture,row.name);ValidateTexture(material,"_SurfaceMap",spec.surfaceTexture,row.name);}
                    }
                    EnvironmentPaths.Require(renderer.shadowCastingMode==(row.castShadows?ShadowCastingMode.On:ShadowCastingMode.Off)&&renderer.receiveShadows==(row.layer=="NEAR"),"Shadow policy drift "+row.name);
                }
                var b=EnvironmentNativeValidation.LocalBounds(node.gameObject);
                // LocalBounds excludes the placement transform; include it explicitly to get authored world AABB.
                b=TransformBounds(b,Matrix4x4.TRS(row.Position,Quaternion.Euler(0,row.yaw,0),row.Scale));
                ValidateClearance(row,b);
                EnvironmentPaths.Require(PotentiallyVisible(b),"Placement permanently outside fixed camera bounds: "+row.name);bounds.Add(row.name,b);
            }
            EnvironmentPaths.Require(prefab.transform.childCount==layout.placements.Length+2,"Unexpected/missing shipping environment nodes");
            var lights=prefab.GetComponentsInChildren<Light>(true);
            EnvironmentPaths.Require(lights.Length==1&&lights[0].type==LightType.Directional,"Wilderness lighting must use one directional key");
            foreach(var c in prefab.GetComponentsInChildren<Component>(true))EnvironmentPaths.Require(c is Transform||c is MeshFilter||c is MeshRenderer||c is Light,"Unexpected/missing presentation component "+(c==null?"Missing script":c.GetType().Name));
            ValidateLayers(layout,bounds);
            M15SurfacePreparation.Validate(library);
        }
        public static void ValidateTextureImport(string path)
        {
            var row=EnvironmentPaths.Read().textures.FirstOrDefault(t=>t.path==path);
            EnvironmentPaths.Require(row!=null,"Untracked external texture import: "+path);
            var importer=AssetImporter.GetAtPath(path) as TextureImporter;
            EnvironmentPaths.Require(importer!=null&&AssetDatabase.LoadAssetAtPath<Texture2D>(path)!=null,"Required texture cannot import: "+path);
            EnvironmentPaths.Require(!importer.isReadable&&importer.mipmapEnabled&&!importer.streamingMipmaps&&importer.npotScale==TextureImporterNPOTScale.None&&importer.maxTextureSize==row.maxSize,"3D texture mip/residency policy: "+path);
            EnvironmentPaths.Require(importer.textureType==(row.kind=="normal"?TextureImporterType.NormalMap:TextureImporterType.Default)&&importer.sRGBTexture==(row.kind=="color"||row.kind=="cutout"),"3D texture type/color space: "+path);
            EnvironmentPaths.Require(importer.alphaSource==(row.hasAlpha?TextureImporterAlphaSource.FromInput:TextureImporterAlphaSource.None)&&importer.alphaIsTransparency==row.hasAlpha&&importer.mipMapsPreserveCoverage==row.hasAlpha&&Mathf.Abs(importer.alphaTestReferenceValue-row.alphaCutoff)<.00001f,"3D foliage coverage policy: "+path);
            EnvironmentPaths.Require(importer.wrapMode==(row.wrap=="Repeat"?TextureWrapMode.Repeat:TextureWrapMode.Clamp)&&importer.filterMode==FilterMode.Trilinear&&importer.anisoLevel==2,"3D texture sampling policy: "+path);
            var web=importer.GetPlatformTextureSettings("WebGL");
            EnvironmentPaths.Require(web.overridden&&web.maxTextureSize==EnvironmentPaths.WebSize(row)&&web.format==TextureImporterFormat.ASTC_6x6,"3D WebGL import policy: "+path);
        }
        static void ValidateTexture(Material material,string property,string path,string placement)
        {
            var texture=material.GetTexture(property);
            EnvironmentPaths.Require(string.IsNullOrEmpty(path)?texture==null:texture!=null&&AssetDatabase.GetAssetPath(texture)==path&&AssetDatabase.LoadAssetAtPath<Texture2D>(path)!=null,"Missing/wrong texture "+placement+" "+property+" expected "+path);
        }
        static Bounds TransformBounds(Bounds b,Matrix4x4 matrix)
        {
            var result=new Bounds(matrix.MultiplyPoint3x4(b.center),Vector3.zero);
            for(int i=0;i<8;i++)result.Encapsulate(matrix.MultiplyPoint3x4(b.center+Vector3.Scale(b.extents,new Vector3((i&1)==0?-1:1,(i&2)==0?-1:1,(i&4)==0?-1:1))));
            return result;
        }
        static void ValidateClearance(WildernessPlacement row,Bounds b)
        {
            bool outside=b.max.x<=-34||b.min.x>=34||b.max.z<=-32||b.min.z>=32;
            bool island=MatchMap.Walls.Any(w=>b.min.x>=w.X-w.Width/2-.002&&b.max.x<=w.X+w.Width/2+.002&&b.min.z>=w.Z-w.Depth/2-.002&&b.max.z<=w.Z+w.Depth/2+.002);
            EnvironmentPaths.Require((row.zone=="island"&&island)||(row.zone=="exterior"&&outside)||(row.zone=="pocket"&&(b.max.z<=-12.5f||b.min.z>=12.5f)),"Invalid wilderness presentation clearance: "+row.name+" bounds "+b);
            EnvironmentPaths.Require(b.max.z<=-12||b.min.z>=12||b.max.x<=-34||b.min.x>=34,"Wilderness enters protected lane: "+row.name);
            // Keep camps/Major and their lane approaches open, irrespective of decorative collision policy.
            foreach(var camp in new[]{new Vector3(-22,2.4f,-22),new Vector3(22,2.4f,-22),new Vector3(-18,2.4f,24),new Vector3(18,2.4f,24),new Vector3(-7,2.4f,-27),new Vector3(7,2.4f,-27),new Vector3(0,3.5f,26)})
            {
                float dx=Mathf.Max(b.min.x-camp.x,0,camp.x-b.max.x),dz=Mathf.Max(b.min.z-camp.z,0,camp.z-b.max.z);
                EnvironmentPaths.Require(dx*dx+dz*dz>=camp.y*camp.y,"Camp/Major presentation clearance: "+row.name);
            }
            foreach(var route in new[]{new Vector4(-22,-17,5,10),new Vector4(22,-17,5,10),new Vector4(-18,18,5,12),new Vector4(18,18,5,12),new Vector4(-7,-19.5f,4,15),new Vector4(7,-19.5f,4,15),new Vector4(0,19,8,14)})
                EnvironmentPaths.Require(!(b.min.x<route.x+route.z/2&&b.max.x>route.x-route.z/2&&b.min.z<route.y+route.w/2&&b.max.z>route.y-route.w/2),"Protected camp approach: "+row.name);
            if(row.layer=="NEAR"&&b.center.z<0&&(row.zone=="island"||row.zone=="pocket"))EnvironmentPaths.Require(b.max.y<=6.8f,"Southern island crown could obscure lane: "+row.name);
        }
        static bool PotentiallyVisible(Bounds b)
        {
            float pitch=(float)CameraFraming.Pitch,h=(float)CameraFraming.HalfHeight,height=(float)CameraFraming.Height;
            float s=Mathf.Sin(pitch*Mathf.Deg2Rad),c=Mathf.Cos(pitch*Mathf.Deg2Rad),offset=height/Mathf.Tan(pitch*Mathf.Deg2Rad);
            foreach(float actorX in new[]{-30f,0,30f})foreach(float actorZ in new[]{-27f,-12,-6,0,6,12,26f})
            {
                float x=(float)CameraFraming.CenterX(actorX,16.0/9),z=(float)CameraFraming.CenterZ(actorZ);
                float lo=(b.min.z-z)*s+b.min.y*c,hi=(b.max.z-z)*s+b.max.y*c;
                float near=(b.min.z-z+offset)*c-(b.max.y-height)*s,far=(b.max.z-z+offset)*c-(b.min.y-height)*s;
                if(b.min.x<x+h*16/9&&b.max.x>x-h*16/9&&lo<h&&hi>-h&&near<150&&far>.1f)return true;
            }
            return false;
        }
        static void ValidateLayers(WildernessLayout layout,Dictionary<string,Bounds> bounds)
        {
            foreach(var layer in new[]{"NEAR","MID","FAR"})EnvironmentPaths.Require(layout.placements.Count(p=>p.layer==layer)>=6,"Missing substantial "+layer+" wilderness layer");
            foreach(var side in new[]{-1,1})
            {
                var near=layout.placements.Where(p=>p.layer=="NEAR"&&(p.zone=="island"||p.zone=="pocket")&&Math.Sign(p.position[2])==side).ToArray();
                EnvironmentPaths.Require(near.Length>=6&&near.Count(p=>bounds[p.name].size.y>=3)>=2,"Near vertical wilderness missing on lane side "+side);
                float center=(float)CameraFraming.CenterZ(side*6),h=(float)CameraFraming.HalfHeight;
                float s=Mathf.Sin((float)CameraFraming.Pitch*Mathf.Deg2Rad),c=Mathf.Cos((float)CameraFraming.Pitch*Mathf.Deg2Rad);
                EnvironmentPaths.Require(near.Count(p=>bounds[p.name].min.x<h*16/9&&bounds[p.name].max.x>-h*16/9&&
                    (bounds[p.name].min.z-center)*s+bounds[p.name].min.y*c<h&&
                    (bounds[p.name].max.z-center)*s+bounds[p.name].max.y*c>-h)>=2,"Near wilderness outside ordinary camera-visible band on side "+side);
            }
            EnvironmentPaths.Require(layout.placements.Select(p=>p.yaw).Distinct().Count()>=20,"Wilderness rotation variation collapsed");
        }
    }
}
