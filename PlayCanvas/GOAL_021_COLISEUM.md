# GOAL 021: The Crownfall Coliseum (graybox)

Founder-approved plan (2026-11-01): https://claude.ai/artifact/BkVWnggfaKQoKU8Exw4EVp (private to the founder).
Branch `goal-021-coliseum` (from `goal-020-solrahn-art-direction`). New single-lane arena; Sol'Rahn V2 is untouched and still
opens with `?mapPreview=solrahn-v2`.

## What it is
- One layout source: `scripts/coliseum/build-coliseum.py` writes `public/assets/coliseum/{height.u16, walk.bin, lane.bin,
  colors.bin, terrain.json}` in the Sol'Rahn V2 format, so movement, bots, scoring and camera run unchanged
  (`src/maps/coliseum.ts` loads it through `createSolrahnV2`, now parametrised by map metadata).
- Lane 10 m wide, goal to goal 120 m (spawns at z ±64), 8 m gold scoring band, plazas at z 0 / ±30. Bases reachable only
  down the lane (sealed corridor |z| 38-60). Wilderness plateaus +2 m with 8 ramps (2.4 / 3.6 / 5 m walkable).
- West: major on a river island, two 3 m bridges (the west's only crossing); Mobility camps at (-24, ±40) (the existing
  Mobility mechanic). East: Defense (24, ±40), Cooldown (20, ±14), a 3.6 m bridge and 2.4 m stepping stones.
  Mirrored top/bottom: identical distances for Blue and Red. Non-Mobility objectives stay inert placeholders.
- Ramps start at the lane edge (x 5 -> 10) so the plateau's inner edge sits at |x| 9.5 (plan drawing showed 7).

## Verified
Generator checks in `terrain.json` (`checks`): one connected floor, every camp and the major reachable from both bases,
both bases sealed except via the lane, major reachable with either island bridge closed, measured grid paths
base->major 86 m for both teams. `tests/coliseum.test.ts`: checksums, spawns, routing, blocking, and a 40 s bot match that
stays on walkable ground. Full suite: 263/264; the one failure is the known `solrahn-surface` weights re-encode issue in
this sandbox (unrelated, see GOAL_020).

## Not yet
No art (graybox palette only), no stadium/crown, no water animation. No iPhone numbers yet: that is the point of this
graybox. Captures in `evidence/021/` are headless SwiftShader: judge layout only.
