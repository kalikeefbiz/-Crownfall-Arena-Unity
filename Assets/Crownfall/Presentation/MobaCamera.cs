using UnityEngine;
using Crownfall.EnvironmentPresentation;

namespace Crownfall
{
    public sealed class MobaCamera : MonoBehaviour
    {
        [SerializeField] bool acceptedBaselineCamera;
        [SerializeField, Min(0.01f)] float followSharpness = 9f;
        Transform target;
        Camera cameraComponent;
        bool production,alive=true,wasAlive=true,results;
        Vector3 look;
        public bool Frozen {get;set;}
        float Pitch {get{return (float)(acceptedBaselineCamera?CameraFraming.BaselinePitch:CameraFraming.Pitch);}}
        float Height {get{return (float)(acceptedBaselineCamera?CameraFraming.BaselineHeight:CameraFraming.Height);}}
        float Focus {get{return acceptedBaselineCamera?0:(float)CameraFraming.FocusNorth;}}
        Vector3 Offset {get{return new Vector3(0,Height,-Height/Mathf.Tan(Pitch*Mathf.Deg2Rad)+Focus);}}
        public void ConfigurePresentation()
        {
            cameraComponent=GetComponent<Camera>();
            cameraComponent.orthographicSize=(float)(acceptedBaselineCamera?CameraFraming.BaselineHalfHeight:CameraFraming.HalfHeight);
            transform.rotation=Quaternion.Euler(Pitch,0,0);
        }
        public void UseAcceptedBaseline(bool enabled)
        {acceptedBaselineCamera=enabled;ConfigurePresentation();if(target!=null)transform.position=ClampPosition(target.position+Offset);}
        [ContextMenu("Camera/Accepted Build 14 fallback")] void Baseline(){UseAcceptedBaseline(true);}
        [ContextMenu("Camera/M15 wilderness framing")] void Wilderness(){UseAcceptedBaseline(false);}
        public void Bind(Transform follow)
        {
            target = follow;look=Vector3.zero;Frozen=false;
            if(target==null)return;
            ConfigurePresentation();transform.position=ClampPosition(target.position+Offset);
        }
        public void Present(Match.MatchEntity actor,bool result,bool targeting)
        {
            production=true;results=result;alive=actor.Alive;
            Vector3 motion=new Vector3((float)(actor.Position.X-actor.Previous.X),0,(float)(actor.Position.Z-actor.Previous.Z));
            Vector3 aim=new Vector3((float)actor.Aim.X,0,(float)actor.Aim.Z);
            look=alive&&!results?Vector3.ClampMagnitude(motion*15,.6f)+(targeting?aim*.6f:Vector3.zero):Vector3.zero;
            if(alive&&!wasAlive)look=Vector3.zero;wasAlive=alive;
        }
        void LateUpdate()
        {
            if(target==null||Frozen)return;
            Vector3 desired=target.position+Offset+look;
            if(production)
            {
                if(!alive&&!results)return;
                if(results)desired=new Vector3(0,Height,-Height/Mathf.Tan(Pitch*Mathf.Deg2Rad));
                desired=ClampPosition(desired);
            }
            Vector3 next=Vector3.Lerp(transform.position, desired,1f-Mathf.Exp(-followSharpness*Time.deltaTime));
            if(production)next=ClampPosition(next);
            transform.position=next;
        }
        Vector3 ClampPosition(Vector3 position)
        {
            float groundOffset=Height/Mathf.Tan(Pitch*Mathf.Deg2Rad);
            position.x=(float)CameraFraming.Clamp(position.x,cameraComponent.orthographicSize*cameraComponent.aspect,34+(acceptedBaselineCamera?0:CameraFraming.HorizontalPadding));
            position.z=(float)CameraFraming.Clamp(position.z+groundOffset,cameraComponent.orthographicSize/Mathf.Sin(Pitch*Mathf.Deg2Rad),32+(acceptedBaselineCamera?0:CameraFraming.NorthSouthPadding))-groundOffset;
            return position;
        }
    }
}
