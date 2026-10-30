import concurrent.futures,hashlib,json,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'evidence/018a'
receipt=json.loads((OUT/'publication.json').read_text());base=receipt['url']
def fetch(url):
 b=urllib.request.urlopen(url).read();return dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
source=json.load(urllib.request.urlopen(base+'preview-source.json'));assert source['source']==receipt['source']
selected=['index.html','preview-source.json',*['assets/environment/stones/mobile/'+a+'.glb' for a in ['rock_face_02','rock_moss_set_02']]]
selected += [p for p in receipt['files'] if p.endswith('.js') or p.endswith('.css')]
def check(path):
 actual=fetch(base+path);expected=receipt['files'][path];assert actual['bytes']==expected['bytes'] and actual['sha256']==expected['sha256'],path;return path,actual
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:new=dict(ex.map(check,selected))
old=json.loads((OUT/'public-before.json').read_text());after={}
for path,expected in old.items():
 actual=fetch(expected['url']);assert actual['bytes']==expected['bytes'] and actual['sha256']==expected['sha256'],path;after[path]=dict(url=expected['url'],**actual)
heads=subprocess.check_output(['git','ls-remote','--heads','origin'],cwd=ROOT).decode();(OUT/'heads-after.txt').write_text(heads)
parse=lambda text:dict((line.split()[1],line.split()[0]) for line in text.splitlines())
beforeheads=parse((OUT/'heads-before.txt').read_text());afterheads=parse(heads)
assert all(ref=='refs/heads/gh-pages' or afterheads.get(ref)==sha for ref,sha in beforeheads.items())
result=dict(source=source,newFilesVerified=new,priorPublicEntries=after,allPriorPublicEntriesByteIdentical=True,allPriorSourceBranchesUnchanged=True,pagesProtectedObjects=receipt['protectedObjectCount'])
(OUT/'public-after.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(source=source,publicFiles=len(new),priorEntries=len(after),oldEntriesByteIdentical=True,oldSourceBranchesUnchanged=True),indent=2))
