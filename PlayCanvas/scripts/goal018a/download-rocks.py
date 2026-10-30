import json,pathlib,urllib.request,hashlib,concurrent.futures
root=pathlib.Path(str(pathlib.Path(__file__).resolve().parents[2] / '.audit/018a/polyhaven'));root.mkdir(parents=True,exist_ok=True)
jobs=[]
for a in ['rock_face_02','rock_moss_set_02']:
 d=json.load(open(pathlib.Path(__file__).resolve().parents[2] / 'public/assets/environment/stones/provenance' / (a+'-files.json'))); p=root/a;p.mkdir(exist_ok=True)
 (p/'files.json').write_text(json.dumps(d,indent=2))
 spec=d['gltf']['1k']['gltf']
 for path,s in [(a+'.gltf',spec),*spec['include'].items()]: jobs.append((p/path,s))
def run(job):
 p,s=job;p.parent.mkdir(parents=True,exist_ok=True);data=urllib.request.urlopen(s['url']).read();assert hashlib.md5(data).hexdigest()==s['md5'];p.write_bytes(data);return str(p),len(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
 for r in ex.map(run,jobs):print(r)
