using System;

namespace Crownfall.EnvironmentPresentation
{
    // Small deterministic renderer-only apron outside the original 68x64 authoritative floor.
    public static class WorldContinuation
    {
        public const int Steps=24;
        public const double OuterX=58,OuterZ=54;
        public const double ContactShadowHeight=.075;
        public static double Height(double x,double z)
        {
            double distance=Math.Max(Math.Abs(x)-34,Math.Abs(z)-32);
            double rise=Math.Min(1,Math.Max(0,distance/14));
            double variation=.5+.25*Math.Sin(x*.19+z*.13)+.25*Math.Cos(z*.23-x*.11);
            return 2.05+rise*(z>0?7:3)*( .65+variation*.6);
        }
        // Four nonoverlapping strips. No triangle covers existing traversable floor.
        public static double[][] Strip(int side)
        {
            switch(side)
            {
                case 0:return new[]{new[]{-OuterX,-OuterZ},new[]{-34.0,OuterZ}};
                case 1:return new[]{new[]{34.0,-OuterZ},new[]{OuterX,OuterZ}};
                case 2:return new[]{new[]{-34.0,32.0},new[]{34.0,OuterZ}};
                case 3:return new[]{new[]{-34.0,-OuterZ},new[]{34.0,-32.0}};
                default:throw new ArgumentOutOfRangeException("side");
            }
        }
    }
}
