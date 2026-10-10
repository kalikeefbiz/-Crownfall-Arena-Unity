using System;
using UnityEngine;

namespace Crownfall.Match
{
    // Opt-in diagnostic only: visit the WebGL page with ?crownfall_probe=1.
    // No match simulation, camera recovery or gameplay code is exercised in this mode.
    public sealed class Build14RenderProbe : MonoBehaviour
    {
        public static bool Requested
        {
            get { return Application.absoluteURL.IndexOf("crownfall_probe=1", StringComparison.OrdinalIgnoreCase) >= 0; }
        }

        Camera view;
        GameObject sceneRoot;
        GameObject blocker;
        SpriteRenderer[] samples;
        Material originalSpriteMaterial, alternateSpriteMaterial, stoneMaterial;
        int mode;
        string[] names = { "KIT", "SET", "RIVEN", "FOREST" };
        static readonly string[] Modes =
        {
            "A / original material, clear line of sight",
            "B / intentional opaque depth obstruction",
            "C / Sprites/Default shader, clear sight",
            "D / original material, sprites raised 2m"
        };

        public void Initialize(Camera camera, RosterPresentationCatalog catalog, Material sprite, Material stone)
        {
            view = camera;
            originalSpriteMaterial = sprite;
            var alternateShader = Shader.Find("Sprites/Default");
            if (alternateShader != null)
                alternateSpriteMaterial = new Material(alternateShader) { name = "Probe-only Sprites/Default" };

            stoneMaterial = new Material(stone) { name = "Probe-only stone" };
            view.orthographic = true;
            view.orthographicSize = 6.5f;
            view.nearClipPlane = 0.1f;
            view.farClipPlane = 100f;
            view.clearFlags = CameraClearFlags.SolidColor;
            view.backgroundColor = new Color(.10f, .16f, .24f);
            view.transform.position = new Vector3(0, 10.5f, -13f);
            view.transform.rotation = Quaternion.Euler(39f, 0f, 0f);

            sceneRoot = new GameObject("Isolated Build14 WebGL render diagnostic");
            sceneRoot.transform.SetParent(transform, false);

            // Real production sprite assets and actual production material, not substitutes.
            var images = new Sprite[]
            {
                First(catalog.kit.idle), First(catalog.set.idle),
                First(catalog.riven.idle), catalog.forest
            };
            samples = new SpriteRenderer[images.Length];
            float[] xs = { -4.5f, -1.5f, 1.5f, 4.6f };
            float[] sizes = { catalog.kit.height, catalog.set.height, catalog.riven.height, 3.4f };
            for (int i = 0; i < images.Length; i++)
            {
                var go = new GameObject("REAL ASSET " + names[i]);
                go.transform.SetParent(sceneRoot.transform, false);
                go.transform.position = new Vector3(xs[i], .08f, 0);
                go.transform.rotation = view.transform.rotation;
                var sr = go.AddComponent<SpriteRenderer>();
                sr.sharedMaterial = originalSpriteMaterial;
                sr.sprite = images[i];
                sr.color = Color.white;
                sr.sortingOrder = 200;
                if (images[i] != null)
                    go.transform.localScale = Vector3.one * (sizes[i] / Mathf.Max(.01f, images[i].bounds.size.y));
                samples[i] = sr;
            }

            // One intentional original-material world mesh proves that opaque geometry renders.
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Probe ground using shipping stone material";
            floor.transform.SetParent(sceneRoot.transform, false);
            floor.transform.position = new Vector3(0, -.18f, 0);
            floor.transform.localScale = new Vector3(15f, .3f, 7f);
            floor.GetComponent<Renderer>().sharedMaterial = stoneMaterial;
            Destroy(floor.GetComponent<Collider>());

            blocker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            blocker.name = "Probe intentional foreground occluder";
            blocker.transform.SetParent(sceneRoot.transform, false);
            blocker.transform.position = new Vector3(0, 1.1f, -1.5f);
            blocker.transform.localScale = new Vector3(12f, 3.4f, .35f);
            blocker.GetComponent<Renderer>().sharedMaterial = stoneMaterial;
            Destroy(blocker.GetComponent<Collider>());
            SetMode(0);
        }

        static Sprite First(Sprite[] sprites)
        { return sprites != null && sprites.Length != 0 ? sprites[0] : null; }

        void SetMode(int next)
        {
            mode = next % Modes.Length;
            blocker.SetActive(mode == 1);
            for (int i = 0; i < samples.Length; i++)
            {
                var sr = samples[i];
                sr.sharedMaterial = mode == 2 && alternateSpriteMaterial != null
                    ? alternateSpriteMaterial : originalSpriteMaterial;
                var p = sr.transform.position;
                p.y = mode == 3 ? 2.08f : .08f;
                sr.transform.position = p;
            }
        }

        void OnGUI()
        {
            if (view == null || samples == null) return;
            int size = Mathf.Clamp(Screen.height / 30, 12, 24);
            var oldLabelSize = GUI.skin.label.fontSize;
            var oldButtonSize = GUI.skin.button.fontSize;
            GUI.skin.label.fontSize = size;
            GUI.skin.button.fontSize = size;
            float width = Mathf.Min(Screen.width - 24f, 780f);
            GUI.Box(new Rect(12f, 10f, width, 126f), "");
            GUI.Label(new Rect(24f, 13f, width - 24f, 27f), "BUILD #14 RECOVERY / WEBGL RENDER PROBE");
            GUI.Label(new Rect(24f, 40f, width - 24f, 29f), Modes[mode]);
            GUI.Label(new Rect(24f, 70f, width - 24f, 46f),
                "Production sprites: KIT / SET / RIVEN / FOREST   |   " +
                "Ship shader: " + (originalSpriteMaterial != null && originalSpriteMaterial.shader != null
                    ? originalSpriteMaterial.shader.name : "MISSING"));
            if (GUI.Button(new Rect(12f, 144f, Mathf.Min(width, 300f), 58f), "NEXT DIAGNOSTIC MODE"))
                SetMode(mode + 1);

            float bottom = Screen.height - 84f;
            string status = "";
            for (int i = 0; i < samples.Length; i++)
            {
                var sr = samples[i];
                status += names[i] + ":" +
                    (sr.sprite == null ? "NO SPRITE" : "BOUND") +
                    "/" + (sr.isVisible ? "IN FRUSTUM" : "NOT VISIBLE") + "  ";
            }
            GUI.Box(new Rect(12f, bottom - 6f, width, 81f), "");
            GUI.Label(new Rect(22f, bottom, width - 20f, 64f), status +
                "\nAlternate shader: " +
                (alternateSpriteMaterial == null ? "NOT FOUND" :
                    alternateSpriteMaterial.shader.isSupported ? "SUPPORTED" : "UNSUPPORTED") +
                "  |  Screenshot every diagnostic mode");
            GUI.skin.label.fontSize = oldLabelSize;
            GUI.skin.button.fontSize = oldButtonSize;
        }

        void OnDestroy()
        {
            if (sceneRoot != null) Destroy(sceneRoot);
            if (alternateSpriteMaterial != null) Destroy(alternateSpriteMaterial);
            if (stoneMaterial != null) Destroy(stoneMaterial);
        }
    }
}
