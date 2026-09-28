# M0 delivery and acceptance

## iPhone / GitHub Actions installation

Direct GitHub writing was previously rejected. No new authentication/write attempts
were made. Delivery is `Crownfall-Unity-M0.zip`, a repository-root source archive,
and the separately downloadable `unpack-unity.yml` for the current import action.

1. Save `Crownfall-Unity-M0.zip` to Files on the iPhone. Keep its name unchanged.
2. In `kalikeefbiz/-Crownfall-Arena-Unity` on GitHub, branch `main`, upload that ZIP
   at the repository root and commit it. Do not unzip/upload each asset individually.
3. Edit `.github/workflows/unpack-unity.yml` on GitHub and replace its entire contents
   with the supplied `unpack-unity.yml`. Commit to `main`. The old action only fixes
   the manifest and cannot import M0.
4. Actions > **Import Crownfall M0 ZIP** > Run workflow > `main`.
5. The action checks that Assets/Packages/ProjectSettings still match the inspected
   baseline, extracts the source, runs static validation, and commits to main. It
   intentionally does not overwrite workflows from inside the ZIP. The baseline
   guard stops if newer Unity source was added after this delivery was prepared.
6. Run the existing Unity Cloud build for the resulting imported commit and open
   the hosted Web build on iPhone as before. If automatic builds trigger on commits,
   use the final source-import commit rather than the earlier ZIP-upload commit.

The ZIP contains complete repository-ready sources, no Library/Temp/Logs/Obj/Builds,
credentials, certificates or signing material. It also includes the workflow for
normal source-control delivery, but workflow installation in step 3 is necessary
because an uninstalled importer cannot import itself.

This workflow was statically parsed and its extraction step exercised locally.
It was not dispatched on GitHub. A successful action will provide the actual
GitHub commit hash; the local source checkpoint is not a successful push.

## Required Unity Cloud validation

- Unity 6000.3.10f1 imports all nine sprites and both configuration assets.
- Scripts compile and the M0Validation pre-build gate passes, including its actual
  TargetingSession behavioral checks.
- Kit sprite shader/materials compile and survive stripping; runtime-created
  primitives appear, with no missing-script/reference/null exceptions.
- Only M0 is built, and the runtime opens the battlefield instead of the cube test.
- The existing Web loader, compression and hosting setup still loads this build.

## Required device acceptance

1. Move in X/Z with the left pad, in both landscape orientations. Verify safe-area
   placement, camera follow, readable test controls and diagonal speed.
2. Collide with every boundary and test obstacle. Push against a wall: animation
   should return to idle when there is no meaningful displacement. Slide along
   corners; verify no penetration/fall-through or unexplained vertical movement.
3. Move with one finger while aiming with another, including aiming opposite to
   movement. Movement must not overwrite aim or facing.
4. Quick-tap each targeting pad: counter increases once. Hold without releasing:
   counter does not increase. Drag: preview changes; release confirms once.
5. Test radial distance clamp, directional length, cancellation by drag into CANCEL
   and a separate cancel finger. Cancelled gestures must never confirm on release.
6. Interrupt a held gesture by backgrounding, focus loss and rotating the device;
   verify movement stops and no delayed confirmation occurs on return.
7. Observe idle and eight run frames at 12 FPS, including frame 8 back to 1; verify
   correct image order, orientation, foot contact, unchanged apparent body scale,
   transparency, texture clarity and scenery occlusion. No appearance is validated yet.
8. Aim left/right while moving and stationary: only the sprite mirrors; collision,
   root position and movement controls remain unchanged.
9. Swap between sprite and primitive while moving and during active targeting.
   Verify position/collision/aim/selection persist and only one view is visible.
10. Inspect loading time, memory and frame pacing on the iPhone. Texture settings
    deliberately prioritize source quality at this stage; revise after profiling.

Native iOS runtime, signing, performance and orientation remain untested; M0 adds
no browser-specific gameplay code. Do not expand beyond M0 until acceptance.
