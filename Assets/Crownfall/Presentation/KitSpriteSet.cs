using UnityEngine;

namespace Crownfall
{
    [CreateAssetMenu(menuName = "Crownfall/Kit Sprite Set")]
    public sealed class KitSpriteSet : ScriptableObject
    {
        public Sprite idle;
        [Tooltip("Authoritative attachment order: Run 1 through Run 8.")]
        public Sprite[] run = new Sprite[8];
        [Min(0.1f)] public float framesPerSecond = 12f;
        [Min(0.01f)] public float runThreshold = 0.12f;
        [Range(0.1f, 1f)] public float stopThresholdRatio = 0.65f;
    }
}
