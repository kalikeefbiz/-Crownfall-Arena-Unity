using System.Collections.Generic;
using UnityEngine;

namespace Crownfall
{
    public enum TargetShape { Directional, Radial }
    public enum TargetPhase { Idle, Pressed, Holding, Dragging, Confirmed, Cancelled }
    public enum TargetAction { Press, Drag, Release, Cancel }
    // Preserve Right/Left numeric values for existing serialized data.
    public enum PresentationFacing { Right = 0, Left = 1, Front = 2, Back = 3 }

    public static class PresentationFacingUtility
    {
        public static PresentationFacing FromDirection(
            Vector3 direction,
            Vector3 cameraRight,
            Vector3 cameraForward,
            PresentationFacing fallback)
        {
            Vector3 flat = Vector3.ProjectOnPlane(direction, Vector3.up);
            if (flat.sqrMagnitude < 0.0001f) return fallback;
            flat.Normalize();

            float horizontal = Vector3.Dot(flat, cameraRight);
            float vertical = Vector3.Dot(flat, cameraForward);
            if (Mathf.Abs(horizontal) > Mathf.Abs(vertical))
                return horizontal < 0 ? PresentationFacing.Left : PresentationFacing.Right;
            return vertical < 0 ? PresentationFacing.Front : PresentationFacing.Back;
        }

        public static bool IsSide(PresentationFacing facing)
        { return facing == PresentationFacing.Left || facing == PresentationFacing.Right; }
    }

    public readonly struct TargetCommand
    {
        public readonly TargetAction Action;
        public readonly TargetShape Shape;
        public readonly Vector2 Offset;
        public TargetCommand(TargetAction action, TargetShape shape, Vector2 offset = default)
        { Action = action; Shape = shape; Offset = offset; }
    }

    // Device adapters supply intentions. They never move a Summoner or own its aim.
    public interface ISummonerInput
    {
        Vector2 Movement { get; }
        void Sample(List<TargetCommand> commands);
        void ResetInput();
    }

    public interface ISummonerViewState
    {
        Vector3 WorldPosition { get; }
        Vector3 Velocity { get; }
        Vector3 AimDirection { get; }
        PresentationFacing Facing { get; }
    }
}
