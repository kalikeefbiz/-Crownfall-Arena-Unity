Shader "Crownfall/Environment/World Surface"
{
    Properties
    {
        _StoneTex ("Shared weathered stone", 2D) = "white" {}
        _StoneNormal ("Shared stone normal", 2D) = "bump" {}
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #pragma multi_compile_instancing
        #include "StoneSurface.cginc"
        struct Input { float3 worldPos; };
        void surf(Input IN,inout SurfaceOutputStandard o)
        {
            o.Albedo=CrownfallStone(IN.worldPos);
            o.Normal=CrownfallStoneNormal(IN.worldPos);
            o.Metallic=0;o.Smoothness=.06;o.Occlusion=1;o.Alpha=1;
        }
        ENDCG
    }
    Fallback "Diffuse"
}
