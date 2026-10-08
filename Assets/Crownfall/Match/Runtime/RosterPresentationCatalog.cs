using System;
using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    [Serializable]
    public sealed class RosterArt
    {
        public Sprite[] idle,run,sideRun,basicFront,basicBack,basicSide,action,ultimate;
        public float height=2.8f;
    }
    public sealed class RosterPresentationCatalog : ScriptableObject
    {
        public RosterArt kit,set,riven;
        public Sprite emberTrail,solarRing,lastFlame,expellantCast,expellantBlast;
        public Sprite[] scythes;
        public Sprite aetherMound,centerLogo,saintRose,waterfall,forest;
        public Texture2D arena,lane,title;
        public RosterArt For(FirstRosterSummoner roster)=>roster==FirstRosterSummoner.Kit?kit:roster==FirstRosterSummoner.Set?set:riven;
    }
}
