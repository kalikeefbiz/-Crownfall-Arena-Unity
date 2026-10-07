using System;

namespace Crownfall.Combat
{
    public enum FirstRosterSummoner
    {
        Kit,
        Set,
        Riven
    }

    public readonly struct FirstRosterProfile
    {
        public readonly FirstRosterSummoner Summoner;
        public readonly double MaximumHealth;
        public readonly double MoveSpeed;
        public readonly double BasicRange;
        public readonly double BasicInterval;
        public readonly double NonUltimateRotationDamage;
        public readonly double UltimateCommitmentDamage;

        public FirstRosterProfile(FirstRosterSummoner summoner, double maximumHealth, double moveSpeed,
            double basicRange, double basicInterval, double nonUltimateRotationDamage, double ultimateCommitmentDamage)
        {
            Summoner = summoner;
            MaximumHealth = maximumHealth;
            MoveSpeed = moveSpeed;
            BasicRange = basicRange;
            BasicInterval = basicInterval;
            NonUltimateRotationDamage = nonUltimateRotationDamage;
            UltimateCommitmentDamage = ultimateCommitmentDamage;
        }

        public double CleanRotationsToDefeat(in FirstRosterProfile target)
        {
            return target.MaximumHealth / NonUltimateRotationDamage;
        }
    }

    public static class FirstRosterBalance
    {
        public const double StandardRadius = 0.40;

        public static FirstRosterProfile Kit => new FirstRosterProfile(
            FirstRosterSummoner.Kit, 950, 5.2, 2.6, .85, 370, 570);

        public static FirstRosterProfile Set => new FirstRosterProfile(
            FirstRosterSummoner.Set, 1300, 4.7, 1.65, 1.0, 290, 440);

        public static FirstRosterProfile Riven => new FirstRosterProfile(
            FirstRosterSummoner.Riven, 900, 5.0, 5.2, .95, 296, 456);

        public static FirstRosterProfile Get(FirstRosterSummoner summoner)
        {
            switch (summoner)
            {
                case FirstRosterSummoner.Kit: return Kit;
                case FirstRosterSummoner.Set: return Set;
                case FirstRosterSummoner.Riven: return Riven;
                default: throw new ArgumentOutOfRangeException(nameof(summoner));
            }
        }

        public static double EffectiveEdge(double authoredRange, double targetRadius = StandardRadius)
        {
            if (!HealthState.Finite(authoredRange) || authoredRange <= 0 ||
                !HealthState.Finite(targetRadius) || targetRadius <= 0)
                throw new ArgumentOutOfRangeException();
            return authoredRange + targetRadius;
        }
    }
}
