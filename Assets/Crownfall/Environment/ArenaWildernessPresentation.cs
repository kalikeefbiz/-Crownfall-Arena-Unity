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
        Transform[] subjects = new Transform[0];
        readonly Vector4[] visibilityCenters = new Vector4[6];
        public ArenaWildernessPresentation(Transform parent, Camera camera)
        {
            view = camera;
            var library = Resources.Load<WildernessLibrary>(ResourcePath);
            if (library == null || library.compositionVersion != WildernessLibrary.Version || library.presentationPrefab == null)
                throw new InvalidOperationException("Crownfall wilderness is not generated. Run Crownfall/Wilderness/Prepare and validate in Unity 6000.3.10f1.");
            root = UnityEngine.Object.Instantiate(library.presentationPrefab,parent,false);
            root.name = "Crownfall 3D wilderness (presentation only)";
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
        }
        public void BindVisibilitySubjects(Transform[] presentationRoots) { subjects = presentationRoots; }
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
            if (root != null) { root.SetActive(false); UnityEngine.Object.Destroy(root); }
        }
    }
}
