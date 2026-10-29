"""Fetch CC0 Poly Haven 1K sources and reproducibly pack mobile PBR maps.
RGB color is sRGB; alpha is LINEAR roughness. Normal RGB is OpenGL tangent
space with reduced strength; alpha is LINEAR AO. No displacement is shipped.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'assets/solrahn-surface/source'
OUT = ROOT/'public/assets/solrahn-surface'
SOURCE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
assets = ['dry_ground_rocks', 'grass_path_2', 'forrest_ground_01', 'mossy_rock']
# Shared neutral-warm palette. Preserve source microvariation without vivid green.
tints = [(1.04, .97, .87), (.86, .86, .75), (.79, .84, .75), (.85, .86, .80)]
receipt = {'license': 'CC0-1.0', 'licenseUrl': 'https://polyhaven.com/license',
           'encoding': 'color RGB sRGB / A linear roughness; normal RGB linear OpenGL / A linear AO',
           'runtimeSize': [1024, 1024], 'tileMetres': 6, 'normalStrength': .38, 'sources': []}
for asset, tint in zip(assets, tints):
    manifest = SOURCE/(asset+'.json')
    if not manifest.exists():
        subprocess.run(['curl', '-fsSL', '--retry', '2', 'https://api.polyhaven.com/files/'+asset, '-o', str(manifest)], check=True)
    data = json.loads(manifest.read_text())
    files = []
    maps = {}
    for role, ext in [('Diffuse', 'jpg'), ('nor_gl', 'png'), ('arm', 'png')]:
        url = data[role]['1k'][ext]['url']
        path = SOURCE/(asset+'_'+role+'.'+ext)
        if not path.exists():
            subprocess.run(['curl', '-fsSL', '--retry', '2', url, '-o', str(path)], check=True)
        files.append(dict(role=role, url=url, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        maps[role] = np.asarray(Image.open(path).convert('RGB').resize((1024,1024), Image.Resampling.LANCZOS), dtype=float)/255
    # Tone adjustments happen in linear color, before sRGB encoding.
    srgb = maps['Diffuse']
    linear = np.where(srgb <= .04045, srgb/12.92, ((srgb+.055)/1.055)**2.4)
    linear *= np.asarray(tint)
    luminance = np.sum(linear*np.asarray([.2126,.7152,.0722]), axis=-1, keepdims=True)
    linear = linear*.82+luminance*.18
    srgb = np.where(linear <= .0031308, linear*12.92, 1.055*np.maximum(linear,0)**(1/2.4)-.055)
    rough = np.rint(np.clip(maps['arm'][:,:,1], .64, .98)*32)/32
    color = np.dstack([np.clip(srgb,0,1),rough])
    normal = maps['nor_gl']*2-1
    normal[:,:,:2] *= .38
    normal /= np.maximum(np.linalg.norm(normal, axis=-1, keepdims=True), 1e-8)
    ao = np.rint((.65+.35*maps['arm'][:,:,0])*32)/32
    normal_ao = np.dstack([normal*.5+.5, ao])
    runtime = []
    for suffix, pixels, options in [('color', color, dict(quality=88,method=6)), ('normal', normal_ao, dict(quality=92,method=6))]:
        dest=OUT/(asset+'_'+suffix+'.webp')
        Image.fromarray(np.rint(pixels*255).astype('uint8')).save(dest, **options)
        runtime.append(dict(path=dest.name, bytes=dest.stat().st_size, sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    receipt['sources'].append(dict(asset=asset,url='https://polyhaven.com/a/'+asset,tintLinear=tint,sourceFiles=files,runtime=runtime))
(OUT/'materials.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
