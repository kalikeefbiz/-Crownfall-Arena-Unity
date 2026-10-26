"""Make labeled source/optimized pairs and record screen-space differences, without editing masters."""
from pathlib import Path
import json,sys,numpy as np
from PIL import Image,ImageDraw,ImageFont
base=Path(__file__).resolve().parents[1];out=base/'previews/comparisons';out.mkdir(exist_ok=True)
configs=json.loads((base/'manifests/comparison-cameras.json').read_text());records=[];missing=[]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
for v in configs:
 name=v['name'];a=base/'previews/source'/(name+'.png');b=base/'previews/optimized'/(name+'.png')
 if not a.exists() or not b.exists():missing.append(name);continue
 ia=Image.open(a).convert('RGB');ib=Image.open(b).convert('RGB');pa=np.asarray(ia,dtype=float);pb=np.asarray(ib,dtype=float)
 ma=np.max(abs(pa-pa[0,0]),axis=2)>3;mb=np.max(abs(pb-pb[0,0]),axis=2)>3;mask=ma|mb;diff=pa-pb
 rmse=float(np.sqrt(np.mean(diff[mask]**2)));mae=float(np.abs(diff[mask]).mean());iou=float((ma&mb).sum()/max(1,mask.sum()))
 records.append(dict(view=name,foreground_rmse_8bit=rmse,foreground_mae_8bit=mae,psnr_db=float(20*np.log10(255/max(1e-10,rmse))),foreground_mask_iou=iou))
 panel=Image.new('RGB',(ia.width*2,ia.height+40),(20,25,30));panel.paste(ia,(0,40));panel.paste(ib,(ia.width,40));d=ImageDraw.Draw(panel)
 d.text((12,9),name+' | ORIGINAL',font=font,fill='white');d.text((ia.width+12,9),'OPTIMIZED | 668,270 triangles | 2K maps',font=font,fill='white')
 panel.save(out/(name+'.jpg'),quality=90,optimize=True,subsampling=0)
for folder,name in [('reimport','entire-arena'),('collision','lane-cores-top-plan')]:
 p=base/'previews'/folder/(name+'.png')
 if p.exists():Image.open(p).convert('RGB').save(out/(folder+'-'+name+'.jpg'),quality=90,optimize=True)
(base/'manifests/visual-differences.json').write_text(json.dumps(dict(views=records,missing=missing,notes='Cycles CPU 16 samples with denoising; matched camera, light and color transform. Differences combine geometry reduction, texture resizing and render sampling/denoising. Masks are background-color estimates, not semantic object IDs. No perceptual or mobile-fps guarantee.'),indent=2))
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sol’Rahn — Goal 013 comparisons</title><style>body{font:16px system-ui;background:#14191e;color:#eee;max-width:1600px;margin:2rem auto;padding:1rem}img{width:100%;height:auto}figure{margin:2rem 0}a{color:#badeff}</style><h1>Sol’Rahn source / optimized</h1><p>Founder’s verified three-lane source, unchanged coordinates. Left: original 5,568,924 triangles with 4K/2K/4K maps. Right: weighted reduction to 668,270 triangles with 2K maps. Matched Cycles CPU renders, 16 samples and denoising.</p><p>Upper/lower names provisionally identify negative/positive Blender X flanks. Gameplay views use the existing competitive camera’s 48° vertical FOV and 15.5:22 elevation/look direction, with distance scaled for this normalized source. These are asset-review views, not integration screenshots.</p>'''
for v in configs:
 if (out/(v['name']+'.jpg')).exists():html+=f'<figure><figcaption>{v["name"]}</figcaption><a href="{v["name"]}.jpg"><img loading="lazy" src="{v["name"]}.jpg" alt="Matched {v["name"]} comparison"></a></figure>'
html+='<p>Collision strips are partial, open and fragmented; no gameplay validation. Reimport overview verifies material/geometry conversion separately. See reports/GOAL_013_REPORT.md for scope and limitations.</p></html>'
(out/'index.html').write_text(html);print(json.dumps(dict(complete=len(records),missing=missing),indent=2))
if '--require-all' in sys.argv:assert not missing,missing
