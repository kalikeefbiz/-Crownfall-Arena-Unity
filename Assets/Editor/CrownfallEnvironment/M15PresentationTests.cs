using System;
using Crownfall.EnvironmentPresentation;

namespace Crownfall.Tests
{
    public static class M15PresentationTests
    {
        static int checks;
        static void Require(bool value,string message){checks++;if(!value)throw new InvalidOperationException("M15 presentation: "+message);}
        public static int Run()
        {
            checks=0;
            foreach(bool baseline in new[]{false,true})foreach(double aspect in new[]{16.0/9,19.5/9})
                foreach(double x in new[]{-30.0,-12,0,12,30})foreach(double z in new[]{-27.0,-6,0,6,26})
                {
                    double cx=CameraFraming.CenterX(x,aspect,baseline),cz=CameraFraming.CenterZ(z,baseline);
                    double h=baseline?CameraFraming.BaselineHalfHeight:CameraFraming.HalfHeight;
                    Require(Math.Abs(x-cx)<h*aspect,"Human leaves landscape viewport");
                    Require(Math.Abs(CameraFraming.ScreenUp(z,0,cz,baseline))<h,"Human leaves vertical viewport");
                    foreach(double aimX in new[]{-4.0,0,3})foreach(double aimZ in new[]{-4.0,0,3})
                    {
                        double projectedZ=CameraFraming.ScreenUp(z+aimZ,0,cz,baseline);
                        double reconstructedZ=CameraFraming.GroundZ(projectedZ,cz,baseline);
                        Require(Math.Abs(reconstructedZ-(z+aimZ))<1e-9,"Ground-ray targeting round trip");
                        // Zero yaw preserves X handedness; world movement/independent aim semantics are unchanged.
                        Require(Math.Abs(((x+aimX-cx)+cx)-x-aimX)<1e-9,"Aim X changed");
                    }
                    // Standard lane engagements six metres north/south remain in view at every lane X.
                    if(Math.Abs(z)<=6)foreach(double dz in new[]{-6.0,6})Require(Math.Abs(CameraFraming.ScreenUp(z+dz,0,cz,baseline))<h,"Nearby opponent outside combat frame");
                }
            Require(CameraFraming.BaselinePitch==50&&CameraFraming.BaselineHalfHeight==11&&CameraFraming.BaselineHeight==15,"Accepted camera fallback drift");
            Require(CameraFraming.HalfHeight<=CameraFraming.BaselineHalfHeight*1.12,"Character projected height reduced excessively");
            Require(WorldContinuation.ContactShadowHeight>.06&&WorldContinuation.ContactShadowHeight<.1,"Contact disc must clear territory/insignia without floating above combat");
            for(int side=0;side<WorldContinuation.StripCount;side++)
            {
                var strip=WorldContinuation.Strip(side);
                if(side==6)Require(strip[0][0]==-34&&strip[0][1]==-32&&strip[1][0]==34&&strip[1][1]==32&&WorldContinuation.Height(side,0,0)==-.06,"Flat renderer-only floor sheet must match the original footprint and stay below collision");
                else Require(strip[0][0]>=34||strip[1][0]<=-34||strip[0][1]>=12.5||strip[1][1]<=-12.5,"Decorative banks enter protected lane");
                foreach(var point in strip)Require(WorldContinuation.Height(side,point[0],point[1])>=-.061,"Invalid decorative ground height");
            }
            foreach(var point in new[]{new[]{-22.0,-22},new[]{22.0,-22},new[]{-18.0,24},new[]{18.0,24},new[]{-7.0,-27},new[]{7.0,-27},new[]{0.0,26},new[]{0.0,19}})
                Require(Math.Abs(WorldContinuation.Height(point[0],point[1])+.025)<1e-9,"Terrain raises objective/approach clearance");
            return checks;
        }
    }
}
