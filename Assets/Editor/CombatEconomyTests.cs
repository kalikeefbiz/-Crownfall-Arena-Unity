using System;
using Crownfall.Combat;

namespace Crownfall.Tests
{
    public static class CombatEconomyTests
    {
        static int checks;
        static void Check(bool value, string message)
        {
            checks++;
            if (!value) throw new Exception("Combat economy test: " + message);
        }
        static void Near(double actual, double expected, double epsilon, string message)
        {
            Check(Math.Abs(actual - expected) <= epsilon, message + " (" + actual + " vs " + expected + ")");
        }

        public static int Run()
        {
            checks = 0;

            Near(CombatEconomy.RegenPerSecond(1000), 45, .000001, "1000 HP regen rate");
            Near(CombatEconomy.RegenPerSecond(1300), 58.5, .000001, "Percentage regen scales with max HP");
            Near(CombatEconomy.RecoverySeconds(.60), 13.3888888889, .00001, "60 percent recovery time");
            Near(CombatEconomy.RecoverySeconds(.40), 17.8333333333, .00001, "40 percent recovery time");
            Near(CombatEconomy.RecoverySeconds(.25), 21.1666666667, .00001, "25 percent recovery time");
            Near(CombatEconomy.RecoverySeconds(1), 0, .000001, "Full health needs no recovery");

            var recovery = new CombatRecoveryState();
            Check(recovery.CanRegenerate(0), "Fresh combatant may regenerate immediately if damaged later");
            recovery.MarkDamagingInteraction(1);
            Check(!recovery.CanRegenerate(5.49), "No regen before 4.5 second delay");
            Check(recovery.CanRegenerate(5.5), "Regen begins exactly at delay boundary");
            Near(recovery.RegenerationAmount(6.5, 1, 1000), 45, .000001, "One second regen amount");

            recovery.MarkDamagingInteraction(7);
            Check(!recovery.CanRegenerate(11.49), "New damage interaction resets delay");
            Check(recovery.CanRegenerate(11.5), "Reset delay expires normally");

            bool rejected = false;
            try { recovery.CanRegenerate(10); } catch (ArgumentException) { rejected = true; }
            Check(rejected, "Recovery clock rejects time reversal");

            return checks;
        }
    }
}
