using UnityEngine;

namespace Crownfall
{
    [CreateAssetMenu(menuName = "Crownfall/Basic Sprite Presentation")]
    public sealed class BasicSpriteSet : ScriptableObject
    {
        public Sprite[] frames;
        [Min(0.1f)] public float framesPerSecond = 12;
        public Sprite AtTime(double elapsed)
        {
            int index = Mathf.Clamp((int)System.Math.Floor(System.Math.Max(0, elapsed) * framesPerSecond + 1e-7), 0, frames.Length - 1);
            return frames[index];
        }
    }
}
