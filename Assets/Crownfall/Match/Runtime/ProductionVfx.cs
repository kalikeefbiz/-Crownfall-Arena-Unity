using System.Collections.Generic;
using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed class ProductionVfx
    {
        public const int Capacity=128;
        public sealed class Visual
        {
            public GameObject Root;
            public SpriteRenderer Sprite;
            public LineRenderer Line;
            public object Key;
            public int OwnerId;
            public long ActionId;
            public double Until;
            public void Reset()
            {
                Key=null;OwnerId=0;ActionId=0;Until=0;
                Root.transform.localPosition=Vector3.zero;Root.transform.localRotation=Quaternion.identity;Root.transform.localScale=Vector3.one;
                Sprite.sprite=null;Sprite.color=Color.white;Sprite.flipX=Sprite.flipY=false;Sprite.enabled=false;
                Line.positionCount=0;Line.loop=false;Line.startColor=Line.endColor=Color.white;Line.startWidth=Line.endWidth=.06f;Line.enabled=false;
                Root.SetActive(false);
            }
        }
        readonly Visual[] visuals=new Visual[Capacity];
        readonly PresentationSlots slots=new PresentationSlots(Capacity);
        readonly Dictionary<object,int> tracked=new Dictionary<object,int>();
        readonly List<object> removed=new List<object>();
        readonly Camera camera;
        readonly RosterPresentationCatalog art;
        long cursor;
        public ProductionVfx(Transform parent,Camera view,Material sprites,Material overlay,RosterPresentationCatalog catalog)
        {
            camera=view;art=catalog;
            for(int i=0;i<Capacity;i++)
            {
                var go=new GameObject("Pooled presentation "+i);go.transform.SetParent(parent,false);
                var s=go.AddComponent<SpriteRenderer>();s.sharedMaterial=sprites;s.sortingOrder=1500;
                var l=go.AddComponent<LineRenderer>();l.sharedMaterial=overlay;l.useWorldSpace=true;
                visuals[i]=new Visual{Root=go,Sprite=s,Line=l};visuals[i].Reset();
            }
        }
        Visual Acquire(object key=null)
        {
            int index;if(key!=null&&tracked.TryGetValue(key,out index))return visuals[index];
            if((key==null||key is MatchEffect)&&slots.Count>=80)return null;
            index=slots.Acquire();if(index<0)return null;
            var v=visuals[index];v.Reset();v.Key=key;v.Root.SetActive(true);if(key!=null)tracked.Add(key,index);return v;
        }
        void Image(Visual v,Sprite image,V2 pos,float size,bool ground=false)
        {
            if(v==null||image==null)return;
            v.Sprite.sprite=image;v.Sprite.enabled=true;v.Root.transform.position=MatchActorView.Ground(pos)+Vector3.up*(ground?.08f:.8f);
            v.Root.transform.rotation=ground?Quaternion.Euler(90,0,0):camera.transform.rotation;
            v.Root.transform.localScale=Vector3.one*(size/Mathf.Max(.01f,image.bounds.size.x));
            if(ground)GroundSpritePlacement.Center(v.Root.transform,image,MatchActorView.Ground(pos)+Vector3.up*.08f,size);
        }
        void Ring(Visual v,V2 pos,double radius,Color color)
        {
            if(v==null)return;v.Line.enabled=true;v.Line.loop=true;v.Line.positionCount=40;v.Line.startColor=v.Line.endColor=color;
            for(int i=0;i<40;i++){float a=i*Mathf.PI/20;v.Line.SetPosition(i,new Vector3((float)pos.X+Mathf.Cos(a)*(float)radius,.13f,(float)pos.Z+Mathf.Sin(a)*(float)radius));}
        }
        static Color Team(int t)=>t==1?new Color(.32f,.72f,1):new Color(1,.38f,.38f);
        public void Sync(MatchSimulation match)
        {
            removed.Clear();
            foreach(var kv in tracked)
            {
                bool alive=kv.Key is Projectile p?match.Projectiles.Contains(p):kv.Key is TimedAction a?match.Actions.Contains(a):kv.Key is MatchEffect e&&match.Effects.Contains(e);
                if(!alive){visuals[kv.Value].Reset();slots.Release(kv.Value);removed.Add(kv.Key);}
            }
            foreach(var key in removed)tracked.Remove(key);
            for(int i=0;i<Capacity;i++)if(visuals[i].Root.activeSelf&&visuals[i].Key==null&&visuals[i].Until<=match.Now){visuals[i].Reset();slots.Release(i);}
            // Persistent projectile objects keep the same slot through outbound,
            // parked and recall. Cosmetic allocation never changes their lifecycle.
            foreach(var p in match.Projectiles)
            {
                var v=Acquire(p);if(v==null)continue;v.OwnerId=p.Owner.Id;v.ActionId=p.PresentationActionId;
                if(!p.Persistent&&p.Owner.Roster==FirstRosterSummoner.Riven&&p.PresentationPulse)
                {Ring(v,p.Position,.35,Color.Lerp(Team(p.Owner.Team),new Color(1,.8f,.35f),.5f));continue;}
                Sprite image=p.Persistent?art.scythes[PresentationMath.Frame(match.Now,art.scythes.Length,8,true)]:p.Owner.Roster==FirstRosterSummoner.Kit?(p.Lethal?art.expellantBlast:art.lastFlame):art.scythes[0];
                Image(v,image,p.Position,p.Persistent?1.3f:p.Owner.Roster==FirstRosterSummoner.Kit?2.5f:.65f);
                v.Sprite.flipX=p.Direction.X<0;
                v.Sprite.color=p.Persistent&&p.Phase==2?new Color(.8f,1,1):p.Persistent&&p.Phase==3?new Color(1,.85f,.55f):Color.white;
            }
            foreach(var a in match.Actions)if(a.Type==0)
            {
                var v=Acquire(a);Ring(v,a.Position,3,Team(a.Owner.Team));
                if(v!=null){v.OwnerId=a.Owner.Id;v.ActionId=a.Presentation.ActionId;v.Line.startWidth=v.Line.endWidth=.08f+.04f*Mathf.Sin((float)match.Now*12);}
            }
            foreach(var e in match.Effects)
            {
                if(e.Kind=="cast")continue;
                // Dash trails are sampled at 60 Hz by authority; decimate cosmetic
                // trails to protect hit/telegraph capacity during catch-up.
                if(e.Kind=="trail"&&match.Tick%4!=0)continue;
                var v=Acquire(e);if(v==null)continue;
                Ring(v,e.Position,e.Kind=="hit"?.35:e.Kind=="trail"?.2:e.Radius,Team(e.Team));
            }
            PresentationEvent ev;
            while(match.Presentation.Read(ref cursor,out ev))
            {
                if(ev.Phase!=PresentationPhase.Cast)continue;
                MatchEntity owner=null;foreach(var p in match.Actors)if(p.Id==ev.ActorId){owner=p;break;}if(owner==null)continue;
                Sprite image=null;bool ground=false;float size=2;
                if(owner.Roster==FirstRosterSummoner.Kit)
                {
                    if(ev.Ability==AbilitySlot.Skill1){image=art.emberTrail;size=2.6f;}
                    if(ev.Ability==AbilitySlot.Skill2){image=art.solarRing;ground=true;size=8.4f;}
                    if(ev.Ability==AbilitySlot.Ultimate||ev.Ability==AbilitySlot.Special){image=art.expellantCast;size=3;}
                }
                else if(owner.Roster==FirstRosterSummoner.Riven&&ev.Ability==AbilitySlot.Ultimate){image=art.riven.ultimate[1];size=6;ground=true;}
                if(image!=null)
                {
                    var v=Acquire();if(v==null)continue;v.OwnerId=ev.ActorId;v.ActionId=ev.ActionId;v.Until=ev.Time+.4;
                    if(v.Until<=match.Now){v.Until=match.Now;continue;}Image(v,image,ev.Position,size,ground);
                }
            }
            // Panther Fist art appears at the authoritative impact, not during
            // wind-up. The circular telegraph above remains the range authority.
            foreach(var e in match.Effects)if(e.Kind=="radial"&&System.Math.Abs(e.Radius-3)<.001)
            {
                var v=Acquire(e);if(v!=null)Image(v,art.set.ultimate[PresentationMath.Frame(.45-(e.Until-match.Now),2,8,false)],e.Position,6,true);
            }
        }
        public void Reset()
        {foreach(var v in visuals)v.Reset();tracked.Clear();removed.Clear();slots.Reset();cursor=0;}
    }
}
