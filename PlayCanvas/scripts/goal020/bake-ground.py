"""GOAL 020 ground bake: art-directed Low-tier color/roughness atlas.

Same four CC0 Poly Haven families and the same unmodified V2 height/weight data
as GOAL 019, but with a controlled palette, worn-lane structure, large-scale
colour variation to hide tiling, and baked cavity/ridge shading for hill form.
Writes only presentation textures; no terrain, collision or navigation data.
"""
from pathlib import Path
import json, hashlib, re
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/solrahn-surface'
W, H = 2048, 1536
PX_PER_M = 12.8
v, u = np.meshgrid(np.linspace(0, 1, H), np.linspace(0, 1, W), indexing='ij')
x, z = (v - .5) * 120, (.5 - u) * 160
rng = np.random.default_rng(20)


def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055)


def hexc(h):
    return srgb_to_lin([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])


def lum(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722


def noise(metres, seed):
    r = np.random.default_rng(seed).standard_normal((H, W))
    n = gaussian_filter(r, sigma=metres * PX_PER_M / 2, mode='wrap')
    return n / n.std()


def smooth(e0, e1, t):
    t = np.clip((t - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def sample(a, px, py, repeat=False):
    ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
    dx, dy = (px - ix)[..., None], (py - iy)[..., None]
    ny, nx = a.shape[:2]
    if repeat:
        ax, bx = ix % nx, (ix + 1) % nx
        ay, by = iy % ny, (iy + 1) % ny
    else:
        ax, bx = np.clip(ix, 0, nx - 1), np.clip(ix + 1, 0, nx - 1)
        ay, by = np.clip(iy, 0, ny - 1), np.clip(iy + 1, 0, ny - 1)
    return (a[ay, ax] * (1 - dx) + a[ay, bx] * dx) * (1 - dy) + (a[by, ax] * (1 - dx) + a[by, bx] * dx) * dy


weights = np.asarray(Image.open(OUT / 'weights.png'), dtype=np.float32) / 255
blend = sample(weights, u * 1199, v * 899)
blend /= blend.sum(-1, keepdims=True)
manifest = json.loads((OUT / 'materials.json').read_text())

# Family colours (sRGB hex -> linear): worn lane earth, meadow, woodland floor, grey-green rock.
FAMILY = [hexc('#9b8567'), hexc('#6c7a58'), hexc('#41533d'), hexc('#767b6c')]
tiles, sources, mean_lum0 = [], [], 0.0
for i, item in enumerate(manifest['sources']):
    path = OUT / (item['asset'] + '_color.webp')
    a = np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32) / 255
    a[:, :, :3] = srgb_to_lin(a[:, :, :3])
    if i == 0:
        mean_lum0 = float(lum(a[:, :, :3]).mean())
    mean_rgb = a[:, :, :3].reshape(-1, 3).mean(0)
    # Detail relative to the tile's own mean colour, softened so scan noise stays quiet.
    rel = a.copy()
    rel[:, :, :3] = np.clip(a[:, :, :3] / np.maximum(mean_rgb, 1e-4), .25, 2.4)
    rel[:, :, :3] = 1 + (rel[:, :, :3] - 1) * .72
    rel = gaussian_filter(rel, sigma=(6, 6, 0), mode='wrap')
    tile_a = sample(rel, (-z / 6 + .08 * np.sin(x * .17)) * 1024 - .5, (1 - x / 6 + .07 * np.sin(z * .13)) * 1024 - .5, True)
    # Second, rotated and re-scaled sample hides the 6 m repeat (standard anti-tiling blend).
    th = np.radians(37 + 23 * i)
    xr, zr = x * np.cos(th) - z * np.sin(th), x * np.sin(th) + z * np.cos(th)
    tile_b = sample(rel, (-zr / 9.3 + .37 + .06 * np.sin(xr * .11)) * 1024 - .5, (1 - xr / 9.3 + .11 + .05 * np.sin(zr * .09)) * 1024 - .5, True)
    mix = smooth(-.7, .7, noise(8, 30 + i))[:, :, None]
    tile = tile_a * (1 - mix) + tile_b * mix
    tiles.append(tile)
    sources.append(dict(path=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))

result = np.zeros((H, W, 4), dtype=np.float64)
for i in range(4):
    result[:, :, :3] += blend[:, :, i:i + 1] * tiles[i][:, :, :3] * FAMILY[i]
    result[:, :, 3] += blend[:, :, i] * tiles[i][:, :, 3]

# --- Large-scale variation: three octaves break repetition without adding texture reads.
n_small, n_mid, n_big = noise(3.2, 11), noise(9, 12), noise(26, 13)
value = 1 + .045 * n_small + .075 * n_mid + .09 * n_big
warm = .035 * n_big + .02 * n_mid                      # +warm / -cool drift
result[:, :, 0] *= value * (1 + warm)
result[:, :, 1] *= value
result[:, :, 2] *= value * (1 - warm)

# --- Lane structure: irregular worn route, dusty centre, darker soil margins, mossy verge.
warp = 1.1 * noise(7, 21) + .5 * noise(2.4, 22)
dx = x + warp + 1.6 * np.sin(z * .045 + .8)
adx = np.abs(dx)
lane = 1 - smooth(3.2, 5.6, adx)
dust = (1 - smooth(.5, 2.8, adx)) * (.5 + .5 * smooth(-.4, 1.2, n_mid))
margin = smooth(3.0, 4.4, adx) * (1 - smooth(4.6, 6.2, adx))
verge = smooth(4.8, 6.6, adx) * (1 - smooth(6.6, 9.5, adx))
lane_colour = hexc('#a8916f')
for c in range(3):
    result[:, :, c] = result[:, :, c] * (1 - .55 * lane) + lane_colour[c] * lum(tiles[0][:, :, :3]) * .55 * lane
result[:, :, :3] *= (1 + .16 * dust)[:, :, None]
result[:, :, :3] *= (1 - .20 * margin)[:, :, None] * np.array([1.0, .98, .90])[None, None, :]
result[:, :, :3] *= (1 + .55 * verge[:, :, None] * np.array([-.10, .06, -.12])[None, None, :])
# Woodland: cooler and clearly darker than the lane so the route reads at a glance.
wild = 1 - lane
result[:, :, :3] *= (1 - .22 * smooth(6, 16, adx))[:, :, None] * np.array([.94, 1.0, 1.04])[None, None, :] ** smooth(6, 16, adx)[:, :, None]

# --- Hill form: cavity darkening in hollows, light on crests (runtime sun adds directional shade).
meta = json.loads((ROOT / 'public/assets/solrahn-v2/terrain.json').read_text())
h = np.fromfile(ROOT / 'public/assets/solrahn-v2/height.u16', dtype='<u2').astype(float).reshape(meta['nz'], meta['nx']) * 8 / 65535
height = sample(h[:, :, None], (x + 60) * 144 / 120, (z + 80) * 192 / 160)[:, :, 0]
cavity = np.clip((gaussian_filter(height, 9) - height) * .55, 0, .30) + np.clip((gaussian_filter(height, 26) - height) * .28, 0, .22)
crest = np.clip((height - gaussian_filter(height, 12)) * .22, 0, .14)
result[:, :, :3] *= (1 - cavity + crest)[:, :, None]
# Steeper ground picks up rock grey-green.
gy, gx = np.gradient(height, 1 / PX_PER_M)
slope = np.hypot(gx, gy)
rocky = smooth(.55, 1.15, slope) * wild
rock_c = hexc('#6e7467') * (.9 + .1 * lum(tiles[3][:, :, :3]))[:, :, None]
result[:, :, :3] = result[:, :, :3] * (1 - .45 * rocky[:, :, None]) + rock_c * .45 * rocky[:, :, None]

# --- Soft contact shading under authored trees and rocks.
layout = (ROOT / 'src/presentation/solrahn-art-layout.ts').read_text()
for tx, tz, th in re.findall(r"\[(-?[\d.]+),\s*(-?[\d.]+),\s*([\d.]+),\s*'", layout):
    tx, tz, th = map(float, (tx, tz, th))
    shadow = np.exp(-((x - tx) / 2.2) ** 2 - ((z - tz) / 2.4) ** 2) * .38
    shadow += np.exp(-((x - tx - 1.8) / 4.0) ** 2 - ((z - tz + 1.8) / 2.3) ** 2) * .14
    result[:, :, :3] *= (1 - shadow)[:, :, None]
for tx, tz in re.findall(r"x: (-?[\d.]+), z: (-?[\d.]+), scale", layout):
    shadow = np.exp(-((x - float(tx)) / 3.0) ** 2 - ((z - float(tz)) / 4.5) ** 2) * .24
    result[:, :, :3] *= (1 - shadow)[:, :, None]

# --- GOAL 020 enclosure: dark, mossy contact band at the foot of every wall so rock sits IN the ground.
enc = ROOT / 'public/assets/solrahn-v2/walk-goal020.bin'
if enc.exists():
    nw, nd = meta['navWidth'], meta['navDepth']
    full0 = np.fromfile(ROOT / 'public/assets/solrahn-v2/walk.bin', dtype='u1')[nw * nd:].reshape(nd, nw) > 0
    full1 = np.fromfile(enc, dtype='u1')[nw * nd:].reshape(nd, nw) > 0
    wall = (full0 & ~full1).astype(float)
    foot = gaussian_filter(wall, 2.2)
    foot = sample(foot[:, :, None], (x + 60) / .5, (z + 80) / .5)[:, :, 0]
    band = np.clip(foot * 1.6, 0, 1)
    result[:, :, :3] *= (1 - .42 * band)[:, :, None] * (1 + band[:, :, None] * np.array([-.06, .04, -.08])[None, None, :])

# --- Top / combo lanes beyond the 3v3 barrier: the same worn route, seen through the forest windows.
lane_src = np.fromfile(ROOT / 'public/assets/solrahn-v2/lane.bin', dtype='u1').reshape(meta['nz'], meta['nx']).astype(float)
outer_lane = sample(gaussian_filter(lane_src, 1.2)[:, :, None], (x + 60) * 144 / 120, (z + 80) * 192 / 160)[:, :, 0]
outer_lane = np.clip((outer_lane - .3) * 2.5, 0, 1) * smooth(29, 32, np.abs(x)) * (1 - .5 * smooth(-.5, 1, noise(5, 41)))
for c in range(3):
    result[:, :, c] = result[:, :, c] * (1 - .6 * outer_lane) + lane_colour[c] * lum(tiles[0][:, :, :3]) * .6 * outer_lane
# --- Forest floor: darker, cooler ground under the tree masses.
enc_json = ROOT / 'public/assets/solrahn-v2/enclosure-goal020.json'
if enc_json.exists():
    canopy = np.zeros((161, 121))
    for tx, tz, th, _, _ in json.loads(enc_json.read_text())['trees']:
        canopy[int(round(tz + 80)), int(round(tx + 60))] += th / 7
    canopy = np.clip(gaussian_filter(canopy, 1.6) * 3.2, 0, 1)
    canopy = sample(canopy[:, :, None], x + 60, z + 80)[:, :, 0]
    result[:, :, :3] *= (1 - .38 * canopy)[:, :, None] * (1 + canopy[:, :, None] * np.array([-.08, .0, .05])[None, None, :])

result[:, :, :3] = lin_to_srgb(result[:, :, :3])
result[:, :, 3] = np.clip(np.rint(result[:, :, 3] * 32) / 32, .64, .98)
dest = OUT / 'goal020_atlas.webp'
Image.fromarray(np.rint(np.clip(result, 0, 1) * 255).astype('uint8')).save(dest, quality=90, method=6)
info = dict(
    size=[W, H],
    encoding='RGB sRGB / A linear roughness; alpha is data',
    mapping='u=.5-worldZ/160; v=.5+worldX/120; exact source endpoints',
    tileMetres=6,
    sourceWeightsSha256=hashlib.sha256((OUT / 'weights.png').read_bytes()).hexdigest(),
    sourceColors=sources,
    detailMeanLuminance=mean_lum0,
    detailStrength=.26,
    detailClamp=[.6, 1.4],
    lowReads=2,
    debugReads=1,
    file=dict(path=dest.name, bytes=dest.stat().st_size, sha256=hashlib.sha256(dest.read_bytes()).hexdigest()),
)
(OUT / 'goal020-atlas.json').write_text(json.dumps(info, indent=2) + '\n')
print('wrote', dest, dest.stat().st_size, 'bytes')
