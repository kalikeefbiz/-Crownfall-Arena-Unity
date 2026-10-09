#ifndef CROWNFALL_WILDERNESS_VISIBILITY
#define CROWNFALL_WILDERNESS_VISIBILITY
float _CrownfallWildernessCount;
float4 _CrownfallWildernessSubjects[6];
float3 _CrownfallWildernessRight, _CrownfallWildernessUp, _CrownfallWildernessForward;
void CrownfallWildernessVisibility(float3 worldPosition)
{
    // Camera-dependent cutaways must not punch holes in the light's shadow map.
    #if defined(UNITY_PASS_SHADOWCASTER)
        return;
    #endif
    for (int i=0; i<6; i++)
    {
        if (i >= _CrownfallWildernessCount) break;
        if (_CrownfallWildernessSubjects[i].w < 0.5) continue;
        float3 relative = worldPosition - _CrownfallWildernessSubjects[i].xyz;
        float depth = dot(relative, _CrownfallWildernessForward);
        float2 projected = float2(dot(relative,_CrownfallWildernessRight),dot(relative,_CrownfallWildernessUp));
        // Clip only decorative geometry between camera and each Summoner; preserve depth behind combat.
        float radius = length(projected / float2(1.6,2.0));
        if (depth < -0.25)
        {
            // A narrow, world-anchored dither rim softens the cut without transparency sorting/overdraw.
            float grain=frac(sin(dot(floor(worldPosition.xz*48),float2(12.9898,78.233)))*43758.5453);
            clip(radius-(.90+grain*.18));
        }
    }
}
#endif
