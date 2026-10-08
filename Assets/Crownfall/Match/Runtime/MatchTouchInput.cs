using System.Collections.Generic;
using UnityEngine;

namespace Crownfall.Match
{
    // Poll legacy Unity input so touch IDs remain independent; UI GUI events cannot commit casts.
    public sealed class MatchTouchInput
    {
        readonly MatchInputState state=new MatchInputState();
        public AbilityGesture Gesture=>state.Gesture;
        public List<CastCommand> Queued=>state.Queued;
        public V2 Movement {get=>state.Movement;set=>state.Movement=value;}
        public V2 Aim {get=>state.Aim;set=>state.Aim=value;}
        public bool Aiming {get=>state.Aiming;set=>state.Aiming=value;}
        public bool BasicHeld {get=>state.BasicHeld;set=>state.BasicHeld=value;}
        public int MoveId {get=>state.MoveId;set=>state.MoveId=value;}
        public int AimId {get=>state.AimId;set=>state.AimId=value;}
        public int AbilityId {get=>state.AbilityId;set=>state.AbilityId=value;}
        int keyboardSlot {get=>state.KeyboardSlot;set=>state.KeyboardSlot=value;}
        Vector2 moveStart,aimStart,abilityStart;
        int width,height;
        readonly int[] liveTouches=new int[16];
        static readonly KeyCode[] keys={KeyCode.Space,KeyCode.Q,KeyCode.E,KeyCode.R,KeyCode.F};
        public Rect MoveRect,AimRect;
        public readonly Rect[] AbilityRects=new Rect[5];
        public void Reset(MatchEntity p)=>state.Reset(p);
        public event System.Action PreviewCancelled {add=>state.PreviewCancelled+=value;remove=>state.PreviewCancelled-=value;}
        public bool PreviewVisible(MatchEntity p,double now,bool blocked)=>state.PreviewVisible(p,now,blocked);
        static Vector2 GuiPoint(Vector2 point) => new Vector2(point.x,Screen.height-point.y);
        static V2 WorldOffset(Vector2 delta,float scale) => new V2(delta.x/scale,-delta.y/scale);
        public void Sample(MatchSimulation match,float scale,Rect pauseRect,System.Action pause)
        {
            var p=match.Human;
            if(width!=Screen.width||height!=Screen.height){Reset(p);width=Screen.width;height=Screen.height;}
            if(!p.Alive||p.StunnedUntil>match.Now){Reset(p);return;}
            for(int touchIndex=0;touchIndex<Input.touchCount;touchIndex++)
            {
                var touch=Input.GetTouch(touchIndex);
                var position=GuiPoint(touch.position)/scale;
                if(touch.phase==TouchPhase.Began)
                {
                    if(pauseRect.Contains(position)){Reset(p);return;}
                    Begin(touch.fingerId,position,p,match);
                }
                else if(touch.phase==TouchPhase.Ended)End(touch.fingerId,match);
                else if(touch.phase==TouchPhase.Canceled)Cancel(touch.fingerId,p);
                else Drag(touch.fingerId,position,match);
            }
            int liveCount=0;
            for(int i=0;i<Input.touchCount&&liveCount<liveTouches.Length;i++)
            {var touch=Input.GetTouch(i);if(touch.phase!=TouchPhase.Canceled&&touch.phase!=TouchPhase.Ended)liveTouches[liveCount++]=touch.fingerId;}
            state.CancelMissing(liveTouches,liveCount,p);
            if(Input.touchCount==0)
            {
                var position=GuiPoint(Input.mousePosition)/scale;
                if(Input.GetMouseButtonDown(0)){if(pauseRect.Contains(position)){Reset(p);return;}Begin(-2,position,p,match);}
                if(Input.GetMouseButton(0))Drag(-2,position,match);
                if(Input.GetMouseButtonUp(0))End(-2,match);
                if(Input.GetMouseButton(1))
                {
                    var ray=Camera.main.ScreenPointToRay(Input.mousePosition);float enter;
                    if(new Plane(Vector3.up,Vector3.zero).Raycast(ray,out enter)){var point=ray.GetPoint(enter);Aim=new V2(point.x-p.Position.X,point.z-p.Position.Z).Normal;Aiming=true;}
                    if(Gesture.Active&&keyboardSlot>=0)Gesture.Drag(Aim*60,match.Range(p,Gesture.Slot));
                }
                else if(AimId==-1&&!Gesture.Active)Aiming=false;
                float x=(Input.GetKey(KeyCode.D)||Input.GetKey(KeyCode.RightArrow)?1:0)-(Input.GetKey(KeyCode.A)||Input.GetKey(KeyCode.LeftArrow)?1:0);
                float z=(Input.GetKey(KeyCode.W)||Input.GetKey(KeyCode.UpArrow)?1:0)-(Input.GetKey(KeyCode.S)||Input.GetKey(KeyCode.DownArrow)?1:0);
                if(MoveId==-1)Movement=new V2(x,z);
                for(int i=0;i<5;i++)
                {
                    if(Input.GetKeyDown(keys[i])&&!Gesture.Active){keyboardSlot=i;Press((AbilitySlot)i,p,match);}
                    if(Input.GetKeyUp(keys[i])&&keyboardSlot==i){Release(match);keyboardSlot=-1;}
                }
                if(Input.GetKeyDown(KeyCode.Escape)){Reset(p);pause();}
            }
        }
        void Begin(int id,Vector2 pos,MatchEntity p,MatchSimulation match)
        {
            if(MoveId==-1&&MoveRect.Contains(pos)){MoveId=id;moveStart=MoveRect.center;Drag(id,pos,match);return;}
            if(AimId==-1&&AimRect.Contains(pos)){AimId=id;aimStart=AimRect.center;Aiming=true;Drag(id,pos,match);return;}
            if(AbilityId!=-1||Gesture.Active)return;
            for(int i=0;i<5;i++)if(AbilityRects[i].Contains(pos)&&!string.IsNullOrEmpty(match.AbilityName(p,(AbilitySlot)i)))
            {AbilityId=id;abilityStart=pos;Press((AbilitySlot)i,p,match);break;}
        }
        void Press(AbilitySlot slot,MatchEntity p,MatchSimulation match)
        {
            p.PendingSecond=false;
            Gesture.Press(slot,Aiming?Aim:p.Aim,Time.unscaledTime,match.Range(p,slot));
            if(slot==AbilitySlot.Basic&&p.Roster!=Combat.FirstRosterSummoner.Riven)BasicHeld=true;
        }
        void Drag(int id,Vector2 pos,MatchSimulation match)
        {
            if(MoveId==id){var delta=WorldOffset(pos-moveStart,1)/55;double magnitude=System.Math.Min(1,delta.Length);Movement=magnitude>.12?delta.Normal*((magnitude-.12)/.88):new V2();}
            if(AimId==id)
            {
                var delta=WorldOffset(pos-aimStart,1);if(delta.Length>5){Aim=delta.Normal;Aiming=true;}
                if(Gesture.Active)Gesture.Drag(delta,match.Range(match.Human,Gesture.Slot));
            }
            if(AbilityId==id&&Gesture.Active)
            {
                Gesture.Drag(WorldOffset(pos-abilityStart,1),match.Range(match.Human,Gesture.Slot));
                if(Gesture.Dragged){Aim=Gesture.Direction;Aiming=true;}
                if(Gesture.Slot==AbilitySlot.Basic&&match.Human.Roster!=Combat.FirstRosterSummoner.Riven)BasicHeld=!Gesture.Cancelled;
            }
        }
        void Release(MatchSimulation match)
        {
            CastCommand c;
            bool wasMelee=Gesture.Slot==AbilitySlot.Basic&&match.Human.Roster!=Combat.FirstRosterSummoner.Riven;
            if(Gesture.Release(Time.unscaledTime,out c)&&!wasMelee)Queued.Add(c);
            BasicHeld=false;
        }
        void End(int id,MatchSimulation match)
        {
            if(MoveId==id){MoveId=-1;Movement=new V2();}
            if(AimId==id){AimId=-1;Aiming=Gesture.Active;}
            if(AbilityId==id){Release(match);AbilityId=-1;}
        }
        void Cancel(int id,MatchEntity p)=>state.Cancel(id,p);
        public MatchCommand Read(bool consume)
        {
            var command=new MatchCommand{Move=Movement,Aim=Gesture.Active&&!Gesture.Cancelled?Gesture.Direction:Aim,Aiming=Aiming||Gesture.Active,BasicHeld=BasicHeld};
            if(consume){command.Casts.AddRange(Queued);Queued.Clear();}return command;
        }
    }
}
