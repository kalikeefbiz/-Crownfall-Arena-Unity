using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    // Only child transforms/material properties change. MatchEntity and the motor
    // are read-only here; authored frame sequences never schedule damage.
    public sealed class ActorPresentationController
    {
        readonly MatchEntity actor;
        readonly RosterArt art;
        readonly Camera camera;
        readonly SpriteRenderer sprite;
        readonly LineRenderer stateRing;
        readonly MeshRenderer shadow;
        double moveStarted,lastCast=double.NegativeInfinity;
        bool moving;
        V2 captured;
        public ActorPresentationController(Transform root,MatchEntity source,RosterArt set,Camera view,Material spriteMaterial,Material overlay,Material shadowMaterial,Mesh disc)
        {
            actor=source;art=set;camera=view;
            var visual=new GameObject("Production roster visual");visual.transform.SetParent(root,false);
            sprite=visual.AddComponent<SpriteRenderer>();sprite.sharedMaterial=spriteMaterial;
            var contact=new GameObject("Contact shadow");contact.transform.SetParent(root,false);contact.transform.localPosition=Vector3.up*.012f;
            contact.transform.localScale=new Vector3(1.2f,1, .72f);
            contact.AddComponent<MeshFilter>().sharedMesh=disc;shadow=contact.AddComponent<MeshRenderer>();shadow.sharedMaterial=shadowMaterial;
            var marker=new GameObject("Team and status marker");marker.transform.SetParent(root,false);
            stateRing=marker.AddComponent<LineRenderer>();stateRing.sharedMaterial=overlay;stateRing.useWorldSpace=false;
            stateRing.loop=true;stateRing.positionCount=32;stateRing.startWidth=stateRing.endWidth=.055f;
            for(int i=0;i<32;i++){float a=i*Mathf.PI/16;stateRing.SetPosition(i,new Vector3(Mathf.Cos(a)*.66f,.035f,Mathf.Sin(a)*.66f));}
        }
        static Sprite Select(Sprite[] sequence,double time,bool loop=true)
        {return sequence==null||sequence.Length==0?null:sequence[PresentationMath.Frame(time,sequence.Length,12,loop)];}
        public void Sync(MatchSimulation match,Vector3 velocity)
        {
            double now=match.Now;
            bool next=velocity.sqrMagnitude>.02f;
            if(next!=moving){moving=next;moveStarted=now;}
            if(actor.CastAt!=lastCast){lastCast=actor.CastAt;captured=actor.CastAim;}
            double elapsed=now-lastCast;
            V2 direction=elapsed>=0&&elapsed<.5?captured:moving?new V2(velocity.x,velocity.z):actor.Aim;
            bool side=System.Math.Abs(direction.X)>System.Math.Abs(direction.Z)*.8;
            Sprite image=Select(moving?(side&&art.sideRun.Length>0?art.sideRun:art.run):art.idle,now-moveStarted);
            if(elapsed>=0&&elapsed<.5)
            {
                Sprite[] action=null;
                if(actor.LastCast==AbilitySlot.Basic)action=side&&art.basicSide.Length>0?art.basicSide:direction.Z>0&&art.basicBack.Length>0?art.basicBack:art.basicFront;
                else if(actor.Roster==FirstRosterSummoner.Set&&actor.LastCast==AbilitySlot.Skill1)action=art.action;
                else if(actor.Roster==FirstRosterSummoner.Riven&&actor.LastCast==AbilitySlot.Ultimate)action=art.ultimate;
                var frame=actor.Roster==FirstRosterSummoner.Riven&&actor.LastCast==AbilitySlot.Ultimate?art.ultimate[0]:Select(action,elapsed,false);if(frame!=null)image=frame;
            }
            sprite.enabled=actor.Alive;shadow.enabled=actor.Alive;stateRing.enabled=actor.Alive;
            sprite.sprite=image;sprite.flipX=direction.X<0&&side;
            if(image!=null)
            {
                float height=Mathf.Max(.01f,image.bounds.size.y);
                sprite.transform.localScale=Vector3.one*(art.height/height);
                sprite.transform.rotation=camera.transform.rotation;
                sprite.sortingOrder=1000-Mathf.RoundToInt((float)actor.Position.Z*10);
            }
            Color team=actor.Team==1?new Color(.24f,.65f,1):new Color(1,.32f,.38f);
            Color status=match.Protected(actor)?new Color(1,.85f,.4f):actor.StunnedUntil>now?new Color(.8f,.5f,1):actor.Buffs.Count>0?Color.Lerp(team,Color.white,.35f):!actor.FinalAvailable?new Color(1,.58f,.18f):team;
            stateRing.startColor=stateRing.endColor=status;
            stateRing.startWidth=stateRing.endWidth=match.Protected(actor)?.095f:.055f;
            sprite.color=now-actor.LastHit<.12?new Color(1,.6f,.6f):actor.Roster==FirstRosterSummoner.Riven&&actor.Pulse?new Color(1,.88f,.72f):Color.white;
        }
    }
}
