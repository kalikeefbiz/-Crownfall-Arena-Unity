import { createHash } from 'node:crypto';

import { BotController } from '../../src/combat/bot-controller.js';
import { CrownfallMatch } from '../../src/combat/match.js';

// Fixed-step default matches, with a deterministic command pilot in the human
// slot. Hash every command, authoritative state and damage transaction, rather
// than retaining megabytes of repeated frame snapshots in the baseline fixture.
export function defaultContractReplay(selected) {
    const match = new CrownfallMatch(selected, { bots: true });
    const pilot = new BotController(9);
    const commands = createHash('sha256');
    const states = createHash('sha256');
    const transactions = createHash('sha256');
    const seen = new WeakSet();
    let ticks = 0;
    let damageTransactions = 0;
    let deaths = 0;
    let respawns = 0;
    let previousDead = match.entities.map((p) => p.dead);
    const record = () => {
        states.update(
            JSON.stringify({
                match: match.snapshot(),
                simulations: match.actors.map(({ sim, bot }) => ({
                    now: sim.now,
                    stance: sim.stance,
                    cooldowns: sim.cooldowns.ends,
                    grants: [...sim.temporary.grants],
                    committedAngle: sim.committedAngle,
                    actionSerial: sim.actionSerial,
                    attempt: sim.journal.latestAttempt,
                    resolution: sim.journal.latestResolution,
                    inWilderness: sim.inWilderness,
                    bot: bot && {
                        seed: bot.seed,
                        decisions: bot.decisions,
                        targetId: bot.targetId,
                        nextAction: bot.nextAction,
                        nextThink: bot.nextThink,
                        nextStance: bot.nextStance,
                        angle: bot.angle
                    }
                }))
            }) + '\n'
        );
        for (const { sim } of match.actors)
            for (const transaction of sim.transactions)
                if (!seen.has(transaction)) {
                    seen.add(transaction);
                    damageTransactions++;
                    transactions.update(JSON.stringify({ actor: sim.player.id, ...transaction }) + '\n');
                }
    };
    record();
    match.start();
    for (; ticks < 304 * 60 && !match.rules.result; ticks++) {
        const command = pilot.command(match.human);
        commands.update(JSON.stringify(command) + '\n');
        match.step(command);
        for (let i = 0; i < previousDead.length; i++) {
            const dead = match.entities[i].dead;
            if (!previousDead[i] && dead) deaths++;
            if (previousDead[i] && !dead) respawns++;
        }
        previousDead = match.entities.map((p) => p.dead);
        record();
    }
    if (!match.rules.result) throw new Error('Default replay did not finish');
    return {
        selected,
        ticks,
        damageTransactions,
        deaths,
        respawns,
        commandsSha256: commands.digest('hex'),
        statesSha256: states.digest('hex'),
        transactionsSha256: transactions.digest('hex'),
        final: JSON.parse(JSON.stringify(match.snapshot()))
    };
}
