using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Crownfall.Editor
{
    public sealed class FirstRosterBalanceValidation : IPreprocessBuildWithReport
    {
        public int callbackOrder => 7;
        public void OnPreprocessBuild(BuildReport report) { Validate(); }

        [MenuItem("Crownfall/Validate First Roster Balance")]
        public static void Validate()
        {
            int checks = Tests.FirstRosterBalanceTests.Run();
            Debug.Log("Crownfall First Roster Balance: " + checks + " assertions passed.");
        }
    }
}
