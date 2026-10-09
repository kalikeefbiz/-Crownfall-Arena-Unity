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
        _GeoTex ("Shared geological detail", 2D) = "white" {}
        _GeoDetail ("World geological detail", Range(0,1)) = 0
        _AetherStrength ("Local Aether veins", Range(0,1)) = 0
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
        sampler2D _MainTex, _BumpMap, _SurfaceMap, _GeoTex;
        fixed4 _Color;
        half _SurfaceMode, _Glossiness, _Saturation, _GeoDetail, _AetherStrength;
        struct Input { float3 worldPos; float3 worldNormal; INTERNAL_DATA float2 uv_MainTex; float2 uv_BumpMap; float2 uv_SurfaceMap; float facing : VFACE; };
        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            CrownfallWildernessVisibility(IN.worldPos);
            o.Albedo = tex2D(_MainTex, IN.uv_MainTex).rgb * _Color.rgb;
            o.Albedo=lerp(dot(o.Albedo,half3(.299,.587,.114)).xxx,o.Albedo,_Saturation);
            if(_GeoDetail>.001)
            {
                half3 weights=pow(abs(WorldNormalVector(IN,half3(0,0,1))),4);weights/=max(.001,weights.x+weights.y+weights.z);
                half3 geology=tex2D(_GeoTex,IN.worldPos.yz/3.5).rgb*weights.x+tex2D(_GeoTex,IN.worldPos.xz/3.5).rgb*weights.y+tex2D(_GeoTex,IN.worldPos.xy/3.5).rgb*weights.z;
                o.Albedo=lerp(o.Albedo,geology*_Color.rgb,_GeoDetail);
            }
            if(_AetherStrength>.001)
            {
                half influence=(1-smoothstep(4,7,abs(IN.worldPos.x-10.4)))*smoothstep(12,15,IN.worldPos.z)*(1-smoothstep(26,30,IN.worldPos.z));
                half vein=pow(saturate(1-abs(sin(IN.worldPos.y*3.5+sin(IN.worldPos.x*1.3)+sin(IN.worldPos.z*.8)))),18);
                o.Emission=half3(.12,.58,.55)*influence*vein*_AetherStrength;
            }
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
