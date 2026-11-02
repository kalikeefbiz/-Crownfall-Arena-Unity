"""Coliseum style slice: three art directions baked onto the SAME 46 x 30 m stretch for comparison.

Slice x -26..20, z 12..42: lane with the z=30 plaza, west 5 m ramp (z 24), east ramps (z 20, 34), lane cliffs and the
edge of both wilderness halves. Uses the approved layout's own classification (build-coliseum.py), so nothing moves.
A  Gilded Sanctum   pale limestone, emissive gold inlay, carved masonry, green with red autumn accents (closest to concept)
B  Painted Diorama  saturated hand-painted values, soft rounded forms, big brush light patches
C  Weathered Stone  photographic CC0 Poly Haven textures already in the repo, darker and grounded
Writes only presentation textures: public/assets/coliseum/styles/{a,b,c}-ground.webp
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
src = (ROOT / 'scripts/coliseum/build-coliseum.py').read_text()
ns = {'__file__': str(ROOT / 'scripts/coliseum/build-coliseum.py')}
exec(src[:src.index('# ---- heightfield + colours')], ns)  # layout + classify only; writes nothing
classify = ns['classify']
LANE, RAMP, PLATEAU, RIM, BASE_BLUE, BASE_RED = (ns[k] for k in ('LANE', 'RAMP', 'PLATEAU', 'RIM', 'BASE_BLUE', 'BASE_RED'))

X0, X1, Z0, Z1, PPM = -26.0, 20.0, 12.0, 42.0, 24
Wp, Hp = int((X1 - X0) * PPM), int((Z1 - Z0) * PPM)
# image row 0 = z0 (the TS drape maps v = (z - z0) / depth with flipY off)
x = X0 + (np.arange(Wp) + 0.5) / PPM
z = Z0 + (np.arange(Hp) + 0.5) / PPM
X, Z = np.meshgrid(x, z)
cls, h = classify(X, Z)
OUT = ROOT / 'public/assets/coliseum/styles'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)

def noise(m, seed):
    r = np.random.default_rng(seed).standard_normal((Hp, Wp))
    n = gaussian_filter(r, m * PPM / 2, mode='reflect')
    return n / (n.std() + 1e-9)

def hexc(s):
    return np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)])

lane = np.isin(cls, [LANE, BASE_BLUE, BASE_RED])
plaza_d = np.hypot(X, Z - 30.0)
in_plaza = lane & (plaza_d <= 8.0) & (np.abs(X) > 0)

def flagstones(slab_x, slab_z, grout, seed):
    """Running-bond slabs in the strip, concentric ring slabs in the plaza. Returns (id field, grout mask)."""
    row = np.floor(Z / slab_z)
    off = (row % 2) * slab_x / 2
    col = np.floor((X + off) / slab_x)
    gx = np.minimum((X + off) % slab_x, slab_x - (X + off) % slab_x)
    gz = np.minimum(Z % slab_z, slab_z - Z % slab_z)
    ids = row * 977 + col
    g = (gx < grout) | (gz < grout)
    ring = np.floor(plaza_d / 1.0)
    ang = np.arctan2(Z - 30.0, X)
    seg = np.floor(ang / (2 * np.pi / np.maximum(8, ring * 6 + 6)) + ring * 0.37)
    rid = 50000 + ring * 131 + seg
    rg = (np.minimum(plaza_d % 1.0, 1.0 - plaza_d % 1.0) < grout) | (np.abs(((ang / (2 * np.pi / np.maximum(8, ring * 6 + 6)) + ring * 0.37) % 1.0) - 0.5) > 0.5 - grout / np.maximum(plaza_d, 0.5) * 3)
    ids = np.where(in_plaza, rid, ids)
    g = np.where(in_plaza, rg, g)
    return ids, g

def per_id(ids, seed):
    u = np.unique(ids)
    r = np.random.default_rng(seed).random(len(u))
    return r[np.searchsorted(u, ids)]

def steps(period):
    t = (np.abs(X) - 5.0) / 5.0
    return np.abs(((np.abs(X) - 5.0) / period) % 1.0 - 0.5) > 0.42

gold_line = lane & ((np.abs(np.abs(X) - 4.0) < 0.11) | (np.abs(plaza_d - 5.0) < 0.09))

def compose(lane_col, plateau_col, rim_col, ramp_col):
    img = np.zeros((Hp, Wp, 3))
    img[:] = rim_col if rim_col.ndim == 1 else 0
    if rim_col.ndim == 3:
        img[:] = rim_col
    for mask, colr in ((lane, lane_col), (cls == PLATEAU, plateau_col), (cls == RAMP, ramp_col)):
        img[mask] = colr[mask] if colr.ndim == 3 else colr
    return img

# --- A: Gilded Sanctum --------------------------------------------------------------------------
ids, grout = flagstones(1.3, 0.85, 0.035, 1)
v = per_id(ids, 2)
stone = hexc('#d8c9ac') * (0.86 + 0.22 * v)[:, :, None] * (1 + 0.04 * noise(0.4, 3))[:, :, None]
stone = stone * np.where(grout, 0.55, 1.0)[:, :, None]
stone[in_plaza & (plaza_d < 2.2)] = hexc('#e3c98a')
grass = hexc('#5f7d3e') * (1 + 0.12 * noise(2.5, 4) + 0.06 * noise(0.5, 5))[:, :, None]
moss = (noise(4, 6) > 0.9)
grass[moss] = grass[moss] * np.array([0.85, 0.95, 0.75])
leaf = (rng.random((Hp, Wp)) > 0.992) & (noise(3, 8) > 0.4)
grass[gaussian_filter(leaf.astype(float), 1.2) > 0.08] = hexc('#b2482a')
rimc = hexc('#9b917f') * (0.9 + 0.12 * noise(0.8, 9))[:, :, None]
ramp = hexc('#c9b38a') * np.where(steps(0.45), 0.62, 1.0)[:, :, None]
A = compose(stone, grass, rimc, ramp)
A[gold_line] = hexc('#f0b13a')

# --- B: Painted Diorama -------------------------------------------------------------------------
ids, grout = flagstones(0.9, 0.9, 0.06, 11)
v = per_id(ids, 12)
band = np.clip(0.5 + 0.5 * noise(6, 13), 0, 1)
stone = (hexc('#f1d9a6') * (1 - band[:, :, None]) + hexc('#e7b97a') * band[:, :, None]) * (0.92 + 0.12 * v)[:, :, None]
stone = stone * np.where(grout, 0.72, 1.0)[:, :, None]
light = np.clip(noise(5, 14) * 0.6 + 0.5, 0, 1)[:, :, None]
grass = hexc('#3f8a3a') * (1 - light) + hexc('#8cc64a') * light
dots = (rng.random((Hp, Wp)) > 0.996)
grass[gaussian_filter(dots.astype(float), 1.0) > 0.05] = hexc('#ffd14a')
rimc = np.zeros((Hp, Wp, 3)) + hexc('#8a7aa8') * (0.9 + 0.15 * np.clip(noise(3, 15), -1, 1))[:, :, None]
ramp = hexc('#f0c47a') * np.where(steps(0.5), 0.78, 1.0)[:, :, None]
B = compose(stone, grass, rimc, ramp)
B[gold_line] = hexc('#ffcc33')

# --- C: Weathered Stone (CC0 Poly Haven textures from the repo) --------------------------------
def tile(name, metres):
    t = np.asarray(Image.open(ROOT / 'public/assets/solrahn-surface' / name).convert('RGB'), dtype=float) / 255
    th, tw = t.shape[:2]
    iy = ((Z / metres) % 1.0 * th).astype(int) % th
    ix = ((X / metres) % 1.0 * tw).astype(int) % tw
    return t[iy, ix]
stone = tile('goal019_stone.webp', 3.0) * 0.95
grass = tile('grass_path_2_color.webp', 4.0) * 0.9 * (1 + 0.08 * noise(3, 21))[:, :, None]
rimc = tile('mossy_rock_color.webp', 4.0) * 0.85
ramp = tile('dry_ground_rocks_color.webp', 3.0) * np.where(steps(0.45), 0.7, 1.0)[:, :, None]
C = compose(stone, grass, rimc, ramp)
C[gold_line] = hexc('#c8973a')

# soft contact darkening at cliff feet for all styles (lane side of the walls)
from scipy.ndimage import distance_transform_edt
wall = ~lane & ~(cls == RAMP)
foot = np.exp(-distance_transform_edt(~wall) / (0.6 * PPM))
for img in (A, B, C):
    img *= (1 - 0.35 * foot * lane)[:, :, None]

for name, img in (('a', A), ('b', B), ('c', C)):
    Image.fromarray(np.rint(np.clip(img, 0, 1) * 255).astype('u1')).save(OUT / f'{name}-ground.webp', quality=88, method=6)
    print(name, (OUT / f'{name}-ground.webp').stat().st_size)
