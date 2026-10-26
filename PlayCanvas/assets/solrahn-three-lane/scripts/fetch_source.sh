#!/usr/bin/env bash
set -euo pipefail
asset_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
filename=export_Meshy_AI_2026-10-26_4debfa.blend
expected=626f546561dc2b364e0ba960eb0ae5979492fecb5667a934902ea4dce6082d7f
mkdir -p "$asset_root/source"
if [[ ! -f "$asset_root/source/$filename" ]]; then
  curl -fL --retry 3 -o "$asset_root/source/$filename.part" "https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/releases/download/solrahn-three-lane-source-v1/$filename"
  printf '%s  %s\n' "$expected" "$asset_root/source/$filename.part" | sha256sum -c -
  test "$(stat -c %s "$asset_root/source/$filename.part")" = 506928885
  mv "$asset_root/source/$filename.part" "$asset_root/source/$filename"
fi
printf '%s  %s\n' "$expected" "$asset_root/source/$filename" | sha256sum -c -
test "$(stat -c %s "$asset_root/source/$filename")" = 506928885
chmod a-w "$asset_root/source/$filename"
