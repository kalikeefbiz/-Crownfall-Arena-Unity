// Observational combat evidence. No hit query, modifier, timing or gate depends
// on this journal; presentation consumes accepted attempts and resolved damage.
export class CombatJournal {
    constructor(sim) {
        this.sim = sim;
        this.serial = 0;
        this.hitSerial = 0;
        this.attempts = [];
        this.hits = [];
        this.latestAttempt = null;
        this.latestAccepted = null;
        this.latestResolution = null;
    }
    reject(id, ability, reason) {
        const record = {
            id: ++this.serial,
            abilityId: id,
            name: ability?.name || id,
            accepted: false,
            reason,
            time: this.sim.now,
            result: 'REJECTED',
            targetIds: [],
            damage: 0
        };
        this.latestAttempt = record;
        this.keep(record);
    }
    accept(ability, origin, angle, target) {
        const record = {
            id: ++this.serial,
            abilityId: ability.id,
            name: ability.name,
            ability,
            accepted: true,
            reason: '',
            time: this.sim.now,
            result: 'PENDING',
            targetIds: [],
            damage: 0,
            pending: 0,
            sealed: false,
            origin: { ...origin },
            angle,
            target: target ? { ...target } : null
        };
        this.latestAttempt = this.latestAccepted = record;
        this.keep(record);
        return record;
    }
    keep(record) {
        this.attempts.push(record);
        if (this.attempts.length > 128) this.attempts.shift();
    }
    reserve(record) {
        if (record) record.pending++;
    }
    seal(record) {
        if (!record) return;
        record.sealed = true;
        this.resolve(record);
    }
    end(record, interrupted = false) {
        if (!record) return;
        record.pending = Math.max(0, record.pending - 1);
        record.interrupted ||= interrupted;
        this.resolve(record);
    }
    resolve(record) {
        if (!record.sealed || record.pending || record.finished !== undefined) return;
        record.finished = this.sim.now;
        const offensive = !['buff', 'stance'].includes(record.ability.effect);
        record.result = record.targetIds.length
            ? 'HIT'
            : record.interrupted
              ? 'INTERRUPTED'
              : offensive
                ? 'MISS'
                : 'DONE';
        this.latestResolution = record;
    }
    hit(record, target, amount, ability) {
        if (record) {
            if (!record.targetIds.includes(target.id)) record.targetIds.push(target.id);
            record.damage += amount;
        }
        const hit = {
            id: ++this.hitSerial,
            time: this.sim.now,
            castId: record?.id ?? null,
            targetId: target.id,
            x: target.x,
            z: target.z,
            amount,
            abilityId: ability?.id ?? null,
            name: ability?.name ?? 'Damage'
        };
        this.hits.push(hit);
        if (this.hits.length > 64) this.hits.shift();
    }
}
