# GOAL 020: Sol'Rahn art direction (vignette 1)

Branch `goal-020-solrahn-art-direction`, based on `goal-019-solrahn-environment-transformation` @ `626d127`.
Presentation only: no combat, input, AI, navigation, collision, heightfield, spawn, camp or scoring changes.

## Direction
Ancient causeway reclaimed by temperate woodland, late afternoon. A lighter, warmer, worn route through cooler,
darker woodland. Ground stays subordinate; characters and effects are the brightest, highest-contrast things on screen.

References (founder-supplied): Vainglory hero shot (pale varied cobble lane, clustered edge foliage, one small accent),
Dota 2 (light path through mid-tone grass, dark clustered tree masses), Vainglory gameplay (dim cool ground, rounded mossy
boulders, effects pop). Aim for saturation between those and the muted palette in the handoff.

## What changed
- `scripts/goal020/bake-ground.py` -> `public/assets/solrahn-surface/goal020_atlas.webp` (+ json). Same four CC0 Poly Haven
  families and unmodified V2 height/weights. New: palette control per family, three-octave macro variation, rotated second
  tile sample to hide the 6 m repeat, irregular noise-warped lane with dusty centre / darker margins / mossy verge, baked
  cavity + crest shading, rock tint on steep ground. Material now reads the goal020 atlas (detail strength 0.26).
- `src/presentation/solrahn-causeway.ts`: grid of near-identical slabs replaced by irregular flagstone fields (many small,
  few large, rejection-spaced, alternating with bare earth) and a broken kerb; lighter stone, irregular outlines, moss tint.
- `src/presentation/scene.ts` (v2 only): warmer lower side-sun, lifted cool ambient, linear distance haze, clear colour
  matched to the haze.
- `src/presentation/solrahn-environment-art.ts`: trees and rocks get separate matte tint values (trees lifted).
- `?bare=1` (dev only): hides the stone lane and props to judge raw terrain. Nothing is deleted.

## Evidence
`evidence/020/` has before (GOAL 019) and after captures from the same camera poses, plus `bare-*` stripped-terrain views and
`before-after-board.png` (a labelled side-by-side composite; individual PNGs are unedited). Captures are headless Chromium /
SwiftShader at 844x390 DPR1 Low: judge look only. Reproduce with `scripts/goal020/capture.mjs` (`CHROME_PATH`,
`CAPTURE_NAME`, `CAPTURE_URL`, optional `CAPTURE_QUERY`, `VIEW_FILTER`).

## Open / weak
- Trees: pine still reads dark and flat; stylised Meshy trees and scanned rocks still don't fully share a style.
- Hills are one green family; woodland vs meadow variety, undergrowth and edge clusters are not built yet.
- Blue/Red territory tint on the lane is still too faint to read.
- Camp clearings are a bare disc with a loose stone ring: needs an authored treatment.
- No physical-iPhone performance evidence. Do not infer FPS from the SwiftShader numbers.
- Unit tests: 259/259 on rerun; one failure on a first run was not identified. Running `vitest` regenerates tracked
  evidence and `weights.png`: restore with `git checkout` before committing.
