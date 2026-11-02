"""Crownfall Coliseum graybox: ONE layout -> heightfield, collision masks, colours and metadata.

Founder-approved plan (2026-11-01): golden lane with three plazas, sealed base corridors, two raised
wilderness halves (west: major on a river island; east: Defense + Cooldown camps), rivers with bridges
and stepping stones, stadium ring. Same file format and loader as Sol'Rahn V2, so the game's movement,
bots, scoring and camera use it unchanged.

World: x across (west -, east +), z along the lane (Red base -z, Blue base +z), Y up.
Heights are stored with a +2 m datum (u16 0..8 m): lane 2.0, wilderness 4.0, river bed 0.8.
"""
from pathlib import Path
import hashlib, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, label

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/coliseum'
OUT.mkdir(parents=True, exist_ok=True)

W, D = 84.0, 164.0                    # map extent (m)
NX, NZ = 113, 219                     # heightfield vertices (~0.75 m)
STEP = 0.5                            # navigation cell (m)
NW, ND = int(W / STEP) + 1, int(D / STEP) + 1
RADIUS, EROSION = 0.45, 0.8           # actor radius; erosion keeps bodies visibly off walls
LANE_H, PLATEAU_H, RIM_H, RIVER_H = 2.0, 4.0, 4.0, 0.8  # rim = plateau level: one clean 2 m cliff, no saw-tooth ridge

# ---- layout (metres) -------------------------------------------------------------------------
LANE_HALF, GOAL, SCORE_HALF = 5.0, 60.0, 4.0
LANE_PLAZAS = [(0.0, -30.0, 8.0), (0.0, 0.0, 8.0), (0.0, 30.0, 8.0)]
BASES = {1: (0.0, 66.0, 10.0), 2: (0.0, -66.0, 10.0)}   # Blue +z, Red -z
SPAWN_Z = 64.0
PLATEAU_IN, PLATEAU_OUT, PLATEAU_Z, PLATEAU_R = 9.5, 33.0, 54.0, 7.0
RAMP_FROM, RAMP_TO = 5.0, 10.0
# (side, z, walkable width). Visual width = walkable + 2 * erosion. Mirrored top/bottom for fairness.
RAMPS = [(-1, z, w) for z, w in ((24, 5.0), (-24, 5.0), (10, 2.4), (-10, 2.4))] + \
        [(+1, z, w) for z, w in ((20, 3.6), (-20, 3.6), (34, 2.4), (-34, 2.4))]
ISLAND = (-22.0, 0.0, 6.2)
W_RIVER_ARM = 8.8                      # outer radius of the river ring around the island
W_RIVER_HALF, E_RIVER_HALF = 1.8, 2.0
BRIDGES = [  # (x0, x1, z0, z1, height)  walkable width + 1.6 visual
    (-24.3, -19.7, 5.4, 9.8, PLATEAU_H), (-24.3, -19.7, -9.8, -5.4, PLATEAU_H),   # island bridges (3 m)
    (23.4, 28.6, -2.8, 2.8, PLATEAU_H),                                             # east bridge (3.6 m)
    (11.0, 15.0, -2.8, 2.8, PLATEAU_H - 0.25),                                      # stepping stones (2.4 m)
]
FLANK_X, FLANK_HALF = 29.0, 0.8
# Tree groves (art kit, 2026-11-01): solid, non-walkable clumps on the wilderness, kept off ramps, camps and crossings
# so trees are honest obstacles. Mirrored top/bottom. (x, z, radius)
GROVES = [(x, s * z, r) for x, z, r in ((-15.0, 16.0, 2.2), (-16.5, 35.0, 2.6), (-28.0, 22.0, 2.4), (15.0, 27.5, 2.4),
                                         (14.5, 6.5, 1.8), (28.0, 28.0, 2.6)) for s in (1, -1)]
STADIUM_X, STADIUM_Z, STADIUM_R = 35.0, 76.0, 26.0

LANDMARKS = [
    dict(id='west-mobility-blue', type='mobility', x=-24.0, z=40.0, radius=3, active=True),
    dict(id='west-mobility-red', type='mobility', x=-24.0, z=-40.0, radius=3, active=True),
    dict(id='east-defense-blue', type='defense', x=24.0, z=40.0, radius=3, active=False),
    dict(id='east-defense-red', type='defense', x=24.0, z=-40.0, radius=3, active=False),
    dict(id='east-cooldown-blue', type='cooldown', x=20.0, z=14.0, radius=3, active=False),
    dict(id='east-cooldown-red', type='cooldown', x=20.0, z=-14.0, radius=3, active=False),
    dict(id='major', type='major', x=-22.0, z=0.0, radius=4, active=False),
]

# ---- classification ----------------------------------------------------------------------------
LANE, RAMP, BRIDGE, RIVER, PLATEAU, RIM, STADIUM, BASE_BLUE, BASE_RED, GROVE = range(10)

def rrect_sd(x, z, hx, hz, r):
    qx, qz = np.abs(x) - (hx - r), np.abs(z) - (hz - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qx, qz), 0) - r

def classify(x, z):
    cls = np.full(x.shape, RIM, dtype=np.int8)
    h = np.full(x.shape, RIM_H)
    # stadium outside the floor
    sd = rrect_sd(x, z, STADIUM_X, STADIUM_Z, STADIUM_R)
    outside = sd > 0
    # plateaus (rounded rect per side)
    px = np.abs(x) - (PLATEAU_IN + PLATEAU_OUT) / 2
    plateau = (rrect_sd(px, z, (PLATEAU_OUT - PLATEAU_IN) / 2, PLATEAU_Z, PLATEAU_R) <= 0)
    island = (x - ISLAND[0]) ** 2 + (z - ISLAND[1]) ** 2 <= ISLAND[2] ** 2
    ring = ((x - ISLAND[0]) ** 2 + (z - ISLAND[1]) ** 2 <= W_RIVER_ARM ** 2) & ~island
    w_river = (x < 0) & (((np.abs(z) <= W_RIVER_HALF) & (x <= -PLATEAU_IN) & ~island) | ring)
    e_river = (x > 0) & (np.abs(z) <= E_RIVER_HALF) & (x >= PLATEAU_IN)
    river = (w_river | e_river) & ~outside
    cls[plateau] = PLATEAU; h[plateau] = PLATEAU_H
    cls[island] = PLATEAU; h[island] = PLATEAU_H
    cls[river] = RIVER; h[river] = RIVER_H
    for x0, x1, z0, z1, bh in BRIDGES:
        m = (x >= x0) & (x <= x1) & (z >= z0) & (z <= z1)
        cls[m] = BRIDGE; h[m] = bh
    # lane surfaces (plazas and bases first; ramps cut into plaza sides; the straight lane strip wins last)
    plaza = np.zeros(x.shape, bool)
    for cx, cz, r in LANE_PLAZAS:
        plaza |= (x - cx) ** 2 + (z - cz) ** 2 <= r * r
    cls[plaza] = LANE; h[plaza] = LANE_H
    for team, (cx, cz, r) in BASES.items():
        m = (x - cx) ** 2 + (z - cz) ** 2 <= r * r
        cls[m] = BASE_BLUE if team == 1 else BASE_RED; h[m] = LANE_H
    for side, rz, w in RAMPS:
        half = (w + 2 * EROSION) / 2
        m = (np.sign(x) == side) & (np.abs(x) >= RAMP_FROM - 0.3) & (np.abs(x) <= RAMP_TO) & (np.abs(z - rz) <= half)
        t = np.clip((np.abs(x) - RAMP_FROM) / (RAMP_TO - RAMP_FROM), 0, 1)
        cls[m] = RAMP; h[m] = LANE_H + (PLATEAU_H - LANE_H) * t[m]
    strip = (np.abs(x) <= LANE_HALF) & (np.abs(z) <= GOAL)
    cls[strip] = LANE; h[strip] = LANE_H
    for gx_, gz_, gr in GROVES:
        m = ((x - gx_) ** 2 + (z - gz_) ** 2 <= gr * gr) & (cls == PLATEAU)
        cls[m] = GROVE
    cls[outside] = STADIUM
    h[outside] = RIM_H + np.minimum(3.2, 0.6 + np.floor(sd[outside] / 1.6) * 0.55)
    return cls, h

WALKABLE = {LANE, RAMP, BRIDGE, PLATEAU, BASE_BLUE, BASE_RED}

# ---- heightfield + colours --------------------------------------------------------------------
vx = np.linspace(-W / 2, W / 2, NX)
vz = np.linspace(-D / 2, D / 2, NZ)
VX, VZ = np.meshgrid(vx, vz)
cls_v, h_v = classify(VX, VZ)
# Anti-aliased heights: average a 5x5 sub-sample per vertex so curved cliff edges don't stair-step.
acc = np.zeros_like(h_v)
offs = np.linspace(-0.3, 0.3, 5)
for ox in offs:
    for oz in offs:
        acc += classify(VX + ox, VZ + oz)[1]
heights = np.clip(acc / len(offs) ** 2, 0, 8)

rng = np.random.default_rng(21)
# Graybox palette, deliberately mid-dark: the scene's sun and ambient lift everything ~1.8x on screen.
PAL = {
    LANE: (0.36, 0.34, 0.31), RAMP: (0.46, 0.34, 0.16), BRIDGE: (0.33, 0.31, 0.28), RIVER: (0.07, 0.17, 0.26),
    GROVE: (0.1, 0.15, 0.08), PLATEAU: (0.17, 0.25, 0.14), RIM: (0.19, 0.18, 0.18), STADIUM: (0.09, 0.085, 0.1),
    BASE_BLUE: (0.18, 0.27, 0.42), BASE_RED: (0.42, 0.2, 0.18),
}
col = np.zeros((NZ, NX, 3))
for k, c in PAL.items():
    col[cls_v == k] = c
flank = (cls_v == PLATEAU) & (np.abs(np.abs(VX) - FLANK_X) <= FLANK_HALF) & (np.abs(VZ) > 4)
col[flank] = (0.27, 0.27, 0.21)
for L in LANDMARKS:
    m = (VX - L['x']) ** 2 + (VZ - L['z']) ** 2 <= (L['radius'] + 1.5) ** 2
    col[m & (cls_v == PLATEAU)] = (0.38, 0.3, 0.12) if L['type'] == 'major' else (0.24, 0.31, 0.17)
stad_tier = (cls_v == STADIUM) & ((np.floor(rrect_sd(VX, VZ, STADIUM_X, STADIUM_Z, STADIUM_R) / 1.6) % 2) == 1)
col[stad_tier] *= 1.5
col *= (0.96 + 0.08 * rng.random((NZ, NX)))[:, :, None]
col = np.clip(col, 0, 1)

# ---- collision (nav grid), eroded so bodies never overlap a wall ----------------------------
gx = np.arange(NW) * STEP - W / 2
gz = np.arange(ND) * STEP - D / 2
GX, GZ = np.meshgrid(gx, gz)
cls_n, h_n = classify(GX, GZ)
raw = np.isin(cls_n, list(WALKABLE))
walk = distance_transform_edt(raw) * STEP > EROSION
# drop unreachable specks
lab, n = label(walk)
sizes = np.bincount(lab.ravel())
sizes[0] = 0
walk = lab == sizes.argmax()

# ---- verification ---------------------------------------------------------------------------
def cell(x, z):
    return int(round((z + D / 2) / STEP)), int(round((x + W / 2) / STEP))

def reach(mask, a, b):
    lb, _ = label(mask)
    ra, rb = lb[cell(*a)], lb[cell(*b)]
    return ra != 0 and ra == rb

checks = {}
spawn_b, spawn_r = (0.0, SPAWN_Z), (0.0, -SPAWN_Z)
checks['bases connected'] = bool(reach(walk, spawn_b, spawn_r))
for L in LANDMARKS:
    checks[f"{L['id']} reachable"] = bool(reach(walk, spawn_b, (L['x'], L['z'])) and reach(walk, spawn_r, (L['x'], L['z'])))
for name, z in (('blue', 48.0), ('red', -48.0)):
    cut = walk.copy()
    r, _ = cell(0, z)
    cut[r - 1:r + 2, :] &= ~(np.abs(GX[r - 1:r + 2, :]) <= LANE_HALF + 1)
    base = spawn_b if name == 'blue' else spawn_r
    checks[f'{name} base sealed (lane is the only way in)'] = bool(not reach(cut, base, (-24.0, 0.0 + (8.0 if name == 'blue' else -8.0))))
# the major is reachable from both teams' halves of the west only through the island bridges
for i, (x0, x1, z0, z1, _) in enumerate(BRIDGES[:2]):
    cut = walk & ~((GX >= x0 - 1) & (GX <= x1 + 1) & (GZ >= z0) & (GZ <= z1))
    checks[f'major still reachable with island bridge {i + 1} closed'] = bool(reach(cut, spawn_b, (-22.0, 0.0)))
# measured walking distance base -> major for both teams (BFS on the nav grid)
def bfs_dist(mask, a, b):
    from collections import deque
    sr, sc = cell(*a); gr, gc = cell(*b)
    dist = np.full(mask.shape, -1, np.int32); dist[sr, sc] = 0; q = deque([(sr, sc)])
    while q:
        r, c = q.popleft()
        if (r, c) == (gr, gc):
            return float(dist[r, c] * STEP)
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < ND and 0 <= cc < NW and mask[rr, cc] and dist[rr, cc] < 0:
                dist[rr, cc] = dist[r, c] + 1; q.append((rr, cc))
    return None
checks['blue base -> major (m, grid path)'] = bfs_dist(walk, spawn_b, (-22.0, 0.0))
checks['red base -> major (m, grid path)'] = bfs_dist(walk, spawn_r, (-22.0, 0.0))
checks['blue base -> red base (m, grid path)'] = bfs_dist(walk, spawn_b, spawn_r)
failed = [k for k, v in checks.items() if v is False or v is None]

# ---- write ----------------------------------------------------------------------------------
def write(name, data):
    p = OUT / name
    p.write_bytes(data)
    return dict(bytes=p.stat().st_size, sha256=hashlib.sha256(data).hexdigest())

files = {
    'height.u16': write('height.u16', np.rint(heights / 8 * 65535).astype('<u2').tobytes()),
    'walk.bin': write('walk.bin', np.concatenate([walk.ravel(), walk.ravel()]).astype('u1').tobytes()),
    'lane.bin': write('lane.bin', np.isin(cls_v, [LANE, BASE_BLUE, BASE_RED]).astype('u1').tobytes()),
    'colors.bin': write('colors.bin', np.rint(col * 255).astype('u1').tobytes()),
}
cells = (NX - 1) * (NZ - 1) * 2
meta = dict(
    version=1, variant='coliseum', name='Crownfall Coliseum',
    normalization='unsigned16 / 65535 * 8 metres; +2 m datum (lane floor = 2.0)',
    mapping='x = i/(nx-1)*width - width/2; z = j/(nz-1)*depth - depth/2; Y up; Blue +z, Red -z',
    width=W, depth=D, nx=NX, nz=NZ, verticalScale=8, navWidth=NW, navDepth=ND, navStep=STEP,
    radius=RADIUS, erosion=EROSION, maxSlopeDegrees=35, maxStepMetres=0.3,
    modeX=[-STADIUM_X, STADIUM_X], chunkCells=24,
    topTriangles=cells, edgeTriangles=2 * 2 * ((NX - 1) + (NZ - 1)), totalTriangles=cells + 4 * ((NX - 1) + (NZ - 1)),
    spawn=dict(z=SPAWN_Z, x=[0, -1.45, 1.45]),
    lane=dict(goalA=-GOAL, goalB=GOAL, halfWidth=SCORE_HALF),
    zones=[dict(x=s * (PLATEAU_IN + PLATEAU_OUT) / 2, z=0, w=PLATEAU_OUT - PLATEAU_IN, d=2 * PLATEAU_Z, tag='wilderness', name='WILDERNESS') for s in (-1, 1)],
    layout=dict(laneHalf=LANE_HALF, scoreHalf=SCORE_HALF, goal=GOAL, plazas=LANE_PLAZAS, bases={str(k): v for k, v in BASES.items()},
                ramps=RAMPS, bridges=BRIDGES, groves=GROVES, island=ISLAND, laneH=LANE_H, plateauH=PLATEAU_H),
    landmarks=LANDMARKS,
    checks=checks,
    files=files,
)
(OUT / 'terrain.json').write_text(json.dumps(meta, indent=1) + '\n')

# plan image (top-down: Red at top)
S = 5
img = Image.fromarray(np.rint(col[:, :] * 255).astype('u1')).resize((int(W * S), int(D * S)), Image.NEAREST)
wk = Image.fromarray((walk * 255).astype('u1')).resize(img.size, Image.NEAREST)
d = ImageDraw.Draw(img)
edge = np.array(wk) > 0
ys, xs = np.nonzero(edge ^ np.roll(edge, 1, 0) | edge ^ np.roll(edge, 1, 1))
for y, x in zip(ys[::3], xs[::3]):
    d.point((x, y), fill=(255, 255, 255))
for L in LANDMARKS:
    px, py = (L['x'] + W / 2) * S, (L['z'] + D / 2) * S
    d.text((px - 18, py - 5), L['id'].split('-')[1][:4].upper() if L['type'] != 'major' else 'MAJOR', fill=(20, 20, 20))
(ROOT / 'evidence/021').mkdir(parents=True, exist_ok=True)
img.save(ROOT / 'evidence/021/coliseum-plan.png')
print(json.dumps(checks, indent=1))
print('FAILED:', failed if failed else 'none')
