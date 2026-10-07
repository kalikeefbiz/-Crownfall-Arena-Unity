using Crownfall.Combat;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Crownfall.Editor
{
    public sealed class M1Validation : IPreprocessBuildWithReport
    {
        public int callbackOrder => 10;
        public void OnPreprocessBuild(BuildReport report) { Validate(); }
        static void Require(bool value, string message)
        { if (!value) throw new BuildFailedException("M1: " + message); }

        [MenuItem("Crownfall/Validate M1")]
        public static void Validate()
        {
            var definition = AssetDatabase.LoadAssetAtPath<BasicAttackDefinition>("Assets/Crownfall/Configuration/KitBasicAttack.asset");
            Require(definition != null, "Missing Kit basic definition");
            var spec = definition.Snapshot();
            Require(Mathf.Approximately((float)spec.Range, 2.6f) && Mathf.Approximately(definition.coneDegrees, 117) &&
                Mathf.Approximately(definition.cooldown, .85f) && Mathf.Approximately(definition.comboWindow, 1.25f) &&
                spec.ComboCount == 2 && spec.Damage(0) == 85 && spec.Damage(1) == 105 &&
                spec.HitCount == 1 && spec.HitTime(0) == 0, "first-roster basic data drift");
            var art = AssetDatabase.LoadAssetAtPath<BasicSpriteSet>("Assets/Crownfall/Configuration/KitBasicSprites.asset");
            var locomotion = AssetDatabase.LoadAssetAtPath<KitSpriteSet>("Assets/Crownfall/Configuration/KitSpriteSet.asset");
            Require(art != null && art.frames.Length == 6 && art.framesPerSecond == 12 &&
                locomotion != null && art.frames[5] == locomotion.idle, "Six logical frames with reused idle");
            for (int i = 0; i < 6; i++)
            {
                string path = "Assets/Art/Characters/Kit/" + (i == 5 ? "Idle/idle.png" : "Basic/" + i.ToString("000") + ".png");
                Require(art.frames[i] != null && AssetDatabase.GetAssetPath(art.frames[i]) == path, "Basic frame order");
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                Require(importer != null && importer.textureType == TextureImporterType.Sprite &&
                    importer.spriteImportMode == SpriteImportMode.Single && importer.spritePixelsPerUnit == 500 &&
                    importer.alphaSource == TextureImporterAlphaSource.FromInput && importer.alphaIsTransparency &&
                    importer.DoesSourceTextureHaveAlpha() && importer.wrapMode == TextureWrapMode.Clamp &&
                    importer.textureCompression == TextureImporterCompression.Uncompressed, "Transparent sprite importer: " + path);
                Require(art.AtTime(i / 12.0) == art.frames[i], "Presentation cadence");
            }
            Require(art.AtTime(5) == locomotion.idle, "Nonlooping final frame");
            Debug.Log("M1: " + Tests.M1CombatTests.Run() + " combat assertions and Unity import/data/presentation checks passed.");
        }
    }
}
