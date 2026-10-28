# Goal 015 cleanup — rejected preview retired

The founder reported that the approximately 240 MB full-resolution Sol’Rahn map
crashed during loading on a physical iPhone. Goal 015 is **rejected for mobile
gameplay**. Its active integration and public preview have been removed. No repair,
geometry processing, optimization or replacement environment was attempted.

## Runtime and asset cleanup

The ten shared files changed for Goal 015 were individually restored to their
pre-Goal-015 contents at `4fadf2cf0c1f51ec819f27c86294e4718ddc9e8d`:

- `.gitattributes`: removed only the rejected GLB's LFS tracking rule.
- `src/maps/solrahn.ts`: restored the Goal 014 optimized asset URL/configuration.
- `src/presentation/scene.ts`: removed Goal 015's camera offset, player-centred
  target and spawn camera clamp. Production camera behaviour is unchanged.
- `src/presentation/solrahn-environment.ts`: removed the high-resolution load
  deadline and triangle declaration; retained the Goal 014 environment loader.
- `src/presentation/summoner-assets.ts`: removed the Goal 015-only timeout argument;
  preserved the shared loader and original 45-second deadline.
- `src/ui/frontend.ts`: removed the Goal 015-only 300-second preparation branch;
  retained the official menu, loading, retry, selection and results systems.
- `src/ui/hud.ts`: removed the optional Goal 015 FPS/frame-time readout.
- `vite.config.ts`: removed the high-resolution dev middleware and build hash
  requirement; retained the existing Goal 014 LFS handling.
- `public/assets/solrahn/surface.bin` and `surface.json`: restored Goal 014's original
  derived data instead of retaining Goal 015's original-mesh samples.

Paths above are relative to `PlayCanvas/` except `.gitattributes`. This is a scoped
cleanup, not a project reset. All shared runtime files now match the Goal 014
baseline byte for byte. The existing `mapPreview=solrahn` entry and older terrain
sampling code belong to Goal 014 and remain available for that experiment.

Removed 15 files used exclusively by the rejected candidate:

- `.github/workflows/publish-crownfall-solrahn-015.yml`.
- `PlayCanvas/scripts/solrahn-surface-015.py`.
- `PlayCanvas/tests/browser/solrahn-015.spec.ts`.
- `PlayCanvas/assets/solrahn-goal-015/runtime/solrahn-full-quality.glb` (LFS pointer).
- All five files in `PlayCanvas/assets/solrahn-goal-015/scripts/`.
- All six generated comparison render/camera files in that directory's `previews/`.

A redundant full-resolution GLB export outside the repository was also deleted.
The founder's original Blender file was left untouched. No GLB was exported.

## Git LFS and history

The rejected pointer was on `playcanvas-port`, the only branch containing it.
No `assets/solrahn-goal-015` branch existed in the repository. Its tracking rule and
current pointer are removed; active code/build scripts contain no rejected asset
URL, filename or checksum. The production build does not contain the GLB.

No history rewrite, force push, LFS storage purge or Release modification occurred.
The old candidate remains retrievable through historical commits/LFS storage by
design. Its historical immutable asset URL is not an active game dependency and
was not revoked. Goal 013's two runtime LFS pointers and payloads remain intact.

## Public retirement and isolation

Pages retirement commit: `cb742a5094098cb27d2adec2aaf4bb2d1dc8d1a6`.
It deletes **only `/solrahn-goal-015/`**, removing all 51 hosted files. GitHub Pages
reports the retirement deployment built. The exact rejected launch URL and every
one of its 51 former hosted files return **HTTP 404**. The retired URL has no game
entry or bundle from which to launch the high-resolution map.

Every other hosted object is byte-identical to the previous Pages commit,
`c89ac91dfb0fcff1ad460637e065aa3f9c910295`, including:

| Hosted path          | Preserved Git object                       |
| -------------------- | ------------------------------------------ |
| `/playcanvas/`       | `ff44fba8658e50c01a402548c6f60ec1a769e962` |
| `/solrahn-goal-014/` | `9e2911aafd41442c250c52cedd471d0e71d6b62d` |
| Unity `/index.html`  | `11d54ce515a37802cd92ed1511fe7938ad254dfd` |
| Unity `/Build/`      | `6be925b8d3b11ba7f7d9d0d2d0a7840ef2b51bec` |

The root headers and `.nojekyll` are unchanged too. No other Pages path was added,
modified or deleted. No production publication workflow was dispatched. The source
cleanup commit uses `[skip ci]` so it cannot automatically publish to production.
Goal 014 remains HTTP 200 and reports its original implementation
`b3e8ee851583c568f3aa7fa7978e6a7c0e809a60`.

## Verification

- **242 unit tests pass** across all 27 existing unit test files.
- Typecheck, scoped ESLint (`src`, `tests`, `vite.config.ts`) and production build pass.
  The unscoped lint command also scans the pre-existing CommonJS Goal 013 offline
  validator; its existing lint incompatibility is outside this cleanup.
- **19 existing browser regressions pass**: arena/combat, menu and settings,
  selection, staged loading, failure/retry, pause, results, cached replay,
  match lifecycle, all three Summoners and captured touch controls.
- The **live production `/playcanvas/` game passes** menu-first/no early GLB download,
  Riven selection, official loading, six animated Summoners, existing normal and
  occlusion material maps, natural AI damage, scoring, six-player results, cached
  replay and a touch Basic damage hit. No rejected-map request or page error occurs.
  The established opt-in verification seam accelerates normal simulation ticks;
  a controlled combat fixture verifies the human touch hit. This does not change
  any hosted rules, match values or game files.
- **Both Goal 014 landscape/portrait browser checks pass**, including its optimized
  map, grounding, touch ability hit, AI, results and cached replay. Test-generated
  historical screenshots/receipts were restored unchanged; new checks are recorded
  separately under `evidence/015-cleanup/`.
- No full-resolution reference remains in active `src`, `public`, `scripts`, tests,
  build configuration or workflows, or in the built JavaScript.
- Approved Unity work, combat, models/animations, frontend art, existing terrain
  materials, Maple/Pine/Red Oak/Redwood, citadel/environment assets, Goal 013 files
  and Goal 014 verification records are unchanged.
- All existing GitHub Release asset names, sizes and digests are unchanged,
  including the founder's original one-lane and three-lane Blender files.

Browser checks use Chromium/SwiftShader for functionality. No new mobile
performance claim is made, and the founder's physical iPhone rejection is retained
as the deciding result.

## Deliberately retained historical files

`GOAL_015_VERIFICATION.md`, `assets/solrahn-goal-015/manifests/*.json` and
`evidence/015/` remain as historical evidence, prominently marked retired/rejected.
Old screenshots, allocation measurements, checksums and publication receipts are
not active runtime resources. Repository commit history, LFS objects and original
Release sources are preserved. There is no replacement preview or next milestone.

Cleanup evidence is in [evidence/015-cleanup/](evidence/015-cleanup/), including
[Pages isolation](evidence/015-cleanup/pages-isolation.json),
[public 404 checks](evidence/015-cleanup/public-retirement.json),
[source isolation](evidence/015-cleanup/source-isolation.json),
[protected source assets](evidence/015-cleanup/protected-source-assets.json), and
[live production checks](evidence/015-cleanup/public-production.json).
