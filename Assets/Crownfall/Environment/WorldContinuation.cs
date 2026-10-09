using System;

namespace Crownfall.EnvironmentPresentation
{
    // Renderer-only sculpted banks and outer continuation. No change to terrain/collision authority.
    public static class WorldContinuation
    {
        public const int Steps=48, StripCount=7;
        public const double OuterX=58,OuterZ=54,ContactShadowHeight=.075;
        static double Smooth(double a,double b,double x)
        {double t=Math.Min(1,Math.Max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
        // The existing camp/Major approach rectangles remain flat, with a generous smooth shoulder.
        public static double Clearance(double x,double z)
        {
            double factor=1;
            double[][] routes={new[]{-22.0,-17,5,10},new[]{22.0,-17,5,10},new[]{-18.0,18,5,12},new[]{18.0,18,5,12},new[]{-7.0,-19.5,4,15},new[]{7.0,-19.5,4,15},new[]{0.0,19,8,14}};
            foreach(var r in routes)
            {double dx=Math.Max(0,Math.Abs(x-r[0])-r[2]/2),dz=Math.Max(0,Math.Abs(z-r[1])-r[3]/2);factor=Math.Min(factor,Smooth(1.5,3.5,Math.Sqrt(dx*dx+dz*dz)));}
            double[][] camps={new[]{-22.0,-22,2.4},new[]{22.0,-22,2.4},new[]{-18.0,24,2.4},new[]{18.0,24,2.4},new[]{-7.0,-27,2.4},new[]{7.0,-27,2.4},new[]{0.0,26,3.5}};
            foreach(var c in camps)factor=Math.Min(factor,Smooth(c[2]+1.5,c[2]+3.5,Math.Sqrt((x-c[0])*(x-c[0])+(z-c[1])*(z-c[1]))));
            return factor;
        }
        public static double Height(double x,double z)
        {
            if(Math.Abs(x)<=34&&Math.Abs(z)<=32)
            {
                double edge=Smooth(12.5,17,Math.Abs(z));
                double mass=1.1+1.1*(.5+.5*Math.Sin(x*.22+Math.Sin(z*.24)))+.7*(.5+.5*Math.Cos(x*.37-z*.15));
                return -.025+edge*mass*(z>0?.55:.38)*Clearance(x,z);
            }
            double rise=Smooth(0,16,Math.Max(Math.Abs(x)-34,Math.Abs(z)-32));
            double variation=.5+.25*Math.Sin(x*.19+z*.13)+.25*Math.Cos(z*.23-x*.11);
            return 2.05+rise*(z>0?8:4)*(.65+variation*.6);
        }
        public static double Height(int side,double x,double z) {return side==6?-.06:Height(x,z);}
        public static double[][] Strip(int side)
        {
            switch(side)
            {
                case 0:return new[]{new[]{-OuterX,-OuterZ},new[]{-34.0,OuterZ}};
                case 1:return new[]{new[]{34.0,-OuterZ},new[]{OuterX,OuterZ}};
                case 2:return new[]{new[]{-34.0,32.0},new[]{34.0,OuterZ}};
                case 3:return new[]{new[]{-34.0,-OuterZ},new[]{34.0,-32.0}};
                case 4:return new[]{new[]{-34.0,12.5},new[]{34.0,32.0}};
                case 5:return new[]{new[]{-34.0,-32.0},new[]{34.0,-12.5}};
                case 6:return new[]{new[]{-34.0,-32.0},new[]{34.0,32.0}};
                default:throw new ArgumentOutOfRangeException("side");
            }
        }
    }
}
