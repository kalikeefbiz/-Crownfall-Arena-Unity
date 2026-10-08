using System;
using System.Collections.Generic;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public struct V2
    {
        public double X, Z;
        public V2(double x, double z) { X = x; Z = z; }
        public double Length => Math.Sqrt(X * X + Z * Z);
        public V2 Normal => Length > 1e-9 ? this / Length : new V2(1, 0);
        public GroundPoint Ground => new GroundPoint(X, Z);
        public static V2 operator +(V2 a, V2 b) => new V2(a.X + b.X, a.Z + b.Z);
        public static V2 operator -(V2 a, V2 b) => new V2(a.X - b.X, a.Z - b.Z);
        public static V2 operator *(V2 a, double b) => new V2(a.X * b, a.Z * b);
        public static V2 operator /(V2 a, double b) => new V2(a.X / b, a.Z / b);
        public static double Distance(V2 a, V2 b) => (a - b).Length;
        public static double Segment(V2 p, V2 a, V2 b)
        {
            V2 d = b - a; double l = d.X * d.X + d.Z * d.Z;
            double t = l > 0 ? Math.Max(0, Math.Min(1, ((p.X-a.X)*d.X+(p.Z-a.Z)*d.Z)/l)) : 0;
            return Distance(p, a + d * t);
        }
    }
    public enum MatchPhase { Countdown, Active, Results }
    public enum EntityKind { Summoner, Camp, Canal }
    public enum AbilitySlot { Basic, Skill1, Skill2, Ultimate, Special }
    public enum AimKind { Directional, Ground, Self }
    public sealed class Modifier
    {
        public double Until, Damage, Mitigation, Speed, Cooldown, Slow;
    }
    public sealed class MatchEntity
    {
        public int Id, Team, Slot;
        public EntityKind Kind;
        public FirstRosterSummoner Roster;
        public string Name, BotState = "advance", CampType;
        public V2 Position, Previous, Spawn, Aim;
        public HealthState Health;
        public double Radius, ProtectedUntil, RespawnAt, StunnedUntil, UltimateMeter, LastHit = double.NegativeInfinity;
        public bool Bot, Reserved, FinalAvailable = true, Eliminated, Pulse;
        public int Kills, Deaths, Assists, Streak, Combo, WeaponNext, OutgoingHits;
        public double DamageDealt, PressureSeconds, ComboAt = double.NegativeInfinity;
        public double CastAt = double.NegativeInfinity, PendingSecondAt, BlastUntil, ThinkAt, RetreatUntil, NextRetreat, NextStance;
        public AbilitySlot LastCast;
        public V2 CastAim, PendingDirection;
        public bool PendingSecond, Returning;
        public readonly double[] ReadyAt = new double[5];
        public readonly Dictionary<string, Modifier> Buffs = new Dictionary<string, Modifier>();
        public readonly Dictionary<int, double> Contributors = new Dictionary<int, double>();
        public CombatRecoveryState Recovery = new CombatRecoveryState();
        public MatchCommand BotCommand = new MatchCommand();
        public int AssignedCamp;
        public double AssignmentUntil;
        public DashMotion Dash;
        public ComboMotion Sequence;
        public bool Alive => Health.Alive;
        public bool Locked => Dash != null || Sequence != null;
        public double Factor(double now, int type)
        {
            double f = 1;
            foreach (var m in Buffs.Values) if (m.Until > now)
            {
                if (type == 0) f *= 1 + m.Damage;
                if (type == 1) f *= 1 - Math.Max(0, Math.Min(1, m.Mitigation));
                if (type == 2) f *= (1 + m.Speed) * (1 - Math.Max(0, Math.Min(1, m.Slow)));
                if (type == 3) f *= 1 - Math.Max(0, Math.Min(.5, m.Cooldown));
            }
            return f;
        }
    }
    public sealed class MatchCommand
    {
        public V2 Move, Aim;
        public bool Aiming, BasicHeld;
        public readonly List<CastCommand> Casts = new List<CastCommand>();
    }
    public struct CastCommand
    {
        public AbilitySlot Slot;
        public V2 Direction, Offset;
        public bool HumanRelease;
        public CastCommand(AbilitySlot slot, V2 direction, V2 offset = default(V2), bool humanRelease = false)
        { Slot = slot; Direction = direction; Offset = offset; HumanRelease = humanRelease; }
    }
    public sealed class DashMotion
    {
        public V2 Direction;
        public double Remaining, Speed, Width, Damage;
        public bool Contact, Empowered;
        public readonly HashSet<int> Hits = new HashSet<int>();
    }
    public sealed class ComboMotion
    {
        public int Target, Index;
        public V2 Direction;
        public double Started;
    }
    public sealed class Projectile
    {
        public MatchEntity Owner;
        public V2 Position, Direction;
        public double Remaining, Speed, Width, Damage;
        public bool Active = true, Piercing, SummonersOnly, Lethal, Grant, Persistent;
        public int Phase, OrbitIndex; // orbit=0, outbound=1, parked=2, return=3
        public readonly HashSet<int> Hits = new HashSet<int>();
        public readonly HashSet<int> Summoners = new HashSet<int>();
    }
    public sealed class TimedAction
    {
        public MatchEntity Owner;
        public V2 Position, Direction;
        public double At, Until;
        public int Index, Type; // fist=0, barrage=1, slow zone=2
        public bool Done;
    }
    public sealed class MatchEffect
    {
        public V2 Position, Direction;
        public double Until, Radius;
        public int Team;
        public string Kind;
    }
    public sealed class MatchResult
    {
        public int Winner;
        public string Reason;
        public double Duration;
    }
    public struct MapWall
    {
        public double X, Z, Width, Depth, Height;
        public MapWall(double x, double z, double w, double d, double h)
        { X=x; Z=z; Width=w; Depth=d; Height=h; }
    }
    public static class MatchMap
    {
        public const double Width = 68, Depth = 64, Goal = 28, LaneHalfWidth = 12;
        public static readonly MapWall[] Walls = {
            new MapWall(-12,-18,4,3,.75), new MapWall(12,-18,4,3,.75),
            new MapWall(-12,18,4,3,.75), new MapWall(12,18,4,3,.75),
            new MapWall(-28,-25,3,6,.65), new MapWall(28,-25,3,6,.65),
            new MapWall(-28,25,3,6,.65), new MapWall(28,25,3,6,.65),
            new MapWall(0,30,8,1,.65), new MapWall(0,-30,18,1,.65) };
        public static bool Blocked(V2 p, double radius)
        {
            if (Math.Abs(p.X)>Width/2-radius || Math.Abs(p.Z)>Depth/2-radius) return true;
            foreach (var w in Walls)
            {
                double x = Math.Max(w.X-w.Width/2,Math.Min(w.X+w.Width/2,p.X));
                double z = Math.Max(w.Z-w.Depth/2,Math.Min(w.Z+w.Depth/2,p.Z));
                if (V2.Distance(p,new V2(x,z)) < radius-1e-8) return true;
            }
            return false;
        }
        public static V2 Move(V2 p, V2 displacement, double radius)
        {
            int n = Math.Max(1,(int)Math.Ceiling(displacement.Length/(radius*.4)));
            V2 d = displacement/n;
            for(int i=0;i<n;i++)
            {
                V2 next = new V2(p.X+d.X,p.Z);
                if(!Blocked(next,radius)) p=next;
                next = new V2(p.X,p.Z+d.Z);
                if(!Blocked(next,radius)) p=next;
            }
            return p;
        }
    }
}
