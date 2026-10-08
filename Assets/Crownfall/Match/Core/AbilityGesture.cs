using System;

namespace Crownfall.Match
{
    // Device-independent release commitment; cancellation and movement never dispatch a cast.
    public sealed class AbilityGesture
    {
        public bool Active { get; private set; }
        public bool Dragged { get; private set; }
        public bool Cancelled { get; private set; }
        public AbilitySlot Slot { get; private set; }
        public V2 Direction { get; private set; }
        public V2 Offset { get; private set; }
        public double Started { get; private set; }
        V2 snapshot;
        public void Press(AbilitySlot slot,V2 facing,double now,double range)
        {
            if(Active)return;
            Active=true;Dragged=Cancelled=false;Slot=slot;snapshot=Direction=facing.Normal;Started=now;Offset=Direction*range*.65;
        }
        public void Drag(V2 screenOffset,double range)
        {
            if(!Active)return;
            double distance=screenOffset.Length;Cancelled=distance>150;
            if(distance<=12)return;
            Dragged=true;Direction=screenOffset.Normal;Offset=Direction*Math.Min(range,range*distance/80);
        }
        public bool Release(double now,out CastCommand command)
        {
            command=default(CastCommand);
            if(!Active)return false;
            Active=false;if(Cancelled)return false;
            command=new CastCommand(Slot,!Dragged&&now-Started<.18?snapshot:Direction,Offset,true);return true;
        }
        public void Cancel(){Active=false;Cancelled=true;}
    }
}
