# Goal 009 — packed-earth surface and proportionate Moonreapers

Source baseline: `e3c357bccb9426a7fe5c7a72ec3547df29ac4f32` (`playcanvas-port`).

Stone courses, seams and retaining masonry are removed. Five shared static batches
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
Only the narrow transition band blends two surfaces; outer rocky shoulders are
opaque and replace the dirt beneath them, limiting PBR overdraw.

The sun direction, intensity and ambient illumination remain unchanged. Normal,
roughness and AO response reveal local depth. Six shared-mesh soft contact discs
ground actors without a shadow-map pass. Territory wash is reduced from 0.065 to
0.035 opacity to reveal soil; frontier, team discs and HUD retain their authority.

Azure Moonreapers normalize to **0.80m**, previously **1.30m** (38.5% shorter).
The approved GLB, materials, orientation, orbit radius, motion and every gameplay
projectile property remain intact. Loading/offline fallbacks scale equally.

## Visual gate and matched captures

| View                              | Before                                      | After                                        |
| --------------------------------- | ------------------------------------------- | -------------------------------------------- |
| Six-summoner active-match fixture | [Stone lane](evidence/009/before-match.png) | [Packed earth](evidence/009/after-match.png) |
| Close terrain inspection          | [Before](evidence/009/before-terrain.png)   | [After](evidence/009/after-terrain.png)      |

[Comparison metadata](evidence/009/comparison.json) verifies identical complete
match state, player state and camera coordinates (within 0.000001m). Both use
844×390 CSS px, DPR 2, the same lighting and FOV 48. CDP images are downsampled to
844×390. Gameplay retains the original competitive camera; close views use
position (9,6,10), target (11,0,0). Animation pose can differ with asset load time;
actor placements and simulation time are fixed.

Visual review: the grid is gone; granular soil and embedded aggregate respond to
the sun in the close view. Broad variation, warped UVs and a feathered edge avoid
visible square repeats. The neutral brown lane preserves team discs, frontier,
character silhouettes and the two smaller Moonreapers. Original approved model
bytes/materials are verified by the weapon test; outgoing/returning/orbit motion
and both independent throws pass the existing browser phase/ownership checks.

## Measured cost

Five terrain batches: **78,272 → 10,015 vertices**, **26,816 → 4,517 triangles**,
**496 → 0 paving slabs**. Shared contact geometry adds six small actor draws.
Six packaged 1K maps total **5,105,001 bytes** (4.87 MiB). Terrain textures occupy
32 MiB with mipmaps versus the previous 85.3 KiB grain map.

Whole-scene PlayCanvas allocation counters, with all six models and four detailed
Moonreapers loaded:

| Allocation      | Before bytes | After bytes |
| --------------- | -----------: | ----------: |
| Textures        |  402,803,636 | 436,270,680 |
| Vertex buffers  |    7,959,692 |   4,844,988 |
| Index buffers   |      513,360 |     379,998 |
| Uniform buffers |        5,216 |       6,144 |
| Draws/frame     |           35 |          41 |

Net texture increase: **31.92 MiB**; geometry buffers decrease **3.10 MiB**.
These counters are not OS residency, peak decode memory or physical-device usage.
Existing character and weapon textures dominate the whole-scene allocation and
remain unchanged.

| DPR | Mean ms before → after | Median ms before → after | P95 ms before → after |
| --- | ---------------------: | -----------------------: | --------------------: |
| 1   |          621.9 → 635.3 |            600.1 → 616.7 |       1233.3 → 1283.2 |
| 2   |        1273.8 → 1461.1 |          1216.5 → 1383.2 |       2400.0 → 2666.5 |

[Baseline raw samples](evidence/009/before-all.json),
[final raw samples](evidence/009/after-all.json). One isolated run per revision,
20 warmup frames, 60 samples per DPR, 844×390, Chromium 154.0.8037.57 / ANGLE
SwiftShader. The authoritative roster is paused while animation/rendering continue.
The final mean increases about 2% / 15% at DPR 1 / 2; this is a measured art cost,
not a speedup. High variance limits precise comparisons.

The initial full-width transparent-shoulder pass measured 705.0 / 1930.8ms means
([raw samples](evidence/009/after-initial-all.json)). Cropping underlying dirt and
making the outer shoulder opaque reduced avoidable overdraw; only the 3.4m
transition band now blends two PBR surfaces. Final captures show this correction.

These are software-browser results, **not physical iPhone Safari tests**. They
cannot establish mobile FPS, memory limits, thermal behavior or sustained match
performance. Physical iPhone validation remains outstanding.

## Verification and release

- Local unit suite: **229 passed / 24 files**; focused geometry/weapon suite:
  **6 passed**. [Unit log](evidence/009/unit.txt), [focused log](evidence/009/focused-unit.txt).
- Focused browser checks: weapon phase/material-sharing, fallback and ordinary
  match cases passed; final terrain cases **2/2 passed** with identical state/camera.
  [Final terrain log](evidence/009/terrain-browser-final.txt).
- Typecheck, ESLint, formatting and production build pass. Vite retains its
  existing large-bundle advisory (1,312.07 kB raw / 354.48 kB gzip).
- The first terrain comparison hit its 60-second screenshot-readback timeout.
  Its allowance is now 120 seconds for two full scene loads; the final run passed
  in 56.8 seconds. Assertions and the complete release suite remain enabled.

Implementation: `1f72fa7d5f13e11c8e7c5b8fbff24be83afa1b60` (includes art commit
`2bedefcbb6ede5d1eaf9c037baf09d5054395f72`). The earlier release run was cancelled
when superseded by the overdraw correction. The corrected revision uses the
existing [validated publication pipeline](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40166808199).
The workflow **passed** all checks, including **229 unit tests** and **118/118
production browser tests in 33.2 minutes**, then published the immutable validated
artifact. [Release record](evidence/009/release.json).

Live verification on **2026-10-25 at 06:24 UTC** fetched the entry bundle and all
six terrain maps and confirmed byte-for-byte equality with the tested local files.
The hosted scene rendered six models and four detailed Moonreapers without browser
exceptions. [Deployment data](evidence/009/deployment.json),
[live screenshot](evidence/009/live-match.png).

- Live preview: <https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/>.
- Entry: `assets/index-D-wM9zvB.js`.
- Bundle SHA-256: `b1b6b5630f026a6ea3921aa17b0f23350b5652a639dc63ab533cbfbd24d73ce6`.
- Required natural 3v3 battle: [active combat](evidence/009/task004-active-desktop.png),
  [natural result](evidence/009/task004-result.png), at the suite's 640×360 viewport.
- Final mobile weapon review: [orbit](evidence/009/008-moonreapers-orbit.png),
  [deployed](evidence/009/008-moonreapers-deployed.png),
  [returning](evidence/009/008-moonreapers-returning.png), at 844×390. Both scythes
  remain distinct and their original detailed materials remain readable.

Reproduce captures/measurements separately from browser tests:

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/review-earth.mjs before http://127.0.0.1:4175/ all
CHROMIUM_PATH=/usr/bin/chromium node tests/helpers/review-earth.mjs after http://127.0.0.1:4173/ all
```

Serve the retained baseline production build on 4175 and the final build on 4173.
The helper exposes the existing app through an inspection-only response override
for close camera placement and draw diagnostics; the published bundle is unchanged.
