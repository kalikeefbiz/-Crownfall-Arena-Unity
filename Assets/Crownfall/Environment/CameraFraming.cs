using System;

namespace Crownfall.EnvironmentPresentation
{
    // Presentation only. Player constants configure Cinemachine, never gameplay collision.
    // The older profile below is retained solely for historical environment estimates/tests.
    public static class CameraFraming
    {
        public const double PlayerPitch = 40, PlayerHalfHeight = 10, PlayerDistance = 32;
        public const double Pitch = 34, HalfHeight = 11, Height = 20, FocusNorth = 6.5;
        public const double HorizontalPadding = 4, NorthSouthPadding = 8;
        public const double BaselinePitch = 50, BaselineHalfHeight = 11, BaselineHeight = 15;
        public static double Radians(double degrees) { return degrees * Math.PI / 180; }
        public static double Clamp(double desired, double extent, double halfWorld)
        { return extent >= halfWorld ? 0 : Math.Max(-halfWorld+extent,Math.Min(halfWorld-extent,desired)); }
        public static double CenterX(double actorX,double aspect,bool baseline=false)
        { return Clamp(actorX,(baseline?BaselineHalfHeight:HalfHeight)*aspect,34+(baseline?0:HorizontalPadding)); }
        public static double CenterZ(double actorZ,bool baseline=false)
        { return Clamp(actorZ+(baseline?0:FocusNorth),(baseline?BaselineHalfHeight:HalfHeight)/Math.Sin(Radians(baseline?BaselinePitch:Pitch)),32+(baseline?0:NorthSouthPadding)); }
        // Orthographic screen-plane coordinates. Inverse intersects the authoritative Y=0 aiming plane.
        public static double ScreenUp(double z,double y,double centerZ,bool baseline=false)
        { double p=Radians(baseline?BaselinePitch:Pitch);return (z-centerZ)*Math.Sin(p)+y*Math.Cos(p); }
        public static double GroundZ(double screenUp,double centerZ,bool baseline=false)
        { return centerZ+screenUp/Math.Sin(Radians(baseline?BaselinePitch:Pitch)); }
    }
}
