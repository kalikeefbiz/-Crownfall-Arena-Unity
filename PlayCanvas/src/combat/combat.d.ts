export type Point = { x: number; z: number };
export type CombatModifier = {
    expires: number;
    label?: string;
    damageBonus?: number;
    speedBonus?: number;
    cooldownReduction?: number;
    slow?: number;
    mitigation?: number;
};
export type Combatant = Point & {
    id: string;
    name?: string;
    team: number;
    kind: string;
    radius: number;
    health: number;
    maxHealth: number;
    dead: boolean;
    targetable: boolean;
    ultimateMeter?: number;
    angle?: number;
    respawnAt: number;
    statuses: Record<string, number>;
    modifiers: Record<string, CombatModifier>;
};
export type CombatPlayer = Combatant & {
    ultimateMeter: number;
    angle: number;
    previous: Point;
    distance: number;
    animation: string;
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
    width?: number;
    radius?: number;
    angle?: number;
};
export type Definition = {
    id: string;
    name?: string;
    health: number;
    abilities: Ability[];
    bonus?: Ability;
    passive?: {
        name?: string;
        zoneTag?: string;
        speedBonus?: number;
        effect?: string;
        radius?: number;
        mitigation?: number;
    };
};
export type HitEvidence = {
    id: number;
    time: number;
    castId: number | null;
    targetId: string;
    x: number;
    z: number;
    amount: number;
    abilityId: string | null;
    name: string;
};
type CastRecord = {
    id: number;
    abilityId: string;
    name: string;
    reason: string;
    time: number;
    targetIds: string[];
    damage: number;
};
export type RejectedCastEvidence = CastRecord & {
    accepted: false;
    result: 'REJECTED';
};
export type AcceptedCastEvidence = CastRecord & {
    accepted: true;
    reason: '';
    result: 'PENDING' | 'HIT' | 'MISS' | 'DONE' | 'INTERRUPTED';
    finished?: number;
    interrupted?: boolean;
    ability: Ability;
    origin: Point;
    angle: number;
    target: Point | null;
    pending: number;
    sealed: boolean;
};
export type CastEvidence = AcceptedCastEvidence | RejectedCastEvidence;
export type CombatAction = { id: string; angle?: number; targetOffset?: Point };
export type CombatCommand = {
    moveX?: number;
    moveZ?: number;
    aimX?: number;
    aimZ?: number;
    aiming?: boolean;
    attackHeld?: boolean;
    actions?: CombatAction[];
    speedMultiplier?: number;
};
export type DamageOptions = {
    lethal?: boolean;
    ability?: Ability;
    trace?: AcceptedCastEvidence | null;
};
export class CombatSimulation {
    constructor(definition?: unknown, training?: unknown, config?: unknown, map?: unknown);
    player: CombatPlayer;
    targets: Combatant[];
    definition: Definition;
    stance: string | null;
    inWilderness: boolean;
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
    journal: {
        latestAttempt: CastEvidence | null;
        latestAccepted: AcceptedCastEvidence | null;
        latestResolution: AcceptedCastEvidence | null;
        hits: HitEvidence[];
        attempts: CastEvidence[];
    };
    transactions: {
        time: number;
        sourceId: string | null;
        targetId: string;
        amount: number;
        abilityId: string | null;
        defeated: boolean;
    }[];
    weapons: { next: number; returning: boolean; blades: { x: number; z: number; phase: string }[] };
    projectiles: { items: { active: boolean; x: number; z: number; persistent?: boolean; phase?: string }[] };
    effects: { items: { active: boolean; x: number; z: number; range?: number; type: string }[] };
    activeAbilities(): Ability[];
    ability(id: string): Ability | null;
    cast(id: string, angle?: number, target?: Point | null): boolean;
    damage(target: Combatant, amount: number, source?: Combatant | null, options?: DamageOptions): number;
    step(command: CombatCommand, dt?: number): void;
}
