using System;
using Crownfall.Combat;

namespace Crownfall.Tests
{
    public static class FirstRosterBalanceTests
    {
        static int checks;
        static void Check(bool value, string message)
        {
            checks++;
            if (!value) throw new Exception("First roster balance test: " + message);
        }
        static void Near(double actual, double expected, double epsilon, string message)
        {
            Check(Math.Abs(actual - expected) <= epsilon, message + " (" + actual + " vs " + expected + ")");
        }

        public static int Run()
        {
            checks = 0;
            var kit = FirstRosterBalance.Kit;
            var set = FirstRosterBalance.Set;
            var riven = FirstRosterBalance.Riven;

            Check(set.MaximumHealth > kit.MaximumHealth && kit.MaximumHealth > riven.MaximumHealth,
                "Durability ordering is Set > Kit > Riven");
            Check(riven.BasicRange > kit.BasicRange && kit.BasicRange > set.BasicRange,
                "Range ordering is Riven > Kit > Set");
            Check(kit.MoveSpeed > riven.MoveSpeed && riven.MoveSpeed > set.MoveSpeed,
                "Movement ordering is Kit > Riven > Set");
            Check(kit.NonUltimateRotationDamage > riven.NonUltimateRotationDamage &&
                riven.NonUltimateRotationDamage > set.NonUltimateRotationDamage,
                "Burst ordering respects access cost");

            Near(FirstRosterBalance.EffectiveEdge(kit.BasicRange), 3.0, .000001, "Kit effective edge");
            Near(FirstRosterBalance.EffectiveEdge(set.BasicRange), 2.05, .000001, "Set effective edge");
            Near(FirstRosterBalance.EffectiveEdge(riven.BasicRange), 5.6, .000001, "Riven effective edge");
            Near(FirstRosterBalance.EffectiveEdge(riven.BasicRange) - FirstRosterBalance.EffectiveEdge(set.BasicRange),
                3.55, .000001, "Riven/Set raw spacing gap");

            Check(kit.CleanRotationsToDefeat(riven) > 2 && kit.CleanRotationsToDefeat(riven) < 3,
                "Kit cannot one-cycle Riven");
            Check(riven.CleanRotationsToDefeat(kit) > 3 && riven.CleanRotationsToDefeat(kit) < 4,
                "Riven needs repeated clean rotations into Kit");
            Check(set.CleanRotationsToDefeat(riven) > 3 && set.CleanRotationsToDefeat(riven) < 4,
                "Set does not burst Riven in one rotation");
            Check(riven.CleanRotationsToDefeat(set) > 4,
                "Riven must sustain multiple rotations into Set");
            Check(kit.CleanRotationsToDefeat(set) > 3,
                "Kit must sustain multiple rotations into Set");

            Check(kit.NonUltimateRotationDamage / CombatEconomy.ReferenceHealth <= .40,
                "Kit non-Ult rotation remains below 40% reference HP");
            Check(riven.NonUltimateRotationDamage / CombatEconomy.ReferenceHealth <= .33,
                "Riven ranged rotation remains below 33% reference HP");
            Check(set.NonUltimateRotationDamage / CombatEconomy.ReferenceHealth <= .32,
                "Set tank rotation remains below 32% reference HP");

            return checks;
        }
    }
}
