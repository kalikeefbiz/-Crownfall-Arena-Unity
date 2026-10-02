using System;

namespace Crownfall.Combat
{
    public enum AttackPhase { Ready, Windup, Hit, Recovery, Complete, Interrupted }

    // Immutable snapshot of authored data. Mutable combo/clock state never lives in a shared asset.
    public sealed class BasicAttackSpec
    {
        public readonly double Range, Arc, Cooldown, ComboWindow;
        readonly double[] damages, hits;
        public int ComboCount { get { return damages.Length; } }
        public int HitCount { get { return hits.Length; } }
        public double Damage(int step) { return damages[step]; }
        public double HitTime(int index) { return hits[index]; }
        public BasicAttackSpec(double range, double arc, double cooldown, double comboWindow,
            double[] comboDamage, double[] hitTimes)
        {
            if (!HealthState.Finite(range) || range <= 0 || !HealthState.Finite(arc) || arc <= 0 || arc > Math.PI * 2 ||
                !HealthState.Finite(cooldown) || cooldown <= 0 || !HealthState.Finite(comboWindow) || comboWindow < 0 ||
                comboDamage == null || comboDamage.Length == 0 || hitTimes == null || hitTimes.Length == 0)
                throw new ArgumentException("Invalid basic definition");
            damages = (double[])comboDamage.Clone(); hits = (double[])hitTimes.Clone();
            foreach (double value in damages)
                if (!HealthState.Finite(value) || value < 0) throw new ArgumentException("Invalid damage");
            for (int i = 0; i < hits.Length; i++)
                if (!HealthState.Finite(hits[i]) || hits[i] < 0 || hits[i] >= cooldown || (i > 0 && hits[i] < hits[i - 1]))
                    throw new ArgumentException("Invalid hit schedule");
            Range = range; Arc = arc; Cooldown = cooldown; ComboWindow = comboWindow;
        }
    }

    public sealed class AttackTimeline
    {
        readonly BasicAttackSpec spec;
        readonly bool[] executed;
        double started, lastStarted = double.NegativeInfinity, readyAt, lastNow;
        bool hasTime;
        public bool Active { get; private set; }
        public double Elapsed { get; private set; }
        public double CooldownRemaining { get { return Math.Max(0, readyAt - lastNow); } }
        public AttackPhase Phase { get; private set; }
        public GroundPoint Direction { get; private set; }
        public GroundPoint Origin { get; private set; }
        public int Sequence { get; private set; }
        public int ComboStep { get; private set; }
        public int ExecutedHits { get; private set; }
        public AttackTimeline(BasicAttackSpec definition)
        { spec = definition; executed = new bool[definition.HitCount]; }

        public bool TryStart(double now, GroundPoint origin, GroundPoint direction, bool alive)
        {
            if (!ValidTime(now) || Active || now < readyAt || !alive ||
                !HealthState.Finite(origin.X) || !HealthState.Finite(origin.Z) ||
                !HealthState.Finite(direction.X) || !HealthState.Finite(direction.Z)) return false;
            double length = Math.Sqrt(direction.X * direction.X + direction.Z * direction.Z);
            if (!HealthState.Finite(length) || length < 0.000001) return false;
            ComboStep = now - lastStarted <= spec.ComboWindow ? (ComboStep + 1) % spec.ComboCount : 0;
            lastStarted = started = lastNow = now; hasTime = true; readyAt = now + spec.Cooldown;
            Direction = new GroundPoint(direction.X / length, direction.Z / length); Origin = origin;
            Array.Clear(executed, 0, executed.Length);
            Sequence++; ExecutedHits = 0; Elapsed = 0; Active = true; Phase = AttackPhase.Windup;
            return true;
        }
        bool ValidTime(double now) { return HealthState.Finite(now) && (!hasTime || now >= lastNow); }
        public void Advance(double now, Action<int, double> hit)
        {
            if (!ValidTime(now)) throw new ArgumentException("Simulation clock must be finite and monotonic");
            lastNow = now; hasTime = true;
            if (!Active) return;
            Elapsed = Math.Max(0, now - started);
            for (int i = 0; i < executed.Length; i++)
            {
                if (executed[i] || Elapsed < spec.HitTime(i)) continue;
                // Mark before dispatch: re-entrancy and repeat ticks cannot repeat this scheduled hit.
                executed[i] = true; ExecutedHits++; Phase = AttackPhase.Hit;
                hit(i, spec.Damage(ComboStep));
                if (!Active) return;
            }
            if (Elapsed >= spec.Cooldown) { Active = false; Phase = AttackPhase.Complete; }
            else Phase = ExecutedHits == 0 ? AttackPhase.Windup : AttackPhase.Recovery;
        }
        // Explicit future interruption seam. A cancelled targeting gesture never starts a timeline.
        // Interruption cannot undo delivered damage or refund the accepted attack cooldown.
        public void Interrupt() { if (Active) { Active = false; Phase = AttackPhase.Interrupted; } }
    }
}
