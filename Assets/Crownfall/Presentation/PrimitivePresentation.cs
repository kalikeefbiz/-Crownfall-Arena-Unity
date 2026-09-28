using UnityEngine;

namespace Crownfall
{
    public sealed class PrimitivePresentation : MonoBehaviour
    {
        ISummonerViewState state;
        public void Bind(ISummonerViewState source) => state = source;
        void LateUpdate()
        {
            if (state != null && state.AimDirection.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.LookRotation(state.AimDirection, Vector3.up);
        }
    }
}
