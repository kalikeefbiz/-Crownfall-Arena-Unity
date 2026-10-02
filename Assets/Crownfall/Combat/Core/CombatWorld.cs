using System;
using System.Collections.Generic;

namespace Crownfall.Combat
{
    public sealed class CombatWorld
    {
        readonly List<ICombatTarget> targets = new List<ICombatTarget>();
        public IEnumerable<ICombatTarget> Targets { get { return targets; } }
        public void Register(ICombatTarget target)
        {
            if (targets.Contains(target)) return;
            foreach (var other in targets)
                if (other.Health.Id == target.Health.Id) throw new ArgumentException("Duplicate combatant ID");
            targets.Add(target);
        }
        public void Unregister(ICombatTarget target) { targets.Remove(target); }
    }
}
