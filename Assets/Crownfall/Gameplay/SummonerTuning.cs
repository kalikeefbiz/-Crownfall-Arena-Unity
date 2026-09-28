using UnityEngine;

namespace Crownfall
{
    [CreateAssetMenu(menuName = "Crownfall/Summoner Tuning")]
    public sealed class SummonerTuning : ScriptableObject
    {
        [Min(0.1f)] public float moveSpeed = 5f;
        public float gravity = -24f;
        [Min(0.05f)] public float holdSeconds = 0.22f;
        [Min(0.1f)] public float previewRange = 5f;
        [Min(0.05f)] public float confirmationSeconds = 0.65f;
    }
}
