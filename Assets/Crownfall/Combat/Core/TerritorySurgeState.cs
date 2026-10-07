using System;

namespace Crownfall.Combat
{
    public enum SurgeLaneMode
    {
        Inactive,
        AutonomousAdvance,
        HoldEarnedControl,
        NormalContest
    }

    /// <summary>
    /// Pure deterministic policy for Crownfall's first territorial Surge experiment.
    /// It owns no scene objects, HP, timers, shaders or objective rewards.
    /// Runtime systems can query it without coupling combat simulation to presentation.
    /// </summary>
    public sealed class TerritorySurgeState
    {
        public const double TriggerControl = 70.0;
        public const int StartingCanals = 3;

        readonly bool[] spent = new bool[2];
        public int ActiveTeam { get; private set; }
        public int CanalsRemaining { get; private set; }
        public bool Active { get { return ActiveTeam != 0 && CanalsRemaining > 0; } }

        public bool HasSpent(int team)
        {
            ValidateTeam(team);
            return spent[team - 1];
        }

        public bool TryTrigger(int team, double teamControl)
        {
            ValidateTeam(team);
            if (!Finite(teamControl) || teamControl < 0 || teamControl > 100)
                throw new ArgumentOutOfRangeException(nameof(teamControl));
            if (Active || spent[team - 1] || teamControl < TriggerControl) return false;

            spent[team - 1] = true;
            ActiveTeam = team;
            CanalsRemaining = StartingCanals;
            return true;
        }

        public bool DestroyCanal()
        {
            if (!Active) return false;
            CanalsRemaining--;
            if (CanalsRemaining <= 0)
            {
                CanalsRemaining = 0;
                ActiveTeam = 0;
            }
            return true;
        }

        /// <summary>
        /// Lane policy while the Surge exists.
        /// No presence: slow autonomous forward pressure.
        /// Defender-only presence: hold the earned control but do not auto-advance.
        /// Any advancing-team presence: normal contest rules decide live pressure.
        /// </summary>
        public SurgeLaneMode ResolveLaneMode(int advancingPresence, int defendingPresence)
        {
            if (advancingPresence < 0) throw new ArgumentOutOfRangeException(nameof(advancingPresence));
            if (defendingPresence < 0) throw new ArgumentOutOfRangeException(nameof(defendingPresence));
            if (!Active) return SurgeLaneMode.Inactive;
            if (advancingPresence > 0) return SurgeLaneMode.NormalContest;
            if (defendingPresence > 0) return SurgeLaneMode.HoldEarnedControl;
            return SurgeLaneMode.AutonomousAdvance;
        }

        static void ValidateTeam(int team)
        {
            if (team != 1 && team != 2) throw new ArgumentOutOfRangeException(nameof(team));
        }

        static bool Finite(double value)
        {
            return !double.IsNaN(value) && !double.IsInfinity(value);
        }
    }
}
