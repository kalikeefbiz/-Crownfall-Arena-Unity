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
        public Vector3 WorldPosition => transform.position;
        public Vector3 Velocity { get; private set; }
        public Vector3 AimDirection => new Vector3((float)Actor.Aim.X,0,(float)Actor.Aim.Z);
        public PresentationFacing Facing => PresentationFacingUtility.FromDirection(AimDirection,Vector3.right,Vector3.forward,PresentationFacing.Right);
        public bool Active => Actor.Alive && Actor.LastCast==AbilitySlot.Basic && Elapsed>=0 && Elapsed<.5;
        public double Elapsed => match.Now-Actor.CastAt;
        public Vector3 CapturedDirection => new Vector3((float)Actor.CastAim.X,0,(float)Actor.CastAim.Z);
        public PresentationFacing CapturedFacing => PresentationFacingUtility.FromDirection(CapturedDirection,Vector3.right,Vector3.forward,Facing);
        public void Bind(MatchSimulation simulation,MatchEntity actor,KitSpriteSet kit,BasicSpriteSet basic,Camera camera,Material sprite,Material body)
        {
            match=simulation;Actor=actor;
            transform.position=Ground(actor.Position);
            if(actor.Kind==EntityKind.Summoner)
            {
                gameObject.layer=8;
                motor=gameObject.AddComponent<CharacterController>();motor.height=1.8f;motor.radius=(float)actor.Radius;
                motor.center=new Vector3(0,.9f,0);motor.skinWidth=.02f;motor.stepOffset=0;motor.minMoveDistance=0;
            }
            if(actor.Kind==EntityKind.Summoner && actor.Roster==FirstRosterSummoner.Kit)
            {
                var child=new GameObject("Kit authored directional sprite");child.transform.SetParent(transform,false);
                child.transform.localPosition=Vector3.zero; // Supplied pivots already anchor the feet.
                var view=child.AddComponent<KitSpritePresentation>();view.Bind(this,kit,camera,sprite);view.BindBasic(this,basic);
            }
            else
            {
                PrimitiveType type=actor.Kind==EntityKind.Canal?PrimitiveType.Cube:actor.Kind==EntityKind.Camp?PrimitiveType.Sphere:actor.Roster==FirstRosterSummoner.Set?PrimitiveType.Capsule:PrimitiveType.Cylinder;
                var child=GameObject.CreatePrimitive(type);child.name=actor.Kind==EntityKind.Summoner?"Temporary missing "+actor.Name+" artwork":"Objective presentation";
                child.transform.SetParent(transform,false);child.transform.localPosition=new Vector3(0,.9f,0);
                float size=actor.Kind==EntityKind.Camp?(actor.CampType=="damage"?2.6f:1.4f):1;
                child.transform.localScale=new Vector3(size,actor.Kind==EntityKind.Summoner?1:size,size);
                Destroy(child.GetComponent<Collider>());child.GetComponent<Renderer>().sharedMaterial=body;
            }
            renderers=GetComponentsInChildren<Renderer>();
        }
        public void RefreshRenderers(){renderers=GetComponentsInChildren<Renderer>();}
        public static Vector3 Ground(V2 point) => new Vector3((float)point.X,.04f,(float)point.Z);
        public void Sync(float dt)
        {
            bool visible=Actor.Alive;
            foreach(var r in renderers)r.enabled=visible;
            var before=transform.position;var desired=Ground(Actor.Position);
            if(motor!=null)
            {
                motor.enabled=visible;
                if(visible)
                {
                    if((desired-before).sqrMagnitude>100){motor.enabled=false;transform.position=desired;motor.enabled=true;}
                    else motor.Move(desired-before);
                    Actor.Position=new V2(transform.position.x,transform.position.z);
                }
            }
            else transform.position=desired;
            Velocity=dt>0?Vector3.ProjectOnPlane(transform.position-before,Vector3.up)/dt:Vector3.zero;
        }
    }
}
