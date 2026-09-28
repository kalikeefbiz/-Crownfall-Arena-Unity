using UnityEngine;

namespace Crownfall
{
    // Reads the gameplay-owned targeting session. Never confirms selections or applies effects.
    public sealed class TargetingPreview : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] float radialRadius = 1.5f;
        SummonerRoot source;
        LineRenderer preview, aim;
        readonly Vector3[] ring = new Vector3[49];
        readonly Vector3[] arrow = new Vector3[5];
        readonly Vector3[] needle = new Vector3[2];

        public void Bind(SummonerRoot root, Material material)
        {
            source = root;
            preview = MakeLine("Selection preview", material, 0.06f);
            aim = MakeLine("Independent aim", material, 0.035f);
        }
        LineRenderer MakeLine(string label, Material material, float width)
        {
            var go = new GameObject(label);
            go.transform.SetParent(transform, false);
            var line = go.AddComponent<LineRenderer>();
            line.sharedMaterial = material;
            line.useWorldSpace = true;
            line.widthMultiplier = width;
            line.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            line.receiveShadows = false;
            return line;
        }
        void LateUpdate()
        {
            if (source == null) return;
            Vector3 origin = source.WorldPosition + Vector3.up * 0.07f;
            needle[0] = origin;
            needle[1] = origin + source.AimDirection * 1.2f;
            aim.positionCount = 2; aim.SetPositions(needle);
            var selection = source.Targeting;
            preview.enabled = selection.Visible;
            if (!selection.Visible) return;
            if (selection.Shape == TargetShape.Radial)
            {
                Vector3 center = origin + selection.Direction * selection.Distance;
                for (int i = 0; i < ring.Length; i++)
                {
                    float angle = i * Mathf.PI * 2 / (ring.Length - 1);
                    ring[i] = center + new Vector3(Mathf.Cos(angle), 0, Mathf.Sin(angle)) * radialRadius;
                }
                preview.positionCount = ring.Length; preview.SetPositions(ring);
            }
            else
            {
                Vector3 tip = origin + selection.Direction * source.PreviewRange;
                Vector3 side = Vector3.Cross(Vector3.up, selection.Direction) * 0.65f;
                arrow[0] = origin; arrow[1] = tip;
                arrow[2] = tip - selection.Direction + side;
                arrow[3] = tip; arrow[4] = tip - selection.Direction - side;
                preview.positionCount = arrow.Length; preview.SetPositions(arrow);
            }
        }
    }
}
