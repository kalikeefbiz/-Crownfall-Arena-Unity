using UnityEngine;

namespace Crownfall
{
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class KitSpritePresentation : MonoBehaviour
    {
        ISummonerViewState state;
        KitSpriteSet art;
        SpriteRenderer visual;
        Camera viewCamera;
        float cycle;
        bool running;

        public void Bind(ISummonerViewState source, KitSpriteSet sprites, Camera camera, Material material)
        {
            state = source; art = sprites; viewCamera = camera;
            visual = GetComponent<SpriteRenderer>();
            visual.sharedMaterial = material;
            visual.sprite = art.idle;
        }

        void OnEnable() { cycle = 0; running = false; }
        void LateUpdate()
        {
            if (state == null || art == null) return;
            float threshold = art.runThreshold * (running ? art.stopThresholdRatio : 1f);
            bool nextRunning = state.Velocity.sqrMagnitude > threshold * threshold;
            if (nextRunning != running) { running = nextRunning; cycle = 0; }
            else if (running) cycle = Mathf.Repeat(cycle + Time.deltaTime * Mathf.Max(0.1f, art.framesPerSecond), art.run.Length);
            visual.sprite = running ? art.run[Mathf.FloorToInt(cycle)] : art.idle;
            visual.flipX = state.Facing == PresentationFacing.Left;
            // Camera-aligned child only. Gameplay root remains unrotated and unscaled.
            transform.rotation = viewCamera.transform.rotation;
        }
    }
}
