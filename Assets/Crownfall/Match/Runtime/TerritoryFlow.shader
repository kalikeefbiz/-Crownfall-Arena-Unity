Shader "Crownfall/Territory Flow"
{
    Properties
    {
        _Color ("Team tint", Color) = (.2,.3,.35,1)
        _Active ("Surge active", Float) = 0
        _Direction ("Forward direction", Float) = 1
        _MatchTime ("Simulation time", Float) = 0
        _StoneTex ("Shared weathered stone", 2D) = "white" {}
        _StoneNormal ("Shared stone normal", 2D) = "bump" {}
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
            CGPROGRAM
            #pragma surface surf Standard fullforwardshadows
            #pragma target 3.0
            #include "../../Environment/Shaders/StoneSurface.cginc"
            fixed4 _Color; float _Active,_Direction,_MatchTime;
            struct Input {float3 worldPos;};
            void surf(Input i,inout SurfaceOutputStandard o)
            {
                float wave=pow(saturate(.5+.5*sin(i.worldPos.x*1.8-_MatchTime*3*_Direction)),8);
                float canal=pow(saturate(.5+.5*cos(i.worldPos.z*6.283185/7)),24);
                // World UVs stay fixed when authoritative territory meshes expand/contract.
                o.Albedo=CrownfallStone(i.worldPos)*lerp(half3(1,1,1),_Color.rgb*3.5,.42);
                o.Normal=CrownfallStoneNormal(i.worldPos);
                o.Emission=_Active*(wave*.065+wave*canal*.07);
                o.Metallic=0;o.Smoothness=.06;o.Occlusion=1;o.Alpha=1;
            }
            ENDCG
    }
    Fallback "Diffuse"
}
