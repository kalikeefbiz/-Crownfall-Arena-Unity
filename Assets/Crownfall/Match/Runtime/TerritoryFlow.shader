Shader "Crownfall/Territory Flow"
{
    Properties
    {
        _Color ("Team tint", Color) = (.2,.3,.35,1)
        _Active ("Surge active", Float) = 0
        _Direction ("Forward direction", Float) = 1
        _MatchTime ("Simulation time", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            fixed4 _Color; float _Active,_Direction,_MatchTime;
            struct Input {float4 vertex : POSITION;};
            struct Output {float4 position : SV_POSITION;float3 world : TEXCOORD0;};
            Output vert(Input v){Output o;o.position=UnityObjectToClipPos(v.vertex);o.world=mul(unity_ObjectToWorld,v.vertex).xyz;return o;}
            fixed4 frag(Output i) : SV_Target
            {
                float wave=pow(saturate(.5+.5*sin(i.world.x*1.8-_MatchTime*3*_Direction)),8);
                float canal=pow(saturate(.5+.5*cos(i.world.z*6.283185/7)),24);
                float2 tile=floor(i.world.xz*1.1);
                float grain=frac(sin(dot(tile,float2(12.9898,78.233)))*43758.5453);
                float2 joints=abs(frac(i.world.xz*.5)-.5);
                float seam=step(.485,max(joints.x,joints.y));
                return fixed4(_Color.rgb*(.92+grain*.13-seam*.08)+_Active*(wave*.065+wave*canal*.07),1);
            }
            ENDCG
        }
    }
}
