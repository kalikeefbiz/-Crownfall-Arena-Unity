import { ARENA, OBSTACLES } from '../config/arena';

import { BotController } from './bot-controller.js';
import { respawn } from './combat-core.js';
import { CombatSimulation } from './combat.js';
import { CONFIG } from './config.js';
import { CrownfallRules } from './crownfall-rules.js';
import { MATCH_WORLD, matchSpawn, worldToReference } from './match-space.js';
import { SUMMONERS } from './summoners.js';

// Lifecycle adaptation of frozen V21 match.js and crownfall-rules.js.
// Bots only supply commands; this remains the sole match authority.
const idle = { moveX: 0, moveZ: 0 };
export class CrownfallMatch {
    constructor(selected = 0, { bots = false, diagnostic = false } = {}) {
        this.diagnostic = diagnostic;
        this.phase = 'prematch';
        this.countdownRemaining = 3;
        this.tick = 0;
        this.rules = new CrownfallRules();
        this.results = null;
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
                const map = diagnostic
                    ? {
                          width: ARENA.halfWidth * 2,
                          depth: ARENA.halfLength * 2,
                          walls: OBSTACLES.map((o) => ({ x: o.x, z: o.z, w: o.halfX * 2, d: o.halfZ * 2 }))
                      }
                    : MATCH_WORLD;
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
                    spawn: diagnostic
                        ? {
                              x: bots ? (slot - 1) * 3 : slot === 0 ? (team === 1 ? 0 : 0.65) : slot === 1 ? -3 : 3,
                              z: bots ? (team === 1 ? 9.8 : -9.8) : team === 1 ? 5 : slot === 0 ? 4.1 : 4.6
                          }
                        : matchSpawn(team, slot)
                });
                p.health = p.maxHealth = Math.round(p.maxHealth * 1.3);
                this.place(sim);
                this.actors.push({
                    sim,
                    bot: bots && (team !== 1 || slot !== 0) ? new BotController(this.actors.length) : null,
                    record: { kills: 0, deaths: 0, assists: 0, damage: 0, pressureSeconds: 0 }
                });
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
        this.rules.defeat(p);
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
    evaluate(dt = 0) {
        if (!this.active) return;
        const entities = this.entities.map((p) => ({ ...p, ...worldToReference(p) }));
        // Retain the close-range lifecycle diagnostic, with neutral territory only.
        if (this.diagnostic) for (const p of entities) p.x = 0;
        this.rules.step(entities, dt);
        for (const a of this.actors) {
            const p = a.sim.player;
            if (
                !p.dead &&
                !p.respawnReserved &&
                Math.abs(p.x) <= this.rules.lane.halfWidth &&
                p.team === this.rules.scoringTeam
            )
                a.record.pressureSeconds += dt;
        }
        if (this.rules.result) {
            this.phase = 'results';
            this.results = {
                ...this.rules.result,
                control: this.rules.control,
                front: this.rules.front,
                cp: { ...this.rules.cp },
                tickets: { ...this.rules.tickets },
                participants: this.actors.map(({ sim, record, bot }) => ({
                    id: sim.player.id,
                    team: sim.player.team,
                    name: sim.player.name,
                    summonerId: sim.player.summonerId,
                    controller: bot ? 'bot' : 'local',
                    ...record
                }))
            };
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
        dt = Math.min(dt, Math.max(0, this.rules.settings.timeLimitSeconds - this.rules.elapsed));
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
        for (const { sim, bot } of ordered) sim.step(sim === this.human ? command : bot ? bot.command(sim) : idle, dt);
        this.evaluate(dt);
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
            remaining: Math.max(0, this.rules.settings.timeLimitSeconds - this.rules.elapsed),
            results: this.results,
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
