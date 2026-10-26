# Goal 012 evidence

Implementation: complete, hidden behind `?mapPreview=solrahn`.
Default battlefield: unchanged. Geography approval: pending founder review.

Access, coordinates, placement table, module design, test methodology and limitations:
[TASK_012_VERIFICATION.md](../../TASK_012_VERIFICATION.md).

## Local checks

- Unit suite: 246 tests pass, including seven new geography tests.
- TypeScript, ESLint, Prettier and production build pass.
- Focused production-browser suite: four tests pass (46.3s).
- Established release gate: all 131 browser tests, no retries/filters, plus unit,
  typecheck, lint, formatting and build; publication only after successful validation.

## Geometry and performance

Sixty 24m source modules; ten terrain render strips. 13,704 terrain triangles;
24,008 static triangles total including all optional overlays/guides. Fifteen static
meshes, four shared materials, zero authored texture bytes. Actual full overview
uses 15 draw calls; representative gameplay uses 9. Approximate engine-reported
geometry buffers: 1.81MB. No character or environment-art requests.

The extra preview module is about 18.2KB raw / 7.9KB gzip and its CSS about 1.6KB raw.
The shared PlayCanvas/control chunk is approximately 1.07MB raw / 279KB gzip. It is
not requested by the default menu until the established game entry requires it.

[performance.json](performance.json) retains measured initialization, GPU buffer
allocation and frame samples at 844 × 390 in Chromium SwiftShader. This software
renderer sampled roughly 68–69ms median and 111–129ms p95 in the initial run;
use the JSON for the final run's exact values. These are measured limitations,
not a mobile frame-rate claim. Physical iPhone and sustained thermal/GPU testing
remain unperformed. The current production engine omits its primitive counter;
`null` is recorded rather than inventing a rendered-triangle measurement.

## Captures and traversal

[Full map](full-map.png), [3v3 band](active-3v3.png),
[gameplay camera](gameplay-middle.png), [mobile gameplay](mobile-gameplay.png).
The verification document links all lanes, Wilderness, bases and remaining views.

[traversal.json](traversal.json) contains real-authority route times, access tests,
flood-fill components, mirrored team comparisons and slope measurements.
[browser-traversal.json](browser-traversal.json) records lane checks from the
production browser and page error results.

## Release

Source commit and workflow result will be appended after submission to the existing
validated publication workflow. The default game is not switched to this geography.
