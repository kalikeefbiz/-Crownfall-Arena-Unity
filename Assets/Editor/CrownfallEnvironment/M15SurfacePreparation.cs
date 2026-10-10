using System;
using System.IO;
using System.Linq;
using Crownfall.EnvironmentPresentation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Crownfall.EnvironmentLab.Editor
{
    public static class M15SurfacePreparation
    {
        public const string Stone="Assets/Art/Environment/External/SharedTextures/T_UnevenBrick_BaseColor.png";
        public const string Normal="Assets/Art/Environment/External/SharedTextures/T_UnevenBrick_Normal.png";
        public const string Ground="Assets/Art/Environment/External/SharedTextures/T_RockFace03_Color.jpg";
        public const string Forest="Assets/Art/Environment/External/SharedTextures/T_ForestGround04_Color.jpg";
        const string MeshPath=EnvironmentPaths.Generated+"WorldContinuation.asset";
        const string MaterialPath=EnvironmentPaths.Generated+"Materials/WorldSurface.mat";
        public const string NodeName="World continuation (no collision)";
        public static Material Generate(Transform parent)
        {
            var shader=Shader.Find("Crownfall/Environment/World Surface");
            EnvironmentPaths.Require(shader!=null&&!ShaderUtil.ShaderHasError(shader),"M15 world surface shader cannot compile");
            var material=AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if(material==null){material=new Material(shader);AssetDatabase.CreateAsset(material,MaterialPath);}
            material.shader=shader;material.enableInstancing=true;
            material.SetTexture("_StoneTex",AssetDatabase.LoadAssetAtPath<Texture2D>(Stone));
            material.SetTexture("_StoneNormal",AssetDatabase.LoadAssetAtPath<Texture2D>(Normal));
            material.SetTexture("_GroundTex",AssetDatabase.LoadAssetAtPath<Texture2D>(Ground));
            material.SetTexture("_ForestTex",AssetDatabase.LoadAssetAtPath<Texture2D>(Forest));
            EditorUtility.SetDirty(material);
            var mesh=AssetDatabase.LoadAssetAtPath<Mesh>(MeshPath);
            bool newMesh=mesh==null;
            if(newMesh)mesh=new Mesh();else mesh.Clear();
            mesh.name="Renderer-only exterior terrain apron";
            int stride=WorldContinuation.Steps+1,perStrip=stride*stride;
            var vertices=new Vector3[perStrip*WorldContinuation.StripCount];var uv=new Vector2[vertices.Length];
            var triangles=new int[WorldContinuation.Steps*WorldContinuation.Steps*6*WorldContinuation.StripCount];int at=0;
            for(int side=0;side<WorldContinuation.StripCount;side++)
            {
                var corners=WorldContinuation.Strip(side);
                for(int z=0;z<stride;z++)for(int x=0;x<stride;x++)
                {
                    double px=corners[0][0]+(corners[1][0]-corners[0][0])*x/WorldContinuation.Steps;
                    double pz=corners[0][1]+(corners[1][1]-corners[0][1])*z/WorldContinuation.Steps;
                    int i=side*perStrip+z*stride+x;
                    vertices[i]=new Vector3((float)px,(float)WorldContinuation.Height(side,px,pz),(float)pz);uv[i]=new Vector2((float)px/8,(float)pz/8);
                    if(x==WorldContinuation.Steps||z==WorldContinuation.Steps)continue;
                    triangles[at++]=i;triangles[at++]=i+stride;triangles[at++]=i+1;
                    triangles[at++]=i+1;triangles[at++]=i+stride;triangles[at++]=i+stride+1;
                }
            }
            mesh.vertices=vertices;mesh.uv=uv;mesh.triangles=triangles;mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();
            if(newMesh)AssetDatabase.CreateAsset(mesh,MeshPath);
            EditorUtility.SetDirty(mesh);
            var node=new GameObject(NodeName);node.transform.SetParent(parent,false);
            node.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=node.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;
            renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=true;
            return material;
        }
        public static void Bind(WildernessLibrary library,Material surface)
        {
            library.worldSurface=surface;library.laneStone=AssetDatabase.LoadAssetAtPath<Texture2D>(Stone);library.laneNormal=AssetDatabase.LoadAssetAtPath<Texture2D>(Normal);library.groundDetail=AssetDatabase.LoadAssetAtPath<Texture2D>(Ground);library.forestFloor=AssetDatabase.LoadAssetAtPath<Texture2D>(Forest);
            library.retainingStone=AssetDatabase.LoadAssetAtPath<Material>(EnvironmentPaths.MaterialPath("qn_Rocks"));
        }
        public static void Validate(WildernessLibrary library)
        {
            EnvironmentPaths.Require(library.worldSurface!=null&&library.worldSurface.shader!=null&&library.worldSurface.shader.name=="Crownfall/Environment/World Surface"&&!ShaderUtil.ShaderHasError(library.worldSurface.shader),"M15 shared world material missing/invalid; regenerate wilderness");
            EnvironmentPaths.Require(library.laneStone!=null&&AssetDatabase.GetAssetPath(library.laneStone)==Stone&&library.laneNormal!=null&&AssetDatabase.GetAssetPath(library.laneNormal)==Normal,"M15 shared stone dependencies missing/wrong");
            EnvironmentPaths.Require(library.worldSurface.GetTexture("_StoneTex")==library.laneStone&&library.worldSurface.GetTexture("_StoneNormal")==library.laneNormal,"M15 world surface texture references invalid");
            EnvironmentPaths.Require(library.retainingStone!=null&&AssetDatabase.GetAssetPath(library.retainingStone)==EnvironmentPaths.MaterialPath("qn_Rocks")&&library.retainingStone.shader!=null&&!ShaderUtil.ShaderHasError(library.retainingStone.shader)&&library.retainingStone.GetTexture("_GeoTex")==library.groundDetail,"M15.1 authoritative wall visual material missing/invalid; regenerate wilderness");
            EnvironmentPaths.Require(library.groundDetail!=null&&AssetDatabase.GetAssetPath(library.groundDetail)==Ground&&library.worldSurface.GetTexture("_GroundTex")==library.groundDetail,"M15.1 geological surface dependency invalid");
            EnvironmentPaths.Require(library.forestFloor!=null&&AssetDatabase.GetAssetPath(library.forestFloor)==Forest&&library.worldSurface.GetTexture("_ForestTex")==library.forestFloor,"M15.1 CC0 forest-floor dependency missing: "+Forest);
            foreach(var prefabRenderer in library.presentationPrefab.GetComponentsInChildren<MeshRenderer>(true))
                foreach(var material in prefabRenderer.sharedMaterials)
                    if(material!=null&&material.HasProperty("_GeoTex"))
                        EnvironmentPaths.Require(material.GetTexture("_GeoTex")==library.groundDetail,"M15.1 missing geological/Aether material dependency: "+material.name);
            var shader=Shader.Find("Crownfall/Territory Flow");
            EnvironmentPaths.Require(shader!=null&&!ShaderUtil.ShaderHasError(shader),"M15 territory surface shader missing/compile error");
            var node=library.presentationPrefab.transform.Find(NodeName);
            EnvironmentPaths.Require(node!=null,"M15 exterior terrain is missing");
            var filter=node.GetComponent<MeshFilter>();var renderer=node.GetComponent<MeshRenderer>();
            EnvironmentPaths.Require(filter!=null&&filter.sharedMesh!=null&&renderer!=null&&renderer.enabled&&renderer.sharedMaterial==library.worldSurface,"M15 exterior terrain mesh/material reference is invalid");
            EnvironmentPaths.Require(filter.sharedMesh.GetIndexCount(0)==WorldContinuation.Steps*WorldContinuation.Steps*6*WorldContinuation.StripCount,"M15 exterior mesh generation version mismatch");
            var terrainVertices=filter.sharedMesh.vertices;
            EnvironmentPaths.Require(terrainVertices.Length==(WorldContinuation.Steps+1)*(WorldContinuation.Steps+1)*WorldContinuation.StripCount,"M15.1 terrain vertex generation mismatch");
            for(int i=0;i<terrainVertices.Length;i++)
            {
                var vertex=terrainVertices[i];int side=i/((WorldContinuation.Steps+1)*(WorldContinuation.Steps+1));
                bool baseSheet=side==6;
                EnvironmentPaths.Require((baseSheet?Mathf.Abs(vertex.x)<=34.001f&&Mathf.Abs(vertex.z)<=32.001f:Mathf.Abs(vertex.x)>=33.999f||Mathf.Abs(vertex.z)>=12.499f)&&
                    Mathf.Abs(vertex.y-(float)WorldContinuation.Height(side,vertex.x,vertex.z))<.002f,
                    "M15.1 derived terrain enters protected lane or has stale floor/height data; regenerate "+MeshPath);
            }
            // Inspect the actual scene bindings safely in an additive scene; leave the shipping scene byte-identical.
            const string path="Assets/Scenes/CrownfallMatch.unity";
            var prior=UnityEngine.SceneManagement.SceneManager.GetActiveScene();var existing=UnityEngine.SceneManagement.SceneManager.GetSceneByPath(path);
            bool opened=!existing.isLoaded;var scene=opened?EditorSceneManager.OpenScene(path,OpenSceneMode.Additive):existing;
            try
            {
                var bootstraps=scene.GetRootGameObjects().SelectMany(r=>r.GetComponentsInChildren<Crownfall.Match.CrownfallMatchBootstrap>(true)).ToArray();
                EnvironmentPaths.Require(bootstraps.Length==1,"Expected one shipping CrownfallMatchBootstrap binding");
                var serialized=new SerializedObject(bootstraps[0]);
                foreach(var property in new[]{"productionArt","productionStone","territoryMaterial","spriteMaterial"})
                    EnvironmentPaths.Require(serialized.FindProperty(property)!=null&&serialized.FindProperty(property).objectReferenceValue!=null,"Missing shipping bootstrap dependency: "+property);
                var territory=serialized.FindProperty("territoryMaterial").objectReferenceValue as Material;
                EnvironmentPaths.Require(territory!=null&&territory.shader==shader&&territory.HasProperty("_StoneTex")&&territory.HasProperty("_StoneNormal")&&territory.HasProperty("_GroundTex")&&territory.HasProperty("_ForestTex"),"Shipping territory template is incompatible with M15 stone binding");
            }
            finally {if(prior.IsValid()&&prior.isLoaded)UnityEngine.SceneManagement.SceneManager.SetActiveScene(prior);if(opened)EditorSceneManager.CloseScene(scene,true);}
            Crownfall.Tests.M15PresentationTests.Run();
            ValidateNativeProjection();
        }
        static void ValidateNativeProjection()
        {
            CameraRecoveryValidation.Projection();
        }
    }
}
