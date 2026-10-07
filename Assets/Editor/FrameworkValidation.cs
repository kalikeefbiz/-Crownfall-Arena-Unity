using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Crownfall.Editor
{
    /// <summary>
    /// Prebuild guard for shared combat/macro framework invariants.
    /// This is independent of milestone-specific presentation fixtures.
    /// </summary>
    public sealed class FrameworkValidation : IPreprocessBuildWithReport
    {
        public int callbackOrder => 5;

        public void OnPreprocessBuild(BuildReport report)
        {
            Validate();
        }

        [MenuItem("Crownfall/Validate Framework")]
        public static void Validate()
        {
            int surgeChecks = Tests.TerritorySurgeTests.Run();
            Debug.Log("Crownfall Framework: " + surgeChecks + " Surge policy assertions passed.");
        }
    }
}
