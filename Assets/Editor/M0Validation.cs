using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;

namespace Crownfall.Editor
{
    public static class M0Validation
    {
        [MenuItem("Crownfall/Validate M0")]
        public static void Validate()
        {
            var art = AssetDatabase.LoadAssetAtPath<KitSpriteSet>("Assets/Crownfall/Configuration/KitSpriteSet.asset");
            Require(art != null && art.idle != null && art.run != null && art.run.Length == 4, "Missing Kit art");
            Require(art.framesPerSecond > 0 && art.runThreshold > 0, "Invalid presentation tuning");
            var paths = new HashSet<string>();
            for (int i = 0; i < 5; i++)
            {
                Sprite sprite = i == 0 ? art.idle : art.run[i - 1];
                string expected = "Assets/Art/Characters/Kit/" +
                    (i == 0 ? "Idle/Front/idle.png" : "Run/" + (i - 1).ToString("000") + ".png");
                string path = AssetDatabase.GetAssetPath(sprite);
                Require(sprite != null && path == expected && paths.Add(path), "Kit order/duplicate: " + expected);
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                Require(importer != null && importer.textureType == TextureImporterType.Sprite &&
                    importer.spriteImportMode == SpriteImportMode.Single && importer.spritePixelsPerUnit == 500 &&
                    importer.npotScale == TextureImporterNPOTScale.None && !importer.isReadable &&
                    importer.alphaSource == TextureImporterAlphaSource.FromInput && importer.alphaIsTransparency &&
                    importer.wrapMode == TextureWrapMode.Clamp &&
                    importer.textureCompression == TextureImporterCompression.Uncompressed &&
                    importer.DoesSourceTextureHaveAlpha(),
                    "Kit import settings: " + path);
            }
            var tuning = AssetDatabase.LoadAssetAtPath<SummonerTuning>("Assets/Crownfall/Configuration/M0SummonerTuning.asset");
            Require(tuning != null && tuning.moveSpeed > 0 && tuning.gravity < 0 && tuning.previewRange > 0, "Invalid Summoner tuning");
            Require(AssetDatabase.LoadAssetAtPath<SceneAsset>("Assets/Scenes/M0.unity") != null, "Missing M0 scene");
            ValidateTargeting();
            Debug.Log("M0 asset order/import and targeting state-machine checks passed in Unity Editor.");
        }

        static void Require(bool condition, string message)
        { if (!condition) throw new BuildFailedException("M0 validation: " + message); }

        // Build-time behavioral gates using the actual gameplay class, not a copied model.
        static void ValidateTargeting()
        {
            var s = new TargetingSession(0.22f, 5f, 0.65f);
            void Send(TargetAction action, float time, Vector2 offset = default, TargetShape shape = TargetShape.Directional)
                => s.Apply(new TargetCommand(action, shape, offset), Vector3.right, Vector3.right, Vector3.forward, time);
            Send(TargetAction.Release, 0);
            Require(s.ConfirmationCount == 0, "Stray release confirmed");
            Send(TargetAction.Press, 0);
            Require(s.Active && s.ConfirmationCount == 0, "Press must not confirm");
            // An externally changed aim cannot change a quick tap's captured press direction.
            s.Apply(new TargetCommand(TargetAction.Release, TargetShape.Directional), Vector3.left,
                Vector3.right, Vector3.forward, 0.1f);
            Require(s.LastWasTap && s.Direction == Vector3.right && s.ConfirmationCount == 1, "Tap snapshot");
            Send(TargetAction.Release, 0.11f);
            Require(s.ConfirmationCount == 1, "Duplicate release");
            s.Tick(1);
            Require(s.Phase == TargetPhase.Idle && !s.Visible, "Confirmation timeout");
            Send(TargetAction.Press, 2);
            s.Tick(2.4f);
            Require(s.Phase == TargetPhase.Holding && s.ConfirmationCount == 1, "Hold must not confirm");
            Send(TargetAction.Drag, 2.5f, Vector2.left);
            Require(s.Phase == TargetPhase.Dragging && s.Direction == Vector3.left, "Drag direction");
            Send(TargetAction.Cancel, 2.6f);
            Send(TargetAction.Release, 2.7f);
            Require(s.Phase == TargetPhase.Cancelled && !s.Visible && s.ConfirmationCount == 1, "Cancel then release");
            Send(TargetAction.Press, 3, default, TargetShape.Radial);
            Send(TargetAction.Drag, 3.1f, new Vector2(0, 4), TargetShape.Radial);
            Require(s.Direction == Vector3.forward && Mathf.Approximately(s.Distance, 5), "Radial clamp");
            Send(TargetAction.Release, 3.2f, default, TargetShape.Directional);
            Require(s.Active, "Wrong channel release");
            Send(TargetAction.Release, 3.3f, default, TargetShape.Radial);
            Require(s.ConfirmationCount == 2 && !s.LastWasTap, "Radial release");
        }
    }
}
