"""Intentional failures run only in /workspace/007l-probe, never source branch."""
import json, os, subprocess
from pathlib import Path
root = Path('/workspace/007l-probe/PlayCanvas')
evidence = Path('/workspace/007l-evidence')
results = []
def probe(name, path, text, command, env=None):
    target = root / path
    assert not target.exists()
    target.write_text(text)
    try:
        p = subprocess.run(command, cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env)
        (evidence / f'negative-{name}.txt').write_text(p.stdout)
        results.append({'probe': name, 'command': command, 'exit_code': p.returncode, 'expected_failure': p.returncode != 0})
        print(json.dumps(results[-1]), flush=True)
        assert p.returncode != 0
    finally:
        target.unlink()
probe('unit', 'tests/ci-gate-probe.test.ts', "import { expect, test } from 'vitest';\ntest('intentional nonpublishing gate probe', () => { expect(1).toBe(2); });\n", ['npm', 'test'])
probe('typecheck', 'tests/ci-gate-probe.ts', 'export const intentionalTypeFailure: string = 1;\n', ['npm', 'run', 'typecheck'])
probe('lint', 'src/ci-gate-probe.js', 'debugger;\n', ['npm', 'run', 'lint'])
probe('format', 'CI_FORMAT_PROBE.md', '#   Intentional formatting probe\n\n-   item\n', ['npm', 'run', 'fmt'])
config = root/'playwright.config.ts'
original = config.read_text()
config.write_text(original.replace('4173', '4273'))
try:
    env = dict(os.environ, CI='true', CHROMIUM_PATH='', PLAYWRIGHT_HTML_OPEN='never')
    probe('browser', 'tests/browser/ci-gate-probe.spec.ts', "import { expect, test } from '@playwright/test';\ntest('intentional nonpublishing browser gate probe', async ({ page }) => { await page.goto('/'); await expect(page).toHaveTitle('INTENTIONAL FAILURE'); });\n", ['npm', 'run', 'test:browser', '--', 'tests/browser/ci-gate-probe.spec.ts', '--workers=1', '--retries=0', '--reporter=line,html', '--trace=retain-on-failure'], env)
finally:
    config.write_text(original)
(evidence/'negative-probes.json').write_text(json.dumps(results, indent=2)+'\n')
