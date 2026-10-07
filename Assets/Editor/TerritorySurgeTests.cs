using System;
using Crownfall.Combat;

namespace Crownfall.Tests
{
    public static class TerritorySurgeTests
    {
        static int checks;

        static void Check(bool value, string message)
        {
            checks++;
            if (!value) throw new Exception("Territory Surge test: " + message);
        }

        public static int Run()
        {
            checks = 0;
            var surge = new TerritorySurgeState();

            Check(!surge.TryTrigger(1, 69.999), "Cannot trigger below 70%");
            Check(surge.TryTrigger(1, 70), "Triggers exactly at 70%");
            Check(surge.Active && surge.ActiveTeam == 1 && surge.CanalsRemaining == 3, "Starts with three canals");
            Check(surge.HasSpent(1), "Team 1 surge is permanently spent on first trigger");
            Check(!surge.TryTrigger(2, 90), "Second surge cannot start while one is active");

            Check(surge.ResolveLaneMode(0, 0) == SurgeLaneMode.AutonomousAdvance,
                "Empty lane creates autonomous forward pressure");
            Check(surge.ResolveLaneMode(0, 1) == SurgeLaneMode.HoldEarnedControl,
                "Defender-only presence cannot reverse control while a canal lives");
            Check(surge.ResolveLaneMode(1, 0) == SurgeLaneMode.NormalContest,
                "Advancing-team presence returns lane to normal contest logic");
            Check(surge.ResolveLaneMode(1, 1) == SurgeLaneMode.NormalContest,
                "Opposed presence uses normal contest logic");

            Check(surge.DestroyCanal() && surge.CanalsRemaining == 2 && surge.Active,
                "First canal only consumes time");
            Check(surge.DestroyCanal() && surge.CanalsRemaining == 1 && surge.Active,
                "One surviving canal keeps full Surge policy active");
            Check(surge.ResolveLaneMode(0, 1) == SurgeLaneMode.HoldEarnedControl,
                "One canal has identical hold behavior to three");
            Check(surge.DestroyCanal() && !surge.Active && surge.CanalsRemaining == 0,
                "Third canal ends Surge immediately");
            Check(surge.ResolveLaneMode(0, 1) == SurgeLaneMode.Inactive,
                "No special lane policy after final canal");
            Check(!surge.DestroyCanal(), "Cannot destroy nonexistent canal");

            Check(!surge.TryTrigger(1, 100), "Team 1 cannot earn a second Surge");
            Check(surge.TryTrigger(2, 70), "Team 2 has its own one-time 70% Surge");
            Check(surge.ActiveTeam == 2 && surge.CanalsRemaining == 3, "Team 2 receives same rules");

            return checks;
        }
    }
}
