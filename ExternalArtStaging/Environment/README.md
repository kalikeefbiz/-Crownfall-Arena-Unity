# Crownfall external environment staging

Research/acquisition only. These files are outside Unity `Assets/` and are not imported or referenced by shipping scenes.

- [Inventory and 38-model shortlist](../../Docs/EXTERNAL_ENVIRONMENT_ASSET_INVENTORY.md)
- [Machine-readable inventory, original file hashes and provenance](../../Docs/EXTERNAL_ENVIRONMENT_ASSET_MANIFEST.json)
- [Validation evidence](Inspection/validation-report.json)

`Quaternius/Nature`, `Quaternius/Medieval`, `Kenney/Nature`, and `Kenney/Castle` contain selected original FBX/glTF/GLB files, required canonical glTF dependencies, supporting texture originals, and original CC0 licenses under `Original/`. Archive paths are preserved beneath that directory. `Provenance/` records official public sources and archive hashes. No raw ZIP archives are committed.

`Quaternius/Ruins` contains provenance and failure evidence only: the public Google Drive download quota prevented acquisition. There are no Ruins models here.

`Inspection/` contains read-only measurement/rendering scripts and generated previews; it does not contain source replacements. The previews are Blender studio inspections, not Crownfall screenshots. Do not interpret per-image framing as relative model scale.

Future integration should select original FBX exports for Unity's native model importer, deliberately map shared Built-in materials, and verify scale. Original FBX files retain creator texture paths; remapping will be necessary. The canonical glTF exports make inspection reproducible without adding Unity packages. No importer, custom shader, URP project, gameplay change, collider, LOD or impostor was added.
