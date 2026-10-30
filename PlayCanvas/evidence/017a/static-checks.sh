#!/usr/bin/env bash
set -u
npm test > evidence/017a/unit-all.txt 2>&1; echo "unit=$?"
npm run typecheck > evidence/017a/typecheck.txt 2>&1; echo "typecheck=$?"
npx eslint src tests vite.config.ts > evidence/017a/lint-scoped.txt 2>&1; echo "lint-scoped=$?"
npm run lint > evidence/017a/lint-all.txt 2>&1; echo "lint-all=$?"
npm run fmt > evidence/017a/format-all.txt 2>&1; echo "format-all=$?"
npm run build > evidence/017a/build.txt 2>&1; echo "build=$?"
