# Derivative of the approved CC0 Poly Haven mossy_rock albedo. Original preserved.
from PIL import Image
import numpy as np,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
src=root/'public/assets/solrahn-surface/mossy_rock_color.webp'
a=np.asarray(Image.open(src).convert('RGB').resize((512,512)),dtype=float)/255
l=a@np.array([.2126,.7152,.0722]);l=np.clip(.51+(l-.3)*.58,.32,.77)
rgb=np.stack([l*1.05,l*1.025,l*.94],axis=-1)
dest=root/'public/assets/solrahn-surface/goal019_stone.webp'
Image.fromarray((np.clip(rgb,0,1)*255).astype('uint8')).save(dest,quality=90)
(root/'evidence/019/stone-texture.json').write_text(json.dumps(dict(source=str(src.relative_to(root)),license='CC0-1.0',operation='512px luminance-derived warm limestone palette; photographed detail retained',sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),bytes=dest.stat().st_size),indent=2)+'\n')
