using UnityEngine;

namespace Crownfall.Combat
{
    public interface IAttackViewState
    {
        bool Active { get; }
        double Elapsed { get; }
        Vector3 CapturedDirection { get; }
        PresentationFacing CapturedFacing { get; }
    }

    // Runs after M0 input/aim/movement. Nothing in this component moves the root or reads sprites.
    [DefaultExecutionOrder(100)]
    public sealed class BasicAttackExecutor : MonoBehaviour, IAttackViewState
    {
        SummonerRoot root;
        Combatant owner;
        CombatWorld world;
        BasicAttackSpec spec;
        AttackTimeline timeline;
        int consumedConfirmation;
        double clock;
        bool focused = true, paused;
        public bool Active => timeline != null && timeline.Active;
        public double Elapsed => timeline == null ? 0 : timeline.Elapsed;
        public Vector3 CapturedDirection => timeline == null ? Vector3.right :
            new Vector3((float)timeline.Direction.X, 0, (float)timeline.Direction.Z);
        public Vector3 CapturedOrigin => timeline == null ? Vector3.zero :
            new Vector3((float)timeline.Origin.X, 0, (float)timeline.Origin.Z);
        public PresentationFacing CapturedFacing { get; private set; }
        public AttackPhase Phase => timeline == null ? AttackPhase.Ready : timeline.Phase;
        public int AttackCount => timeline == null ? 0 : timeline.Sequence;
        public int ComboStep => timeline == null ? 0 : timeline.ComboStep;
        public int HitEvents { get; private set; }
        public int LastHitTargets { get; private set; }
        public double CooldownRemaining => timeline == null ? 0 : timeline.CooldownRemaining;
        public string LastConfirmation { get; private set; } = "Ready";

        public void Bind(SummonerRoot source, Combatant combatant, CombatWorld combatWorld, BasicAttackDefinition definition)
        {
            root = source; owner = combatant; world = combatWorld;
            spec = definition.Snapshot(); timeline = new AttackTimeline(spec);
            consumedConfirmation = root.Targeting.ConfirmationCount;
        }
        void Update()
        {
            if (timeline == null) return;
            if (paused || !focused) { consumedConfirmation = root.Targeting.ConfirmationCount; return; }
            clock += Time.deltaTime;
            if (!owner.Targetable) timeline.Interrupt();
            timeline.Advance(clock, ExecuteHit);
            var selection = root.Targeting;
            if (selection.ConfirmationCount == consumedConfirmation) return;
            consumedConfirmation = selection.ConfirmationCount;
            if (selection.Phase != TargetPhase.Confirmed || selection.Shape != TargetShape.Directional) return;
            Vector3 aim = selection.Direction;
            bool started = timeline.TryStart(clock, owner.Position, new GroundPoint(aim.x, aim.z), owner.Targetable);
            LastConfirmation = started ? "Solar Whip accepted" : "Rejected: cooldown / not alive";
            // Time zero is a real simulation hit. No frame event or coroutine can delay it.
            if (started) { CapturedFacing = root.Facing; timeline.Advance(clock, ExecuteHit); }
        }
        void ExecuteHit(int index, double damage)
        {
            HitEvents++;
            LastHitTargets = ConeHitQuery.Resolve(world.Targets, timeline.Origin, timeline.Direction,
                spec.Range, spec.Arc, new DamageRequest(owner.Health.Id, owner.Health.Team, timeline.Sequence, index, damage));
        }
        void OnApplicationFocus(bool value) { focused = value; }
        void OnApplicationPause(bool value) { paused = value; }
        void OnDisable() { timeline?.Interrupt(); }
    }
}
