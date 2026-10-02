"""Compile and execute the actual pure C# combat core; never claims Unity execution."""
from pathlib import Path
import os, shutil, subprocess, tempfile

root = Path(__file__).resolve().parents[1]
mono = os.environ.get('M1_MONO') or shutil.which('mono')
mcs = os.environ.get('M1_MCS_EXE')
compiler = [mono, mcs] if mono and mcs else [shutil.which('mcs')]
if not mono or not compiler[0]:
    raise SystemExit('Mono compiler/runtime required. Ubuntu: install mono-mcs (fail closed).')
sources = sorted((root/'Assets/Crownfall/Combat/Core').glob('*.cs'))
sources.append(root/'Assets/Editor/M1CombatTests.cs')
with tempfile.TemporaryDirectory(prefix='crownfall-m1-tests-') as temporary:
    executable = str(Path(temporary)/'CombatTests.exe')
    subprocess.run(compiler + ['-warnaserror+', '-define:M1_STANDALONE_TESTS', '-out:'+executable] +
                   [str(p) for p in sources], check=True)
    subprocess.run([mono, executable], check=True)
