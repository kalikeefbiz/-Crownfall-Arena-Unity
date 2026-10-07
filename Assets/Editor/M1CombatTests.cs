using System;
using Crownfall.Combat;

namespace Crownfall.Tests
{
    // The same actual production core is tested by Mono in CI and by Unity's prebuild gate.
    // No Unity stubs, duplicated combat implementation or renderer is used.
    public static class M1CombatTests
    {
        static int checks;
        static void Check(bool value, string message)
        { checks++; if (!value) throw new Exception("M1 combat test: " + message); }
        static void Equal(double actual, double expected, string message)
        { Check(Math.Abs(actual - expected) < 0.000001, message); }
        sealed class Target : ICombatTarget
        {
            public HealthState Health { get; private set; }
            public GroundPoint Position { get; set; }
            public double Radius { get; set; }
            public bool Enabled = true;
            public bool Targetable { get { return Enabled && Health.Alive; } }
            public Target(int id, int team, double hp, double x, double z, double radius = .52)
            { Health = new HealthState(id, team, hp); Position = new GroundPoint(x, z); Radius = radius; }
            public DamageResult Receive(DamageRequest request) { return Health.Receive(request); }
        }
        static BasicAttackSpec Kit()
        { return new BasicAttackSpec(2.6, Math.PI * .65, .85, 1.25, new double[] { 85, 105 }, new double[] { 0 }); }

        public static int Run()
        {
            checks = 0;
            var spec = Kit();
            Equal(spec.Range, 2.6, "Kit range"); Equal(spec.Arc, Math.PI * .65, "Kit arc");
            Check(spec.ComboCount == 2 && spec.HitCount == 1, "Two CAST combo, one event per cast");
            var east = new GroundPoint(1, 0); var origin = new GroundPoint(0, 0);
            Func<double, double, double, bool> inside = (x, z, r) =>
                ConeHitQuery.Contains(origin, new GroundPoint(x, z), r, east, spec.Range, spec.Arc);
            Check(inside(2, 0, .52), "Enemy in cone");
            Check(!inside(4, 0, .52), "Outside range plus radius");
            Check(!inside(0, 2, .1), "Outside cone");
            Check(!inside(-2, 0, .52), "Behind source");
            Check(inside(-.2, 0, .52), "Overlapping target circle includes origin as in V21");
            Check(inside(3.1, 0, .52), "Target radius expands range");
            Check(!inside(3.121, 0, .52), "Beyond expanded boundary");
            double edge = spec.Arc / 2 + .08;
            Check(inside(Math.Cos(edge) * 2, Math.Sin(edge) * 2, .2), "Cone edge circle overlap");
            Check(!inside(Math.Cos(edge) * 2, Math.Sin(edge) * 2, .05), "Outside cone edge circle");
            Check(ConeHitQuery.Contains(new GroundPoint(10, -3), new GroundPoint(10, -5), .2,
                new GroundPoint(0, -1), 2.6, spec.Arc), "Translated and rotated query");

            var enemy = new Target(2, 2, 190, 2, 0);
            var self = new Target(1, 1, 950, 0, 0);
            var ally = new Target(3, 1, 950, 1, 0);
            var disabled = new Target(4, 2, 950, 1, 0) { Enabled = false };
            var outside = new Target(5, 2, 950, 5, 0);
            var behind = new Target(6, 2, 950, -2, 0);
            var candidates = new ICombatTarget[] { enemy, self, ally, enemy, null, disabled, outside, behind, enemy };
            var request = new DamageRequest(1, 1, 7, 0, 85);
            Check(ConeHitQuery.Resolve(candidates, origin, east, 2.6, spec.Arc, request) == 1, "One unique enemy damage transaction");
            Equal(enemy.Health.Current, 105, "Duplicate candidates cannot multiply hit");
            foreach (var untouched in new[] { self, ally, disabled, outside, behind })
                Equal(untouched.Health.Current, 950, "Filtered target unchanged");
            var lethal = enemy.Receive(new DamageRequest(1, 1, 8, 0, 999));
            Equal(lethal.Applied, 105, "Damage capped at remaining health");
            Check(lethal.Defeated && !enemy.Health.Alive && !enemy.Targetable, "Defeat and eligibility");
            Equal(enemy.Health.Current, 0, "No negative health");
            Check(ConeHitQuery.Resolve(candidates, origin, east, 2.8, spec.Arc, request) == 0, "Dead target rejected");
            Equal(enemy.Receive(request).Applied, 0, "Dead reception also rejected");
            Equal(self.Receive(request).Applied, 0, "Self rejected by transaction");
            Equal(ally.Receive(request).Applied, 0, "Friendly rejected by transaction");
            Equal(outside.Receive(new DamageRequest(1, 1, 1, 0, -8)).Applied, 0, "Negative damage clamped");
            Equal(outside.Receive(new DamageRequest(1, 1, 1, 0, double.NaN)).Applied, 0, "NaN damage rejected");
            Equal(outside.Receive(new DamageRequest(1, 1, 1, 0, double.PositiveInfinity)).Applied, 0, "Infinite damage rejected");
            Check(lethal.Request.AttackId == 8 && lethal.TargetId == 2, "Transaction provenance");

            var timeline = new AttackTimeline(spec);
            int events = 0; double total = 0;
            Action<int, double> hit = (i, damage) => { Check(i == 0, "Kit single scheduled index"); events++; total += damage; };
            Check(!timeline.TryStart(0, origin, east, false), "Dead attacker cannot start");
            Check(!timeline.TryStart(0, origin, origin, true), "Zero aim rejected");
            Check(timeline.TryStart(0, origin, east, true), "First cast accepted");
            timeline.Advance(0, hit);
            Check(events == 1 && timeline.ExecutedHits == 1 && timeline.ComboStep == 0, "Immediate first strike");
            Equal(total, 85, "First combo damage");
            Check(timeline.Phase == AttackPhase.Recovery && timeline.Active, "Immediate hit followed by recovery");
            timeline.Advance(.1, hit); timeline.Advance(.1, hit);
            Check(events == 1 && !timeline.TryStart(.1, origin, east, true), "Repeat tick / cooldown protected");
            Equal(timeline.Direction.X, 1, "Attack aim captured");
            Equal(timeline.Origin.X, 0, "Attack origin captured");
            timeline.Advance(.85, hit);
            Check(!timeline.Active && timeline.Phase == AttackPhase.Complete, "Completion .85");
            Check(timeline.TryStart(.85, origin, new GroundPoint(-3, 0), true), "Second cast accepted");
            timeline.Advance(.85, hit);
            Check(timeline.ComboStep == 1 && events == 2, "Second cast is second combo strike");
            Equal(total, 190, "85 plus 105"); Equal(timeline.Direction.X, -1, "Captured direction normalized");
            timeline.Advance(1.7, hit);
            Check(timeline.TryStart(1.7, origin, east, true), "Third cast accepted"); timeline.Advance(1.7, hit);
            Check(timeline.ComboStep == 0 && events == 3, "Combo wraps to first");
            timeline.Advance(3, hit); Check(timeline.TryStart(3, origin, east, true), "After combo expiry");
            timeline.Advance(3, hit); Check(timeline.ComboStep == 0, "Expired combo resets");
            timeline.Advance(4.25, hit); Check(timeline.TryStart(4.25, origin, east, true), "Inclusive combo boundary");
            timeline.Advance(4.25, hit); Check(timeline.ComboStep == 1, "Exactly1.25 retains combo");
            timeline.Interrupt(); Check(!timeline.Active && timeline.Phase == AttackPhase.Interrupted, "Explicit interrupt");
            Check(!timeline.TryStart(4.3, origin, east, true), "Interrupt does not refund cooldown");
            int before = events; timeline.Advance(6, hit); Check(events == before, "Interrupt does not repeat hits");

            // Synthetic definition exercises the reusable scheduler; NOT Kit's authored definition.
            var multi = new AttackTimeline(new BasicAttackSpec(2.8, 1, .55, 1, new double[] { 9 }, new double[] { 0, .2 }));
            int mask = 0;
            Check(multi.TryStart(0, origin, east, true), "Synthetic multihit starts");
            multi.Advance(.8, (i, damage) => { Check((mask & (1 << i)) == 0, "No duplicate event"); mask |= 1 << i; });
            Check(mask == 3 && !multi.Active && multi.ExecutedHits == 2, "Dropped frame executes every due hit before completion");
            multi.Advance(1, (i, damage) => { throw new Exception("Repeated completed hit"); });
            var interrupted = new AttackTimeline(new BasicAttackSpec(1, 1, 1, 1, new double[] { 9 }, new double[] { .3 }));
            interrupted.TryStart(0, origin, east, true); interrupted.Interrupt();
            interrupted.Advance(1, (i, damage) => { throw new Exception("Interrupted delayed hit"); });
            Check(interrupted.ExecutedHits == 0, "Interruption blocks future hits");
            var reentrant = new AttackTimeline(spec); int reentrantCount = 0;
            reentrant.TryStart(0, origin, east, true);
            reentrant.Advance(0, (i, damage) => { reentrantCount++; reentrant.Advance(0, (j, d) => { reentrantCount++; }); });
            Check(reentrantCount == 1, "Reentrant observer cannot duplicate hit");

            var world = new CombatWorld(); world.Register(self); world.Register(self); world.Register(ally);
            int count = 0; foreach (var t in world.Targets) count++;
            Check(count == 2, "Registry identity deduplication");
            bool rejected = false;
            try { world.Register(new Target(1, 2, 1, 0, 0)); } catch (ArgumentException) { rejected = true; }
            Check(rejected, "Registry ID collision rejected");
            world.Unregister(self); count = 0; foreach (var t in world.Targets) count++;
            Check(count == 1, "Registry unregister");
            var damages = new double[] { 85, 105 }; var schedule = new double[] { 0 };
            var snapshot = new BasicAttackSpec(2.6, 1, .85, 1.25, damages, schedule);
            damages[0] = 999; schedule[0] = .4;
            Equal(snapshot.Damage(0), 85, "Immutable authored snapshot damage");
            Equal(snapshot.HitTime(0), 0, "Immutable authored snapshot schedule");
            rejected = false;
            try { new BasicAttackSpec(1, 1, 1, 1, damages, new double[] { 2 }); } catch (ArgumentException) { rejected = true; }
            Check(rejected, "Invalid schedule rejected");
            return checks;
        }
#if M1_STANDALONE_TESTS
        public static int Main()
        {
            try { Console.WriteLine("PASS: " + Run() + " production C# combat assertions (no Unity runtime)."); return 0; }
            catch (Exception error) { Console.Error.WriteLine(error); return 1; }
        }
#endif
    }
}
