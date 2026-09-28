using UnityEngine;

namespace Crownfall
{
    public sealed class PresentationSwitcher : MonoBehaviour
    {
        GameObject sprite, proxy;
        public bool UsesSprite { get; private set; }
        public void Bind(GameObject spriteChild, GameObject proxyChild)
        { sprite = spriteChild; proxy = proxyChild; SetSprite(true); }
        public void Toggle() => SetSprite(!UsesSprite);
        public void SetSprite(bool useSprite)
        {
            UsesSprite = useSprite;
            sprite.SetActive(useSprite);
            proxy.SetActive(!useSprite);
        }
    }
}
