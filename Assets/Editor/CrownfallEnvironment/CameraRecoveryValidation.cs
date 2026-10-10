using System;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using Unity.Cinemachine;
using Crownfall.Match;

namespace Crownfall.EnvironmentLab.Editor
{
    // Run inside the exact Editor. These checks exercise the actual Cinemachine pipeline,
    // not a second implementation of its projection or confinement mathematics.
    public static class CameraRecoveryValidation
    {
        static void Require(bool ok,string message)
        { if(!ok)throw new InvalidOperationException("Camera recovery: "+message); }

        [MenuItem("Crownfall/Camera recovery/Validate native tracking")]
        public static void Projection()
        {
            var node=new GameObject("Recovery projection test camera");
            var target=new GameObject("Recovery tracking subject");
            var camera=node.AddComponent<Camera>();
            var follow=node.AddComponent<Crownfall.MobaCamera>();
            var match=new MatchSimulation(Crownfall.Combat.FirstRosterSummoner.Kit);
            var late=typeof(Crownfall.MobaCamera).GetMethod("LateUpdate",BindingFlags.Instance|BindingFlags.NonPublic);
            try
            {
                follow.Bind(target.transform);
                var brain=node.GetComponent<CinemachineBrain>();
                var shot=UnityEngine.Object.FindFirstObjectByType<CinemachineCamera>();
                // Resolve our camera by target; other open scenes may have virtual cameras.
                foreach(var candidate in UnityEngine.Object.FindObjectsByType<CinemachineCamera>(FindObjectsSortMode.None))
                    if(candidate.Follow==target.transform)shot=candidate;
                Require(shot!=null&&shot.Follow==target.transform,"human target not bound");
                int frame=Time.frameCount+1;
                foreach(float aspect in new[]{4f/3,16f/9,19.5f/9,21f/9})
                {
                    camera.aspect=aspect;
                    foreach(float z in new[]{-30f,-6f,0f,6f,30f})
                    {
                        float previousX=float.NegativeInfinity;
                        foreach(float x in new[]{-32f,-20f,0f,20f,32f})
                        {
                            target.transform.position=new Vector3(x,.04f,z);
                            // Settle with real damping, rather than invalidating state at each position.
                            for(int i=0;i<180;i++)brain.ManualUpdate(frame++,1f/60);
                            Require(camera.transform.position.x>previousX+1,"camera immobilized at boundary");
                            previousX=camera.transform.position.x;
                            var human=camera.WorldToViewportPoint(target.transform.position);
                            Require(Mathf.Abs(human.x-.5f)<.03f&&human.y>.4f&&human.y<.55f,"human composition lost");
                            Require(camera.orthographic,"unexpected projection mode");
                            Require(Quaternion.Angle(camera.transform.rotation,Quaternion.Euler(40,0,0))<.01f,"fixed heading drift");
                            foreach(var point in new[]{target.transform.position+new Vector3(0,0,-6),target.transform.position+new Vector3(0,0,6),target.transform.position+new Vector3(6,0,0)})
                            {
                                var ground=new Vector3(point.x,0,point.z);
                                var projected=camera.WorldToViewportPoint(ground);
                                Require(projected.x>0&&projected.x<1&&projected.y>0&&projected.y<1&&projected.z>0,"nearby engagement outside frame");
                                var ray=camera.ViewportPointToRay(projected);float distance;
                                Require(new Plane(Vector3.up,Vector3.zero).Raycast(ray,out distance)&&Vector3.Distance(ray.GetPoint(distance),ground)<.002f,"aim ground round trip");
                            }
                        }
                    }
                }
                var before=camera.transform.position;
                follow.Frozen=true;target.transform.position=Vector3.zero;late.Invoke(follow,null);
                Require(camera.transform.position==before,"pause moved camera");
                follow.Frozen=false;match.Human.Health.Receive(new Crownfall.Combat.DamageRequest(999,2,1,0,100000));follow.Present(match.Human,false,false);late.Invoke(follow,null);
                Require(camera.transform.position==before,"death moved camera");
                match.Human.Health=new Crownfall.Combat.HealthState(match.Human.Id,match.Human.Team,1000);follow.Present(match.Human,false,false);
                Require(!shot.PreviousStateIsValid,"respawn retained stale damping");
                brain.ManualUpdate(frame++,1f/60);
                Require(Mathf.Abs(camera.WorldToViewportPoint(target.transform.position).x-.5f)<.03f,"respawn not reframed");
                follow.Present(match.Human,true,false);
                Require(shot.Follow!=target.transform&&shot.Follow.position==Vector3.zero,"results focus missing");
                follow.Bind(null);Require(!shot.enabled,"reset left virtual camera active");
                follow.Bind(target.transform);Require(shot.enabled&&shot.Follow==target.transform&&!shot.PreviousStateIsValid,"replay binding stale");
                Require(target.GetComponents<Component>().Length==1,"camera changed gameplay authority");
                Debug.Log("PASS native Cinemachine tracking: 100 positions, four aspects, ground rays, pause/death/respawn/results/reset");
            }
            finally {UnityEngine.Object.DestroyImmediate(node);UnityEngine.Object.DestroyImmediate(target);}
        }
    }
}
