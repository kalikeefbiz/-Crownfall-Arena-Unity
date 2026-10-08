using System;

namespace Crownfall.Match
{
    public enum PresentationPhase { Cast, Hit, Death, Respawn, Blade, Objective, Surge, Result }
    public struct PresentationEvent
    {
        public long Sequence, ActionId;
        public int ActorId, TargetId, Detail;
        public AbilitySlot Ability;
        public PresentationPhase Phase;
        public V2 Position, Direction;
        public double Time;
    }
    // Output-only identity captured when an authoritative action is committed.
    public readonly struct PresentationIdentity
    {
        public readonly long ActionId;
        public readonly AbilitySlot Ability;
        public readonly V2 Direction;
        public readonly bool Pulse;
        public PresentationIdentity(MatchEntity actor)
        {ActionId=actor.PresentationActionId;Ability=actor.LastCast;Direction=actor.CastAim;Pulse=actor.Pulse;}
    }
    // Bounded output journal. Each reader owns its cursor; neither consumption nor
    // overflow can affect the simulation. No renderer subscription lives in core.
    public sealed class PresentationJournal
    {
        public const int Capacity=256;
        readonly PresentationEvent[] entries=new PresentationEvent[Capacity];
        public long LastSequence { get; private set; }
        public void Publish(PresentationEvent value)
        { value.Sequence=++LastSequence;entries[(value.Sequence-1)%Capacity]=value; }
        public bool Read(ref long cursor,out PresentationEvent value)
        {
            cursor=Math.Max(cursor,LastSequence-Capacity);
            if(cursor>=LastSequence){value=default(PresentationEvent);return false;}
            value=entries[cursor++%Capacity];return true;
        }
    }
    // Pure presentation math, shared with executable tests (not a second territory model).
    public static class PresentationMath
    {
        public static int Frame(double elapsed,int count,double fps,bool loop)
        {
            if(count<=0)return 0;
            int f=(int)Math.Max(0,Math.Min(int.MaxValue-1,elapsed*fps));
            return loop?f%count:Math.Min(count-1,f);
        }
        public static double ClampCenter(double desired,double extent,double halfMap)
        { return extent>=halfMap?0:Math.Max(-halfMap+extent,Math.Min(halfMap-extent,desired)); }
        public static double GroundDepth(double orthoHalfHeight,double pitchRadians)
        { return orthoHalfHeight/Math.Sin(pitchRadians); }
        // A sprite's local X/Y plane becomes world X/Z after a +90 degree X rotation.
        // Compensate the imported pivot in presentation, never in authoritative positions.
        public static V2 GroundSpriteOrigin(V2 center,V2 boundsCenter,double scale)
        { return center-boundsCenter*scale; }
    }
    // Handles missing end states without turning a lost/canceled finger into a cast.
    public static class TouchOwnership
    {
        public static bool Missing(int owned,int[] live,int count)
        { if(owned<0)return false;for(int i=0;i<count;i++)if(live[i]==owned)return false;return true; }
    }
}
