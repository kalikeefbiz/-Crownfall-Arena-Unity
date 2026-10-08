using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
using Crownfall.Match;

namespace Crownfall.Editor
{
    public static class CompleteMatchValidation
    {
        [MenuItem("Crownfall/Validate Complete Match")]
        public static void Validate()
        {
            if(AssetDatabase.LoadAssetAtPath<SceneAsset>("Assets/Scenes/CrownfallMatch.unity")==null)
                throw new BuildFailedException("Complete Crownfall match scene missing");
            var basic=AssetDatabase.LoadAssetAtPath<Combat.BasicAttackDefinition>("Assets/Crownfall/Configuration/KitBasicAttack.asset");
            if(basic==null)throw new BuildFailedException("Serialized Kit basic definition missing");
            var match=new MatchSimulation(Combat.FirstRosterSummoner.Kit,basic.Snapshot());
            if(match.Actors.Count!=6||match.Camps.Count!=7)throw new BuildFailedException("Invalid match composition");
            int checks=Tests.CompleteMatchTests.Run();
            Debug.Log("Complete Crownfall match: "+checks+" gameplay assertions passed.");
        }
    }
}
