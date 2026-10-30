#!/usr/bin/env bash
# Execute after diagnostics, serially; preserve all prior completed receipts.
set -u
npx prettier --write src/presentation/terrain-textures.ts src/presentation/solrahn-surface-material.ts src/presentation/solrahn-v2-environment.ts tests/helpers/measure-solrahn-performance.ts tests/browser/solrahn-performance.spec.ts > evidence/017a/format-final-touched.txt 2>&1
python3 -m py_compile scripts/prepare-solrahn-performance.py scripts/prepare-solrahn-diagnostics.py scripts/verify-solrahn-performance-protection.py evidence/017a/aggregate.py evidence/017a/make-report.py > evidence/017a/python-final.txt 2>&1; echo "python=$?" >> evidence/017a/final-status.txt
npm test > evidence/017a/unit-final.txt 2>&1; echo "unit=$?" >> evidence/017a/final-status.txt
npm run typecheck > evidence/017a/typecheck-final.txt 2>&1; echo "typecheck=$?" >> evidence/017a/final-status.txt
npx eslint src tests vite.config.ts > evidence/017a/lint-final.txt 2>&1; echo "lint=$?" >> evidence/017a/final-status.txt
npm run build > evidence/017a/build-final.txt 2>&1; echo "build=$?" >> evidence/017a/final-status.txt
if rg -q '^(python|unit|typecheck|lint|build)=[1-9]' evidence/017a/final-status.txt; then exit 1; fi
BUILDS='[["goal017a","http://127.0.0.1:4173/?mapPreview=solrahn-v2&surface=goal017&frontend=1&verify=1"]]' LABEL=final node tests/helpers/measure-solrahn-performance.ts > evidence/017a/benchmark-final.txt 2>&1
echo "benchmark=$?" >> evidence/017a/final-status.txt
npm run test:browser -- --workers=1 --retries=0 --forbid-only --global-timeout=3600000 --reporter=line > evidence/017a/browser-all.txt 2>&1
echo "browser=$?" >> evidence/017a/final-status.txt
node tests/helpers/capture-solrahn-performance.ts > evidence/017a/capture.txt 2>&1
echo "captures=$?" >> evidence/017a/final-status.txt
