using UnityEditor;
using UnityEditor.Build;
using UnityEngine;
using Crownfall.Match;

namespace Crownfall.Editor
{
    public static class ProductionArtValidation
    {
        [MenuItem("Crownfall/Validate Production Art")]
        public static void Validate()
        {
            var art=AssetDatabase.LoadAssetAtPath<RosterPresentationCatalog>("Assets/Crownfall/Configuration/ProductionArt.asset");
            Require(art!=null,"Missing production catalog");
            foreach(var roster in new[]{art.kit,art.set,art.riven})
            {
                Require(roster!=null&&roster.height>0&&roster.run.Length==8&&roster.idle.Length>0,"Roster animation binding");
                foreach(var sequence in new[]{roster.idle,roster.run,roster.sideRun,roster.basicFront,roster.basicBack,roster.basicSide,roster.action,roster.ultimate})
                    foreach(var frame in sequence)Require(frame!=null,"Missing imported production frame");
            }
            Require(art.emberTrail!=null&&art.solarRing!=null&&art.lastFlame!=null&&art.expellantCast!=null&&art.expellantBlast!=null,"Kit effect art");
            Require(art.centerLogo!=null&&art.aetherMound!=null&&art.saintRose!=null&&art.waterfall!=null&&art.forest!=null,"Scenic production art");
            Require(art.arena!=null&&art.lane!=null&&art.title!=null&&art.scythes.Length==3,"Brand/reference/scythe art");
            foreach(string id in AssetDatabase.FindAssets("t:Texture2D",new[]{"Assets/Art"}))
            {
                var path=AssetDatabase.GUIDToAssetPath(id);var importer=AssetImporter.GetAtPath(path) as TextureImporter;
                Require(importer!=null&&!importer.isReadable&&!importer.mipmapEnabled&&importer.npotScale==TextureImporterNPOTScale.None,"Texture residency policy "+path);
                var web=importer.GetPlatformTextureSettings("WebGL");
                Require(web.overridden&&web.maxTextureSize<=1024&&web.format==TextureImporterFormat.RGBA32,"Explicit mobile WebGL policy "+path);
            }
            Require(AssetDatabase.LoadAssetAtPath<Material>("Assets/Crownfall/Match/Runtime/ProductionStone.mat")!=null,"Shared structural material missing");
            int assertions=Tests.ProductionPresentationTests.Run();
            Debug.Log("Production catalog/import policy and "+assertions+" presentation assertions passed. Play-mode rendering/device acceptance still required.");
        }
        static void Require(bool value,string message){if(!value)throw new BuildFailedException("Production: "+message);}
    }
}
