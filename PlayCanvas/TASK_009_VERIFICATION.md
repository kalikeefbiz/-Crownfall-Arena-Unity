# Goal 009 — packed-earth surface and proportionate Moonreapers

Source baseline: `e3c357bccb9426a7fe5c7a72ec3547df29ac4f32` (`playcanvas-port`).

Stone courses, seams and retaining masonry are removed. Four shared static batches
depict continuous compacted dirt, feathered rocky shoulders, eroded banks and
sparse embedded gravel. Relief stays within original obstacle footprints or
outside movement bounds; playable footing stays within centimetres of Y=0.
Collision, navigation, camera, controls and combat code are unchanged.

[Poly Haven sources / CC0 / conversions](public/assets/environment/polyhaven/SOURCES.md).
Both approved scans use 1K albedo, OpenGL normal and packed AO/roughness maps.
Albedo is sRGB; data maps are linear. All maps share orientation, repeat scale,
mipmaps and trilinear filtering. Meshes provide calculated normals and orthogonal
four-component tangent streams, including vertical banks. Broad vertex pigment
and gently warped world UVs soften repetition without generated textures.
The rocky scan uses a subdued, cooler material multiplier to match the lane.

The sun direction, intensity and ambient illumination remain unchanged. Normal,
roughness and AO response reveal local depth. Six shared-mesh soft contact discs
ground actors without a shadow-map pass. Territory wash is reduced from 0.065 to
0.035 opacity to reveal soil; frontier, team discs and HUD retain their authority.

Azure Moonreapers normalize to **0.80m**, previously **1.30m** (38.5% shorter).
The approved GLB, materials, orientation, orbit radius, motion and every gameplay
projectile property remain intact. Loading/offline fallbacks scale equally.

## Review evidence

Matched screenshots and frame/allocation measurements are recorded in `evidence/009/`.
Reproduce separately from browser tests:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/review-earth.mjs before http://127.0.0.1:4175/ capture
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/review-earth.mjs after http://127.0.0.1:4173/ measure
```

The helper exposes the existing app through a browser response override solely
for camera inspection and draw diagnostics; the published bundle is unchanged.
Gameplay captures retain the competitive camera. Close views use position
(9,6,10), target (11,0,0), FOV 48. Both use 844×390 CSS px and DPR 2. Benchmarks
use 20 warmup frames and 60 samples at DPR 1 and 2, with six animated models and
paused authoritative simulation.

Software Chromium results are not physical iPhone Safari results. They cannot
establish mobile FPS, memory residency, thermal behavior or sustained match load.
