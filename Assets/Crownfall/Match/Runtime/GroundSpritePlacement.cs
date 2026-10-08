using UnityEngine;

namespace Crownfall.Match
{
    public static class GroundSpritePlacement
    {
        public static void Center(Transform visual,Sprite image,Vector3 center,float width)
        {
            if(image==null)return;
            float scale=width/Mathf.Max(.01f,image.bounds.size.x);
            var origin=PresentationMath.GroundSpriteOrigin(new V2(center.x,center.z),new V2(image.bounds.center.x,image.bounds.center.y),scale);
            visual.rotation=Quaternion.Euler(90,0,0);visual.localScale=Vector3.one*scale;
            visual.position=new Vector3((float)origin.X,center.y,(float)origin.Z);
        }
    }
}
