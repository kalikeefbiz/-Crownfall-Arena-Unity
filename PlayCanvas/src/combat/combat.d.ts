export type Combatant = {
    id: string;
    team: number;
    kind: string;
    x: number;
    z: number;
    radius: number;
    health: number;
    maxHealth: number;
    dead: boolean;
    targetable: boolean;
    ultimateMeter: number;
    angle: number;
    statuses: Record<string, number>;
    modifiers: Record<string, Record<string, number>>;
};
export type Ability = {
    id: string;
    name: string;
    short: string;
    basic?: boolean;
    ultimate?: boolean;
    cooldown: number;
    cooldownKey?: string;
    effect: string;
    aim: string;
    range?: number;
    key: string;
};
export type Definition = { id: string; name?: string; health: number; abilities: Ability[]; bonus?: Ability };
export class CombatSimulation {
    constructor(definition?: unknown, training?: unknown, config?: unknown, map?: unknown);
    player: Combatant;
    targets: Combatant[];
    definition: Definition;
    stance: string | null;
    now: number;
    actionSerial: number;
    committedAngle: number;
    collisions: number;
    lastEvent: string;
    cooldowns: {
        ends: Record<string, number>;
        remaining(id: string, now: number): number;
        ready(id: string, now: number): boolean;
    };
    temporary: { available(id: string, now: number): boolean; grants: Map<string, { expires: number }> };
    weapons: { next: number; returning: boolean };
    projectiles: { items: { active: boolean; x: number; z: number; persistent?: boolean; phase?: string }[] };
    effects: { items: { active: boolean; x: number; z: number; range?: number; type: string }[] };
    activeAbilities(): Ability[];
    ability(id: string): Ability;
    cast(id: string, angle?: number, target?: { x: number; z: number }): boolean;
    damage(target: Combatant, amount: number, source?: Combatant): number;
    step(command: unknown, dt?: number): void;
}
