# Set 2.5D sprite proof (2026-11-02)

Founder direction: the Meshy model/rig reads "kitty cat, not predator"; question whether to stay full 3D or return to
2D. Proposed and now testing a hybrid: keep the 3D Coliseum, draw summoners from the founder's painted 2D frames.

- Art: founder upload `Crownfall_Arena.zip` (Characters/set). Copied sources: `art-source/set/run/000-007.png`
  (the 2D build's run, 8 frames at 12 fps, 437 x 431, transparent) and `art-source/set/idle/000.png` (1223 x 1286).
- `scripts/summoners/build-set-sprites.py` -> `public/assets/summoners/set/sprite/set-atlas.webp` (3 x 3 cells, 511 KB)
  + `set-atlas.json`. Stray sheet numbers and neighbour slivers removed by keeping only large connected shapes.
- `src/presentation/set-sprite.ts`: a camera-facing card at Set's feet, unlit painted art with its own alpha; run cycle
  at 12 fps while moving, idle otherwise; mirrored when he faces left on screen (frames face right). One draw per Set.
- On by default for this preview; `?setSprite=0` restores the 3D model (and its PantherSprint). Kit and Riven stay 3D
  for side-by-side judgement. Simulation/collision unchanged.
- Known proof limits: only run + idle (no attack/war-cry frames wired), left/right mirroring only (no toward/away
  frames), idle is a front-facing pose, no shadow under the card yet.
- Evidence: `evidence/summoners/set-sprite-proof-sheet.png` (top: close; bottom: near gameplay camera).
