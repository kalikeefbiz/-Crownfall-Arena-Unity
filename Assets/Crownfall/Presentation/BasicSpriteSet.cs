using UnityEngine;

namespace Crownfall
{
    [CreateAssetMenu(menuName = "Crownfall/Basic Sprite Presentation")]
    public sealed class BasicSpriteSet : ScriptableObject
    {
        // Legacy front sequence retained for backward compatibility with existing assets.
        public Sprite[] frames;
        public Sprite[] front;
        public Sprite[] back;
        public Sprite[] side;
        [Min(0.1f)] public float framesPerSecond = 12;

        Sprite[] SequenceFor(PresentationFacing facing)
        {
            Sprite[] selected = null;
            switch (facing)
            {
                case PresentationFacing.Back:
                    selected = back;
                    break;
                case PresentationFacing.Left:
                case PresentationFacing.Right:
                    selected = side;
                    break;
                default:
                    selected = front;
                    break;
            }

            if (selected != null && selected.Length > 0) return selected;
            if (front != null && front.Length > 0) return front;
            return frames;
        }

        public Sprite AtTime(double elapsed, PresentationFacing facing)
        {
            var sequence = SequenceFor(facing);
            if (sequence == null || sequence.Length == 0) return null;
            int index = Mathf.Clamp(
                (int)System.Math.Floor(System.Math.Max(0, elapsed) * framesPerSecond + 1e-7),
                0, sequence.Length - 1);
            return sequence[index];
        }

        public Sprite AtTime(double elapsed)
        { return AtTime(elapsed, PresentationFacing.Front); }
    }
}
