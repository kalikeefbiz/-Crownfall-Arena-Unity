using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace Crownfall.EnvironmentPresentation
{
    [Serializable] public sealed class WildernessLayout
    {
        public int schemaVersion, compositionVersion;
        public string requiredUnityVersion, textureTier;
        public WildernessPlacement[] placements;
    }
    [Serializable] public sealed class WildernessPlacement
    {
        public string name, model, layer, role, zone;
        public float[] position, scale;
        public float yaw;
        public bool castShadows;
        public Vector3 Position { get { return new Vector3(position[0],position[1],position[2]); } }
        public Vector3 Scale { get { return new Vector3(scale[0],scale[1],scale[2]); } }
    }

    public sealed class ArenaWildernessPresentation : IDisposable
    {
        public const string ResourcePath = "CrownfallEnvironment/ShippingWilderness";
        readonly GameObject root;
        readonly Camera view;
        readonly WildernessLibrary library;
        readonly Color previousAmbient;
        readonly AmbientMode previousAmbientMode;
        readonly Color previousSky,previousEquator,previousGround,previousFogColor;
        readonly bool previousFog;
        readonly FogMode previousFogMode;
        readonly float previousFogStart,previousFogEnd;
        Transform[] subjects = new Transform[0];
        readonly Vector4[] visibilityCenters = new Vector4[6];
        public ArenaWildernessPresentation(Transform parent, Camera camera)
        {
            view = camera;
            library = Resources.Load<WildernessLibrary>(ResourcePath);
            if (library == null || library.compositionVersion != WildernessLibrary.Version || library.presentationPrefab == null || library.worldSurface == null || library.retainingStone == null || library.laneStone == null || library.laneNormal == null || library.groundDetail == null || library.forestFloor == null)
                throw new InvalidOperationException("Crownfall wilderness is not generated. Run Crownfall/Wilderness/Prepare and validate in Unity 6000.3.10f1.");
            root = UnityEngine.Object.Instantiate(library.presentationPrefab,parent,false);
            root.name = "Crownfall 3D wilderness (presentation only)";
            previousAmbient=RenderSettings.ambientLight;previousAmbientMode=RenderSettings.ambientMode;
            previousSky=RenderSettings.ambientSkyColor;previousEquator=RenderSettings.ambientEquatorColor;previousGround=RenderSettings.ambientGroundColor;
            previousFog=RenderSettings.fog;previousFogMode=RenderSettings.fogMode;previousFogColor=RenderSettings.fogColor;previousFogStart=RenderSettings.fogStartDistance;previousFogEnd=RenderSettings.fogEndDistance;
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.27f,.36f,.40f);RenderSettings.ambientEquatorColor=new Color(.17f,.23f,.22f);RenderSettings.ambientGroundColor=new Color(.10f,.12f,.085f);
            RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;RenderSettings.fogColor=new Color(.12f,.19f,.21f);RenderSettings.fogStartDistance=38;RenderSettings.fogEndDistance=105;
            Camera.onPreCull += PrepareVisibility;
            // Defense in depth: the prebuild gate rejects these, even when disabled.
            foreach (var collider in root.GetComponentsInChildren<Collider>(true))
            { collider.enabled = false; UnityEngine.Object.Destroy(collider); }
            foreach (var body in root.GetComponentsInChildren<Rigidbody>(true))
                UnityEngine.Object.Destroy(body);
            // Lower quality levels retain every mesh and the composition, but remove environment shadow work.
            if (QualitySettings.shadows == ShadowQuality.Disable)
                foreach (var renderer in root.GetComponentsInChildren<MeshRenderer>(true))
                { renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false; }
            var key=root.GetComponentInChildren<Light>();
            if(key!=null)key.shadows=QualitySettings.shadows==ShadowQuality.Disable?LightShadows.None:
                QualitySettings.shadowResolution>=ShadowResolution.High?LightShadows.Soft:LightShadows.Hard;
        }
        public void BindGround(Renderer floor,Renderer lane)
        {
            floor.sharedMaterial=library.worldSurface;lane.sharedMaterial=library.worldSurface;
            floor.enabled=false; // Its collider is unchanged; a renderer-only sheet removes the box side faces.
            floor.shadowCastingMode=ShadowCastingMode.Off;lane.shadowCastingMode=ShadowCastingMode.Off;
            // Preserve a visible marker for every authoritative wall; all transforms/colliders remain unchanged.
            foreach(Transform node in floor.transform.parent)
            {
                var backdrop=node.GetComponent<SpriteRenderer>();
                if(backdrop!=null&&(node.name.StartsWith("Forest ",StringComparison.Ordinal)||node.name.StartsWith("Waterfall ",StringComparison.Ordinal)))
                    backdrop.color=new Color(.75f,.80f,.76f,1);
                if(node.name=="Wilderness island")
                {
                    var renderer=node.GetComponent<MeshRenderer>();if(renderer==null)continue;
                    renderer.sharedMaterial=library.retainingStone;renderer.shadowCastingMode=ShadowCastingMode.Off;
                }
                else if(node.name.EndsWith("boundary",StringComparison.Ordinal))
                {
                    var renderer=node.GetComponent<MeshRenderer>();if(renderer==null)continue;
                    renderer.enabled=false; // Replace engineering cubes visually; their original colliders remain active.
                }
            }
        }
        public void BindStone(Material territory)
        {territory.SetTexture("_StoneTex",library.laneStone);territory.SetTexture("_StoneNormal",library.laneNormal);territory.SetTexture("_GroundTex",library.groundDetail);territory.SetTexture("_ForestTex",library.forestFloor);}
        public void BindVisibilitySubjects(Transform[] presentationRoots)
        {
            subjects=presentationRoots;
            foreach(Transform node in root.transform.parent)
                if(node.name=="Blue territory"||node.name=="Red territory"||node.name=="Authoritative territorial front")
                {var groundRenderer=node.GetComponent<MeshRenderer>();if(groundRenderer!=null)groundRenderer.shadowCastingMode=ShadowCastingMode.Off;}
            foreach(var subject in subjects)
            {
                // Existing overlay discs were below the opaque territory top (Y=.02).
                // Keep artwork/controllers untouched and markers above this shared transparent shadow.
                var contact=subject.Find("Contact shadow");if(contact==null)continue;
                var point=contact.localPosition;point.y=(float)WorldContinuation.ContactShadowHeight;contact.localPosition=point;
                var renderer=contact.GetComponent<MeshRenderer>();if(renderer!=null)renderer.sortingOrder=-20;
            }
        }
        void PrepareVisibility(Camera camera)
        {
            if (camera != view) return;
            // Pure presentation transforms. Protect all six Summoners even when camera clamping places them off-center.
            int count = Mathf.Min(6,subjects.Length);
            for (int i=0;i<count;i++)
            {
                var subject=subjects[i];
                if(subject==null||!subject.gameObject.activeInHierarchy){visibilityCenters[i]=Vector4.zero;continue;}
                var point=subject.position+Vector3.up*1.1f;
                visibilityCenters[i]=new Vector4(point.x,point.y,point.z,1);
            }
            Shader.SetGlobalFloat("_CrownfallWildernessCount",count);
            Shader.SetGlobalVectorArray("_CrownfallWildernessSubjects",visibilityCenters);
            Shader.SetGlobalVector("_CrownfallWildernessRight",view.transform.right);
            Shader.SetGlobalVector("_CrownfallWildernessUp",view.transform.up);
            Shader.SetGlobalVector("_CrownfallWildernessForward",view.transform.forward);
        }
        public void Dispose()
        {
            Camera.onPreCull -= PrepareVisibility;
            Shader.SetGlobalFloat("_CrownfallWildernessCount",0);
            RenderSettings.ambientLight=previousAmbient;RenderSettings.ambientMode=previousAmbientMode;
            RenderSettings.ambientSkyColor=previousSky;RenderSettings.ambientEquatorColor=previousEquator;RenderSettings.ambientGroundColor=previousGround;
            RenderSettings.fog=previousFog;RenderSettings.fogMode=previousFogMode;RenderSettings.fogColor=previousFogColor;RenderSettings.fogStartDistance=previousFogStart;RenderSettings.fogEndDistance=previousFogEnd;
            if (root != null) { root.SetActive(false); UnityEngine.Object.Destroy(root); }
        }
    }
}
