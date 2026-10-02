using System;
using System.Collections.Generic;

namespace Crownfall.Combat
{
    public static class ConeHitQuery
    {
        // Exact V21 X/Z footprint: radius-expanded range, angular inclusion, then cone-edge capsules.
        // Terrain/line-of-sight is deliberately absent: the browser whip has no occlusion test.
        public static bool Contains(GroundPoint origin, GroundPoint target, double radius,
            GroundPoint direction, double range, double arc)
        {
            double dx = target.X - origin.X, dz = target.Z - origin.Z;
            double distance = Math.Sqrt(dx * dx + dz * dz);
            if (distance > range + radius) return false;
            if (distance <= radius) return true;
            double angle = Math.Atan2(direction.X, direction.Z);
            double delta = Math.Atan2(dx, dz) - angle;
            double diff = Math.Abs(Math.Atan2(Math.Sin(delta), Math.Cos(delta)));
            return diff <= arc / 2 || EdgeDistance(dx, dz, angle - arc / 2, range) <= radius ||
                EdgeDistance(dx, dz, angle + arc / 2, range) <= radius;
        }
        static double EdgeDistance(double x, double z, double angle, double range)
        {
            double bx = Math.Sin(angle) * range, bz = Math.Cos(angle) * range;
            double length = bx * bx + bz * bz;
            double t = length > 0 ? Math.Max(0, Math.Min(1, (x * bx + z * bz) / length)) : 0;
            x -= bx * t; z -= bz * t;
            return Math.Sqrt(x * x + z * z);
        }
        public static int Resolve(IEnumerable<ICombatTarget> candidates, GroundPoint origin,
            GroundPoint direction, double range, double arc, DamageRequest request)
        {
            // Stable gameplay IDs, never collider IDs or sprite bounds. Even a future physics
            // broadphase returning the same combatant repeatedly cannot multiply one hit.
            var targets = new List<ICombatTarget>();
            foreach (var target in candidates)
                if (target != null && target.Health != null) targets.Add(target);
            targets.Sort((a, b) => a.Health.Id.CompareTo(b.Health.Id));
            var visited = new HashSet<int>();
            int damaged = 0;
            foreach (var target in targets)
            {
                if (!visited.Add(target.Health.Id) || !target.Targetable ||
                    !target.Health.CanReceive(request.SourceId, request.SourceTeam)) continue;
                if (Contains(origin, target.Position, target.Radius, direction, range, arc) &&
                    target.Receive(request).Applied > 0) damaged++;
            }
            return damaged;
        }
    }
}
