using System;

namespace Crownfall.Combat
{
    // Simulation values; no Unity, rendering, physics or input dependencies.
    public struct GroundPoint
    {
        public readonly double X, Z;
        public GroundPoint(double x, double z) { X = x; Z = z; }
    }

    public struct DamageRequest
    {
        public readonly int SourceId, SourceTeam, AttackId, HitIndex;
        public readonly double Amount;
        public DamageRequest(int sourceId, int sourceTeam, int attackId, int hitIndex, double amount)
        { SourceId = sourceId; SourceTeam = sourceTeam; AttackId = attackId; HitIndex = hitIndex; Amount = amount; }
    }

    public struct DamageResult
    {
        public readonly DamageRequest Request;
        public readonly int TargetId;
        public readonly double Before, After;
        public double Applied { get { return Before - After; } }
        public bool Defeated { get { return Before > 0 && After == 0; } }
        public DamageResult(DamageRequest request, int targetId, double before, double after)
        { Request = request; TargetId = targetId; Before = before; After = after; }
    }

    public sealed class HealthState
    {
        public int Id { get; private set; }
        public int Team { get; private set; }
        public double Maximum { get; private set; }
        public double Current { get; private set; }
        public bool Alive { get { return Current > 0; } }
        public HealthState(int id, int team, double maximum)
        {
            if (id <= 0 || !Finite(maximum) || maximum <= 0) throw new ArgumentOutOfRangeException();
            Id = id; Team = team; Maximum = maximum; Current = maximum;
        }
        public bool CanReceive(int sourceId, int sourceTeam)
        { return Alive && sourceId != Id && sourceTeam != Team; }

        // Central transaction seam for future mitigation/modifiers/shields; none exist in M1.
        public DamageResult Receive(DamageRequest request)
        {
            double before = Current;
            if (CanReceive(request.SourceId, request.SourceTeam) && Finite(request.Amount))
                Current -= Math.Min(Current, Math.Max(0, request.Amount));
            return new DamageResult(request, Id, before, Current);
        }

        public double Restore(double amount)
        {
            if (!Alive || !Finite(amount) || amount <= 0) return 0;
            double before = Current;
            Current = Math.Min(Maximum, Current + amount);
            return Current - before;
        }

        public static bool Finite(double value) { return !double.IsNaN(value) && !double.IsInfinity(value); }
    }

    public interface ICombatTarget
    {
        HealthState Health { get; }
        GroundPoint Position { get; }
        double Radius { get; }
        bool Targetable { get; }
        DamageResult Receive(DamageRequest request);
    }
}
