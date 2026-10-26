# Reproduce Goal 013 preparation

Use Blender **4.5.15 LTS**, Python with NumPy/SciPy/Pillow, Node.js, and `gltf-validator@2.0.0-dev.3.10`. All Blender loads must disable embedded automatic execution. The scripts here are trusted task scripts; source scene text and metadata are data only.

From `PlayCanvas/assets/solrahn-three-lane`, set `BLENDER_BIN` to your Blender executable. Keep all generated binaries in the ignored directories. The original is never saved by any preparation script.

```bash
scripts/fetch_source.sh
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/audit.py -- manifests/source-audit.json
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/shading_probe.py -- manifests/source-shading.json
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/topology_probe.py -- working/source-topology
python scripts/analyze_topology.py .
python scripts/surface_audit.py .
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/optimize.py -- 0.12 working/solrahn-candidate-12pct.blend
"$BLENDER_BIN" -b -t 3 --disable-autoexec working/solrahn-candidate-12pct.blend --python scripts/prepare_runtime.py
"$BLENDER_BIN" -b -t 3 --disable-autoexec working/solrahn-three-lane-optimized.blend --python scripts/audit.py -- manifests/optimized-audit.json
python scripts/repair_tangents.py runtime/solrahn-three-lane-visual.glb manifests/tangent-repair.json
python scripts/glb_stats.py runtime/solrahn-three-lane-visual.glb manifests/glb-visual.json
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/collision_candidates.py
"$BLENDER_BIN" -b -t 3 --disable-autoexec working/solrahn-lane-collision-candidates.blend --python scripts/collision_review.py
"$BLENDER_BIN" -b -t 3 --disable-autoexec --python scripts/reimport_check.py -- solrahn-three-lane-visual.glb
"$BLENDER_BIN" -b -t 3 --disable-autoexec --python scripts/reimport_check.py -- solrahn-lane-collision-candidates.glb
"$BLENDER_BIN" -b -t 3 --disable-autoexec working/solrahn-three-lane-optimized.blend --python scripts/geometry_compare.py
"$BLENDER_BIN" -b -t 3 --disable-autoexec source/export_Meshy_AI_2026-10-26_4debfa.blend --python scripts/render_views.py -- previews/source manifests/comparison-cameras.json
"$BLENDER_BIN" -b -t 3 --disable-autoexec working/solrahn-three-lane-optimized.blend --python scripts/render_views.py -- previews/optimized manifests/comparison-cameras.json
python scripts/compare_images.py --require-all
```

Install the validator outside the game repository, then set `NODE_PATH` to that install's `node_modules`:

```bash
npm install --prefix /tmp/solrahn-validator gltf-validator@2.0.0-dev.3.10
NODE_PATH=/tmp/solrahn-validator/node_modules node scripts/validate_glb.cjs runtime/solrahn-three-lane-visual.glb manifests/validator-visual.json
NODE_PATH=/tmp/solrahn-validator/node_modules node scripts/validate_glb.cjs runtime/solrahn-lane-collision-candidates.glb manifests/validator-collision.json
```

The original needs about 1.5–3.3 GiB for inventory/rendering; weighted collapse peaked around 6 GiB RSS in this 8 GiB container. Run heavy steps sequentially on similar machines. Sampling and rendering use CPU and built-in Blender features. Do not enable remeshing, weld the continuous surface, add semantic cuts, or silently substitute textures.

`geometry_compare.py` uses 50,000 seeded triangle-centroid probes per direction. The view comparison combines geometry, texture downsampling, and Cycles sampling/denoising changes. Neither comparison certifies every hidden surface or hardware frame rate. The chosen 12% face ratio is a preparation candidate, not a proven optimal mobile budget.

The intended storage is a new preparation-only release. In this session the upload endpoint returned HTTP 401; binaries remain in the workspace, with transfer instructions in `TRANSFER.md`. Do not overwrite the founder's source release, commit `.blend`/GLB files, run deployment workflows, or integrate the exports as part of reproduction. If pushing documentation to `playcanvas-port`, use `[skip ci]` so the existing push-triggered publish workflow does not deploy.
