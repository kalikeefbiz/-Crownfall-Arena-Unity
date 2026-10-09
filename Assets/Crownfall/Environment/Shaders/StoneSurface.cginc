#ifndef CROWNFALL_STONE_SURFACE
#define CROWNFALL_STONE_SURFACE
sampler2D _StoneTex, _StoneNormal;
float CrownfallWeather(float2 p)
{
    // Continuous, inexpensive variation; no per-frame noise or texture payload duplication.
    return .5+.25*sin(p.x*.73+sin(p.y*.39)*2)+.25*sin(p.y*.91+p.x*.27);
}
half CrownfallPaving(float3 world)
{
    float wornEdge=CrownfallWeather(world.xz*.8);
    return (1-smoothstep(9.8+wornEdge*2,12.8+wornEdge*2,abs(world.z))) *
        (1-smoothstep(26.5,29.5,abs(world.x)));
}
half3 CrownfallStone(float3 world)
{
    half3 source=tex2D(_StoneTex,world.xz/8.0).rgb;
    half gray=dot(source,half3(.299,.587,.114));
    half3 stone=lerp(gray.xxx,source,.35)*half3(.70,.76,.79);
    half weather=CrownfallWeather(world.xz);
    half seam=1-smoothstep(.18,.32,gray);
    stone=lerp(stone,half3(.12,.18,.115),seam*weather*.42);
    half3 soil=half3(.10,.135,.11)*( .8+weather*.55)+source*.065;
    return lerp(soil,stone,CrownfallPaving(world));
}
half3 CrownfallStoneNormal(float3 world)
{
    half3 n=UnpackNormal(tex2D(_StoneNormal,world.xz/8.0));
    n.xy*=CrownfallPaving(world)*.45;
    return normalize(n);
}
#endif
