"""GOAL 020 enclosure design: authored walls, gates and passes for Sol'Rahn V2.

Derives (never edits) the V2 walk masks. Output:
  public/assets/solrahn-v2/walk-goal020.bin   walk + fullWalk masks with wall footprints removed
  public/assets/solrahn-v2/enclosure-goal020.json   wall paths, gates, passes, hashes (renderer input)
  evidence/020/enclosure-plan.png               annotated plan
Walls only ever REMOVE walkable cells. Connectivity is verified here and in tests.
"""
from pathlib import Path
import json, hashlib, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, label

ROOT = Path(__file__).resolve().parents[2]
V2 = ROOT / 'public/assets/solrahn-v2'
meta = json.loads((V2 / 'terrain.json').read_text())
NW, ND, STEP = meta['navWidth'], meta['navDepth'], meta['navStep']
raw = np.fromfile(V2 / 'walk.bin', dtype='u1')
walk0, full0 = raw[:NW * ND].reshape(ND, NW) > 0, raw[NW * ND:].reshape(ND, NW) > 0
gx = np.arange(NW) * STEP - 60
gz = np.arange(ND) * STEP - 80
X, Z = np.meshgrid(gx, gz)

# ---- authored layout (metres) -------------------------------------------------------------
# Lane walls: inner face wobbles around |x| = 7.6 so the lane breathes (pinches at gates, bulges between).
LANE_HALF = 7.6
WALL_T = 2.6
LANE_Z = (-69.0, 69.0)

def lane_edge(z, phase):
    return LANE_HALF + 0.9 * math.sin(z * 0.085 + phase) + 0.35 * math.sin(z * 0.23 + phase * 2)

# Gates: (side, z centre, WALKABLE width, kind). Visual gap = width + 1.6 erosion.
# Founder rule: the lane is SEALED for ~30 m in front of each base (|z| > 40), so a push there is a commitment;
# the middle 80 m opens every ~16 m per side, staggered L/R, so nobody is stuck in the lane for long.
GATES = [
    ('W', 34.0, 3.6, 'gap'), ('W', 18.0, 2.4, 'throat'), ('W', 2.0, 5.0, 'mouth'), ('W', -14.0, 2.4, 'throat'), ('W', -30.0, 3.6, 'gap'),
    ('E', 27.0, 2.4, 'throat'), ('E', 10.0, 3.6, 'gap'), ('E', -6.0, 2.4, 'throat'), ('E', -22.0, 5.0, 'mouth'), ('E', -36.0, 3.6, 'gap'),
]
# Wilderness spurs: (side, z, anchor, length, pass width). 'in'/'out' leave one pass at the far end (S-shaped routes);
# 'mid' leaves a pass at BOTH ends (base-side camp pockets keep two entrances); 'seal' closes completely (base plazas).
SPURS = [
    ('W', 44.0, 'mid', 0.0, 3.6), ('W', 10.0, 'out', 12.0, 3.6), ('W', -22.0, 'in', 12.0, 3.6), ('W', -44.0, 'mid', 0.0, 3.6),
    ('E', 40.0, 'mid', 0.0, 3.6), ('E', 16.0, 'in', 12.0, 3.6), ('E', -18.0, 'out', 12.0, 3.6), ('E', -30.0, 'mid', 0.0, 3.6),
    ('W', 66.0, 'seal', 0.0, 0.0), ('W', -66.0, 'seal', 0.0, 0.0), ('E', 66.0, 'seal', 0.0, 0.0), ('E', -66.0, 'seal', 0.0, 0.0),
]
OUTER = 27.4  # inner face of the outer cliff ridge; matches the 3v3 mode boundary (|x|<=28)
SPUR_T = 3.4  # thick enough to carry a tree belt

segments = []  # (x0,z0,x1,z1,thickness,kind)

def side(s):
    return -1 if s == 'W' else 1

BELT = 2.6  # tree belt behind each lane wall (wilderness side), same gaps as the wall

def lane_wall(s, offset=WALL_T / 2, margin=0.0):
    phase = 0.8 if s == 'W' else 2.4
    zs = np.arange(LANE_Z[0], LANE_Z[1] + 0.01, 1.0)
    gates = [(g[1], g[2] + 1.6 + margin) for g in GATES if g[0] == s]
    out, run = [], []
    for z in zs:
        in_gate = any(abs(z - c) < w / 2 for c, w in gates)
        if in_gate:
            if len(run) > 1:
                out.append(run)
            run = []
        else:
            run.append((side(s) * (lane_edge(z, phase) + offset), float(z)))
    if len(run) > 1:
        out.append(run)
    return out

for s in 'WE':
    for run in lane_wall(s):
        for (xa, za), (xb, zb) in zip(run[:-1], run[1:]):
            segments.append((xa, za, xb, zb, WALL_T, 'lane'))
    # Belt flares at gates (wider gap) so each gate opens into the wilderness like a funnel, not a slot.
    for run in lane_wall(s, WALL_T + BELT / 2 - 0.2, 2.4):
        for (xa, za), (xb, zb) in zip(run[:-1], run[1:]):
            segments.append((xa, za, xb, zb, BELT, 'belt'))

spur_defs = []
for s, z, anchor, length, passw in SPURS:
    sg = side(s)
    inner = sg * (lane_edge(z, 0.8 if s == 'W' else 2.4) + WALL_T + BELT - 0.4)
    if anchor == 'in':
        x_from, x_to = inner, inner + sg * length
    elif anchor == 'out':
        x_from, x_to = sg * OUTER, sg * (OUTER - length)
    elif anchor == 'mid':
        x_from, x_to = inner + sg * (passw + 1.6 + SPUR_T / 2), sg * (OUTER - passw - 1.6 - SPUR_T / 2)
    else:  # seal: lane wall to beyond the barrier
        x_from, x_to = inner - sg * 1.0, sg * (OUTER + 2.0)
    spur_defs.append(dict(side=s, z=z, anchor=anchor, x0=x_from, x1=x_to, pass_width=passw))
    n = max(2, int(abs(x_to - x_from) / 1.0))
    for i in range(n):
        a, b = i / n, (i + 1) / n
        zj = 0.55 * math.sin(i * 1.7 + z)
        segments.append((x_from + (x_to - x_from) * a, z + zj, x_from + (x_to - x_from) * b, z + 0.55 * math.sin((i + 1) * 1.7 + z), SPUR_T, 'spur'))

def capsule_mask(x0, z0, x1, z1, half):
    dx, dz = x1 - x0, z1 - z0
    L2 = dx * dx + dz * dz or 1e-9
    t = np.clip(((X - x0) * dx + (Z - z0) * dz) / L2, 0, 1)
    return (X - (x0 + t * dx)) ** 2 + (Z - (z0 + t * dz)) ** 2 <= half * half

footprint = np.zeros_like(walk0)
for x0, z0, x1, z1, t, _ in segments:
    footprint |= capsule_mask(x0, z0, x1, z1, t / 2)
# Actors have radius .45 plus margin: keep them visibly off the rock face.
blocked = distance_transform_edt(~footprint) * STEP <= 0.8
walk1, full1 = walk0 & ~blocked, full0 & ~blocked
# Corner dead-ends sealed behind the base spurs are useless pockets: remove them rather than leave unreachable floor.
for m in (walk1, full1):
    lab_, n_ = label(m)
    for i_ in range(1, n_ + 1):
        if (lab_ == i_).sum() < 600:
            m[lab_ == i_] = False

# ---- verification ---------------------------------------------------------------------------
def cell(x, z):
    return int(round((z + 80) / STEP)), int(round((x + 60) / STEP))

def nearest_walk(mask, x, z):
    r, c = cell(x, z)
    for rad in range(0, 40):
        sub = mask[max(0, r - rad):r + rad + 1, max(0, c - rad):c + rad + 1]
        if sub.any():
            rr, cc = np.argwhere(sub)[0]
            return max(0, r - rad) + rr, max(0, c - rad) + cc
    raise SystemExit('no walkable cell near %s,%s' % (x, z))

lab0, n0 = label(walk0)
lab1, n1 = label(walk1)
spawns = [(0, 71), (0, -71), (-1.45, 71), (1.45, -71)]
camps = [(l['id'], l['x'], l['z']) for l in meta['landmarks']]
report = dict(components_before=int(n0), components_after=int(n1), walk_cells_before=int(walk0.sum()), walk_cells_after=int(walk1.sum()))
ref = lab1[nearest_walk(walk1, 0, 71)]
problems = []
for name, x, z in [('spawn%d' % i, *s) for i, s in enumerate(spawns)] + camps:
    r, c = nearest_walk(walk1, x, z)
    if lab1[r, c] != ref:
        problems.append(name)
report['unreachable_from_blue_spawn'] = problems

# Count lane-to-wilderness gates + pass connectivity per pocket: remove one gate at a time and re-check camps.
def reachable(mask, goal):
    lab, _ = label(mask)
    return lab[nearest_walk(mask, 0, 71)] == lab[nearest_walk(mask, *goal)]

report['camp_resilience'] = {}
for cid, cx, cz in camps:
    survive = 0
    for gi, g in enumerate(GATES):
        gm = np.zeros_like(walk1)
        sg = side(g[0])
        gm = (np.abs(Z - g[1]) < (g[2] + 1.6) / 2 + .6) & (np.abs(X) > LANE_HALF - 1.8) & (np.abs(X) < LANE_HALF + WALL_T + BELT + 2.2) & (np.sign(X) == sg)
        if reachable(walk1 & ~gm, (cx, cz)):
            survive += 1
    report['camp_resilience'][cid] = f'{survive}/{len(GATES)} single-gate closures keep it reachable'
report['gates'] = [dict(side=s, z=z, walkable_width=w, kind=k) for s, z, w, k in GATES]
report['spurs'] = spur_defs

# ---- tree masses (presentation only; placed ONLY on non-walkable ground so every trunk is honest) ----
rng = np.random.default_rng(2020)
belt_fp = np.zeros_like(walk0)
for x0, z0, x1, z1, t, k in segments:
    if k in ('belt', 'spur'):
        belt_fp |= capsule_mask(x0, z0, x1, z1, t / 2)
dist_walk = distance_transform_edt(~walk1) * STEP          # metres to nearest walkable cell
lane_face = np.zeros_like(walk0)
for x0, z0, x1, z1, t, k in segments:
    if k == 'lane':
        lane_face |= capsule_mask(x0, z0, x1, z1, t / 2 + 0.6)
WINDOWS = [-52.0, -14.0, 24.0, 58.0]  # gaps in the barrier forest that look out onto the top / combo lanes
window = np.zeros_like(walk0)
for wz in WINDOWS:
    window |= (np.abs(Z - wz) < 6.5) & (np.abs(X) > 28.5)
camp_clear = np.zeros_like(walk0)
for _, cx, cz in camps:
    camp_clear |= (X - cx) ** 2 + (Z - cz) ** 2 < 6.5 ** 2
inside = (np.abs(X) < 28.2) & ~walk1 & (dist_walk >= 0.5) & ~lane_face & ~camp_clear & (belt_fp | ~walk0)
barrier = (np.abs(X) >= 28.2) & (np.abs(X) < 36.0) & ~window & (np.abs(Z) < 79)
trees = []
def scatter(mask, spacing, hmin, hmax, kinds, cap):
    cand = np.argwhere(mask)
    rng.shuffle(cand)
    pts = np.array([[t[0], t[1]] for t in trees]) if trees else np.zeros((0, 2))
    added = 0
    for r, c in cand:
        x, z = gx[c] + rng.uniform(-.2, .2), gz[r] + rng.uniform(-.2, .2)
        if len(pts) and (((pts - (x, z)) ** 2).sum(1) < spacing ** 2).any():
            continue
        trees.append([round(float(x), 2), round(float(z), 2), round(float(rng.uniform(hmin, hmax)), 2), int(rng.choice(kinds)), int(rng.integers(0, 360))])
        pts = np.vstack([pts, [x, z]])
        added += 1
        if added >= cap:
            break
scatter(inside, 2.5, 4.5, 7.5, [0, 1, 2, 3], 260)
scatter(barrier, 2.3, 6.0, 9.5, [0, 1, 2], 320)
report['trees'] = len(trees)

# ---- outputs --------------------------------------------------------------------------------
out_bin = V2 / 'walk-goal020.bin'
out_bin.write_bytes(np.concatenate([walk1.reshape(-1), full1.reshape(-1)]).astype('u1').tobytes())
layout = dict(
    version=1, base_walk_sha256=meta['files']['walk.bin']['sha256'],
    walk=dict(file='walk-goal020.bin', bytes=out_bin.stat().st_size, sha256=hashlib.sha256(out_bin.read_bytes()).hexdigest()),
    laneHalf=LANE_HALF, wallThickness=WALL_T, outer=OUTER,
    segments=[[round(v, 3) if isinstance(v, float) else v for v in s] for s in segments],
    gates=[dict(side=s, z=z, width=w, kind=k) for s, z, w, k in GATES],
    spurs=spur_defs, windows=WINDOWS, trees=trees, report=report,
)
(V2 / 'enclosure-goal020.json').write_text(json.dumps(layout, indent=1) + '\n')

# plan image
S = 5
im = Image.new('RGB', (120 * S, 160 * S), (24, 28, 24))
a = np.zeros((ND, NW, 3), 'u1')
a[walk0] = (60, 80, 60)
a[walk0 & blocked] = (150, 60, 50)
a[~walk0 & full0] = (50, 50, 70)
im.paste(Image.fromarray(a).resize((120 * S, 160 * S), Image.NEAREST))
d = ImageDraw.Draw(im)
P = lambda x, z: ((x + 60) * S, (z + 80) * S)
for cid, cx, cz in camps:
    px, py = P(cx, cz)
    d.ellipse([px - 12, py - 12, px + 12, py + 12], outline=(255, 235, 150), width=2)
    d.text((px + 14, py - 5), cid, fill=(255, 235, 150))
for s, z, w, k in GATES:
    px, py = P(side(s) * LANE_HALF, z)
    d.text((px - 10, py - 5), f'{w:g}', fill=(120, 220, 255))
for p in [(0, 71), (0, -71)]:
    px, py = P(*p)
    d.rectangle([px - 6, py - 6, px + 6, py + 6], outline=(255, 255, 255))
(ROOT / 'evidence/020').mkdir(parents=True, exist_ok=True)
im.save(ROOT / 'evidence/020/enclosure-plan.png')
print(json.dumps({k: v for k, v in report.items() if k not in ('spurs', 'gates')}, indent=1))
