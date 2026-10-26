# Goal 012 cleanup and Blender source verification

The rejected procedural arena is removed from source. No replacement arena was
created, integrated or deployed. Existing production behavior and Git history are
preserved. The cleanup commit uses `[skip ci]` because a normal source push triggers
the existing automatic publication workflow; regression validation ran locally.
The live `gh-pages` deployment remains untouched.

## Removed scope

- `src/maps/solrahn.ts`: terrain, lanes, rocks, camp placements, boundaries and map config.
- `src/preview/solrahn-preview.ts`, `solrahn-scene.ts`, `solrahn.css`: preview entry,
  geometry, camera harness, controls wrapper and presentation.
- `tests/solrahn.test.ts` and `tests/browser/solrahn.spec.ts`.
- Preview-only `src/combat/movement.d.ts`, `resolveJsonModule` setting and query dispatch.
- `design/solrahn-graybox-v1/`: rejected JSON authority and its PNG/SVG references.
  These are withdrawn; their history remains in Git and they must not direct future work.
- The old Goal 012 verification document, README promotion and `evidence/012/`
  captures/reports, including abandoned local draft evidence.

[Exact removed-file manifest](evidence/012-cleanup/removed-files.json).
Founder source-intake documentation under `design/solrahn-meshy-source/` is preserved.

## Exactly two release assets verified

Release: <https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/tag/solrahn-three-lane-source-v1>.
GitHub reports exactly two uploaded assets, both named `.blend`, with distinct asset
IDs, filenames, sizes and SHA-256 digests. No GLB assets are present. Each download
URL returned HTTP HEAD 200; Content-Length matches the release metadata.
The founder explicitly confirmed the lane-count mapping in this session.

| Arena      | Exact filename / download URL                                                                                                                                                           |     Bytes | GitHub SHA-256                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------ |
| Three-lane | [export_Meshy_AI_2026-10-26_4debfa.blend](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/download/solrahn-three-lane-source-v1/export_Meshy_AI_2026-10-26_4debfa.blend) | 506928885 | `626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f` |
| One-lane   | [export_Meshy_AI_2026-10-26_7d27be.blend](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/download/solrahn-three-lane-source-v1/export_Meshy_AI_2026-10-26_7d27be.blend) | 154342975 | `a245c604a9f1b092c37dcc6b66bed5353df6506a9d16e91d5188f0c616f7af82` |

[Metadata and accessibility evidence](evidence/012-cleanup/release-assets.json).
Hashes are GitHub-reported digests, not hashes recomputed from local downloads.
Verification used release metadata and HTTP headers only. Neither Blender file was
downloaded or opened. No geometry inspection, edits, optimization, conversion,
GLB export or PlayCanvas import occurred. Future retrieval should use these exact
release URLs and verify downloaded bytes against the recorded SHA-256 values.

## Validation

- 239 existing unit tests pass across 26 files.
- Typecheck, ESLint, Prettier and production build pass.
- Nine existing production-browser tests pass (1.4m): menu/roster/settings at three
  mobile sizes; sequential readiness/result/replay/pause; movement/aim/facing;
  obstacle collision; Kit, Set and Riven Basic damage.
- Default access and the retired `?mapPreview=solrahn` both open the official menu.
  No preview global, panel, preview request or page error remains.
- No Sol’Rahn preview references remain in runtime source or tests; the build contains
  no rejected preview chunks.
- All production source, public assets, dependencies, TypeScript settings and
  workflows exactly match validated pre-Goal-012 baseline `5c2c6f0`.
- No publication or deployment was requested. Live `gh-pages` revision at cleanup:
  `129ae5cd91b134ed511a95953d155ff30a4c46ef`.

[Validation record](evidence/012-cleanup/validation.json),
[browser removal smoke check](evidence/012-cleanup/browser-smoke.json),
[production source equality](evidence/012-cleanup/production-source-equality.json).

Cleanup and asset verification stop here. The Blender maps have not been integrated.
