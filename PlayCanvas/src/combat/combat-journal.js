// @ts-check
/** @typedef {import('./combat').Ability} Ability */
/** @typedef {import('./combat').Combatant} Combatant */
/** @typedef {import('./combat').Point} Point */
/** @typedef {import('./combat').CastEvidence} CastEvidence */
/** @typedef {import('./combat').AcceptedCastEvidence} AcceptedCastEvidence */
/** @typedef {import('./combat').RejectedCastEvidence} RejectedCastEvidence */
/** @typedef {import('./combat').HitEvidence} HitEvidence */

// Observational combat evidence. No hit query, modifier, timing or gate depends
// on this journal; presentation consumes accepted attempts and resolved damage.
export class CombatJournal {
    /** @param {{now: number}} sim */
    constructor(sim) {
        this.sim = sim;
        this.serial = 0;
        this.hitSerial = 0;
        /** @type {CastEvidence[]} */
        this.attempts = [];
        /** @type {HitEvidence[]} */
        this.hits = [];
        /** @type {CastEvidence | null} */
        this.latestAttempt = null;
        /** @type {AcceptedCastEvidence | null} */
        this.latestAccepted = null;
        /** @type {AcceptedCastEvidence | null} */
        this.latestResolution = null;
    }
    /** @param {string} id @param {Ability | null} ability @param {string} reason */
    reject(id, ability, reason) {
        /** @type {RejectedCastEvidence} */
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
    /** @param {Ability} ability @param {Point} origin @param {number} angle @param {Point | null} target */
    accept(ability, origin, angle, target) {
        /** @type {AcceptedCastEvidence} */
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
    /** @param {CastEvidence} record */
    keep(record) {
        this.attempts.push(record);
        if (this.attempts.length > 128) this.attempts.shift();
    }
    /** @param {AcceptedCastEvidence | null | undefined} record */
    reserve(record) {
        if (record) record.pending++;
    }
    /** @param {AcceptedCastEvidence | null | undefined} record */
    seal(record) {
        if (!record) return;
        record.sealed = true;
        this.resolve(record);
    }
    /** @param {AcceptedCastEvidence | null | undefined} record */
    end(record, interrupted = false) {
        if (!record) return;
        record.pending = Math.max(0, record.pending - 1);
        record.interrupted ||= interrupted;
        this.resolve(record);
    }
    /** @param {AcceptedCastEvidence} record */
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
    /**
     * @param {AcceptedCastEvidence | null | undefined} record
     * @param {Combatant} target
     * @param {number} amount
     * @param {Ability} [ability]
     */
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
