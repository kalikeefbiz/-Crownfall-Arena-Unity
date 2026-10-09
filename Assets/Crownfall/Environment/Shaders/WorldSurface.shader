Shader "Crownfall/Environment/World Surface"
{
    Properties
    {
        _StoneTex ("Shared weathered stone", 2D) = "white" {}
        _StoneNormal ("Shared stone normal", 2D) = "bump" {}
        _GroundTex ("Shared geological detail", 2D) = "white" {}
        _ForestTex ("Shared CC0 forest litter", 2D) = "white" {}
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows addshadow
        #pragma target 3.0
        #pragma multi_compile_instancing
        #include "StoneSurface.cginc"
        #include "WildernessVisibility.cginc"
        struct Input { float3 worldPos; };
        void surf(Input IN,inout SurfaceOutputStandard o)
        {
            // Cut raised banks only; clipping the replacement floor would expose empty pixels near combat.
            if(IN.worldPos.y>.35) CrownfallWildernessVisibility(IN.worldPos);
            o.Albedo=CrownfallStone(IN.worldPos);
            o.Normal=CrownfallStoneNormal(IN.worldPos);
            o.Metallic=0;o.Smoothness=.06;o.Occlusion=1;o.Alpha=1;
        }
        ENDCG
    }
    Fallback "Diffuse"
}
