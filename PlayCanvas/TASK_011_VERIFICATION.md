# Goal 011 — official front-end and staged player entry

Source baseline: `fea6b9e` on `playcanvas-port`, retaining the Goal 010 grove,
weapon scale, deferred scenery setup, completed-render warmup and disposal fixes.
No arena layout, art composition, character scale, animation file, combat rule,
ability, collision or AI behavior was changed.

## Implemented flow

Main Menu → Summoner Selection → Resource Loading → existing protected three-second
Countdown → Gameplay → skippable Crownfall announcement → authoritative Results →
Play Again / Change Summoner / Main Menu. Pause, Resume and Settings work during
play. Combat Practice enters the existing sandbox and its development controls.
There is one existing simulation and one application owner, retained for rematches.
Changing between practice and competitive play disposes the previous scene owner.

The attached `CROWNFALL_MENU_DESIGN_DIRECTION.md` is the visual authority. The original
`ucl-arena-menu.jpeg` is copied byte-for-byte. Functional HTML components use navy,
ivory, gold, sharp panels and self-hosted OFL Cinzel and Rajdhani; licenses ship beside
the fonts. No concept screenshot is shipped as an interface. The three portrait
WebPs total about 34 KiB and derive from the approved GLBs and imported materials;
[provenance](public/assets/frontend/portraits/provenance.json) records source hashes.
Reproduce with Blender via `tests/helpers/render-portraits.py`, then convert the
transparent PNGs to WebP using Pillow, quality 90, method 6. Source GLBs are unedited.

## Resource lifecycle

Public startup loads the menu, artwork, styles and fonts. Selection requests only
small portrait stills. It does not create a WebGL device, arena, simulation or HUD.
The production entry and menu JS are separate from the deferred game bundle.

Confirmed entry creates the existing application with simulation and automatic
rendering suspended. The gate awaits:

1. Essential battlefield geometry/materials and six existing terrain maps.
2. Selected Summoner's shared container, instantiation and completed render.
3. Each remaining unique Summoner, sequentially, with the same render fence.
4. The shared Azure Moonreaper container.
5. Roster/control initialization and a final essential render.

The seven-stage meter counts completed operations, never invented bytes or time.
All container owners serialize fetch/decode work. Each has a 45-second active-job
limit; the entire public preparation has a 120-second deadline. Essential failures
show Retry / Back, dispose the failed owner and perform fresh requests on retry.
Cancellation aborts active downloads and prevents queued imports. Existing optional
Wilderness resources remain outside essential readiness and use their preserved
completed-render warmup. No timer artificially delays entry or advances progress.

Readiness samples are recorded in [readiness.json](evidence/011/readiness.json).
They are local Chromium/SwiftShader measurements, including a deliberate held
request used to prove the gate; they are not iPhone/network performance claims.
The earlier unheld development sample took 5.24 seconds at 844×390/DPR 1.
Initial arena geometry, shared character materials and animations are unchanged.
Menu/pause/results suspend simulation, animation time and full-scene rendering.
Returning to play reuses the owner and cached containers, not another simulation.

## Settings and control editor

Standard retains the existing rendering settings. Low caps DPR at 1 and disables
terrain normal/occlusion maps. Settings persist locally; fullscreen uses the browser
API, with iPhone Add to Home Screen guidance and request-failure feedback.

Edit Controls operates on movement, aim/facing, basic, skill 1, skill 2, ultimate
and special/stance. Dragging, scale 0.8–1.35 and opacity 0.35–1 edit an isolated draft.
Save persists normalized, collision-resolved positions. Cancel discards the draft.
Reset requires two presses and still requires Save. Corrupt/incomplete/out-of-range
storage recovers to defaults. Layout resolution protects safe areas, minimum 44px
hit targets and overlap, including after rotation. Positions apply directly to the
existing Controls and AbilityInput DOM elements, including rebuilt stance buttons.

## Verification and release integrity

- Focused front-end browser cases cover all three requested landscape sizes,
  menu-first requests, identities, settings persistence, editor save/cancel/reset,
  malformed storage, actual readiness, failure/retry, authoritative six-person
  results, replay requests, paused/menu frame suspension and practice.
- A captured-touch case uses saved positions, rotates to 667×375 and exercises the
  real movement and basic-attack hit surfaces together.
- Existing gameplay/browser checks retain their assertions and timeouts. Their
  explicit `?verify=1` prematch inspection entry preserves model, natural-match,
  input, environment and HUD fixtures. Public navigation is tested separately.
- Lifecycle listener inspection includes the deferred game bundle. Disposal fixtures
  now hold one in-flight container (three embedded textures), with the other two
  containers queued. Late responses, late decodes, native listener cleanup, six-model
  remount and full GPU allocation equality remain required.
- The existing complete Validate and Publish workflow is unchanged. Publication
  remains dependent on its full production browser gate. No manual hosting copy
  or weakened GPU check is used.

Local logs, mobile screenshots, design comparison and final release disposition
are recorded under [evidence/011](evidence/011). Physical iPhone Safari performance,
thermal behavior and hardware safe-area acceptance require a physical device;
Chromium touch/viewport checks do not establish those results.
