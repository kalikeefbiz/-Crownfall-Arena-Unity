import type { PreviewIntent } from '../combat/ability-input';
import type { CombatSimulation } from '../combat/combat';
import type { Vec } from '../gameplay/vector';

import { abilityPreview } from './ability-preview';
import type { AbilityPreview } from './ability-preview';

type Project = (point: Vec, height?: number) => { x: number; y: number };
export function createCombatOverlay() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'combat-world';
    svg.setAttribute('aria-label', 'World combat preview');
    const path = (id: string) => {
        const p = document.createElementNS(svg.namespaceURI, 'path') as SVGPathElement;
        p.id = id;
        svg.append(p);
        return p;
    };
    const previewPath = path('ability-preview'),
        castPath = path('committed-shape');
    const labels = document.createElement('div');
    labels.id = 'combat-labels';
    const marker = document.createElement('div');
    marker.id = 'mobile-test-label';
    marker.textContent = 'MOBILE TEST · 1.11m\nFace gold target from RESET';
    labels.append(marker);
    const hint = document.createElement('div');
    hint.id = 'preview-hint';
    labels.append(hint);
    const numbers = new Map<number, HTMLDivElement>();
    document.body.append(svg, labels);
    let current: AbilityPreview | null = null;
    let observedJournal: CombatSimulation['journal'] | null = null;
    const draw = (node: SVGPathElement, shape: AbilityPreview | null, project: Project) => {
        node.setAttribute(
            'd',
            shape
                ? shape.outlines
                      .map((line) =>
                          line
                              .map((p, i) => {
                                  const screen = project(p, 0.08);
                                  return `${i ? 'L' : 'M'}${screen.x.toFixed(2)},${screen.y.toFixed(2)}`;
                              })
                              .join(' ')
                      )
                      .join(' ')
                : ''
        );
    };
    return {
        get preview() {
            return current;
        },
        update(sim: CombatSimulation, intent: PreviewIntent | null, project: Project) {
            if (observedJournal !== sim.journal) {
                for (const node of numbers.values()) node.remove();
                numbers.clear();
                observedJournal = sim.journal;
            }
            svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
            current = intent ? abilityPreview(intent.ability, sim.player, intent.angle, intent.targetOffset) : null;
            if (current && intent?.ability.effect === 'weaponSequence' && sim.weapons.next >= 2) {
                current.kind = 'recall';
                current.outlines = sim.weapons.blades.map((b) => [
                    { x: b.x, z: b.z },
                    { x: sim.player.x, z: sim.player.z }
                ]);
            }
            draw(previewPath, current, project);
            previewPath.classList.toggle('cancelled', !!intent?.cancel);
            hint.textContent = current
                ? intent?.cancel
                    ? 'CANCELLED · drag beyond 150px'
                    : current.kind === 'recall'
                      ? `${intent!.ability.name} · RECALL tracks caster`
                      : `${intent!.ability.name} · ${current.kind} · ${current.range.toFixed(2)}m${current.width ? ` · width ±${current.width}m` : ''}`
                : '';
            const accepted = sim.journal.latestAccepted;
            const stamp =
                accepted &&
                sim.now - accepted.time < 0.4 &&
                accepted.ability.effect !== 'projectile' &&
                accepted.ability.effect !== 'weaponSequence'
                    ? abilityPreview(
                          accepted.ability,
                          accepted.origin,
                          accepted.angle,
                          accepted.target
                              ? { x: accepted.target.x - accepted.origin.x, z: accepted.target.z - accepted.origin.z }
                              : undefined
                      )
                    : null;
            draw(castPath, stamp, project);
            const target = sim.targets.find((t) => t.id === 'mobile-test');
            marker.hidden = !target || target.dead;
            if (target) {
                const p = project(target, 0);
                marker.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,28px)`;
                marker.hidden = target.dead;
            }
            const visible = new Set<number>();
            for (const hit of sim.journal.hits) {
                const age = sim.now - hit.time;
                if (age > 1.4) continue;
                visible.add(hit.id);
                let label = numbers.get(hit.id);
                if (!label) {
                    label = document.createElement('div');
                    label.className = 'damage-number';
                    label.textContent = `−${Number(hit.amount.toFixed(1))}`;
                    label.dataset.target = hit.targetId;
                    labels.append(label);
                    numbers.set(hit.id, label);
                }
                const p = project(hit, 1.15 + age * 0.7);
                label.style.transform = `translate(${p.x}px,${p.y - (hit.id % 4) * 18}px) translate(-50%,-100%)`;
                label.style.opacity = String(Math.min(1, (1.4 - age) * 2));
            }
            for (const [id, node] of numbers)
                if (!visible.has(id)) {
                    node.remove();
                    numbers.delete(id);
                }
        },
        destroy() {
            svg.remove();
            labels.remove();
        }
    };
}
