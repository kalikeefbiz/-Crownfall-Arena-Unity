# Goal 012 — Sol’Rahn geography validation

An isolated, navigable three-lane graybox. Normal Crownfall retains its menu,
selection, loading, six-Summoner match, AI, combat, objectives, scoring and current
map. Founder approval is required before any default-map integration.

## Access

From `PlayCanvas/`, use Node 22.23.2+:

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

- Master: <http://localhost:5173/?mapPreview=solrahn>
- Bounded 3v3 region: <http://localhost:5173/?mapPreview=solrahn&mapMode=3v3>
- Built preview: `npm run build`, then `npm run start -- --host 0.0.0.0 --port 4173`;
  use the same queries at port 4173.
- Hidden published URL, after the existing complete release gate succeeds:
  <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/?mapPreview=solrahn>
- Immutable commit and publication status: [evidence/012/README.md](evidence/012/README.md).

**Region** switches master/3v3. **View** changes camera only. **Survey** explicitly
places the proxy at an inspection site. Walk using WASD/arrows or the existing left
stick. Overview movement follows screen axes; gameplay view uses the established
world axes. **Routes** toggles blueprint guides; green terrain remains open without
them. **Guide** explains materials/controls. **Exit** returns to normal Crownfall.

This geography harness uses the existing `MovementSimulation` (the base class of
`CombatSimulation`) at 60Hz, 6 units/s and radius 0.45. A 1.75m proxy avoids character
art downloads. It does not run a second combat engine, monsters, bots, rewards or
scoring. The bounded 3v3 configuration validates geography, not a relocated six-bot
match. Existing systems/rules stay untouched and their new-map sites are reserved.

## Dimensions and placements

Inspected the committed PNG, SVG and JSON before implementation. Runtime imports
the coordinate JSON directly. Its whitespace was normalized for the existing
release formatter; no coordinate values changed.

| Element                | Reference X/Z coordinates or size                       |
| ---------------------- | ------------------------------------------------------- |
| Extent                 | X −120…120, Z −72…72; 240 × 144 units                   |
| Middle                 | Original centerline; 18-unit nominal width              |
| Upper / lower          | Original nine-point centerlines; 14-unit nominal width  |
| Crown Cores            | Blue (−101, 0); Red (101, 0)                            |
| Base reservations      | 24 × 32 around each core                                |
| Spawn reservations     | X ±108; Z 0, −8, +8; three per team                     |
| Mobility               | (−53, −25), (53, −25)                                   |
| Defense                | (−18, −25), (18, −25)                                   |
| Cooldown               | (−40, 25), (40, 25)                                     |
| Existing major neutral | (0, 26)                                                 |
| Clearing radii         | Minor 7; major 8; core 5                                |
| Territorial staging    | Ground rings at X −45 / 0 / 45, Z 0; no scoring changes |
| 3v3 band               | Middle + both adjacent Wilderness regions; −35 ≤ Z ≤ 35 |

Reference X runs Blue → Red. Existing `referenceToWorld` maps `(x,z)` to world
`(z,−x)`. One master configuration serves both regions; no coordinate rescaling.
No lane, core, base, objective, rotation-link or active-band target was moved.

Added details where the blueprint leaves physical geometry unspecified:

- Enclosing oval within the JSON extent, matching the visual reference. Shared 2m
  cross-sections cut mesh edges, close cliff skirts and supply AABB boundaries.
- Rolling Wilderness shoulders, carved lanes/clearings, and an outer bank with
  0–3m surface elevation. Sixteen isolated rock formations rise 3–4m above local
  ground. Their whole visible base footprints block movement; no maze walls.
  Team-side collision is mirrored.
- Sixty editable 24 × 24m terrain modules at 2m spacing, assembled into ten render
  strips. Colors feather across the grid; nominal lane clearance is checked
  independently of pigment interpolation.
- A slope check exposed excessive outer-bank gradient. Contour amplitude/blending
  was reduced instead of changing movement. Final maximum sampled walkable gradient
  is 0.441 (23.8°). XY/Z design targets remain unchanged.

Blender 4.3.2 and installed asset-production guidance were inspected. No Blender
assets were used: procedural modules keep geometry, collision and revisions exact.
No textures, paid generation, monolithic terrain, foliage, stadium architecture or
final environment art was needed.

## Connectivity and travel

[traversal.json](evidence/012/traversal.json) records real fixed-step movement paths
and 2m flood fills with checked edge midpoints. Focused tests verify:

- Three lanes, both directions, zero collisions; full nominal-width samples clear.
- Twelve blueprint cross-lane routes plus ten open straight alternatives at
  X −80, −45, 0, 45, 80. Movement is not limited to the marked links.
- Two longer longitudinal Wilderness routes, connecting clearings and terrain cover.
- One master component (6,724 free samples), one 3v3 component (3,888), and one
  component within each tested Wilderness interior (1,216 samples each).
- Four radial approaches and a combat-clearing loop around all nine core/objective
  sites, inside 3v3. All six spawn sites are clear.
- Matching mirrored team-to-objective times. The major's north/south asymmetry is
  retained; Blue/Red access remains symmetric.

| Route                             | Measured time at current speed |
| --------------------------------- | ------------------------------ |
| Middle core-to-core               | 33.67s                         |
| Upper / lower core-to-core        | 42.98s each                    |
| Blueprint cross-lane rotation     | 8.20s                          |
| Straight open cross-lane rotation | 8.17s                          |

These exclude combat, buffs, waiting and enemies; they do not predict match length.
The larger geography needs founder pacing review before default adoption. Movement
speed, ability ranges, combat values, objective rewards and scoring stay unchanged.

## 3v3 boundaries and camera

Collision slabs block Z beyond ±35. Radius limits the player center to ±34.55.
Cyan lines and solid 1.8m fence faces make this visible; inactive terrain darkens.
Upper/lower survey sites are disabled. Switching from an out-of-band master
position resets to center. All objective clearings fit inside the band. Curved
outer-lane mouths inside the band remain base approach space, but no outer lane
continues through the fence. The full master retains all lanes/Wilderness for a
future 5v5 goal; no new lane assignment or ten-player gameplay exists.

Gameplay view retains FOV 48°, offset Y 15.5 / Z 18, look-ahead 4 and follow rate 9.
Only preview presentation follows terrain height, using the rendered triangles'
interpolation. Existing movement stays planar: no gravity, jumping, slope speed
penalty or altered collision rules. Future height-aware combat aiming/LOS and full
match pacing require their own integration review. Competitive camera code is
unchanged. Mobile screenshots use Chromium at 844 × 390, not a physical iPhone.

## Performance and verification

Four shared materials, vertex colors, no environment textures/shadows. Generated
geometry budgets and actual browser allocation/frame samples are recorded in
[performance.json](evidence/012/performance.json). The production engine does not
publish its primitive counter here; the report preserves `null` and gives generated
triangle counts separately. Software SwiftShader timings are not iPhone GPU results.

Focused browser tests cover real keyboard/stick input, boundary collision, disabled
placement, default-menu isolation and no art downloads. The established complete
release gate also runs menu, selection, loading, combat and match regressions.
No physical iPhone validation was performed.

Actual production-build screenshots:

- [Full map](evidence/012/full-map.png)
- [Upper](evidence/012/lane-upper.png), [middle](evidence/012/lane-middle.png), [lower](evidence/012/lane-lower.png)
- [Wilderness](evidence/012/wilderness.png)
- [Blue base](evidence/012/blue.png), [Red base](evidence/012/red.png)
- [3v3 active region](evidence/012/active-3v3.png)
- [Middle gameplay](evidence/012/gameplay-middle.png), [upper gameplay](evidence/012/gameplay-upper.png),
  [lower gameplay](evidence/012/gameplay-lower.png), [Wilderness gameplay](evidence/012/gameplay-wilderness.png),
  [major gameplay](evidence/012/gameplay-major.png)
- [Mobile gameplay](evidence/012/mobile-gameplay.png), [mobile region](evidence/012/mobile-active-3v3.png)

No towers, new creatures/rewards, production map replacement, UI redesign, global
movement/camera changes, physics/AI rewrite or character edits. The only normal
entry change is exact query dispatch; preview code/styles load only for
`mapPreview=solrahn`. Unknown flags and default access still reach normal Crownfall.
Goal 012 ends here; no final-art or unrelated maintenance work begins.
