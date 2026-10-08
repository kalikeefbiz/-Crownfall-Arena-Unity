using System.Collections.Generic;
namespace Crownfall.Match
{
    // Input ownership lives here so lifecycle cancellation can be exercised without
    // an iPhone. This state never applies damage or casts an ability by itself.
    public sealed class MatchInputState
    {
        public readonly AbilityGesture Gesture=new AbilityGesture();
        public readonly List<CastCommand> Queued=new List<CastCommand>();
        public V2 Movement,Aim=new V2(1,0);
        public bool Aiming,BasicHeld;
        public int MoveId=-1,AimId=-1,AbilityId=-1,KeyboardSlot=-1;
        public void Reset(MatchEntity p)
        {
            MoveId=AimId=AbilityId=KeyboardSlot=-1;Movement=new V2();Aiming=BasicHeld=false;Gesture.Cancel();Queued.Clear();
            if(p!=null)p.PendingSecond=false;
        }
        public void Cancel(int id,MatchEntity p)
        {
            if(MoveId==id){MoveId=-1;Movement=new V2();}
            if(AimId==id){AimId=-1;Aiming=false;}
            if(AbilityId==id){AbilityId=-1;Gesture.Cancel();BasicHeld=false;if(p!=null)p.PendingSecond=false;}
        }
        public void CancelMissing(int[] live,int count,MatchEntity p)
        {
            if(TouchOwnership.Missing(MoveId,live,count))Cancel(MoveId,p);
            if(TouchOwnership.Missing(AimId,live,count))Cancel(AimId,p);
            if(TouchOwnership.Missing(AbilityId,live,count))Cancel(AbilityId,p);
        }
    }
}
