// Persistent weapons use the same pooled projectile entities and swept-hit system.
export class ReturningWeapons {
    constructor(sim) {
        this.sim = sim;
        this.reset();
    }
    reset() {
        for (const b of this.blades || []) b.active = false;
        this.blades = [];
        this.next = 0;
        this.outgoingHits = 0;
        this.returning = false;
        const a = Object.values(this.sim.definition.stances || {})
            .flatMap((s) => s.abilities)
            .find((a) => a.effect === 'weaponSequence');
        if (!a) return;
        this.ability = a;
        for (let i = 0; i < 2; i++)
            this.blades.push(
                this.sim.projectiles.spawn({
                    type: 'reso-scythe',
                    ability: a,
                    x: this.sim.player.x,
                    z: this.sim.player.z,
                    angle: 0,
                    remaining: 0,
                    team: this.sim.player.team,
                    source: this.sim.player,
                    hits: new Set(),
                    summoners: new Set(),
                    persistent: true,
                    phase: 'orbit',
                    orbitIndex: i,
                    weaponController: this
                })
            );
    }
    canAttack() {
        return !this.returning;
    }
    attack(angle) {
        const s = this.sim,
            a = this.ability;
        if (this.returning) return false;
        if (this.next < 2) {
            const b = this.blades[this.next++];
            Object.assign(b, {
                phase: 'outgoing',
                x: s.player.x,
                z: s.player.z,
                angle,
                remaining: a.range,
                ability: a,
                hits: new Set(),
                summoners: new Set()
            });
            s.lastEvent = `Reso Blades · scythe ${this.next}`;
        } else {
            this.returning = true;
            const damage = a.recallDamage * (1 + Math.min(this.outgoingHits, a.recallHitCap) * a.recallScaling);
            for (const b of this.blades)
                Object.assign(b, {
                    phase: 'returning',
                    ability: { ...a, damage, speed: a.returnSpeed },
                    hits: new Set(),
                    summoners: new Set()
                });
            s.lastEvent = `Reso recall · ${this.outgoingHits} outgoing hits · ${damage.toFixed(0)} base damage / scythe`;
        }
        s.advanced.pose = { kind: 'strum', until: s.now + 0.2 };
        return true;
    }
    onHit(shot) {
        if (shot.phase === 'outgoing') this.outgoingHits++;
    }
    onReturn() {
        if (this.blades.every((b) => b.phase === 'orbit')) {
            this.next = 0;
            this.outgoingHits = 0;
            this.returning = false;
        }
    }
    clear() {
        for (const b of this.blades) b.active = false;
        this.blades = [];
        this.next = 0;
        this.outgoingHits = 0;
        this.returning = false;
    }
}
