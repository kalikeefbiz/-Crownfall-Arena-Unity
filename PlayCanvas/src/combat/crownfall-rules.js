import { MATCH_LANE, matchSettings } from './match-data.js';
// Pure, fixed-step rules. A front is a position, never a capture/contest flag.
export class CrownfallRules {
    constructor(settings = {}, lane = MATCH_LANE) {
        this.lane = lane;
        this.settings = matchSettings(settings);
        this.elapsed = 0;
        this.control = 0.5;
        this.front = 0;
        this.cp = { 1: 0, 2: 0 };
        this.tickets = { 1: this.settings.startingTickets, 2: this.settings.startingTickets };
        this.pressureTeam = 0;
        this.pressureAge = 0;
        this.scoringTeam = 0;
        this.result = null;
    }
    measure(entities) {
        if (this.result) return this.control;
        const LANE = this.lane;
        const lane = entities.filter((p) => !p.dead && !p.respawnReserved && Math.abs(p.z) <= LANE.halfWidth),
            blue = lane.filter((p) => p.team === 1),
            red = lane.filter((p) => p.team === 2);
        const b = blue.length ? Math.max(...blue.map((p) => p.x)) : null,
            r = red.length ? Math.min(...red.map((p) => p.x)) : null;
        this.front =
            b !== null && r !== null
                ? b <= r
                    ? (b + r) / 2
                    : Math.max(r, Math.min(b, this.front))
                : b !== null
                  ? Math.max(0, b)
                  : r !== null
                    ? Math.min(0, r)
                    : 0;
        this.front = Math.max(LANE.goalA, Math.min(LANE.goalB, this.front));
        // Only crossed formations need endpoint protection against a backline runner.
        if (b !== null && r !== null && b > r)
            this.front = Math.max(
                LANE.goalA + (LANE.goalB - LANE.goalA) / 1000,
                Math.min(LANE.goalB - (LANE.goalB - LANE.goalA) / 1000, this.front)
            );
        this.control = (this.front - LANE.goalA) / (LANE.goalB - LANE.goalA);
        if (Math.abs(this.control - 0.5) < 1e-9) this.control = 0.5;
        return this.control;
    }
    defeat(entity) {
        if (entity.respawnReserved !== undefined) return;
        let available = false;
        if (this.tickets[entity.team] > 0) {
            this.tickets[entity.team]--;
            available = true;
        } else if (entity.finalRespawnAvailable !== false) {
            entity.finalRespawnAvailable = false;
            available = true;
        }
        entity.respawnReserved = available;
        entity.eliminated = !available;
        entity.respawnAt = available ? this.elapsed + this.settings.respawnSeconds : Infinity;
    }
    finish(winner, reason) {
        if (!this.result) this.result = { winner, reason, duration: this.elapsed };
    }
    step(entities, dt) {
        if (this.result) return;
        dt = Math.min(dt, Math.max(0, this.settings.timeLimitSeconds - this.elapsed));
        this.elapsed += dt;
        this.measure(entities);
        // No grace for total control. Simultaneous terminal elimination is an explicit draw.
        if (this.control >= 1) {
            this.finish(1, 'total-control');
            return;
        }
        if (this.control <= 0) {
            this.finish(2, 'total-control');
            return;
        }
        const viable = (team) => entities.some((p) => p.team === team && (!p.dead || p.respawnReserved === true));
        const blue = viable(1),
            red = viable(2);
        if (!blue || !red) {
            this.finish(blue ? 1 : red ? 2 : 0, 'tickets');
            return;
        }
        const team = this.control > 0.5 ? 1 : this.control < 0.5 ? 2 : 0;
        if (team !== this.pressureTeam) {
            this.pressureTeam = team;
            this.pressureAge = 0;
        }
        this.scoringTeam = 0;
        if (team) {
            const old = this.pressureAge;
            this.pressureAge += dt;
            const scoringTime =
                Math.max(0, this.pressureAge - this.settings.graceSeconds) -
                Math.max(0, old - this.settings.graceSeconds);
            if (this.pressureAge >= this.settings.graceSeconds) this.scoringTeam = team;
            const rate = this.settings.cpPerSecond * (1 + this.settings.depthBonus * Math.abs(this.control - 0.5) * 2);
            this.cp[team] = Math.min(this.settings.cpTarget, this.cp[team] + scoringTime * rate);
            if (this.cp[team] >= this.settings.cpTarget) this.finish(team, 'points');
        } else this.pressureAge = 0;
        // Temporary regulation resolution: retained CP, then current territory, then draw.
        if (!this.result && this.settings.timeLimitSeconds > 0 && this.elapsed >= this.settings.timeLimitSeconds)
            this.finish(
                this.cp[1] !== this.cp[2]
                    ? this.cp[1] > this.cp[2]
                        ? 1
                        : 2
                    : this.control !== 0.5
                      ? this.control > 0.5
                          ? 1
                          : 2
                      : 0,
                'regulation'
            );
    }
}
