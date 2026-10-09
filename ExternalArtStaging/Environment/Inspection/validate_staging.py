"""Validate original bytes, canonical glTF dependencies/metrics, and task scope."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile
from acquire_inventory import metrics

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
j=json.loads((ROOT/'Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json').read_text())
cache=Path(sys.argv[1]) if len(sys.argv)>1 else None
archives={s['id']:zipfile.ZipFile(cache/(s['id']+'.zip')) for s in j['sources'] if s['status']=='acquired'} if cache else {}
for s in j['sources']:
 if s['status']!='acquired':continue
 if cache:assert hashlib.sha256((cache/(s['id']+'.zip')).read_bytes()).hexdigest()==s['archive_sha256']
 assert s['license_files']
 for p in s['license_files']:assert 'CC0' in (ROOT/p).read_text()
for f in j['files']:
 p=ROOT/f['staged_path'];b=p.read_bytes()
 assert len(b)==f['file_size_bytes'],str(p)
 assert hashlib.sha256(b).hexdigest()==f['sha256'],str(p)
 if archives:assert b==archives[f['source_id']].read(f['original_path']),str(p)
staged_originals={str(p.relative_to(ROOT)) for p in (ROOT/'ExternalArtStaging/Environment').glob('**/Original/**/*') if p.is_file()}
assert staged_originals=={f['staged_path'] for f in j['files']}
ids=set()
for m in j['models']:
 assert m['id'] not in ids;ids.add(m['id'])
 for k,v in metrics(ROOT/m['staged_path']).items():assert m[k]==v,(m['id'],k)
 assert len(m['original_model_variants'])==2
 assert any(p.endswith('.fbx') for p in m['original_model_variants'])
 assert m['classification'] in ['HERO','NEAR WILDERNESS','MIDGROUND','DISTANT FILLER','STRUCTURAL','REJECT']
 assert m['license']=='CC0-1.0'
 assert m['source_id']!='qr'
 assert m['shortlisted']==(m['id'] in j['shortlist_model_ids'])
 assert m['first_integration_pass_recommended']==(m['id'] in j['first_pass_model_ids'])
 if m['shortlisted']:assert m['classification']!='REJECT'
assert len(ids)==144 and len(j['shortlist_model_ids'])==38 and len(j['first_pass_model_ids'])==25
assert set(j['first_pass_model_ids'])<=set(j['shortlist_model_ids'])
assert len(j['excluded_candidates'])==505
reviewed=[m for m in j['models'] if m['visual_review'].startswith('Blender')]
assert len(reviewed)==39
for m in reviewed:assert (HERE/'Previews'/(m['id'].replace(':','_')+'.png')).is_file()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
assert branch==j['branch']
changes=subprocess.check_output(['git','diff','--name-only',j['starting_head']],cwd=ROOT,text=True).splitlines()
changes+=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
assert all(p.startswith(('ExternalArtStaging/Environment/','Docs/EXTERNAL_ENVIRONMENT_')) for p in changes),changes
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True)
subprocess.run(['git','diff','--cached','--check'],cwd=ROOT,check=True)
blender=json.loads((HERE/'blender-geometry-checks.json').read_text())
assert blender['result']=='pass' and len(blender['checks'])==8
report={'result':'pass','baseline':j['starting_head'],'branch':branch,'original_files_sha256_verified':len(j['files']),
 'original_files_compared_byte_for_byte_to_archives':len(j['files']) if cache else None,
 'archive_hashes_verified':len(archives),'unique_models_measured_and_dependencies_resolved':len(ids),
 'canonical_format':'glTF/GLB; FBX preserved but not independently imported',
 'shortlisted_models':38,'first_pass_models':25,'visually_rendered_candidates':39,'independent_blender_geometry_samples':8,
 'scope_check':'Only ExternalArtStaging/Environment and Docs/EXTERNAL_ENVIRONMENT_* differ from baseline',
 'unity_editor_run':False,'unity_build_started':False,'shipping_asset_import_performed':False,
 'limitations':['No Unity Built-in import/material/device validation','No independent FBX geometry or embedded collider inspection','Ruins download blocked by public Drive quota']}
(HERE/'validation-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
