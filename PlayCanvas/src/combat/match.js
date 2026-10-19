import { ARENA, OBSTACLES } from '../config/arena';

import { respawn } from './combat-core.js';
import { CombatSimulation } from './combat.js';
import { CONFIG } from './config.js';
import { SUMMONERS } from './summoners.js';

// Lifecycle-only adaptation of frozen V21 match.js and crownfall-rules.js.
// Spawns belong to this diagnostic arena; no territory, timer victory or bots.
const idle = { moveX: 0, moveZ: 0 };
export class CrownfallMatch {
    constructor(selected = 0) {
        this.phase = 'prematch';
        this.countdownRemaining = 3;
        this.tick = 0;
        this.rules = {
            elapsed: 0,
            tickets: { 1: 15, 2: 15 },
            result: null,
            settings: { respawnSeconds: 3, protectionSeconds: 2 }
        };
        this.damageLog = new Map();
        this.feed = [];
        this.actors = [];
        const chosen = SUMMONERS[selected] || SUMMONERS[0];
        const blue = [chosen, ...SUMMONERS.filter((s) => s !== chosen)];
        for (const team of [1, 2])
            for (let slot = 0; slot < 3; slot++) {
                const entry = (team === 1 ? blue : SUMMONERS)[slot];
                const config = {
                    ...CONFIG,
                    summoner: { ...CONFIG.summoner, speed: 6, radius: 0.45, spawn: { x: 0, z: 5 } }
                };
                const map = {
                    width: ARENA.halfWidth * 2,
                    depth: ARENA.halfLength * 2,
                    walls: OBSTACLES.map((o) => ({ x: o.x, z: o.z, w: o.halfX * 2, d: o.halfZ * 2 }))
                };
                const sim = new CombatSimulation(
                    entry.definition,
                    { targets: [], stations: [], zones: [], targetRespawn: Infinity },
                    config,
                    map
                );
                sim.match = this;
                const p = sim.player;
                Object.assign(p, {
                    id: `${team}-${slot}`,
                    team,
                    name: entry.name,
                    summonerId: entry.definition.id,
                    finalRespawnAvailable: true,
                    eliminated: false,
                    protectedUntil: 0,
                    spawn: {
                        x: slot === 0 ? (team === 1 ? 0 : 0.65) : slot === 1 ? -3 : 3,
                        z: team === 1 ? 5 : slot === 0 ? 4.1 : 4.6
                    }
                });
                p.health = p.maxHealth = Math.round(p.maxHealth * 1.3);
                this.place(sim);
                this.actors.push({ sim, record: { kills: 0, deaths: 0, assists: 0, damage: 0 } });
            }
        this.entities = this.actors.map((a) => a.sim.player);
        for (const { sim } of this.actors) sim.targets = this.entities.filter((p) => p !== sim.player);
        this.human = this.actors[0].sim;
        this.refreshAuras();
    }
    place(sim) {
        const p = sim.player;
        Object.assign(p, p.spawn);
        p.previous = { ...p.spawn };
        p.angle = p.team === 1 ? Math.PI : 0;
        sim.stance = sim.definition.initialStance || null;
        sim.weapons.reset();
    }
    start() {
        if (this.phase === 'prematch') this.phase = 'countdown';
    }
    get active() {
        return this.phase === 'active' && !this.rules.result;
    }
    protected(p) {
        return this.active && p.protectedUntil > this.rules.elapsed;
    }
    allowCast(sim, ability) {
        return this.active && !sim.player.dead && (!ability.ultimate || sim.player.ultimateMeter >= 100);
    }
    onCast(sim, ability) {
        if (!['buff', 'stance'].includes(ability.effect)) sim.player.protectedUntil = 0;
    }
    refreshAuras() {
        for (const { sim } of this.actors) sim.refreshAura();
    }
    defeat(p) {
        if (p.respawnReserved !== undefined) return;
        let reserved = false;
        if (this.rules.tickets[p.team] > 0) {
            this.rules.tickets[p.team]--;
            reserved = true;
        } else if (p.finalRespawnAvailable) {
            p.finalRespawnAvailable = false;
            reserved = true;
        }
        p.respawnReserved = reserved;
        p.eliminated = !reserved;
        p.respawnAt = reserved ? this.rules.elapsed + 3 : Infinity;
    }
    recordDamage(sim, target, amount, source) {
        if (!this.active) return;
        const attacker = this.actors.find((a) => a.sim.player === source);
        const victim = this.actors.find((a) => a.sim.player === target);
        if (attacker && source.team !== target.team) {
            attacker.record.damage += amount;
            const log = this.damageLog.get(target.id) || new Map();
            log.set(source.id, this.rules.elapsed);
            this.damageLog.set(target.id, log);
        }
        if (!target.dead || !victim) return;
        victim.record.deaths++;
        victim.sim.onDefeated();
        this.defeat(target);
        if (attacker) attacker.record.kills++;
        for (const [id, time] of this.damageLog.get(target.id) || []) {
            const assist = this.actors.find((a) => a.sim.player.id === id);
            if (
                assist &&
                assist !== attacker &&
                assist.sim.player.team !== target.team &&
                this.rules.elapsed - time <= 8
            )
                assist.record.assists++;
        }
        this.damageLog.delete(target.id);
        this.refreshAuras();
        this.feed.unshift(`${source?.name || 'Combat'} defeated ${target.name}`);
        this.feed.length = Math.min(3, this.feed.length);
    }
    evaluate() {
        if (!this.active) return;
        const viable = (team) => this.entities.some((p) => p.team === team && (!p.dead || p.respawnReserved === true));
        const blue = viable(1),
            red = viable(2);
        if (!blue || !red) {
            this.rules.result = { winner: blue ? 1 : red ? 2 : 0, reason: 'tickets', duration: this.rules.elapsed };
            this.phase = 'results';
        }
    }
    step(command = idle, dt = 1 / 60) {
        if (this.rules.result || this.phase === 'prematch') return;
        if (this.phase === 'countdown') {
            this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
            if (this.countdownRemaining < 1e-9) {
                this.countdownRemaining = 0;
                this.phase = 'active';
            }
            return;
        }
        for (const { sim } of this.actors) {
            const p = sim.player;
            if (p.dead && p.respawnReserved && this.rules.elapsed + 1e-9 >= p.respawnAt) {
                respawn(p);
                p.protectedUntil = this.rules.elapsed + 2;
                delete p.respawnReserved;
                this.place(sim);
            }
        }
        this.tick++;
        const ordered = this.tick % 2 ? this.actors : [...this.actors].reverse();
        for (const { sim } of ordered) sim.step(sim === this.human ? command : idle, dt);
        this.rules.elapsed += dt;
        this.evaluate();
    }
    // Explicit debug timer seam: runs every authoritative fixed tick, never edits clocks/lives.
    debugAdvance(seconds = 5.1) {
        for (let i = 0; i < Math.ceil(seconds * 60) && !this.rules.result; i++) this.step(idle);
    }
    debugDamage(id, lethal = false) {
        if (!this.active) return;
        const victim = this.actors.find((a) => a.sim.player.id === id);
        if (!victim) return;
        const source = this.actors.find((a) => a.sim.player.team !== victim.sim.player.team).sim;
        source.damage(victim.sim.player, lethal ? 999999 : 100, source.player, { lethal });
    }
    snapshot() {
        return {
            phase: this.phase,
            countdownRemaining: this.countdownRemaining,
            ...this.rules,
            feed: [...this.feed],
            actors: this.actors.map(({ sim, record }) => ({
                ...sim.player,
                protected: this.protected(sim.player),
                human: sim === this.human,
                ...record
            }))
        };
    }
}
