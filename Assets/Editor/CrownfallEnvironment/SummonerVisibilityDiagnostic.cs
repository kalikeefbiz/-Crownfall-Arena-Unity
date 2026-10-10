using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Crownfall.Match;

namespace Crownfall.EnvironmentLab.Editor
{
    // Synchronous capture of the actual running match. Each isolation changes just one
    // rendering variable, then restores it. No gameplay transforms or source assets change.
    public static class SummonerVisibilityDiagnostic
    {
        [Serializable] sealed class Subject
        {
            public string name, sprite, material, shader;
            public bool alive, enabled, active, shaderSupported, cameraIncludesLayer;
            public Vector3 position, viewport, boundsMin, boundsMax;
            public int normalPixels, withoutOpaquePixels;
        }
        [Serializable] sealed class Report
        {
            public string unityVersion, graphicsDevice, graphicsApi;
            public bool orthographic;
            public float aspect;
            public Vector3 cameraPosition, cameraEuler;
            public Subject[] subjects;
        }
        static Color32[] Capture(Camera camera,RenderTexture target,string path=null)
        {
            camera.Render();
            var previous=RenderTexture.active;RenderTexture.active=target;
            var pixels=new Texture2D(target.width,target.height,TextureFormat.RGBA32,false);
            try
            {
                pixels.ReadPixels(new Rect(0,0,target.width,target.height),0,0);pixels.Apply();
                if(path!=null)File.WriteAllBytes(path,pixels.EncodeToPNG());
                return pixels.GetPixels32();
            }
            finally {RenderTexture.active=previous;UnityEngine.Object.DestroyImmediate(pixels);}
        }
        static int Difference(Color32[] a,Color32[] b)
        {
            int count=0;
            for(int i=0;i<a.Length;i++)
                if(Math.Abs(a[i].r-b[i].r)+Math.Abs(a[i].g-b[i].g)+Math.Abs(a[i].b-b[i].b)>24)count++;
            return count;
        }
        [MenuItem("Crownfall/Camera recovery/Capture live Summoner isolation")]
        public static void CaptureLiveMatch()
        {
            if(!EditorApplication.isPlaying||Application.unityVersion!="6000.3.10f1"||SystemInfo.graphicsDeviceType==GraphicsDeviceType.Null)
                throw new InvalidOperationException("Run a match in Unity 6000.3.10f1 with GPU rendering; null-device captures are not evidence.");
            var actors=UnityEngine.Object.FindObjectsByType<MatchActorView>(FindObjectsSortMode.None)
                .Where(v=>v.Actor!=null&&v.Actor.Kind==EntityKind.Summoner).OrderBy(v=>v.Actor.Id).ToArray();
            if(actors.Length!=6)throw new InvalidOperationException("Expected the six live match entities, including dead Summoners.");
            var camera=Camera.main;
            if(camera==null)throw new InvalidOperationException("Match camera absent");
            var renderers=UnityEngine.Object.FindObjectsByType<Renderer>(FindObjectsSortMode.None);
            var enabled=renderers.Select(r=>r.enabled).ToArray();
            var originalTarget=camera.targetTexture;float originalAspect=camera.aspect;
            var target=new RenderTexture(1950,900,24,RenderTextureFormat.ARGB32);
            string directory=Path.Combine("Logs","CameraRecovery",DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));
            Directory.CreateDirectory(directory);
            var report=new Report {unityVersion=Application.unityVersion,graphicsDevice=SystemInfo.graphicsDeviceName,
                graphicsApi=SystemInfo.graphicsDeviceType.ToString(),orthographic=camera.orthographic,aspect=1950f/900,
                cameraPosition=camera.transform.position,cameraEuler=camera.transform.eulerAngles,subjects=new Subject[6]};
            try
            {
                camera.targetTexture=target;camera.aspect=1950f/900;
                var sprites=actors.Select(a=>a.GetComponentInChildren<SpriteRenderer>(true)).ToArray();
                for(int i=0;i<6;i++)
                {
                    var sprite=sprites[i];var material=sprite==null?null:sprite.sharedMaterial;
                    report.subjects[i]=new Subject {name=actors[i].name,alive=actors[i].Actor.Alive,
                        enabled=sprite!=null&&sprite.enabled,active=sprite!=null&&sprite.gameObject.activeInHierarchy,
                        sprite=sprite==null||sprite.sprite==null?"MISSING":AssetDatabase.GetAssetPath(sprite.sprite),
                        material=material==null?"MISSING":AssetDatabase.GetAssetPath(material),
                        shader=material==null||material.shader==null?"MISSING":material.shader.name,
                        shaderSupported=material!=null&&material.shader!=null&&material.shader.isSupported,
                        cameraIncludesLayer=sprite!=null&&(camera.cullingMask&(1<<sprite.gameObject.layer))!=0,
                        position=actors[i].transform.position,viewport=camera.WorldToViewportPoint(actors[i].transform.position),
                        boundsMin=sprite==null?Vector3.zero:sprite.bounds.min,boundsMax=sprite==null?Vector3.zero:sprite.bounds.max};
                }
                for(int phase=0;phase<2;phase++)
                {
                    if(phase==1)
                        foreach(var renderer in renderers)
                            if(renderer.sharedMaterials.Any(m=>m!=null&&m.renderQueue<=2500))renderer.enabled=false;
                    var baseline=Capture(camera,target,Path.Combine(directory,phase==0?"normal.png":"opaque-disabled.png"));
                    for(int i=0;i<6;i++)
                    {
                        var sprite=sprites[i];if(sprite==null)continue;
                        bool wasEnabled=sprite.enabled;sprite.enabled=false;
                        int difference=Difference(baseline,Capture(camera,target));sprite.enabled=wasEnabled;
                        if(phase==0)report.subjects[i].normalPixels=difference;
                        else report.subjects[i].withoutOpaquePixels=difference;
                    }
                }
                File.WriteAllText(Path.Combine(directory,"isolation.json"),JsonUtility.ToJson(report,true));
                Debug.Log("Summoner isolation captured at "+directory+". Zero normal pixels with positive opaque-disabled pixels implicates depth occlusion; zero in both requires checking bounds, alpha, shader and culling. Offscreen/dead subjects are not visibility failures.");
            }
            finally
            {
                for(int i=0;i<renderers.Length;i++)if(renderers[i]!=null)renderers[i].enabled=enabled[i];
                camera.targetTexture=originalTarget;camera.aspect=originalAspect;
                target.Release();UnityEngine.Object.DestroyImmediate(target);
            }
        }
    }
}
