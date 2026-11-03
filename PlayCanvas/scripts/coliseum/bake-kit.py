"""Coliseum art kit, whole arena (founder pick 2026-11-01: A "Gilded Sanctum" with B's richer painted colour).

The layout is mirrored top/bottom (build-coliseum.py), so ONE half (z 0..82, all x) is painted and the ground mesh
mirrors its v coordinate for z < 0. That keeps the drape at 22 px/m inside an iPhone-friendly texture budget.
Writes presentation textures only:
  public/assets/coliseum/kit/ground.webp   draped colour, row 0 = z 0, last row = |z| 82
  public/assets/coliseum/kit/detail.webp   seamless grain around linear mid-grey (overlay blend, 2 m tile) for close-up sharpness
  public/assets/coliseum/kit/cliff.webp    seamless warm sandstone strata for steep faces (3 m tile)
  public/assets/coliseum/kit/water.webp    seamless animated water tile
  public/assets/coliseum/kit/slice.json    bounds, mirror flag, water rectangles, groves, camps
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
src = (ROOT / 'scripts/coliseum/build-coliseum.py').read_text()
ns = {'__file__': str(ROOT / 'scripts/coliseum/build-coliseum.py')}
exec(src[:src.index('# ---- heightfield + colours')], ns)
classify, rrect_sd = ns['classify'], ns['rrect_sd']
C = {k: ns[k] for k in ('LANE', 'RAMP', 'BRIDGE', 'RIVER', 'PLATEAU', 'RIM', 'STADIUM', 'BASE_BLUE', 'BASE_RED', 'GROVE')}
GROVES, LANDMARKS = ns['GROVES'], ns['LANDMARKS']
SX, SZ, SR = ns['STADIUM_X'], ns['STADIUM_Z'], ns['STADIUM_R']

HW, HD = ns['W'] / 2, ns['D'] / 2
X0, X1, Z0, Z1, PPM = -HW, HW, 0.0, HD, 22
Wp, Hp = int((X1 - X0) * PPM), int((Z1 - Z0) * PPM)
x = X0 + (np.arange(Wp) + 0.5) / PPM
z = Z0 + (np.arange(Hp) + 0.5) / PPM
X, Z = np.meshgrid(x, z)
cls, h = classify(X, Z)
OUT = ROOT / 'public/assets/coliseum/kit'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(2021)

def noise(m, seed):
    r = np.random.default_rng(seed).standard_normal((Hp, Wp))
    n = gaussian_filter(r, m * PPM / 2, mode='reflect')
    return n / (n.std() + 1e-9)

def aa(d, w):
    """Anti-aliased line mask: 1 inside half-width w (metres) of a line at distance d, ~1 px soft edge."""
    return np.clip((w - d) * PPM + 0.5, 0, 1)

def hexc(s):
    return np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)])

lane = np.isin(cls, [C['LANE'], C['BASE_BLUE'], C['BASE_RED']])
plazas = [(0.0, 0.0, 8.0), (0.0, 30.0, 8.0), (0.0, 66.0, 10.0)]   # two lane plazas + the base disc
pd_all = np.stack([np.hypot(X - px, Z - pz) for px, pz, _ in plazas])
which = pd_all.argmin(axis=0)
pd = pd_all.min(axis=0)
pz_of = np.array([p[1] for p in plazas])[which]
pr_of = np.array([p[2] for p in plazas])[which]
in_plaza = lane & (pd <= pr_of)

# ---- lane: running-bond limestone, ring-laid plazas, warm painted value banding ----
row = np.floor(Z / 0.85)
off = (row % 2) * 0.65
col = np.floor((X + off) / 1.3)
gx = np.minimum((X + off) % 1.3, 1.3 - (X + off) % 1.3)
gz = np.minimum(Z % 0.85, 0.85 - Z % 0.85)
ids = row * 977 + col
G = 0.04
dg = np.minimum(gx, gz)
ring = np.floor(pd / 1.0)
ang = np.arctan2(Z - pz_of, X)
nseg = np.maximum(8, ring * 6 + 6)
segf = ang / (2 * np.pi / nseg) + ring * 0.37
ids = np.where(in_plaza, 50000 + ring * 131 + np.floor(segf) + pz_of * 3, ids)
dseg = (0.5 - np.abs(segf % 1.0 - 0.5)) * (2 * np.pi * np.maximum(pd, 0.5) / nseg)
rdg = np.minimum(np.minimum(pd % 1.0, 1 - pd % 1.0), dseg)
dg = np.where(in_plaza, rdg, dg)
grout = aa(dg, G)
u = np.unique(ids)
v = np.random.default_rng(3).random(len(u))[np.searchsorted(u, ids)]
band = np.clip(0.5 + 0.45 * noise(7, 4), 0, 1)[:, :, None]
stone = (hexc('#e6d3ac') * (1 - band) + hexc('#d9b98a') * band) * (0.9 + 0.14 * v)[:, :, None]
stone *= (1 + 0.02 * noise(0.35, 5))[:, :, None]
# each stone is gently bevelled: its rim a touch darker than its face, then a clean mortar line
stone *= (0.94 + 0.06 * np.clip((dg - G) / 0.12, 0, 1))[:, :, None]
stone *= (1 - 0.27 * grout)[:, :, None]
med = in_plaza & (pd < 2.0)
stone[med] = hexc('#e9cf93') * (0.95 + 0.05 * noise(0.5, 6)[med])[:, None]

# ---- wilderness: rich painted grass, sparse red leaves and small flowers ----
light = np.clip(noise(5.5, 7) * 0.55 + 0.5, 0, 1)[:, :, None]
grass = hexc('#3d6a32') * (1 - light) + hexc('#77a646') * light
grass *= (1 + 0.035 * noise(1.4, 8) + 0.015 * noise(0.4, 18))[:, :, None]
rng.random((Hp, Wp)); rng.random((Hp, Wp))   # keep the shared stream (backlot scatter) where it was
LEAVES = [hexc('#b8482a'), hexc('#c8642c'), hexc('#a63d24'), hexc('#d08a36')]
lr = np.random.default_rng(77)
drift = noise(4, 9)
SP = 0.5
for zz in np.arange(0, Z1, SP):
    for xx in np.arange(X0, X1, SP):
        px, pz = xx + lr.random() * SP, zz + lr.random() * SP
        i, j = int((px - X0) * PPM), int((pz - Z0) * PPM)
        if not (3 <= i < Wp - 3 and 3 <= j < Hp - 3):
            continue
        if lr.random() > 0.45 + 0.25 * np.clip(drift[j, i], -1, 1):   # drifts: denser in some patches, never noisy
            continue
        flower = lr.random() < 0.35
        L = 0.06 if flower else 0.09 + 0.06 * lr.random()      # half-length, metres
        Wd = 0.06 if flower else L * 0.5
        a = lr.random() * np.pi
        col = hexc('#f2d36b') if flower else LEAVES[lr.integers(len(LEAVES))] * (0.9 + 0.2 * lr.random())
        ys, xs_ = np.mgrid[j - 3:j + 4, i - 3:i + 4]
        dx, dz = X[ys, xs_] - px, Z[ys, xs_] - pz
        u_, v_ = dx * np.cos(a) + dz * np.sin(a), -dx * np.sin(a) + dz * np.cos(a)
        e = np.sqrt((u_ / L) ** 2 + (v_ / Wd) ** 2)
        m = np.clip((1 - e) * L * PPM + 0.5, 0, 1)[:, :, None]
        grass[ys, xs_] = grass[ys, xs_] * (1 - m) + col * m
forest = hexc('#2c4426') * (0.9 + 0.15 * noise(1.2, 10))[:, :, None]

rim = (cls == C['RIM'])
lane_d = distance_transform_edt(~lane) / PPM
cap = rim & (lane_d < 0.75)
steps = np.abs(((np.abs(X) - 5.0) / 0.45) % 1.0 - 0.5) > 0.43
rampc = hexc('#dcc396') * np.where(steps, 0.64, 1.0)[:, :, None] * (0.95 + 0.05 * noise(0.5, 11))[:, :, None]

river = cls == C['RIVER']
bank = river & (distance_transform_edt(river) / PPM < 0.9)
bed = hexc('#2a4a52') * (0.9 + 0.1 * noise(0.8, 12))[:, :, None]
bankc = hexc('#9c8f78') * (0.85 + 0.15 * noise(0.4, 13))[:, :, None]
bridge = cls == C['BRIDGE']

# ---- stadium: limestone seating tiers (seat tops pale, a darker shadow line at each riser foot) ----
stad = cls == C['STADIUM']
sd = rrect_sd(X, Z, SX, SZ, SR)
tier_f = (sd / 1.6) % 1.0
seat = hexc('#d6c09a') * (0.92 + 0.08 * noise(0.6, 15))[:, :, None]
seat *= np.where(tier_f < 0.12, 0.7, 1.0)[:, :, None]
aisle = (np.abs(((np.arctan2(Z, X) / (2 * np.pi)) * 64) % 1.0 - 0.5) > 0.47)
seat[aisle] *= 0.82

img = np.zeros((Hp, Wp, 3))
img[:] = grass
img[lane] = stone[lane]
img[cls == C['RAMP']] = rampc[cls == C['RAMP']]
img[cls == C['GROVE']] = forest[cls == C['GROVE']]
img[cap] = (hexc('#cdb991') * (0.9 + 0.1 * noise(0.4, 14))[:, :, None])[cap]
img[river] = bed[river]
img[bank] = bankc[bank]
img[bridge] = stone[bridge] * 0.92
img[stad] = seat[stad]

# ---- backlot (stadium phase): the non-walkable rim ground around each base reads as forest floor + crags, not lawn ----
rim_d = distance_transform_edt(rim) / PPM
backlot = rim & (Z > 46)
wb = np.clip((rim_d - 0.8) / 1.8, 0, 1)[:, :, None] * backlot[:, :, None]
under = hexc('#26361f') * (0.85 + 0.2 * noise(1.6, 16))[:, :, None]
under[gaussian_filter((rng.random((Hp, Wp)) > 0.996).astype(float), 1.4) > 0.03] = hexc('#5c4a3a')
img = img * (1 - wb) + under * wb
scatter = []
for zz in np.arange(47.0, 82.0, 3.1):
    for xx in np.arange(-41.0, 41.5, 3.1):
        jx = xx + (rng.random() - 0.5) * 2.0
        jz = zz + (rng.random() - 0.5) * 2.0
        i, j = int((jx - X0) * PPM), int((jz - Z0) * PPM)
        if not (0 <= i < Wp and 0 <= j < Hp) or not rim[j, i] or rim_d[j, i] < 1.7:
            continue
        crag = rim_d[j, i] >= 3.0 and rng.random() < 0.3   # crags sit deep in the backlot, never at the walk edge
        scatter.append([round(float(jx), 2), round(float(jz), 2), 1 if crag else 0])

# ---- camps (corner plazas) and the major: carved stone discs with a brass ring on the wilderness ----
camps = []
for L in LANDMARKS:
    if L['z'] < 0:
        continue
    r = L['radius'] + (2.0 if L['type'] == 'major' else 1.4)
    d = np.hypot(X - L['x'], Z - L['z'])
    m = (d <= r) & np.isin(cls, [C['PLATEAU'], C['GROVE']])
    ringn = np.floor(d / 0.9)
    seg = np.arctan2(Z - L['z'], X - L['x']) / (2 * np.pi / np.maximum(6, ringn * 5 + 6)) + ringn * 0.41
    sg = (np.minimum(d % 0.9, 0.9 - d % 0.9) < G) | (np.abs(seg % 1.0 - 0.5) > 0.5 - G / np.maximum(d, 0.5) * 2.5)
    base = hexc('#e2c99a' if L['type'] == 'major' else '#d8c7a4') * (0.9 + 0.1 * noise(0.4, 16))[:, :, None]
    base *= np.where(sg, 0.68, 1.0)[:, :, None]
    img[m] = base[m]
    img[m & (np.abs(d - (r - 0.6)) < 0.09)] = hexc('#c99a45')
    img[m & (d < 1.0)] = hexc('#c99a45') * 0.95
    edge = (d > r) & (d < r + 0.6) & (cls == C['PLATEAU'])
    img[edge] *= 0.8
    camps.append(dict(id=L['id'], type=L['type'], x=L['x'], z=L['z'], r=round(r, 2)))

gw = np.maximum(aa(np.abs(np.abs(X) - 4.0), 0.1) * (np.abs(Z) <= 60.0), aa(np.abs(pd - (pr_of - 3.0)), 0.085))
gw = np.maximum(gw, aa(np.abs(Z - 60.0), 0.12) * (np.abs(X) <= 5.0)) * lane
img = img * (1 - gw[:, :, None]) + hexc('#c99a45') * gw[:, :, None]
wall = ~lane & ~(cls == C['RAMP']) & ~bridge
foot = np.exp(-distance_transform_edt(~wall) / (0.55 * PPM))
img *= (1 - 0.32 * foot * lane)[:, :, None]
gro = np.zeros(X.shape)
for gx_, gz_, gr in GROVES:
    if gz_ < -3:
        continue
    gro = np.maximum(gro, np.exp(-np.clip(np.hypot(X - gx_, Z - gz_) - gr, 0, None) / 1.2))
img *= (1 - 0.35 * gro * (cls == C['PLATEAU']))[:, :, None]
Image.fromarray(np.rint(np.clip(img, 0, 1) * 255).astype('u1')).save(OUT / 'ground.webp', quality=88, method=6)

# ---- seamless tiles ----
def tilenoise(n, sigma, seed, shape=None):
    r = np.random.default_rng(seed).standard_normal(shape or (n, n))
    t = gaussian_filter(r, sigma, mode='wrap')
    return t / t.std()

N = 256
# detail: grain around LINEAR 0.5 (the engine decodes colour maps as sRGB, and the overlay blend is neutral at
# linear 0.5), so the drape is unchanged on average; stored sRGB-encoded.
grain = 0.25 * tilenoise(N, 1.2, 41) + 0.45 * tilenoise(N, 3, 42) + 0.3 * tilenoise(N, 8, 43)
det = np.clip(0.5 + 0.035 * grain, 0, 1) ** (1 / 2.2)
Image.fromarray(np.rint(det * 255).astype('u1')).convert('RGB').save(OUT / 'detail.webp', quality=90, method=6)

# cliff: dressed sandstone courses (u along the face, v up; 3 m tile, 512 px): anti-aliased mortar joints, a sunlit lip
# on each course top and a soft shadow under it, gentle block-to-block tone variation
NC, COURSES, BLOCKS = 512, 7, 5
yy = (np.arange(NC) + 0.5) / NC
xx_ = (np.arange(NC) + 0.5) / NC
course = np.floor(yy * COURSES)[:, None] * np.ones((1, NC))
shift = (course % 2) * 0.5 + 0.25 * np.random.default_rng(5).random(COURSES)[course.astype(int)]
bu = xx_[None, :] * BLOCKS + shift
fy = (yy * COURSES) % 1.0
px_m = 3.0 / NC                                            # metres per pixel of the tile
dj = np.minimum(bu % 1.0, 1 - bu % 1.0) * (3.0 / BLOCKS) / px_m   # pixels to the nearest vertical joint
dc = np.minimum(fy, 1 - fy)[:, None] * (3.0 / COURSES) / px_m     # pixels to the nearest bed joint
joint = np.clip(np.maximum(2.2 - dj, 2.6 - dc) + 0.5, 0, 1)
blockid = course * 31 + np.floor(bu)
bv = np.random.default_rng(6).random(int(blockid.max()) + 2)[blockid.astype(int)]
cl = hexc('#c9ab7c')[None, None, :] * (0.87 + 0.13 * bv)[:, :, None]
cl *= (1 + 0.03 * tilenoise(NC, 2.5, 44) + 0.02 * tilenoise(NC, 9, 45))[:, :, None]
lip = np.clip(1 - fy[:, None] * (3.0 / COURSES) / px_m / 6, 0, 1)   # bright just below each course top
foot = np.clip(1 - (1 - fy)[:, None] * (3.0 / COURSES) / px_m / 9, 0, 1)        # shade just above each bed joint
cl *= (1 + 0.1 * lip - 0.12 * foot)[:, :, None]
cl *= (1 - 0.42 * joint)[:, :, None]
Image.fromarray(np.rint(np.clip(cl, 0, 1) * 255).astype('u1')).save(OUT / 'cliff.webp', quality=90, method=6)

ripple = 0.6 * tilenoise(N, 10, 31) + 0.4 * tilenoise(N, 4, 32)
t = np.clip(0.5 + 0.28 * ripple, 0, 1)[:, :, None]
water = hexc('#1f6f86') * (1 - t) + hexc('#5fb7c7') * t
foam = np.clip((tilenoise(N, 3, 33) - 1.6) * 2.5, 0, 1)[:, :, None]
water = water * (1 - foam) + hexc('#dff3f2') * foam
Image.fromarray(np.rint(np.clip(water, 0, 1) * 255).astype('u1')).save(OUT / 'water.webp', quality=90, method=6)

# ---- water rectangles over the whole arena (merged per 0.5 m row) ----
step = 0.5
rects = []
for zz in np.arange(-HD, HD, step):
    xs = np.arange(X0, X1, step) + step / 2
    c_, _ = classify(xs, np.full_like(xs, zz + step / 2))
    run = None
    for i, k in enumerate(c_):
        if k == C['RIVER'] and run is None:
            run = xs[i] - step / 2
        if (k != C['RIVER'] or i == len(xs) - 1) and run is not None:
            end = xs[i] - step / 2 if k != C['RIVER'] else xs[i] + step / 2
            rects.append([round(float(run), 2), round(float(zz), 2), round(float(end), 2), round(float(zz + step), 2)])
            run = None
mirrored = camps + [dict(c, id=c['id'].replace('-blue', '-red'), z=-c['z']) for c in camps if c['z'] > 0]
(OUT / 'slice.json').write_text(json.dumps(dict(
    bounds=[X0, X1, -HD, HD], mirrorZ=True, size=[Wp, Hp], waterY=1.55, water=rects,
    groves=[list(g) for g in GROVES], camps=mirrored, backlot=scatter,
    stadium=dict(hx=SX, hz=SZ, r=SR)), indent=1) + '\n')
print('ground', Wp, 'x', Hp, (OUT / 'ground.webp').stat().st_size, 'water rects', len(rects))
