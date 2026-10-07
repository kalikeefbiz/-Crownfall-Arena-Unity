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
        Combat.IAttackViewState attack;
        BasicSpriteSet basic;

        public void BindBasic(Combat.IAttackViewState combat, BasicSpriteSet sprites)
        { attack = combat; basic = sprites; }

        public void Bind(ISummonerViewState source, KitSpriteSet sprites, Camera camera, Material material)
        {
            state = source; art = sprites; viewCamera = camera;
            visual = GetComponent<SpriteRenderer>();
            visual.sharedMaterial = material;
            visual.sprite = art.IdleFor(state.Facing);
        }

        void OnEnable() { cycle = 0; running = false; }

        void ApplyFacing(PresentationFacing facing)
        {
            visual.flipX = facing == PresentationFacing.Left;
        }

        void LateUpdate()
        {
            if (state == null || art == null) return;

            float threshold = art.runThreshold * (running ? art.stopThresholdRatio : 1f);
            bool nextRunning = state.Velocity.sqrMagnitude > threshold * threshold;
            if (nextRunning != running) { running = nextRunning; cycle = 0; }
            else if (running && art.run != null && art.run.Length > 0)
                cycle = Mathf.Repeat(cycle + Time.deltaTime * Mathf.Max(0.1f, art.framesPerSecond), art.run.Length);

            var facing = state.Facing;
            bool sideRun = running && PresentationFacingUtility.IsSide(facing) &&
                art.run != null && art.run.Length > 0;

            visual.sprite = sideRun ? art.run[Mathf.FloorToInt(cycle)] : art.IdleFor(facing);
            ApplyFacing(facing);

            if (attack != null && attack.Active && basic != null)
            {
                facing = attack.CapturedFacing;
                Sprite attackSprite = basic.AtTime(attack.Elapsed, facing);
                if (attackSprite != null) visual.sprite = attackSprite;
                ApplyFacing(facing);
            }

            // Camera-aligned child only. Gameplay root remains unrotated and unscaled.
            if (viewCamera != null) transform.rotation = viewCamera.transform.rotation;
        }
    }
}
