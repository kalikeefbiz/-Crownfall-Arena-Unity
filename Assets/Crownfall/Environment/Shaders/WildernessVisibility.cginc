#ifndef CROWNFALL_WILDERNESS_VISIBILITY
#define CROWNFALL_WILDERNESS_VISIBILITY
float _CrownfallWildernessCount;
float4 _CrownfallWildernessSubjects[6];
float3 _CrownfallWildernessRight, _CrownfallWildernessUp, _CrownfallWildernessForward;
void CrownfallWildernessVisibility(float3 worldPosition)
{
    for (int i=0; i<6; i++)
    {
        if (i >= _CrownfallWildernessCount) break;
        if (_CrownfallWildernessSubjects[i].w < 0.5) continue;
        float3 relative = worldPosition - _CrownfallWildernessSubjects[i].xyz;
        float depth = dot(relative, _CrownfallWildernessForward);
        float2 projected = float2(dot(relative,_CrownfallWildernessRight),dot(relative,_CrownfallWildernessUp));
        // Clip only decorative geometry between camera and each Summoner; preserve depth behind combat.
        float radius = length(projected / float2(1.6,2.0));
        if (depth < -0.25) clip(radius - 1.0);
    }
}
#endif
