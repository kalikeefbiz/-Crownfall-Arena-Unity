using System;
namespace Crownfall.Match
{
    public struct LayoutRect
    {
        public double X,Y,Width,Height;
        public double Right=>X+Width;
        public double Bottom=>Y+Height;
        public LayoutRect(double x,double y,double width,double height){X=x;Y=y;Width=width;Height=height;}
        public bool Overlaps(LayoutRect r)=>X<r.Right&&Right>r.X&&Y<r.Bottom&&Bottom>r.Y;
    }
    public static class PresentationLayout
    {
        public static LayoutRect Safe(double width,double height,LayoutRect engine,double left,double top,double right,double bottom)
        {
            double x=Math.Max(engine.X,left*width),y=Math.Max(engine.Y,top*height);
            double xmax=Math.Min(engine.Right,width*(1-right)),ymax=Math.Min(engine.Bottom,height*(1-bottom));
            return new LayoutRect(x,y,Math.Max(1,xmax-x),Math.Max(1,ymax-y));
        }
        public static LayoutRect Control(LayoutRect safe,int index,double x,double y,double scale)
        {
            double w=(index<2?112:110)*scale,h=(index<2?112:65)*scale;
            return new LayoutRect(Math.Max(safe.X,Math.Min(safe.Right-w,safe.X+x*safe.Width-w/2)),
                Math.Max(safe.Y+140,Math.Min(safe.Bottom-h,safe.Y+y*safe.Height-h/2)),w,h);
        }
    }
}
