using System;
using UnityEngine;

namespace Crownfall.Combat
{
    // Attach to gameplay roots, never their replaceable visual children.
    public sealed class Combatant : MonoBehaviour, ICombatTarget
    {
        CombatWorld world;
        readonly CombatRecoveryState recovery = new CombatRecoveryState();
        public HealthState Health { get; private set; }
        public double Radius { get; private set; }
        public GroundPoint Position => new GroundPoint(transform.position.x, transform.position.z);
        public bool Targetable => isActiveAndEnabled && Health != null && Health.Alive;
        public event Action<DamageResult> DamageReceived;

        public void Bind(CombatWorld combatWorld, int id, int team, float maximum, float radius)
        {
            if (Health != null) throw new InvalidOperationException("Combatant already initialized");
            if (!HealthState.Finite(radius) || radius <= 0) throw new ArgumentOutOfRangeException(nameof(radius));
            Health = new HealthState(id, team, maximum); Radius = radius; world = combatWorld;
            if (isActiveAndEnabled) world.Register(this);
        }
        public DamageResult Receive(DamageRequest request)
        {
            var result = Targetable ? Health.Receive(request) :
                new DamageResult(request, Health.Id, Health.Current, Health.Current);
            if (result.Applied > 0)
            {
                recovery.MarkDamagingInteraction(Time.timeAsDouble);
                if (DamageReceived != null)
                    foreach (Action<DamageResult> listener in DamageReceived.GetInvocationList())
                        try { listener(result); } catch (Exception error) { Debug.LogException(error); }
            }
            return result;
        }

        public void MarkDamageDealt()
        {
            if (Targetable) recovery.MarkDamagingInteraction(Time.timeAsDouble);
        }

        void Update()
        {
            if (!Targetable || Health.Current >= Health.Maximum) return;
            double amount = recovery.RegenerationAmount(Time.timeAsDouble, Time.deltaTime, Health.Maximum);
            if (amount > 0) Health.Restore(amount);
        }
        // Fixture reset only, not a match respawn/elimination system.
        public void ResetDiagnosticHealth()
        { Health = new HealthState(Health.Id, Health.Team, Health.Maximum); }
        void OnEnable() { if (Health != null) world.Register(this); }
        void OnDisable() { world?.Unregister(this); }
    }
}
