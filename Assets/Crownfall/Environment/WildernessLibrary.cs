using UnityEngine;

namespace Crownfall.EnvironmentPresentation
{
    // Native Editor generation supplies real asset references; no handwritten GUIDs or runtime FBX import.
    public sealed class WildernessLibrary : ScriptableObject
    {
        public const int Version = 2;
        public int compositionVersion;
        public string compositionHash;
        public GameObject presentationPrefab;
        public Material worldSurface;
        public Texture2D laneStone, laneNormal;
    }

}
