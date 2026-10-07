using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Crownfall.Editor
{
    public sealed class CombatEconomyValidation : IPreprocessBuildWithReport
    {
        public int callbackOrder => 6;
        public void OnPreprocessBuild(BuildReport report) { Validate(); }

        [MenuItem("Crownfall/Validate Combat Economy")]
        public static void Validate()
        {
            int checks = Tests.CombatEconomyTests.Run();
            Debug.Log("Crownfall Combat Economy: " + checks + " assertions passed.");
        }
    }
}
