using System.Collections.Generic;
using UnityEngine;

namespace Crownfall
{
    // Small composition root for the temporary M0 fixture, not a match/game manager.
    public sealed class M0Bootstrap : MonoBehaviour
    {
        [SerializeField] KitSpriteSet kit;
        [SerializeField] SummonerTuning tuning;
        [SerializeField] Material solidMaterial;
        [SerializeField] Material spriteMaterial;
        [SerializeField] Material previewMaterial;
        readonly List<Material> ownedMaterials = new List<Material>();

        void Awake()
        {
            Application.targetFrameRate = 60;
            var field = new GameObject("Temporary Battlefield").transform;
            var ground = Tint(new Color(0.16f, 0.23f, 0.22f));
            var walls = Tint(new Color(0.31f, 0.37f, 0.42f));
            var obstacles = Tint(new Color(0.49f, 0.36f, 0.24f));
            Box("Ground", field, new Vector3(0,-0.5f,0), new Vector3(28,1,36), ground);
            Box("West boundary", field, new Vector3(-14,1,0), new Vector3(1,2,37), walls);
            Box("East boundary", field, new Vector3(14,1,0), new Vector3(1,2,37), walls);
            Box("North boundary", field, new Vector3(0,1,18), new Vector3(28,2,1), walls);
            Box("South boundary", field, new Vector3(0,1,-18), new Vector3(28,2,1), walls);
            Box("Wide obstacle", field, new Vector3(-4,0.75f,1), new Vector3(4,1.5f,2), obstacles);
            Box("Tall obstacle", field, new Vector3(4,1.5f,4), new Vector3(2,3,3), obstacles);
            Box("Corner slide obstacle", field, new Vector3(0,1,9), new Vector3(3,2,2), obstacles);

            var go = new GameObject("Summoner Gameplay Root");
            go.transform.position = new Vector3(0,0.05f,-4);
            var motor = go.AddComponent<CharacterController>();
            motor.height = 1.8f; motor.radius = 0.4f; motor.center = new Vector3(0,0.9f,0);
            motor.stepOffset = 0.25f; motor.slopeLimit = 45; motor.skinWidth = 0.04f; motor.minMoveDistance = 0;
            var root = go.AddComponent<SummonerRoot>();
            root.Configure(tuning);
            var cameraObject = new GameObject("M0 MOBA Camera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.035f, 0.055f, 0.075f);
            camera.orthographic = true; camera.orthographicSize = 8.5f;
            camera.nearClipPlane = 0.1f; camera.farClipPlane = 80;
            cameraObject.AddComponent<MobaCamera>().Bind(go.transform);
            var input = gameObject.AddComponent<PointerSummonerInput>();
            root.BindInput(input, camera);

            var presentation = new GameObject("Presentation");
            presentation.transform.SetParent(go.transform, false);
            var sprite = new GameObject("Kit Sprite");
            sprite.transform.SetParent(presentation.transform, false);
            sprite.AddComponent<KitSpritePresentation>().Bind(root, kit, camera, spriteMaterial);
            var proxy = new GameObject("Primitive 3D Proxy");
            proxy.transform.SetParent(presentation.transform, false);
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Proxy body"; body.transform.SetParent(proxy.transform, false);
            body.transform.localPosition = new Vector3(0,0.9f,0);
            body.transform.localScale = new Vector3(0.8f,0.9f,0.8f);
            body.GetComponent<Collider>().enabled = false; Destroy(body.GetComponent<Collider>());
            body.GetComponent<Renderer>().sharedMaterial = Tint(new Color(0.95f,0.45f,0.08f));
            var nose = Box("Aim nose", proxy.transform, new Vector3(0,1.2f,0.52f),
                new Vector3(0.25f,0.25f,0.5f), walls);
            nose.GetComponent<Collider>().enabled = false; Destroy(nose.GetComponent<Collider>());
            proxy.AddComponent<PrimitivePresentation>().Bind(root);
            var switcher = presentation.AddComponent<PresentationSwitcher>();
            switcher.Bind(sprite, proxy);
            var preview = new GameObject("Targeting Presentation");
            preview.transform.SetParent(go.transform, false);
            preview.AddComponent<TargetingPreview>().Bind(root, previewMaterial);
            gameObject.AddComponent<M0Diagnostics>().Bind(input, root, switcher);
            Physics.SyncTransforms();
        }

        Material Tint(Color color)
        {
            var material = new Material(solidMaterial); material.color = color;
            ownedMaterials.Add(material); return material;
        }
        static GameObject Box(string label, Transform parent, Vector3 position, Vector3 size, Material material)
        {
            var box = GameObject.CreatePrimitive(PrimitiveType.Cube);
            box.name = label; box.transform.SetParent(parent, false);
            box.transform.localPosition = position; box.transform.localScale = size;
            box.GetComponent<Renderer>().sharedMaterial = material;
            return box;
        }
        void OnDestroy() { foreach (var material in ownedMaterials) Destroy(material); }
    }
}
