"""Run the actual Editor without building a player. Missing Editor fails closed."""
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--unity-editor',default=os.environ.get('CROWNFALL_UNITY_EDITOR') or shutil.which('Unity'))
parser.add_argument('--mobile-textures',action='store_true')
parser.add_argument('--no-graphics',action='store_true',help='Import/generate only; cannot certify rendering')
args=parser.parse_args()
if not args.unity_editor or not Path(args.unity_editor).is_file():raise SystemExit('Unity 6000.3.10f1 unavailable: native validation PENDING. No serialized scene/prefab/material/GUID fabricated.')
report=ROOT/'Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json'
if report.exists():report.unlink()  # A stale successful report cannot satisfy this run.
method='Crownfall.EnvironmentLab.Editor.EnvironmentAssetLab.GenerateAndValidate'+('Mobile' if args.mobile_textures else '')
command=[args.unity_editor,'-batchmode','-quit','-projectPath',str(ROOT),'-executeMethod',method,'-logFile','/tmp/crownfall-environment-unity.log']
if args.no_graphics:command.append('-nographics')
subprocess.run(command,check=True)
if not report.exists():raise SystemExit('Editor did not produce a native validation report; inspect /tmp/crownfall-environment-unity.log')
j=json.loads(report.read_text())
assert j['unityExecuted'] and j['unityVersion']=='6000.3.10f1' and j['status']=='PASS_NATIVE_IMPORT'
assert j['modelCount']==25 and not j['playerBuildExecuted']
print(json.dumps(j,indent=2))
