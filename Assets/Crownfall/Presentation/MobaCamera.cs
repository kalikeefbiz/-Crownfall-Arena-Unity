using UnityEngine;

namespace Crownfall
{
    public sealed class MobaCamera : MonoBehaviour
    {
        [SerializeField] Vector3 offset = new Vector3(0, 15, -12.5865f);
        [SerializeField, Min(0.01f)] float followSharpness = 9f;
        Transform target;
        public void Bind(Transform follow)
        { target = follow; transform.position = target.position + offset; transform.rotation = Quaternion.Euler(50, 0, 0); }
        void LateUpdate()
        {
            if (target != null)
                transform.position = Vector3.Lerp(transform.position, target.position + offset,
                    1f - Mathf.Exp(-followSharpness * Time.deltaTime));
        }
    }
}
