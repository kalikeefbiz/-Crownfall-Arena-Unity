// Compile-only negative cases. An unused @ts-expect-error fails typecheck if a
// declaration regresses to promising fields that the runtime does not provide.
import type { CombatSimulation, CastEvidence, CombatModifier } from '../src/combat/combat';
import type { MatchActorSnapshot, MatchSnapshot } from '../src/combat/match';
import { CrownfallMatch } from '../src/combat/match.js';

export function verifyContracts(
    sim: CombatSimulation,
    match: CrownfallMatch,
    record: CastEvidence,
    modifier: CombatModifier,
    snapshot: MatchSnapshot
): void {
    // @ts-expect-error Ability lookup can return null, including for unknown IDs.
    void sim.ability('unknown').name;
    const ability = sim.ability('whip');
    if (ability) ability.name.toUpperCase();
    // @ts-expect-error Accepted-only data requires discriminant narrowing.
    void record.pending;
    if (record.accepted) {
        record.ability.name.toUpperCase();
        record.origin.x.toFixed();
        record.pending.toFixed();
        record.target?.z.toFixed();
    } else {
        record.reason.toUpperCase();
        void (record.result satisfies 'REJECTED');
        // @ts-expect-error Rejected records have no ability object.
        void record.ability;
        // @ts-expect-error Rejected records have no origin.
        void record.origin;
        // @ts-expect-error Rejected records have no pending counter.
        void record.pending;
    }
    sim.journal.latestAccepted?.ability.name.toUpperCase();
    modifier.label?.toUpperCase();
    modifier.speedBonus?.toFixed();
    // @ts-expect-error Descriptive labels are not numeric stats.
    modifier.label = 5;
    // @ts-expect-error Numeric modifier values cannot contain text.
    modifier.mitigation = 'twenty percent';
    // @ts-expect-error Unknown modifier properties are not an unrestricted dictionary.
    modifier.mystery = {};
    const live = match.entities[0];
    live.health = live.maxHealth;
    live.protectedUntil.toFixed();
    live.ultimateMeter.toFixed();
    // @ts-expect-error Match activity is a computed getter, not mutable state.
    match.active = true;
    // @ts-expect-error A respawn reservation is absent until the first death.
    live.respawnReserved.valueOf();
    // @ts-expect-error Protection is derived for snapshots, not installed on live actors.
    void live.protected;
    // @ts-expect-error Human ownership is derived for snapshots.
    void live.human;
    // @ts-expect-error Score belongs to match.actors[].record, not the live player.
    void live.kills;
    // @ts-expect-error Live actors lack the snapshot's flags and score fields.
    const observed: MatchActorSnapshot = live;
    void observed;
    snapshot.actors[0].protected.valueOf();
    snapshot.actors[0].kills.toFixed();
    snapshot.actors[0].modifiers['camp:mobility'].label?.toUpperCase();
    // @ts-expect-error Snapshot observations are read-only.
    snapshot.actors[0].health = 1;
    // @ts-expect-error Nested modifier observations are read-only too.
    snapshot.actors[0].modifiers['camp:mobility'].speedBonus = 0.5;
    // @ts-expect-error Snapshot settings cannot be used as a tuning mutation surface.
    snapshot.settings.graceSeconds = 9;
    // @ts-expect-error Snapshot arrays cannot be appended to.
    snapshot.actors.push(live);
    // @ts-expect-error Camps do not promise a summoner's ultimate meter.
    match.wilderness.camps[0].ultimateMeter.toFixed();
    sim.step({ moveX: 1, actions: [{ id: 'ring', angle: 0 }] });
    // @ts-expect-error Commands have a concrete action shape.
    sim.step({ actions: [{ ability: 'ring' }] });
    new CrownfallMatch(0, { settings: { protectionSeconds: 9, ultimateDealt: 0.12 } });
    // @ts-expect-error Supported match settings are numeric.
    new CrownfallMatch(0, { settings: { ultimateDealt: 'fast' } });
}
