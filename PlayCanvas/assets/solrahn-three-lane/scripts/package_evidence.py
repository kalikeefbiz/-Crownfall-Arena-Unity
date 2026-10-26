"""Package lightweight evidence and master PNGs, never source/runtime/native binaries."""
from pathlib import Path
import zipfile,json,hashlib
base=Path(__file__).resolve().parents[1];out=base/'packages';out.mkdir(exist_ok=True);archive=out/'solrahn-goal-013-evidence.zip'
files=[base/'README.md',base/'.gitignore']
for directory in ['scripts','reports','manifests','previews']:
 files.extend(p for p in (base/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='transfer-package.json')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(files):z.write(p,Path('solrahn-three-lane')/p.relative_to(base))
artifacts=json.loads((base/'manifests/artifacts.json').read_text())['artifacts'];lines=[a['sha256']+'  '+Path(a['path']).name for a in artifacts]
h=hashlib.file_digest(archive.open('rb'),'sha256').hexdigest();lines.append(h+'  '+archive.name);(out/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n')
manifest=dict(archive_path=str(archive),archive_bytes=archive.stat().st_size,archive_sha256=h,sha256sums_path=str(out/'SHA256SUMS.txt'),binary_total_bytes=sum(a['bytes'] for a in artifacts),total_transfer_bytes=sum(a['bytes'] for a in artifacts)+archive.stat().st_size+(out/'SHA256SUMS.txt').stat().st_size,uploaded=False,note='ZIP contains reports, manifests, scripts, matched JPEG comparisons and original/optimized PNG render masters, not the large source/working/runtime binaries. This archive sidecar is excluded from the ZIP to avoid a self-referential checksum.')
(base/'manifests/transfer-package.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
