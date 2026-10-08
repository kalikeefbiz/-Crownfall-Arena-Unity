# Crownfall production art — upload staging

**Status: PLACEHOLDERS ONLY. No production PNG/JPEG bytes have been uploaded here.**

Target repo: `kalikeefbiz/-Crownfall-Arena-Unity`, branch `browser-parity-unity`. This directory is outside `Assets/` so unfinished uploads do not affect Unity imports.

## Upload from the eight ZIPs

1. On GitHub, switch to the **browser-parity-unity** branch (not `main`).
2. Open the matching subfolder under `ProductionArtStaging/Crownfall/` and select **Add file → Upload files**. Choose extracted **individual image files** from the ZIP, not the ZIP archive.
3. Retain original image file names **including capitalization and double extensions**. Do not change image bytes, resize, recompress, or remove transparency.
4. Refer to `TRANSFER_MAP.json` for the exact `source_path` → `target_path` of every image. Upload only the 53 entries in `files`; the other 21 source records are already present, byte-identical duplicates, or deliberately excluded.
5. Commit the uploads to the branch. Once uploaded, tell Codex to consume the art from `ProductionArtStaging/Crownfall`, verify sizes/checksums, then integrate it into existing Unity presentation architecture. Do not use Codex chat ZIP attachments.

**First implementation pass:** Kit and Set. **Later pass:** Riven, Environment and UI. Uploading all assets now does not authorize Codex to integrate Pass 2 assets early.

## Source ZIP → target folders

- `Crownfall-Art-01-Kit-Animation.zip` → `Kit/Idle`, `Kit/Run`
- `Crownfall-Art-02-Kit-VFX.zip` → `Kit/Abilities`
- `Crownfall-Art-03-Set-Basic-Panther.zip` → `Set/Basic`, `Set/PanthersFist`
- `Crownfall-Art-04-Set-WarCry-Run.zip` → `Set/WarCry`, `Set/Run`
- `Crownfall-Art-05-Riven-Run.zip` → `Riven/Run`
- `Crownfall-Art-06-Riven-Ability-Idle.zip` → `Riven/Idle`, `Riven/Scream`, `Riven/Scythes`
- `Crownfall-Art-07-Environment.zip` → `Environment`
- `Crownfall-Art-08-UI.zip` → `UI`

## Preservation and verification

This upload mapping came from `Crownfall-Asset-Transfer-Manifest.json` and preserves exact image names, original SHA-256 and Git blob SHA-1 for verification. **Never substitute .gitkeep markers or image previews for actual artwork.** Empty folders are deliberately tracked by .gitkeep files and should remain until art is committed; markers are not production files.

The frozen `Crownfall-Browser-V21-Reference` repository has not been modified. All Unity implementation belongs in the Unity repo.
