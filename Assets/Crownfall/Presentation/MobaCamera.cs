using UnityEngine;
using Unity.Cinemachine;
using Crownfall.EnvironmentPresentation;

namespace Crownfall
{
    // Match lifecycle adapter only. Cinemachine owns position, damping and projection.
    [RequireComponent(typeof(Camera))]
    public sealed class MobaCamera : MonoBehaviour
    {
        Transform target;
        GameObject rig, resultsAnchor;
        CinemachineBrain brain;
        CinemachineCamera shot;
        CinemachinePositionComposer composer;
        bool alive=true, wasAlive=true, results;
        public bool Frozen { get; set; }

        public void ConfigurePresentation()
        {
            if (shot != null) return;
            var cameraComponent=GetComponent<Camera>();
            cameraComponent.orthographic=true;
            brain=gameObject.AddComponent<CinemachineBrain>();
            // Simulation/motor sync happens in Update. A single manual LateUpdate lets
            // pause and death hold the exact shot without moving the gameplay target.
            brain.UpdateMethod=CinemachineBrain.UpdateMethods.ManualUpdate;
            brain.DefaultBlend=new CinemachineBlendDefinition(CinemachineBlendDefinition.Styles.Cut,0);
            brain.LensModeOverride=new CinemachineBrain.LensModeOverrideSettings
            { Enabled=true, DefaultMode=LensSettings.OverrideModes.Orthographic };
            rig=new GameObject("Crownfall Cinemachine player shot");
            rig.transform.rotation=Quaternion.Euler((float)CameraFraming.PlayerPitch,0,0);
            shot=rig.AddComponent<CinemachineCamera>();
            shot.Lens.OrthographicSize=(float)CameraFraming.PlayerHalfHeight;
            shot.Lens.NearClipPlane=.1f;shot.Lens.FarClipPlane=150;
            shot.Lens.ModeOverride=LensSettings.OverrideModes.Orthographic;
            composer=rig.AddComponent<CinemachinePositionComposer>();
            composer.CameraDistance=(float)CameraFraming.PlayerDistance;
            composer.TargetOffset=Vector3.up;
            composer.Damping=new Vector3(.25f,.25f,.25f);
            composer.Composition=new ScreenComposerSettings
            {
                ScreenPosition=Vector2.zero,
                DeadZone=new ScreenComposerSettings.DeadZoneSettings { Enabled=false },
                HardLimits=new ScreenComposerSettings.HardLimitSettings
                { Enabled=true, Size=new Vector2(.6f,.6f), Offset=Vector2.zero }
            };
            composer.CenterOnActivate=true;
            // The authoritative actor bounds already constrain the tracking target.
            // Do not shrink them by viewport width: that immobilizes wide-phone shots.
            resultsAnchor=new GameObject("Crownfall results focus");
            shot.enabled=false;
        }

        public void Bind(Transform follow)
        {
            ConfigurePresentation();
            target=follow;alive=wasAlive=true;results=false;Frozen=false;
            composer.TargetOffset=Vector3.up;
            shot.Follow=target;shot.PreviousStateIsValid=false;
            shot.enabled=target!=null;
        }

        public void Present(Match.MatchEntity actor,bool result,bool targeting)
        {
            alive=actor.Alive;results=result;
            if(alive&&!wasAlive)shot.PreviousStateIsValid=false;
            wasAlive=alive;
            shot.Follow=results?resultsAnchor.transform:target;
            // Preserve the small aiming lead, with Composer supplying its damping.
            composer.TargetOffset=Vector3.up+(alive&&!results&&targeting?
                new Vector3((float)actor.Aim.X,0,(float)actor.Aim.Z)*.6f:Vector3.zero);
        }

        void LateUpdate()
        {
            if(target==null||Frozen||(!alive&&!results))return;
            brain.ManualUpdate();
        }

        void OnDestroy()
        {
            // The virtual camera must not be parented to the camera it drives.
            if(rig!=null){rig.SetActive(false);if(Application.isPlaying)Destroy(rig);else DestroyImmediate(rig);}
            if(resultsAnchor!=null){if(Application.isPlaying)Destroy(resultsAnchor);else DestroyImmediate(resultsAnchor);}
        }
    }
}
