export function addModifier(e, id, value) {
    e.modifiers ??= {};
    e.modifiers[id] = { ...value };
}
export function modifierTotals(e, now) {
    let outgoing = 1,
        incoming = 1,
        movement = 1,
        cooldown = 1;
    for (const v of Object.values(e?.modifiers || {})) {
        if (v.expires <= now) continue;
        outgoing *= 1 + (v.damageBonus || 0);
        movement *= 1 + (v.speedBonus || 0);
        cooldown *= 1 - Math.max(0, Math.min(0.5, v.cooldownReduction || 0));
        movement *= 1 - Math.max(0, Math.min(1, v.slow || 0));
        incoming *= 1 - Math.max(0, Math.min(1, v.mitigation || 0));
    }
    return { outgoing, incoming, movement, cooldown };
}
export function expireModifiers(e, now) {
    for (const [id, v] of Object.entries(e.modifiers || {})) if (v.expires <= now) delete e.modifiers[id];
}
export function updateAlliedAura(owner, entities, passive) {
    const key = `aura:${owner.id}`;
    for (const e of entities) if (e.modifiers) delete e.modifiers[key];
    if (owner.dead || passive?.effect !== 'alliedAura') return [];
    const allies = entities.filter(
        (e) =>
            e !== owner &&
            !e.dead &&
            e.team === owner.team &&
            e.kind === 'summoner' &&
            Math.hypot(e.x - owner.x, e.z - owner.z) <= passive.radius
    );
    if (allies.length)
        for (const e of [owner, ...allies]) addModifier(e, key, { mitigation: passive.mitigation, expires: Infinity });
    return allies;
}
export function clampGroundTarget(p, target, range) {
    const dx = target.x - p.x,
        dz = target.z - p.z,
        d = Math.hypot(dx, dz),
        scale = d > range ? range / d : 1;
    return { x: p.x + dx * scale, z: p.z + dz * scale };
}
