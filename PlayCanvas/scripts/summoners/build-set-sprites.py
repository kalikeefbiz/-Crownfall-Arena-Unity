"""Set's painted 2D frames -> one sprite atlas for the 2.5D proof (founder art, Crownfall_Arena.zip, Characters/set).

Source: art-source/set/run/000-007.png (the 2D build's 8-frame run, 437 x 431, transparent) and art-source/set/idle/000.png
(1223 x 1286). The run frames were cut from a numbered sheet, so stray frame numbers and slivers of neighbouring frames
are removed by keeping only the large connected shapes. Every cell maps to the same world box (as in the 2D build), so
the idle frame is scaled into a run-sized cell.

Writes public/assets/summoners/set/sprite/set-atlas.webp (3 x 3 cells: run 0-7, idle) and set-atlas.json (cell size,
foot line and horizontal centre measured from the run frames).
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source/set'
OUT = ROOT / 'public/assets/summoners/set/sprite'
OUT.mkdir(parents=True, exist_ok=True)
CW, CH = 437, 431


def clean(im):
    a = np.array(im.convert('RGBA'))
    mask = a[:, :, 3] > 6
    lab, n = label(mask)
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    keep = sizes >= max(400, sizes.max() * 0.02)   # the character (and big glow wisps); drops digits and slivers
    a[~keep[lab]] = 0
    return Image.fromarray(a)


run = [clean(Image.open(SRC / f'run/{i:03d}.png')) for i in range(8)]
idle_src = Image.open(SRC / 'idle/000.png').convert('RGBA')
s = CH / idle_src.height
idle = Image.new('RGBA', (CW, CH))
idle_r = idle_src.resize((round(idle_src.width * s), CH), Image.LANCZOS)
idle.alpha_composite(idle_r, ((CW - idle_r.width) // 2, 0))
idle = clean(idle)

# foot line: lowest solidly opaque row of the body across the run (claws), and the body's horizontal centre
feet, centres = [], []
for im in run:
    al = np.array(im)[:, :, 3]
    rows = np.where((al > 200).sum(axis=1) > 3)[0]
    feet.append(int(rows.max()))
    cols = np.where((al > 200).sum(axis=0) > 3)[0]
    centres.append(float(cols.mean()))
foot = int(np.median(feet))
atlas = Image.new('RGBA', (CW * 3, CH * 3))
for k, im in enumerate(run + [idle]):
    atlas.alpha_composite(im, ((k % 3) * CW, (k // 3) * CH))
atlas.save(OUT / 'set-atlas.webp', quality=92, method=6)
ia = np.array(idle)[:, :, 3]
irows = np.where((ia > 200).sum(axis=1) > 3)[0]
meta = dict(cols=3, rows=3, cell=[CW, CH], run=list(range(8)), idle=8, fps=12,
            footY=foot / CH, centreX=float(np.mean(centres)) / CW, idleFootY=int(irows.max()) / CH,
            source='founder art: Crownfall_Arena.zip Characters/set (run 000-007, idle 000)')
(OUT / 'set-atlas.json').write_text(json.dumps(meta, indent=1) + '\n')
print(meta, (OUT / 'set-atlas.webp').stat().st_size)
