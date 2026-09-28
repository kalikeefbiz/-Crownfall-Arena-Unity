Shader "PipelineTest/Color"
{
    Properties { _Color ("Color", Color) = (0.1, 0.85, 0.8, 1) }
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
            struct Input { float4 vertex : POSITION; float3 normal : NORMAL; };
            struct Output { float4 position : SV_POSITION; fixed shade : TEXCOORD0; };
            Output vert(Input v)
            {
                Output o;
                o.position = UnityObjectToClipPos(v.vertex);
                o.shade = 0.55 + 0.45 * saturate(dot(UnityObjectToWorldNormal(v.normal),
                    normalize(float3(-0.4, 0.7, -1.0))));
                return o;
            }
            fixed4 frag(Output i) : SV_Target { return fixed4(_Color.rgb * i.shade, 1); }
            ENDCG
        }
    }
}
