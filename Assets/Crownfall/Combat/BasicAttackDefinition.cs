using System;
using UnityEngine;

namespace Crownfall.Combat
{
    [CreateAssetMenu(menuName = "Crownfall/Basic Attack")]
    public sealed class BasicAttackDefinition : ScriptableObject
    {
        [Min(0.01f)] public float range = 2.8f;
        [Range(1, 360)] public float coneDegrees = 117f;
        [Min(0.001f)] public float cooldown = 0.55f;
        [Min(0)] public float comboWindow = 1.25f;
        public float[] comboDamage = { 110, 150 };
        [Tooltip("Seconds from accepted cast. V21 Solar Whip: one immediate hit per cast.")]
        public float[] hitTimes = { 0 };
        public BasicAttackSpec Snapshot()
        {
            return new BasicAttackSpec(range, coneDegrees * Math.PI / 180, cooldown, comboWindow,
                Array.ConvertAll(comboDamage, x => (double)x), Array.ConvertAll(hitTimes, x => (double)x));
        }
    }
}
