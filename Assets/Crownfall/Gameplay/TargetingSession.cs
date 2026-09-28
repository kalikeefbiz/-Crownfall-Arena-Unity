using UnityEngine;

namespace Crownfall
{
    // Non-damaging selection state machine. No ability execution, scene or input API.
    public sealed class TargetingSession
    {
        public TargetPhase Phase { get; private set; }
        public TargetShape Shape { get; private set; }
        public Vector3 Direction { get; private set; } = Vector3.right;
        public float Distance { get; private set; }
        public int ConfirmationCount { get; private set; }
        public bool Active => Phase == TargetPhase.Pressed || Phase == TargetPhase.Holding || Phase == TargetPhase.Dragging;
        public bool Visible => Active || Phase == TargetPhase.Confirmed;
        public bool LastWasTap { get; private set; }
        readonly float holdSeconds, range, feedbackSeconds;
        Vector3 pressDirection;
        float pressedAt, finishedAt;

        public TargetingSession(float holdSeconds, float range, float feedbackSeconds)
        {
            this.holdSeconds = Mathf.Max(0.05f, holdSeconds);
            this.range = Mathf.Max(0.1f, range);
            this.feedbackSeconds = Mathf.Max(0.05f, feedbackSeconds);
        }

        public void Apply(TargetCommand command, Vector3 aim, Vector3 right, Vector3 forward, float now)
        {
            if (command.Action == TargetAction.Cancel) { Cancel(now); return; }
            if (command.Action == TargetAction.Press)
            {
                if (Active) return;
                Shape = command.Shape;
                pressDirection = aim.normalized;
                Direction = pressDirection;
                Distance = range * 0.5f;
                pressedAt = now;
                Phase = TargetPhase.Pressed;
                return;
            }
            if (!Active || command.Shape != Shape) return;
            if (command.Action == TargetAction.Drag && command.Offset.sqrMagnitude > 0.0001f)
            {
                Direction = (right * command.Offset.x + forward * command.Offset.y).normalized;
                Distance = Mathf.Clamp01(command.Offset.magnitude) * range;
                Phase = TargetPhase.Dragging;
            }
            if (command.Action == TargetAction.Release)
            {
                LastWasTap = Phase == TargetPhase.Pressed && now - pressedAt < holdSeconds;
                if (LastWasTap) Direction = pressDirection;
                Phase = TargetPhase.Confirmed;
                finishedAt = now;
                ConfirmationCount++;
            }
        }

        public void Tick(float now)
        {
            if (Phase == TargetPhase.Pressed && now - pressedAt >= holdSeconds) Phase = TargetPhase.Holding;
            if ((Phase == TargetPhase.Confirmed || Phase == TargetPhase.Cancelled) && now - finishedAt >= feedbackSeconds)
                Phase = TargetPhase.Idle;
        }

        public void Cancel(float now)
        {
            if (!Active) return;
            Phase = TargetPhase.Cancelled;
            finishedAt = now;
        }
    }
}
