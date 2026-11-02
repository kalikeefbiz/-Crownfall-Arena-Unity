"""Coliseum art-kit slice (founder pick 2026-11-01): A "Gilded Sanctum" with B's richer painted colour.

Slice x -26..20, z -6..42: centre plaza + both rivers, the z=30 plaza, west 5 m ramp, east ramps, lane walls, groves.
Writes presentation textures only:
  public/assets/coliseum/kit/ground.webp   draped colour (row 0 = z0)
  public/assets/coliseum/kit/water.webp    seamless animated water tile
  public/assets/coliseum/kit/slice.json    bounds, water rectangles, grove list
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
classify = ns['classify']
C = {k: ns[k] for k in ('LANE', 'RAMP', 'BRIDGE', 'RIVER', 'PLATEAU', 'RIM', 'BASE_BLUE', 'BASE_RED', 'GROVE')}
GROVES = ns['GROVES']

X0, X1, Z0, Z1, PPM = -26.0, 20.0, -6.0, 42.0, 24
Wp, Hp = int((X1 - X0) * PPM), int((Z1 - Z0) * PPM)
x = X0 + (np.arange(Wp) + 0.5) / PPM
z = Z0 + (np.arange(Hp) + 0.5) / PPM
X, Z = np.meshgrid(x, z)
cls, h = classify(X, Z)
OUT = ROOT / 'public/assets/coliseum/kit'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(2021)

def noise(m, seed, shape=None):
    shp = shape or (Hp, Wp)
    r = np.random.default_rng(seed).standard_normal(shp)
    n = gaussian_filter(r, m * PPM / 2, mode='wrap' if shape else 'reflect')
    return n / (n.std() + 1e-9)

def hexc(s):
    return np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)])

lane = np.isin(cls, [C['LANE'], C['BASE_BLUE'], C['BASE_RED']])
plazas = [(0.0, 0.0), (0.0, 30.0)]
pd = np.min([np.hypot(X - px, Z - pz) for px, pz in plazas], axis=0)
pz_of = np.where(np.hypot(X, Z) < np.hypot(X, Z - 30), 0.0, 30.0)
in_plaza = lane & (pd <= 8.0) & (np.abs(X) > 0)

# ---- lane: running-bond limestone, ring-laid plazas, warm painted value banding ----
row = np.floor(Z / 0.85)
off = (row % 2) * 0.65
col = np.floor((X + off) / 1.3)
gx = np.minimum((X + off) % 1.3, 1.3 - (X + off) % 1.3)
gz = np.minimum(Z % 0.85, 0.85 - Z % 0.85)
ids = row * 977 + col
grout = (gx < 0.03) | (gz < 0.03)
ring = np.floor(pd / 1.0)
ang = np.arctan2(Z - pz_of, X)
nseg = np.maximum(8, ring * 6 + 6)
segf = ang / (2 * np.pi / nseg) + ring * 0.37
ids = np.where(in_plaza, 50000 + ring * 131 + np.floor(segf) + pz_of, ids)
rgrout = (np.minimum(pd % 1.0, 1 - pd % 1.0) < 0.03) | (np.abs(segf % 1.0 - 0.5) > 0.5 - 0.03 / np.maximum(pd, 0.5) * 2.5)
grout = np.where(in_plaza, rgrout, grout)
u = np.unique(ids)
v = np.random.default_rng(3).random(len(u))[np.searchsorted(u, ids)]
band = np.clip(0.5 + 0.45 * noise(7, 4), 0, 1)[:, :, None]
stone = (hexc('#e6d3ac') * (1 - band) + hexc('#d9b98a') * band) * (0.9 + 0.14 * v)[:, :, None]
stone *= (1 + 0.035 * noise(0.35, 5))[:, :, None]
stone *= np.where(grout, 0.66, 1.0)[:, :, None]
med = in_plaza & (pd < 2.0)
stone[med] = hexc('#e9cf93') * (0.95 + 0.05 * noise(0.5, 6)[med])[:, None]

# ---- wilderness: rich painted grass, worn flank path, sparse red leaves and small flowers ----
light = np.clip(noise(5.5, 7) * 0.55 + 0.5, 0, 1)[:, :, None]
grass = hexc('#3d6a32') * (1 - light) + hexc('#77a646') * light
grass *= (1 + 0.05 * noise(0.45, 8))[:, :, None]
leaf = (rng.random((Hp, Wp)) > 0.994) & (noise(3, 9) > 0.3)
grass[gaussian_filter(leaf.astype(float), 1.1) > 0.07] = hexc('#b8482a')
flower = (rng.random((Hp, Wp)) > 0.9975)
grass[gaussian_filter(flower.astype(float), 0.8) > 0.06] = hexc('#f2d36b')
forest = hexc('#2c4426') * (0.9 + 0.15 * noise(1.2, 10))[:, :, None]

# ---- rim (between lane wall and plateau): grass with a carved stone cap along the lane edge ----
rim = (cls == C['RIM'])
lane_d = distance_transform_edt(~lane) / PPM
cap = rim & (lane_d < 0.75)
ramp_t = np.clip((np.abs(X) - 5.0) / 5.0, 0, 1)
steps = np.abs(((np.abs(X) - 5.0) / 0.45) % 1.0 - 0.5) > 0.43
rampc = hexc('#dcc396') * np.where(steps, 0.64, 1.0)[:, :, None] * (0.95 + 0.05 * noise(0.5, 11))[:, :, None]

# ---- river bed + carved banks ----
river = cls == C['RIVER']
bank = river & (distance_transform_edt(river) / PPM < 0.9)
bed = hexc('#2a4a52') * (0.9 + 0.1 * noise(0.8, 12))[:, :, None]
bankc = hexc('#9c8f78') * (0.85 + 0.15 * noise(0.4, 13))[:, :, None]
bridge = cls == C['BRIDGE']

img = np.zeros((Hp, Wp, 3))
img[:] = grass
img[lane] = stone[lane]
img[cls == C['RAMP']] = rampc[cls == C['RAMP']]
img[cls == C['GROVE']] = forest[cls == C['GROVE']]
img[cap] = (hexc('#cdb991') * (0.9 + 0.1 * noise(0.4, 14))[:, :, None])[cap]
img[river] = bed[river]
img[bank] = bankc[bank]
img[bridge] = stone[bridge] * 0.92
# brass inlay (scoring band + plaza rings)
gold = lane & ((np.abs(np.abs(X) - 4.0) < 0.1) | (np.abs(pd - 5.0) < 0.085))
img[gold] = hexc('#c99a45')
# soft contact shade at wall feet and under groves
wall = ~lane & ~(cls == C['RAMP']) & ~bridge
foot = np.exp(-distance_transform_edt(~wall) / (0.55 * PPM))
img *= (1 - 0.32 * foot * lane)[:, :, None]
gro = np.zeros(X.shape)
for gx_, gz_, gr in GROVES:
    gro = np.maximum(gro, np.exp(-np.clip(np.hypot(X - gx_, Z - gz_) - gr, 0, None) / 1.2))
img *= (1 - 0.35 * gro * (cls == C['PLATEAU']))[:, :, None]
Image.fromarray(np.rint(np.clip(img, 0, 1) * 255).astype('u1')).save(OUT / 'ground.webp', quality=88, method=6)

# ---- seamless water tile (256 px = 4 m) ----
N = 256
def tilenoise(sigma, seed):
    r = np.random.default_rng(seed).standard_normal((N, N))
    n = gaussian_filter(r, sigma, mode='wrap')
    return n / n.std()
ripple = 0.6 * tilenoise(10, 31) + 0.4 * tilenoise(4, 32)
t = np.clip(0.5 + 0.28 * ripple, 0, 1)[:, :, None]
water = hexc('#1f6f86') * (1 - t) + hexc('#5fb7c7') * t
foam = np.clip((tilenoise(3, 33) - 1.6) * 2.5, 0, 1)[:, :, None]
water = water * (1 - foam) + hexc('#dff3f2') * foam
Image.fromarray(np.rint(np.clip(water, 0, 1) * 255).astype('u1')).save(OUT / 'water.webp', quality=90, method=6)

# ---- water rectangles (merged per 0.5 m row) ----
step = 0.5
rects = []
for zz in np.arange(Z0, Z1, step):
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
(OUT / 'slice.json').write_text(json.dumps(dict(bounds=[X0, X1, Z0, Z1], water=rects, waterY=1.55,
                                                groves=[g for g in GROVES if X0 - 3 < g[0] < X1 + 3 and Z0 - 3 < g[1] < Z1 + 3]), indent=1) + '\n')
print('ground', (OUT / 'ground.webp').stat().st_size, 'water rects', len(rects))
