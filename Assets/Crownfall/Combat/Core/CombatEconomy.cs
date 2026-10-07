using System;

namespace Crownfall.Combat
{
    public static class CombatEconomy
    {
        public const double ReferenceHealth = 1000.0;
        public const double OutOfCombatDelay = 4.5;
        public const double RegenFractionPerSecond = 0.045;

        public static double RegenPerSecond(double maximumHealth)
        {
            if (!HealthState.Finite(maximumHealth) || maximumHealth <= 0)
                throw new ArgumentOutOfRangeException(nameof(maximumHealth));
            return maximumHealth * RegenFractionPerSecond;
        }

        public static double RecoverySeconds(double healthFraction)
        {
            if (!HealthState.Finite(healthFraction) || healthFraction < 0 || healthFraction > 1)
                throw new ArgumentOutOfRangeException(nameof(healthFraction));
            if (healthFraction >= 1) return 0;
            return OutOfCombatDelay + (1.0 - healthFraction) / RegenFractionPerSecond;
        }
    }

    /// <summary>
    /// Pure combat-activity clock. Damage dealt or received restarts the out-of-combat delay.
    /// This object does not own HealthState; runtime composition decides when to apply recovery.
    /// </summary>
    public sealed class CombatRecoveryState
    {
        double lastInteraction = double.NegativeInfinity;
        double lastNow = double.NegativeInfinity;

        public double LastInteraction { get { return lastInteraction; } }

        public void MarkDamagingInteraction(double now)
        {
            ValidateTime(now);
            lastNow = now;
            lastInteraction = now;
        }

        public bool CanRegenerate(double now)
        {
            ValidateTime(now);
            lastNow = now;
            return now - lastInteraction >= CombatEconomy.OutOfCombatDelay;
        }

        public double RegenerationAmount(double now, double deltaSeconds, double maximumHealth)
        {
            if (!HealthState.Finite(deltaSeconds) || deltaSeconds < 0)
                throw new ArgumentOutOfRangeException(nameof(deltaSeconds));
            if (!CanRegenerate(now)) return 0;
            return CombatEconomy.RegenPerSecond(maximumHealth) * deltaSeconds;
        }

        void ValidateTime(double now)
        {
            if (!HealthState.Finite(now) || now < lastNow)
                throw new ArgumentException("Combat recovery clock must be finite and monotonic");
        }
    }
}
