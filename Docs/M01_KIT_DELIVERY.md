# M0.1: approved Kit PNG presentation correction

Baseline: GitHub main `832b3a60fc3964c9f60f5cc8c5c07a6def765ddd`.
Only `side-run-idle.zip` supplies this update. The earlier Kit.zip is superseded.

## Exact replacements

| ZIP file (under side-run-idle/) | Production path | Replaces | Retained GUID |
|---|---|---|---|
| idle.png.PNG | Assets/Art/Characters/Kit/Idle/idle.png | Idle/Kit_Idle.jpeg | 758e511d31cd5603b36cbb2a8901d37e |
| 000.png.PNG | Assets/Art/Characters/Kit/Run/000.png | Run/Kit_Run_01.jpeg | 443288b204ab5d1ea0bf3d7e2d82f048 |
| 001.png.PNG | Assets/Art/Characters/Kit/Run/001.png | Run/Kit_Run_02.jpeg | 4cafc9ed456a51b498ffb93b73ceea2e |
| 002.png.PNG | Assets/Art/Characters/Kit/Run/002.png | Run/Kit_Run_03.jpeg | 8ae219bf247051d99866082bd01dd84a |
| 003.png.PNG | Assets/Art/Characters/Kit/Run/003.png | Run/Kit_Run_04.jpeg | a04930c1418f53338d328acd831f8cfa |

The five retained .meta files are renamed only, with byte-identical contents.
All nine old Kit JPEGs and their old-path metas are removed. Former run frames
5–8 are removed from the sprite set; their GUIDs are no longer referenced.
The sprite set's idle and first four frame GUIDs are unchanged. No scene edits.

## Presentation/import settings

- Idle: idle.png. Run: 000 → 001 → 002 → 003 → 000.
- Configurable 12 FPS retained: four-frame loop takes 1/3 second.
- No extra frames, duplicates, mirrored files or earlier artwork inserted.
- Sprite / Single; Input Texture Alpha; Alpha Is Transparency enabled.
- Clamp U/V/W, trilinear filtering with mipmaps, uncompressed texture import,
  2048 maximum size, NPOT resizing disabled, readback disabled.
- Existing custom pivots, shared 500 pixels/unit and visual transforms unchanged.
  New sources have the same 1254 x 1254 dimensions. Visual grounding requires device review.
- Runtime SpriteRenderer.flipX, animation code, thresholds, proxy swap and all M0
  simulation/input/camera/scene/HUD/battlefield/landscape settings are unchanged.
- Run length is serialized data; the existing animator already uses array length.
  Further approved frames can be added later without changing gameplay architecture.

## Changed files

Five PNG files and their preserved metas replace the old assets listed above.
Nine JPEG files and old-path metas are deleted, including former slots 5–8.
Other changes:

- Assets/Crownfall/Configuration/KitSpriteSet.asset: four approved run references.
- Assets/Editor/M0Validation.cs: approved PNG names/count and alpha/import validation.
- Tools/validate_m0.py: five-frame asset set, PNG signature/RGBA/CRC and stale asset checks.
- Docs/KitSourceManifest.json: source mapping, hashes and alpha properties.
- Docs/KIT_ASSETS.md: current approved mapping.
- Docs/M01_KIT_DELIVERY.md: this report.
- README.md: current four-frame PNG documentation.
- .github/workflows/unpack-unity.yml: scoped M0.1 patch import; delivered separately.

## Static validation

All five original members were decoded read-only: valid PNG signature, RGBA,
1254 x 1254, alpha extrema 0–255 including fully transparent pixels. PNG chunk
CRCs and SHA-256 checks passed. Integrated bytes equal the ZIP members exactly.
There is no re-encoding, source scaling, cropping, matte removal or artwork edit.

Checked GUID uniqueness, complete meta coverage, no orphan old frames, exact
idle/run references, no Apple metadata, and intact scene/material/config references.
C# syntax and serialized YAML checks passed. All runtime C# files, scene, materials,
shaders, tuning, Packages and ProjectSettings byte-match the baseline. The existing
Web build hook is unchanged; its Editor validation now expects the approved PNGs.

Unity Editor was not executed. Actual Unity texture recognition/import, C# type
checking, shader compilation and Web build success cannot be claimed locally.
The Editor gate checks Unity's source-alpha detection during the next cloud build.

## GitHub installation from iPhone

1. Upload **Crownfall-Unity-M0.1-Kit.zip** to the repository root on **main**.
   Keep the filename unchanged. This is a scoped patch, not a standalone project.
2. Replace `.github/workflows/unpack-unity.yml` with the supplied
   **unpack-unity-m01.yml** contents and commit.
3. Run **Import Crownfall M0.1 Kit PNGs** on main. It guards the baseline, verifies
   the patch hash, applies only listed files, deletes the old Kit JPEGs/metas,
   runs static checks, and commits the correction to main.
4. Build the final imported commit using the existing Unity Cloud target.

No direct GitHub push/authentication retry was attempted. The import script is
validated locally against the baseline; GitHub dispatch itself remains untested.
Old delivery ZIPs remaining at repository root are historical archives, not active
Unity assets. Do not re-run the old M0 importer.

## Unity Cloud + iPhone checks still required

- Successful PNG/Sprite import with alpha recognized and Editor validation passing.
- Successful compilation/Web build using the existing target and loader.
- Idle and moving Kit render without a white rectangle or unwanted alpha fringes.
- Only the approved 000–003 loop displays, with acceptable timing and grounding.
- Idle/run scale and foot contact, left/right mirroring, scene occlusion.
- Sprite/proxy swap, independent movement/aim and targeting remain functional.

No M1, combat or other gameplay work is included.
