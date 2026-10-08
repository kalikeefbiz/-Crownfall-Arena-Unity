Shader "Crownfall/Production Stone"
{
    Properties { _Color ("Stone / Aether tint", Color) = (.2,.22,.24,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            fixed4 _Color;
            struct Input { float4 vertex:POSITION; float3 normal:NORMAL; };
            struct Output { float4 position:SV_POSITION; float3 world:TEXCOORD0; float3 normal:TEXCOORD1; };
            Output vert(Input v){Output o;o.position=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xyz;o.normal=UnityObjectToWorldNormal(v.normal);return o;}
            fixed4 frag(Output i):SV_Target
            {
                float3 n=normalize(i.normal);
                // Two warm fixed daylight contributions: no realtime shadow maps,
                // additional lights, textures, or shader feature variants on mobile.
                float sunA=saturate(dot(n,normalize(float3(-.5,1,-.35))));
                float sunB=saturate(dot(n,normalize(float3(.65,1,.25))));
                float grain=frac(sin(dot(floor(i.world.xz*2),float2(12.9898,78.233)))*43758.5453);
                float weather=.94+grain*.1;
                return fixed4(_Color.rgb*weather*(.68+sunA*.24+sunB*.12)*fixed3(1,.97,.91),1);
            }
            ENDCG
        }
    }
}
