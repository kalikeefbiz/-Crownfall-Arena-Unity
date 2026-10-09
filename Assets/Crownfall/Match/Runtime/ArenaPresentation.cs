using System.Collections.Generic;
using UnityEngine;

namespace Crownfall.Match
{
    // All scenery is renderer-only. Existing map/controller collision is untouched.
    public sealed class ArenaPresentation
    {
        readonly Transform root;
        readonly Camera camera;
        readonly Material sprite;
        readonly Crownfall.EnvironmentPresentation.ArenaWildernessPresentation wildernessPresentation;
        readonly List<Mesh> owned=new List<Mesh>();
        public readonly Mesh RingMesh,ShadowMesh;
        public ArenaPresentation(Transform parent,Camera view,Material spriteMaterial,Material stone,Material gold,Material moss,RosterPresentationCatalog art)
        {
            root=parent;camera=view;sprite=spriteMaterial;
            RingMesh=Disc(new DiscGeometry());ShadowMesh=Disc(new DiscGeometry(32,0,1));
            var seams=new BoxGeometry();
            wildernessPresentation=new Crownfall.EnvironmentPresentation.ArenaWildernessPresentation(root,camera);
            // Broken ancient inlay accents, rather than a grid outlining the engineering rectangle.
            foreach(var p in new[]{new Vector3(-17,.032f,8.7f),new Vector3(9,.032f,-8.3f),new Vector3(23,.032f,9.2f)})
                Box(seams,p,new Vector3(2.7f,.012f,.035f));
            Combine("Warm Aether inlay",seams,gold);
            GroundArt("Crownfall center medallion",art.centerLogo,new Vector3(0,.06f,0),8);
            // Source Crownfall art extends the interior skyline; true 3D groves/cliffs supply its depth.
            Billboard("Forest west extension",art.forest,new Vector3(-25,1,27.5f),10,-250);
            Billboard("Forest center extension",art.forest,new Vector3(-7,0,28),11,-250);
            Billboard("Forest east extension",art.forest,new Vector3(25,1,26.5f),10,-250);
            Billboard("Waterfall west accent",art.waterfall,new Vector3(-30,3,29),9,-240);
            Billboard("Waterfall east accent",art.waterfall,new Vector3(28,3,29.5f),9,-240);
            foreach(var position in new[]{new Vector3(-26,0,20),new Vector3(24,0,-20),new Vector3(9,0,28)})
                Billboard("Saint Rose accent",art.saintRose,position,2.5f,-230);
            Billboard("Major Aether landmark",art.aetherMound,new Vector3(0,0,29.5f),4,-200);
        }
        public void BindVisibilitySubjects(Transform[] subjects) { wildernessPresentation.BindVisibilitySubjects(subjects); }
        public void BindGround(Renderer floor,Renderer lane) { wildernessPresentation.BindGround(floor,lane); }
        public void BindStone(Material territory) { wildernessPresentation.BindStone(territory); }
        Mesh Disc(DiscGeometry data)
        {
            var mesh=new Mesh{name="Shared finite ground disc"};var vertices=new Vector3[data.Vertices.Length];
            for(int i=0;i<vertices.Length;i++)vertices[i]=new Vector3((float)data.Vertices[i].X,0,(float)data.Vertices[i].Z);
            mesh.vertices=vertices;mesh.triangles=data.Indices;mesh.RecalculateNormals();mesh.RecalculateBounds();owned.Add(mesh);return mesh;
        }
        public GameObject DiscObject(string name,Transform parent,Vector3 position,float scale,Material material,bool shadow=false)
        {
            var go=new GameObject(name);go.transform.SetParent(parent,false);go.transform.localPosition=position;go.transform.localScale=Vector3.one*scale;
            go.AddComponent<MeshFilter>().sharedMesh=shadow?ShadowMesh:RingMesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;return go;
        }
        public SpriteRenderer GroundArt(string name,Sprite image,Vector3 position,float width)
        {
            var r=Billboard(name,image,position,width,-210);GroundSpritePlacement.Center(r.transform,image,position,width);return r;
        }
        SpriteRenderer Billboard(string name,Sprite image,Vector3 position,float width,int sort)
        {
            var go=new GameObject(name);go.transform.SetParent(root,false);go.transform.position=position;
            var r=go.AddComponent<SpriteRenderer>();r.sprite=image;r.sharedMaterial=sprite;r.sortingOrder=sort;
            if(image!=null)go.transform.localScale=Vector3.one*(width/Mathf.Max(.01f,image.bounds.size.x));
            go.transform.rotation=camera.transform.rotation;return r;
        }
        void Combine(string name,BoxGeometry boxes,Material material)
        {
            var go=new GameObject(name);go.transform.SetParent(root,false);
            var mesh=new Mesh{name=name};var vertices=new Vector3[boxes.Vertices.Count];for(int i=0;i<vertices.Length;i++){var v=boxes.Vertices[i];vertices[i]=new Vector3((float)v.X,(float)v.Y,(float)v.Z);}
            mesh.vertices=vertices;mesh.SetTriangles(boxes.Indices,0);mesh.RecalculateNormals();mesh.RecalculateBounds();owned.Add(mesh);
            go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=material;
        }
        public void Dispose(){wildernessPresentation.Dispose();foreach(var mesh in owned)Object.Destroy(mesh);owned.Clear();}
        static void Box(BoxGeometry boxes,Vector3 position,Vector3 size)
        {boxes.Box(position.x,position.y,position.z,size.x,size.y,size.z);}
    }
}
