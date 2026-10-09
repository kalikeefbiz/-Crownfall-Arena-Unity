#ifndef CROWNFALL_STONE_SURFACE
#define CROWNFALL_STONE_SURFACE
sampler2D _StoneTex, _StoneNormal, _GroundTex, _ForestTex;
float CrownfallHash(float2 p){return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
float CrownfallWeather(float2 p)
{return .5+.25*sin(p.x*.73+sin(p.y*.39)*2)+.25*sin(p.y*.91+p.x*.27);}
half CrownfallPaving(float3 world)
{
    float edge=8.8+sin(world.x*.23)*1.0+sin(world.x*.67+2)*.45;
    return (1-smoothstep(edge,edge+2.4,abs(world.z)))*(1-smoothstep(27,32,abs(world.x)));
}
half3 CrownfallStone(float3 world)
{
    float2 uv=world.xz;
    float2 wornUV=uv+float2(sin(uv.y*.31+uv.x*.19),sin(uv.x*.28))*.12;
    half3 detail=tex2D(_StoneTex,uv/8.0).rgb;
    half3 rock=tex2D(_GroundTex,uv/2.3).rgb;
    half gray=dot(detail,half3(.299,.587,.114));
    float2 stagger=float2(wornUV.x/1.7+floor(wornUV.y/1.25)*.5,wornUV.y/1.25);
    float2 cell=floor(stagger),local=frac(stagger);
    float seed=CrownfallHash(cell);
    float seam=min(min(local.x,1-local.x),min(local.y,1-local.y));
    half joint=smoothstep(.025,.065,seam);
    half3 flags=lerp(half3(.22,.245,.24),half3(.36,.355,.31),seed)*(.78+detail*.55);
    half3 cobble=lerp(gray.xxx,detail,.28)*half3(.66,.70,.66);
    half patch=smoothstep(.30,.68,CrownfallWeather(uv*.31));
    half3 stone=lerp(cobble,flags,patch*.78);
    half weather=CrownfallWeather(uv);
    half fracture=1-smoothstep(.02,.05,abs(sin(uv.x*.61+sin(uv.y*.33)*2.5)));
    stone*=lerp(1,lerp(.72,1,joint),patch*.85);
    stone=lerp(stone,half3(.11,.16,.095),(1-joint)*.32+fracture*.10);
    // Missing stones/accumulated dirt are stable authored-size cells, subdued in the central combat band.
    half damage=step(.86,seed)*smoothstep(3,10,abs(world.z))*(1-joint*.72);
    half3 litter=tex2D(_ForestTex,uv/4.0).rgb;
    half3 soil=litter*half3(.56,.62,.52)*(.85+weather*.30);
    half3 moss=half3(.075,.15,.085)*(.8+rock*.8);
    soil=lerp(soil,moss,smoothstep(.52,.82,CrownfallWeather(uv*.53))*.22);
    return lerp(soil,lerp(stone,soil,damage),CrownfallPaving(world));
}
half3 CrownfallStoneNormal(float3 world)
{
    half3 n=UnpackNormal(tex2D(_StoneNormal,world.xz/8.0));
    n.xy*=CrownfallPaving(world)*.32;return normalize(n);
}
#endif
