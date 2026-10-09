"""Explicit scope for prepared environment inputs and shipping generation awaiting native import.
Legacy sprite checks stay strict for their shipping assets. The environment has
its own source/hash/dependency gate and must never count toward sprite residency.
"""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCOPES=('Assets/Art/Environment/External','Assets/Crownfall/Environment','Assets/Editor/CrownfallEnvironment')

def environment_owned(path):
 relative=path.relative_to(ROOT).as_posix()
 return any(relative==s or relative.startswith(s+'/') for s in SCOPES)

def pending_environment_metadata(path):
 # Editor generates GUIDs/importer metadata; absence is disclosed, never forged.
 if not (ROOT/'Assets/Crownfall/Environment/ExternalEnvironmentCatalog.json').is_file():return False
 report=ROOT/'Docs/ENVIRONMENT_ASSET_NATIVE_VALIDATION.json'
 if report.is_file():return False  # A native run must generate real .meta files.
 return environment_owned(path) or path.relative_to(ROOT).as_posix()=='Assets/Art/Environment'
