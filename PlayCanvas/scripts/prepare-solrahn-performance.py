"""Prepare immutable GOAL 016/017 comparison servers inside this repository.
Requires npm ci and the verified GOAL 014 LFS guard file in the working tree.
Never checks out or pushes another branch; all outputs are ignored in .audit/.
"""
from pathlib import Path
import argparse, hashlib, io, json, shutil, subprocess, tarfile
root=Path(__file__).resolve().parents[1]
repo=root.parent
out=root/'.audit'
out.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--diagnostics',action='store_true',help='Also reconstruct the immutable iteration-one and lazy-only render profiles')
args=parser.parse_args()
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args])
def archive(ref,path,destination):
 raw=git('archive',ref,path)
 destination.mkdir(parents=True,exist_ok=True)
 with tarfile.open(fileobj=io.BytesIO(raw)) as tar:tar.extractall(destination,filter='data')
pages='4521174ae290685b5a7e875640081e2a73066b5b'
subprocess.run(['git','-C',str(repo),'fetch','origin',pages],check=True)
archive(pages,'solrahn-goal-016',out/'goal016')
source='765041a87a857675b0e6411e5ad527aa527f3ea5'
archive(source,'PlayCanvas',out/'original-source')
project=out/'original-source/PlayCanvas'
if not (project/'node_modules').exists(): (project/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
shutil.copy2(root/'assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb',project/'assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb')
subprocess.run(['npm','run','build'],cwd=project,check=True)
shutil.copytree(project/'dist',out/'original-dist',dirs_exist_ok=True)
receipt=dict(goal016Pages=pages,goal016Source='93912bf4fdfd77475c8c4dbc9c7db0f7076a6a91',goal017Source=source,originalFiles={str(p.relative_to(out/'original-dist')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (out/'original-dist').rglob('*') if p.is_file()})
(root/'evidence/017a/reproduction-builds.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Serve .audit/goal016/solrahn-goal-016 on 4175, .audit/original-dist on 4176, dist on 4173.')

if args.diagnostics:
 iteration='03b67c95a294a33739b98832fd3791d035aa9f5b'
 archive(iteration,'PlayCanvas',out/'iteration-source')
 project=out/'iteration-source/PlayCanvas'
 if not (project/'node_modules').exists(): (project/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
 shutil.copy2(root/'assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb',project/'assets/solrahn-three-lane/runtime/solrahn-three-lane-visual.glb')
 subprocess.run(['npm','run','build'],cwd=project,check=True)
 shutil.copytree(project/'dist',out/'iteration1',dirs_exist_ok=True)
 material=project/'src/presentation/solrahn-surface-material.ts'
 original=material.read_text()
 material.write_text(original.replace('mat.useMetalness = !low;', 'mat.useMetalness = true;').replace('skirt.useMetalness = !low;', 'skirt.useMetalness = true;'))
 subprocess.run(['npm','run','build'],cwd=project,check=True)
 shutil.copytree(project/'dist',out/'lazy-dist',dirs_exist_ok=True)
 material.write_text(original)
 print('Iteration-one and lazy-only render profiles reconstructed; original lazy receipt predates ownership counters, so its metadata/bundle hash differs.')
