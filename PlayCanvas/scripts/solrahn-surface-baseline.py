"""Rebuild the measured GOAL 016 baseline from verified published text blobs.
Run after npm run build; then serve the output directory on port 4175.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,subprocess,shutil
root=Path(__file__).resolve().parents[1]
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('/tmp/crownfall-goal016-baseline'))
args=parser.parse_args()
assert args.output.resolve()!= (root/'dist').resolve()
rows=[]
for line in (root/'evidence/017/pages-before.txt').read_text().splitlines():
 desc,path=line.split('\t');sha=desc.split()[2]
 if path.startswith(('playcanvas/','solrahn-goal-014/','solrahn-goal-016/')) and path.endswith(('.html','.js','.css','.json')) or path=='index.html': rows.append((path,sha))
def download(row):
 path,sha=row
 raw=subprocess.check_output(['curl','-fsSL','--retry','2','https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/'+path])
 actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 assert sha==actual,(path,sha,actual)
 if path.startswith('solrahn-goal-016/'):
  dest=args.output/path.removeprefix('solrahn-goal-016/');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 return dict(path=path,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),gitBlob=actual)
shutil.copytree(root/'dist',args.output,dirs_exist_ok=True)
with ThreadPoolExecutor(max_workers=4) as pool: result=list(pool.map(download,rows))
(root/'evidence/017/baseline-live-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(len(result),'protected live files verified')
