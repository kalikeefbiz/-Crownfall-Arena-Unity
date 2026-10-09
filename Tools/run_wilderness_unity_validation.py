"""Exact native shipping preparation without exporting any player."""
import argparse,hashlib,json,os,shutil,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--unity-editor',default=os.environ.get('CROWNFALL_UNITY_EDITOR') or shutil.which('Unity'));a=p.parse_args()
if not a.unity_editor or not Path(a.unity_editor).is_file():raise SystemExit('Unity 6000.3.10f1 unavailable: shipping native validation PENDING. No build executed.')
report=ROOT/'Docs/CROWNFALL_WILDERNESS_NATIVE_VALIDATION.json'
if report.exists():report.unlink()
subprocess.run([a.unity_editor,'-batchmode','-quit','-projectPath',str(ROOT),'-executeMethod','Crownfall.EnvironmentLab.Editor.WildernessBuildPreparation.PrepareAndValidate','-logFile','/tmp/crownfall-wilderness-unity.log'],check=True)
if not report.exists():raise SystemExit('Native report missing; inspect /tmp/crownfall-wilderness-unity.log')
j=json.loads(report.read_text());assert j['status']=='PASS_NATIVE_DEPENDENCIES' and j['unityExecuted'] and j['unityVersion']=='6000.3.10f1' and not j['playerBuildExecuted'];assert j['compositionHash']==hashlib.sha256((ROOT/'Assets/Crownfall/Environment/WildernessComposition.json').read_bytes()).hexdigest()
print(json.dumps(j,indent=2))
