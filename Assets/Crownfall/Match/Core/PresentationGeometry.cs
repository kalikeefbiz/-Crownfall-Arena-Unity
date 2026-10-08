using System;
using System.Collections.Generic;
namespace Crownfall.Match
{
    public struct PresentationVertex
    {
        public double X,Y,Z;
        public PresentationVertex(double x,double y,double z){X=x;Y=y;Z=z;}
    }
    public sealed class BoxGeometry
    {
        public readonly List<PresentationVertex> Vertices=new List<PresentationVertex>();
        public readonly List<int> Indices=new List<int>();
        static readonly int[] faces={0,2,1,1,2,3,4,5,6,5,7,6,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5};
        public void Box(double x,double y,double z,double width,double height,double depth)
        {
            if(!Finite(x)||!Finite(y)||!Finite(z)||!Finite(width)||!Finite(height)||!Finite(depth)||width<=0||height<=0||depth<=0)throw new ArgumentOutOfRangeException();
            int start=Vertices.Count;
            for(int i=0;i<8;i++)Vertices.Add(new PresentationVertex(x+((i&1)==0?-.5:.5)*width,y+((i&2)==0?-.5:.5)*height,z+((i&4)==0?-.5:.5)*depth));
            foreach(int i in faces)Indices.Add(start+i);
        }
        public static bool Finite(double n)=>!double.IsNaN(n)&&!double.IsInfinity(n);
    }
    public sealed class DiscGeometry
    {
        public readonly V2[] Vertices;
        public readonly int[] Indices;
        public DiscGeometry(int segments=48,double inner=.82,double outer=1)
        {
            if(segments<3||segments>128||inner<0||outer<=inner)throw new ArgumentOutOfRangeException();
            Vertices=new V2[segments*2];Indices=new int[segments*6];
            for(int i=0;i<segments;i++)
            {
                double angle=i*Math.PI*2/segments;
                Vertices[2*i]=new V2(Math.Cos(angle)*inner,Math.Sin(angle)*inner);
                Vertices[2*i+1]=new V2(Math.Cos(angle)*outer,Math.Sin(angle)*outer);
                int n=(i+1)%segments*2,j=i*6;
                Indices[j]=2*i;Indices[j+1]=n;Indices[j+2]=2*i+1;
                Indices[j+3]=n;Indices[j+4]=n+1;Indices[j+5]=2*i+1;
            }
        }
    }
    public sealed class PresentationSlots
    {
        readonly bool[] used;
        public int Count {get;private set;}
        public PresentationSlots(int capacity){used=new bool[capacity];}
        public int Acquire(){for(int i=0;i<used.Length;i++)if(!used[i]){used[i]=true;Count++;return i;}return -1;}
        public void Release(int i){if(i>=0&&i<used.Length&&used[i]){used[i]=false;Count--;}}
        public void Reset(){Array.Clear(used,0,used.Length);Count=0;}
    }
}
