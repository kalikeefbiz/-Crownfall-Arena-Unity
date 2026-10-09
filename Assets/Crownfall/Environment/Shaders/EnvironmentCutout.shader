Shader "Crownfall/Environment/Cutout"
{
    Properties
    {
        _Color ("Source color", Color) = (1,1,1,1)
        _MainTex ("Foliage RGBA", 2D) = "white" {}
        _Cutoff ("Coverage cutoff", Range(0,1)) = 0.2
    }
    SubShader
    {
        Tags { "Queue"="AlphaTest" "RenderType"="TransparentCutout" }
        Cull Off
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows addshadow alphatest:_Cutoff
        #include "WildernessVisibility.cginc"
        #pragma target 3.0
        #pragma multi_compile_instancing
        sampler2D _MainTex;
        fixed4 _Color;
        struct Input { float3 worldPos; float2 uv_MainTex; float facing : VFACE; };
        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            CrownfallWildernessVisibility(IN.worldPos);
            fixed4 c = tex2D(_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;
            o.Normal = half3(0,0,IN.facing >= 0 ? 1 : -1);
            o.Metallic = 0;
            o.Smoothness = 0;
            o.Occlusion = 1;
            o.Alpha = c.a;
        }
        ENDCG
    }
    Fallback "Transparent/Cutout/Diffuse"
}
