using System.Collections.Generic;
using UnityEngine;

namespace Crownfall
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class SummonerRoot : MonoBehaviour, ISummonerViewState
    {
        [SerializeField, Min(0.1f)] float moveSpeed = 5f;
        [SerializeField] float gravity = -24f;
        [SerializeField, Min(0.05f)] float holdSeconds = 0.22f;
        [SerializeField, Min(0.1f)] float previewRange = 5f;
        [SerializeField, Min(0.05f)] float confirmationSeconds = 0.65f;
        public Vector3 WorldPosition => transform.position;
        public Vector3 Velocity { get; private set; }
        public Vector3 AimDirection { get; private set; } = Vector3.right;
        public PresentationFacing Facing { get; private set; } = PresentationFacing.Right;
        public TargetingSession Targeting { get; private set; }
        public float PreviewRange => previewRange;
        public Vector3 InputRight { get; private set; } = Vector3.right;
        public Vector3 InputForward { get; private set; } = Vector3.forward;
        ISummonerInput input;
        CharacterController motor;
        float verticalSpeed;
        readonly List<TargetCommand> commands = new List<TargetCommand>(8);

        void Awake()
        {
            motor = GetComponent<CharacterController>();
            Targeting = new TargetingSession(holdSeconds, previewRange, confirmationSeconds);
        }

        public void Configure(SummonerTuning tuning)
        {
            moveSpeed = tuning.moveSpeed; gravity = tuning.gravity;
            holdSeconds = tuning.holdSeconds; previewRange = tuning.previewRange;
            confirmationSeconds = tuning.confirmationSeconds;
            Targeting = new TargetingSession(holdSeconds, previewRange, confirmationSeconds);
        }

        public void BindInput(ISummonerInput source, Camera camera)
        {
            input?.ResetInput();
            input = source;
            InputRight = Vector3.ProjectOnPlane(camera.transform.right, Vector3.up).normalized;
            InputForward = Vector3.ProjectOnPlane(camera.transform.forward, Vector3.up).normalized;
        }

        // Explicit gameplay policy seam; future rules can set facing independently of aim/movement.
        public void SetPresentationFacing(PresentationFacing facing) => Facing = facing;

        void Update()
        {
            if (input == null) return;
            commands.Clear();
            input.Sample(commands);
            float now = Time.unscaledTime;
            Targeting.Tick(now);
            foreach (var command in commands)
                Targeting.Apply(command, AimDirection, InputRight, InputForward, now);
            if (Targeting.Active || Targeting.Phase == TargetPhase.Confirmed)
            {
                AimDirection = Targeting.Direction;
                float side = Vector3.Dot(AimDirection, InputRight);
                if (Mathf.Abs(side) > 0.05f)
                    SetPresentationFacing(side < 0 ? PresentationFacing.Left : PresentationFacing.Right);
            }

            Vector2 move = Vector2.ClampMagnitude(input.Movement, 1f);
            Vector3 horizontal = (InputRight * move.x + InputForward * move.y) * moveSpeed;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            if (motor.isGrounded && verticalSpeed < 0) verticalSpeed = -2f;
            verticalSpeed += gravity * dt;
            Vector3 before = transform.position;
            motor.Move((horizontal + Vector3.up * verticalSpeed) * dt);
            Velocity = dt > 0 ? Vector3.ProjectOnPlane(transform.position - before, Vector3.up) / dt : Vector3.zero;
        }

        void StopInput()
        {
            input?.ResetInput();
            Targeting?.Cancel(Time.unscaledTime);
            Velocity = Vector3.zero;
            verticalSpeed = 0;
        }
        void OnApplicationFocus(bool focused) { if (!focused) StopInput(); }
        void OnApplicationPause(bool paused) { if (paused) StopInput(); }
        void OnDisable() => StopInput();
    }
}
