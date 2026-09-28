using System.Collections.Generic;
using UnityEngine;

namespace Crownfall
{
    public enum TargetShape { Directional, Radial }
    public enum TargetPhase { Idle, Pressed, Holding, Dragging, Confirmed, Cancelled }
    public enum TargetAction { Press, Drag, Release, Cancel }
    public enum PresentationFacing { Right, Left }

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
