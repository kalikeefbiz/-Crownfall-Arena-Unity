using System.Collections.Generic;
using UnityEngine;

namespace Crownfall
{
    // Native Unity touch/mouse adapter; replaceable by an Input System/gamepad adapter.
    // One captured pointer per channel. A movement finger never becomes an aim finger.
    public sealed class PointerSummonerInput : MonoBehaviour, ISummonerInput
    {
        [SerializeField, Range(0f, 0.5f)] float movementDeadZone = 0.12f;
        [SerializeField, Range(0.01f, 0.3f)] float dragThreshold = 0.08f;
        public Vector2 Movement { get; private set; }
        public bool SwapRequested { get; private set; }
        public Rect MoveRect { get; private set; }
        public Rect DirectionRect { get; private set; }
        public Rect RadialRect { get; private set; }
        public Rect CancelRect { get; private set; }
        public Rect SwapRect { get; private set; }
        public float UIScale { get; private set; }
        const int None = int.MinValue;
        int moveId = None, aimId = None;
        Vector2 moveOrigin, aimOrigin;
        TargetShape aimShape;
        bool dragged;
        bool pendingCancel;
        int lastWidth, lastHeight;
        Rect lastSafeArea;
        float radius;

        void Awake()
        {
            UnityEngine.Input.simulateMouseWithTouches = false;
            UnityEngine.Input.multiTouchEnabled = true;
            UpdateLayout();
        }

        public void Sample(List<TargetCommand> commands)
        {
            SwapRequested = false;
            if (Screen.width != lastWidth || Screen.height != lastHeight || Screen.safeArea != lastSafeArea)
            { ResetInput(); UpdateLayout(); }
            if (pendingCancel) { commands.Add(new TargetCommand(TargetAction.Cancel, aimShape)); pendingCancel = false; }
            bool sawMove = false, sawAim = false;
            if (UnityEngine.Input.touchCount > 0)
            {
                for (int i = 0; i < UnityEngine.Input.touchCount; i++)
                {
                    Touch t = UnityEngine.Input.GetTouch(i);
                    if (t.fingerId == moveId) sawMove = true;
                    if (t.fingerId == aimId) sawAim = true;
                    if (t.phase == TouchPhase.Began) Begin(t.fingerId, t.position, commands);
                    else if (t.phase == TouchPhase.Canceled) End(t.fingerId, t.position, true, commands);
                    else if (t.phase == TouchPhase.Ended) End(t.fingerId, t.position, false, commands);
                    else Drag(t.fingerId, t.position, commands);
                    if (t.fingerId == moveId) sawMove = true;
                    if (t.fingerId == aimId) sawAim = true;
                }
                if (moveId != None && !sawMove) { moveId = None; Movement = Vector2.zero; }
                if (aimId != None && !sawAim) CancelAim(commands);
            }
            else
            {
                // A disappeared touch cannot silently become a mouse press.
                if (moveId >= 0) { moveId = None; Movement = Vector2.zero; }
                if (aimId >= 0) CancelAim(commands);
                Vector2 position = UnityEngine.Input.mousePosition;
                if (UnityEngine.Input.GetMouseButtonDown(0)) Begin(-1, position, commands);
                else if (UnityEngine.Input.GetMouseButtonUp(0)) End(-1, position, false, commands);
                else if (UnityEngine.Input.GetMouseButton(0)) Drag(-1, position, commands);
                if (moveId == None)
                {
                    Movement = Vector2.ClampMagnitude(new Vector2(
                        (Key(KeyCode.D) || Key(KeyCode.RightArrow) ? 1 : 0) - (Key(KeyCode.A) || Key(KeyCode.LeftArrow) ? 1 : 0),
                        (Key(KeyCode.W) || Key(KeyCode.UpArrow) ? 1 : 0) - (Key(KeyCode.S) || Key(KeyCode.DownArrow) ? 1 : 0)), 1);
                }
            }
            if (UnityEngine.Input.GetKeyDown(KeyCode.Escape)) CancelAim(commands);
            if (UnityEngine.Input.GetKeyDown(KeyCode.Tab)) SwapRequested = true;
        }

        static bool Key(KeyCode code) => UnityEngine.Input.GetKey(code);
        static Vector2 GUIPosition(Vector2 position) => new Vector2(position.x, Screen.height - position.y);

        void Begin(int id, Vector2 position, List<TargetCommand> commands)
        {
            Vector2 gui = GUIPosition(position);
            if (CancelRect.Contains(gui)) { CancelAim(commands); return; }
            if (SwapRect.Contains(gui)) { SwapRequested = true; return; }
            if (MoveRect.Contains(gui) && moveId == None)
            { moveId = id; moveOrigin = position; Movement = Vector2.zero; return; }
            if (aimId != None) return;
            if (!DirectionRect.Contains(gui) && !RadialRect.Contains(gui)) return;
            aimId = id;
            aimOrigin = position;
            aimShape = DirectionRect.Contains(gui) ? TargetShape.Directional : TargetShape.Radial;
            dragged = false;
            commands.Add(new TargetCommand(TargetAction.Press, aimShape));
        }

        void Drag(int id, Vector2 position, List<TargetCommand> commands)
        {
            if (id == moveId)
            {
                Vector2 delta = (position - moveOrigin) / radius;
                float magnitude = Mathf.Clamp01(delta.magnitude);
                Movement = magnitude <= movementDeadZone ? Vector2.zero : delta.normalized *
                    ((magnitude - movementDeadZone) / (1f - movementDeadZone));
            }
            if (id != aimId) return;
            if (CancelRect.Contains(GUIPosition(position))) { CancelAim(commands); return; }
            Vector2 offset = (position - aimOrigin) / radius;
            if (offset.magnitude >= dragThreshold) dragged = true;
            if (dragged && offset.sqrMagnitude > 0.0001f)
                commands.Add(new TargetCommand(TargetAction.Drag, aimShape, Vector2.ClampMagnitude(offset, 1)));
        }

        void End(int id, Vector2 position, bool cancelled, List<TargetCommand> commands)
        {
            if (id == moveId) { moveId = None; Movement = Vector2.zero; }
            if (id != aimId) return;
            if (cancelled || CancelRect.Contains(GUIPosition(position))) { CancelAim(commands); return; }
            Drag(id, position, commands);
            if (id == aimId) commands.Add(new TargetCommand(TargetAction.Release, aimShape));
            aimId = None;
        }

        void CancelAim(List<TargetCommand> commands)
        {
            commands.Add(new TargetCommand(TargetAction.Cancel, aimShape));
            aimId = None;
            dragged = false;
        }

        public void ResetInput()
        { pendingCancel = true; moveId = aimId = None; Movement = Vector2.zero; dragged = false; }
        void OnApplicationFocus(bool focused) { if (!focused) ResetInput(); }
        void OnApplicationPause(bool paused) { if (paused) ResetInput(); }
        void OnDisable() => ResetInput();

        void UpdateLayout()
        {
            lastWidth = Screen.width; lastHeight = Screen.height; lastSafeArea = Screen.safeArea;
            Rect safe = Screen.safeArea;
            UIScale = Mathf.Max(0.4f, Mathf.Min(safe.width / 960f, safe.height / 540f));
            float s = UIScale, left = safe.xMin, top = Screen.height - safe.yMax;
            float bottom = top + safe.height, right = safe.xMax;
            radius = 90 * s;
            MoveRect = new Rect(left + 16*s, bottom - 200*s, 190*s, 180*s);
            DirectionRect = new Rect(right - 244*s, bottom - 122*s, 108*s, 102*s);
            RadialRect = new Rect(right - 124*s, bottom - 122*s, 108*s, 102*s);
            CancelRect = new Rect(right - 124*s, bottom - 200*s, 108*s, 62*s);
            SwapRect = new Rect(right - 204*s, top + 12*s, 188*s, 50*s);
        }
    }
}
