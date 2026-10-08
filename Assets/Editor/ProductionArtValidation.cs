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
            ProductionUiDependencies.Validate();
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
            ValidateTexture(art.arena,"arena","Assets/Art/Production/Environment/Arena.PNG","6e491fb1106141f7a962c62344f50714");
            ValidateTexture(art.lane,"lane","Assets/Art/Production/Environment/Lane pov.PNG","c60fb46f31e5477cb4abd468dcc8c3a3");
            ValidateTexture(art.title,"title","Assets/Art/Production/UI/Title Logo.PNG","c3ee7635015148919eecd28d1da3bf0e");
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
        static void ValidateTexture(Texture2D texture,string field,string path,string expectedGuid)
        {
            var imported=AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            Require(imported!=null,"Texture2D import failed: "+path);
            Require(texture!=null&&texture==imported&&AssetDatabase.GetAssetPath(texture)==path,"Catalog Texture2D reference: "+field);
            Require(AssetDatabase.TryGetGUIDAndLocalFileIdentifier(texture,out string guid,out long fileId)&&guid==expectedGuid&&fileId==2800000,"Texture2D GUID/fileID: "+field);
            Require(AssetImporter.GetAtPath(path) is TextureImporter,"Expected TextureImporter: "+path);
        }
        static void Require(bool value,string message){if(!value)throw new BuildFailedException("Production: "+message);}
    }
}
