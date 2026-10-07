using UnityEngine;

namespace Crownfall
{
    // Temporary acceptance-test overlay. No production HUD or browser UI.
    public sealed class M0Diagnostics : MonoBehaviour
    {
        PointerSummonerInput input;
        SummonerRoot pawn;
        PresentationSwitcher switcher;
        GUIStyle label, button;
        public void Bind(PointerSummonerInput adapter, SummonerRoot root, PresentationSwitcher views)
        { input = adapter; pawn = root; switcher = views; }
        void LateUpdate() { if (input != null && input.SwapRequested) switcher.Toggle(); }
        void OnGUI()
        {
            if (input == null) return;
            if (label == null)
            {
                label = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.UpperLeft, wordWrap = true };
                button = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.MiddleCenter, wordWrap = true };
            }
            float s = input.UIScale;
            label.fontSize = Mathf.RoundToInt(16*s); button.fontSize = Mathf.RoundToInt(18*s);
            Rect safe = Screen.safeArea;
            GUI.Box(new Rect(safe.xMin + 12*s, Screen.height - safe.yMax + 12*s, 590*s, 90*s),
                "Crownfall M0 | " + (switcher.UsesSprite ? "KIT SPRITE" : "3D PROXY") +
                "\nMove: left pad / WASD. Aim: hold + drag either right pad.\n" +
                pawn.Targeting.Phase + " | Selections: " + pawn.Targeting.ConfirmationCount +
                " | Facing: " + pawn.Facing + " | Direction: basic / Radial: preview", label);
            GUI.Box(input.MoveRect, "MOVE\nDrag", button);
            GUI.Box(input.BasicRect, "BASIC", button);
            GUI.Box(input.Skill1Rect, "SKILL 1", button);
            GUI.Box(input.Skill2Rect, "SKILL 2", button);
            GUI.Box(input.UltimateRect, "ULT", button);
            GUI.Box(input.RadialRect, "RADIAL\nTEST", button);
            GUI.Box(input.CancelRect, "CANCEL", button);
            GUI.Box(input.SwapRect, "SWAP PRESENTATION", button);
        }
    }
}
