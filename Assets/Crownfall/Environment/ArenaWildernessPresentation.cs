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
        Transform[] subjects = new Transform[0];
        readonly Vector4[] visibilityCenters = new Vector4[6];
        public ArenaWildernessPresentation(Transform parent, Camera camera)
        {
            view = camera;
            library = Resources.Load<WildernessLibrary>(ResourcePath);
            if (library == null || library.compositionVersion != WildernessLibrary.Version || library.presentationPrefab == null || library.worldSurface == null || library.laneStone == null || library.laneNormal == null)
                throw new InvalidOperationException("Crownfall wilderness is not generated. Run Crownfall/Wilderness/Prepare and validate in Unity 6000.3.10f1.");
            root = UnityEngine.Object.Instantiate(library.presentationPrefab,parent,false);
            root.name = "Crownfall 3D wilderness (presentation only)";
            previousAmbient=RenderSettings.ambientLight;previousAmbientMode=RenderSettings.ambientMode;
            RenderSettings.ambientMode=AmbientMode.Flat;RenderSettings.ambientLight=new Color(.30f,.34f,.37f);
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
            floor.shadowCastingMode=ShadowCastingMode.Off;lane.shadowCastingMode=ShadowCastingMode.Off;
            // Re-skin engineering boundary/island renderers; their transforms/colliders remain authoritative.
            foreach(Transform node in floor.transform.parent)
                if(node.name.EndsWith("boundary",StringComparison.Ordinal)||node.name=="Wilderness island")
                {
                    var renderer=node.GetComponent<MeshRenderer>();if(renderer==null)continue;
                    renderer.sharedMaterial=library.worldSurface;renderer.shadowCastingMode=ShadowCastingMode.Off;
                }
        }
        public void BindStone(Material territory)
        {territory.SetTexture("_StoneTex",library.laneStone);territory.SetTexture("_StoneNormal",library.laneNormal);}
        public void BindVisibilitySubjects(Transform[] presentationRoots)
        {
            subjects=presentationRoots;
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
            if (root != null) { root.SetActive(false); UnityEngine.Object.Destroy(root); }
        }
    }
}
