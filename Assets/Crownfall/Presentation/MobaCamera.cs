using UnityEngine;

namespace Crownfall
{
    public sealed class MobaCamera : MonoBehaviour
    {
        [SerializeField] Vector3 offset = new Vector3(0, 15, -12.5865f);
        [SerializeField, Min(0.01f)] float followSharpness = 9f;
        Transform target;
        Camera cameraComponent;
        bool production,alive=true,wasAlive=true,results;
        Vector3 look;
        public bool Frozen {get;set;}
        public void Bind(Transform follow)
        {
            target = follow;look=Vector3.zero;Frozen=false;
            if(target==null)return;
            transform.position = target.position + offset; transform.rotation = Quaternion.Euler(50, 0, 0);
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
            Vector3 desired=target.position+offset+look;
            if(production)
            {
                if(!alive&&!results)return;
                if(cameraComponent==null)cameraComponent=GetComponent<Camera>();
                float groundOffset=offset.y/Mathf.Tan(50*Mathf.Deg2Rad);
                if(results)desired=new Vector3(0,offset.y,-groundOffset);
                double depth=Match.PresentationMath.GroundDepth(cameraComponent.orthographicSize,50*Mathf.Deg2Rad);
                desired.x=(float)Match.PresentationMath.ClampCenter(desired.x,cameraComponent.orthographicSize*cameraComponent.aspect,34);
                desired.z=(float)Match.PresentationMath.ClampCenter(desired.z+groundOffset,depth,32)-groundOffset;
            }
            Vector3 next=Vector3.Lerp(transform.position, desired,1f-Mathf.Exp(-followSharpness*Time.deltaTime));
            if(production)
            {
                float groundOffset=offset.y/Mathf.Tan(50*Mathf.Deg2Rad);
                next.x=(float)Match.PresentationMath.ClampCenter(next.x,cameraComponent.orthographicSize*cameraComponent.aspect,34);
                next.z=(float)Match.PresentationMath.ClampCenter(next.z+groundOffset,Match.PresentationMath.GroundDepth(cameraComponent.orthographicSize,50*Mathf.Deg2Rad),32)-groundOffset;
            }
            transform.position=next;
        }
    }
}
