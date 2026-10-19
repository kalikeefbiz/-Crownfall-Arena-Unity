// Sample intentions only when a fixed tick can consume them. An idle render
// frame must never acknowledge a held press or drain a release command.
export class CommandStepper {
    accumulator = 0;
    advance(sim, controls, frame, dt) {
        this.accumulator += Math.min(Math.max(dt, 0), 0.1);
        let accepted = false;
        while (this.accumulator + 1e-10 >= 1 / 60) {
            controls.synchronize(sim);
            const preview = controls.preview;
            const command = controls.read();
            const before = sim.actionSerial;
            sim.step({
                moveX: frame.movement.x,
                moveZ: frame.movement.z,
                aimX: preview ? Math.sin(preview.angle) : frame.aim.x,
                aimZ: preview ? Math.cos(preview.angle) : frame.aim.z,
                aiming: !!preview || frame.targeting,
                ...command
            });
            accepted ||= sim.actionSerial !== before;
            this.accumulator -= 1 / 60;
        }
        return accepted;
    }
}
