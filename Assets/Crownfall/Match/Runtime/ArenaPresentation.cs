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
        readonly List<Mesh> owned=new List<Mesh>();
        public readonly Mesh RingMesh,ShadowMesh;
        public ArenaPresentation(Transform parent,Camera view,Material spriteMaterial,Material stone,Material gold,Material moss,RosterPresentationCatalog art)
        {
            root=parent;camera=view;sprite=spriteMaterial;
            RingMesh=Disc(new DiscGeometry());ShadowMesh=Disc(new DiscGeometry(32,0,1));
            // One combined mesh per shared material for structural dressing.
            var walls=new BoxGeometry();var seams=new BoxGeometry();var wilderness=new BoxGeometry();
            for(int i=0;i<18;i++)
            {
                float x=-34+i*4;
                for(int side=-1;side<=1;side+=2)
                {
                    Box(walls,new Vector3(x,4.5f,side*35),new Vector3(3.4f,9,2));
                    Box(walls,new Vector3(x,10,side*35),new Vector3(4.1f,1.5f,3));
                    Box(seams,new Vector3(x,4,side*33.94f),new Vector3(.12f,7,.08f));
                    Box(wilderness,new Vector3(x,-.1f,side*21),new Vector3(3.4f,.08f,5));
                }
            }
            for(int i=0;i<16;i++)for(int side=-1;side<=1;side+=2)
            {
                float z=-30+i*4;
                Box(walls,new Vector3(side*37,4,z),new Vector3(3,8,3.4f));
                Box(seams,new Vector3(side*35.45f,3.5f,z),new Vector3(.08f,6,.1f));
            }
            for(int x=-26;x<=26;x+=4)
            {
                Box(seams,new Vector3(x,.032f,0),new Vector3(.035f,.012f,23.5f));
                for(int z=-10;z<=10;z+=4)Box(seams,new Vector3(x,.032f,z),new Vector3(3.9f,.012f,.035f));
            }
            foreach(int side in new[]{-1,1})Box(seams,new Vector3(0,.034f,side*11.9f),new Vector3(56,.02f,.09f));
            Combine("Monumental dark stone colonnade",walls,stone);Combine("Warm Aether inlay",seams,gold);Combine("Wilderness terraces",wilderness,moss);
            GroundArt("Crownfall center medallion",art.centerLogo,new Vector3(0,.06f,0),8);
            for(int i=0;i<8;i++)
            {
                float x=-28+i*8;
                Billboard("Forest boundary",art.forest,new Vector3(x,0,31.5f),8, -250);
                if(i%2==0)Billboard("Waterfall cliff",art.waterfall,new Vector3(x,0,-31.5f),7,-240);
                Billboard("Saint Rose accent",art.saintRose,new Vector3(x,0,i%2==0?19:-19),2.5f,-230);
            }
            Billboard("Major Aether landmark",art.aetherMound,new Vector3(0,0,29.5f),4,-200);
        }
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
        public void Dispose(){foreach(var mesh in owned)Object.Destroy(mesh);owned.Clear();}
        static void Box(BoxGeometry boxes,Vector3 position,Vector3 size)
        {boxes.Box(position.x,position.y,position.z,size.x,size.y,size.z);}
    }
}
