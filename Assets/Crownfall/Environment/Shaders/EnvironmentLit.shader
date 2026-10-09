Shader "Crownfall/Environment/Lit"
{
    Properties
    {
        _Color ("Source color", Color) = (1,1,1,1)
        _MainTex ("Base color", 2D) = "white" {}
        _BumpMap ("Tangent normal", 2D) = "bump" {}
        _SurfaceMap ("Linear roughness or ORM", 2D) = "white" {}
        _SurfaceMode ("0 uniform, 1 roughness R, 2 ORM", Float) = 0
        _Glossiness ("Uniform smoothness", Range(0,1)) = 0.1
        _Saturation ("Source detail saturation", Range(0,1)) = 0.8
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 2
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Cull [_Cull]
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows addshadow
        #include "WildernessVisibility.cginc"
        #pragma target 3.0
        #pragma multi_compile_instancing
        sampler2D _MainTex, _BumpMap, _SurfaceMap;
        fixed4 _Color;
        half _SurfaceMode, _Glossiness, _Saturation;
        struct Input { float3 worldPos; float2 uv_MainTex; float2 uv_BumpMap; float2 uv_SurfaceMap; float facing : VFACE; };
        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            CrownfallWildernessVisibility(IN.worldPos);
            o.Albedo = tex2D(_MainTex, IN.uv_MainTex).rgb * _Color.rgb;
            o.Albedo=lerp(dot(o.Albedo,half3(.299,.587,.114)).xxx,o.Albedo,_Saturation);
            o.Normal = UnpackNormal(tex2D(_BumpMap, IN.uv_BumpMap));
            o.Normal *= IN.facing >= 0 ? 1 : -1;
            half3 data = tex2D(_SurfaceMap, IN.uv_SurfaceMap).rgb;
            o.Metallic = 0; // Bark, stone, plaster and foliage are dielectrics.
            o.Smoothness = _SurfaceMode < 0.5 ? _Glossiness : 1 - (_SurfaceMode < 1.5 ? data.r : data.g);
            o.Occlusion = _SurfaceMode > 1.5 ? data.r : 1;
            o.Alpha = 1;
        }
        ENDCG
    }
    Fallback "Diffuse"
}
