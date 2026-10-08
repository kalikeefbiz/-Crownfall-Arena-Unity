using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    // The native 3D motor and presentation read the same actor. Sprite timing never applies damage.
    public sealed class MatchActorView : MonoBehaviour, ISummonerViewState, IAttackViewState
    {
        public MatchEntity Actor { get; private set; }
        MatchSimulation match;
        CharacterController motor;
        Renderer[] renderers;
        ActorPresentationController presentation;
        public Vector3 WorldPosition => transform.position;
        public Vector3 Velocity { get; private set; }
        public Vector3 AimDirection => new Vector3((float)Actor.Aim.X,0,(float)Actor.Aim.Z);
        public PresentationFacing Facing => PresentationFacingUtility.FromDirection(AimDirection,Vector3.right,Vector3.forward,PresentationFacing.Right);
        public bool Active => Actor.Alive && Actor.LastCast==AbilitySlot.Basic && Elapsed>=0 && Elapsed<.5;
        public double Elapsed => match.Now-Actor.CastAt;
        public Vector3 CapturedDirection => new Vector3((float)Actor.CastAim.X,0,(float)Actor.CastAim.Z);
        public PresentationFacing CapturedFacing => PresentationFacingUtility.FromDirection(CapturedDirection,Vector3.right,Vector3.forward,Facing);
        public void Bind(MatchSimulation simulation,MatchEntity actor,KitSpriteSet kit,BasicSpriteSet basic,Camera camera,Material sprite,Material body,RosterPresentationCatalog production,ArenaPresentation arena,Material overlay,Material shadow)
        {
            match=simulation;Actor=actor;
            transform.position=Ground(actor.Position);
            if(actor.Kind==EntityKind.Summoner)
            {
                gameObject.layer=8;
                motor=gameObject.AddComponent<CharacterController>();motor.height=1.8f;motor.radius=(float)actor.Radius;
                motor.center=new Vector3(0,.9f,0);motor.skinWidth=.02f;motor.stepOffset=0;motor.minMoveDistance=0;
            }
            if(actor.Kind==EntityKind.Summoner)
                presentation=new ActorPresentationController(transform,actor,production.For(actor.Roster),camera,sprite,overlay,shadow,arena.ShadowMesh);
            else
            {
                arena.DiscObject("Aether objective medallion",transform,new Vector3(0,.045f,0),actor.Kind==EntityKind.Camp&&actor.CampType=="damage"?2.5f:1.2f,body);
                var anchor=new GameObject("Neutral structural Aether anchor");anchor.transform.SetParent(transform,false);
                var mesh=anchor.AddComponent<MeshFilter>();mesh.sharedMesh=arena.RingMesh;
                anchor.AddComponent<MeshRenderer>().sharedMaterial=body;
                anchor.transform.localPosition=Vector3.up*.7f;anchor.transform.localRotation=Quaternion.Euler(90,0,0);
                anchor.transform.localScale=Vector3.one*(actor.CampType=="damage"?1.8f:.8f);
            }
            renderers=GetComponentsInChildren<Renderer>();
        }
        public void RefreshRenderers(){renderers=GetComponentsInChildren<Renderer>();}
        public static Vector3 Ground(V2 point) => new Vector3((float)point.X,.04f,(float)point.Z);
        public void Sync(float dt)
        {
            bool visible=Actor.Alive;
            foreach(var r in renderers)r.enabled=visible;
            var before=transform.position;var desired=Ground(Actor.Position);bool warp=(desired-before).sqrMagnitude>100;
            if(motor!=null)
            {
                motor.enabled=visible;
                if(visible)
                {
                    if(warp){motor.enabled=false;transform.position=desired;motor.enabled=true;}
                    else motor.Move(desired-before);
                    Actor.Position=new V2(transform.position.x,transform.position.z);
                }
            }
            else transform.position=desired;
            Velocity=visible&&!warp&&dt>0?Vector3.ProjectOnPlane(transform.position-before,Vector3.up)/dt:Vector3.zero;
            if(presentation!=null)presentation.Sync(match,Velocity);
        }
    }
}
