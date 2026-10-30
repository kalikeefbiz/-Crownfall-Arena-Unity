"""Verify old public text bundles and all prior Git objects around isolated publication."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse,hashlib,json,subprocess,urllib.request
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'PlayCanvas/evidence/017b'
HOST='https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/'
parser=argparse.ArgumentParser();parser.add_argument('--after',action='store_true');args=parser.parse_args()
def git(*items):return subprocess.check_output(['git',*items],cwd=ROOT).decode().strip()
rows=[]
for row in (OUT/'pages-before.txt').read_text().splitlines():
 description,path=row.split('\t')
 if path.endswith(('.html','.js','.css','.json')):rows.append((path,description.split()[2]))
assert rows and any(p.startswith('solrahn-goal-017/') for p,_ in rows), 'Protected baseline is empty or incomplete'
def fetch(item):
 path,blob=item
 with urllib.request.urlopen(HOST+urllib.parse.quote(path),timeout=60) as response:raw=response.read()
 actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 assert actual==blob,(path,blob,actual)
 return dict(path=path,gitBlob=actual,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
with ThreadPoolExecutor(max_workers=4) as pool:old=list(pool.map(fetch,rows))
if args.after:
 before=json.loads((OUT/'public-before.json').read_text())
 assert before==old,'A protected public file changed'
 receipt=json.loads((OUT/'publication.json').read_text())
 current=git('ls-remote','origin','refs/heads/gh-pages').split()[0]
 assert current==receipt['pagesAfter']
 protected=lambda data:[r for r in data.splitlines() if not r.split('\t')[1].startswith('solrahn-goal-017b/')]
 assert protected(git('ls-tree','-r',current))==protected((OUT/'pages-before.txt').read_text())
 with urllib.request.urlopen(HOST+'solrahn-goal-017b/preview-source.json') as response:provenance=json.load(response)
 assert provenance['source']==receipt['source']
 (OUT/'protection-after.json').write_text(json.dumps(dict(protectedGitObjectsIdentical=True,protectedObjectCount=receipt['protectedObjectCount'],protectedPublicFiles=len(old),source=provenance,pages=current),indent=2)+'\n')
(OUT/('public-after.json' if args.after else 'public-before.json')).write_text(json.dumps(old,indent=2)+'\n')
print(len(old),'protected public text objects match their original Git blobs')
