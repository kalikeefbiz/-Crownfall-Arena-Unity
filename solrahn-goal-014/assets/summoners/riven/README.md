# Riven animated GLB

`Riven_Animated.glb` is the unchanged binary supplied in the repository-root
`Riven_Animated_GLB.zip` (the task referred to `PlayCanvas/Riven_Animated_GLB.zip`).
ZIP CRC validation and byte-for-byte comparison passed before removing the staging ZIP.

- Size: **11,170,312 bytes**.
- SHA-256: `ba2cb5d72eb2bcfe272c59a50b06a594100a5ac3ceac8f6af457c243c6a5de61`.
- One mesh/material/skin; **68 joints**, **18,349 exported vertices**, **14,200 triangles**.
- Embedded JPEG base color, normal, and metallic/roughness maps: **2048×2048 each**.
- Each of the four clips targets all 68 joints with linear position/rotation curves.

| Clip       | Duration (seconds) | Runtime use                                            |
| ---------- | -----------------: | ------------------------------------------------------ |
| Idle_6     |           7.366667 | Idle loop                                              |
| Walking    |           1.033333 | Available loop; no separate gameplay walk speed exists |
| Running    |           0.633333 | Selected locomotion loop                               |
| run_fast_7 |           0.866667 | Preferred candidate; rejected by loop validation       |

Runtime copies pin only the hip X/Z channels to the authored bind reference.
Vertical gait, other joint curves, textures and source GLB bytes remain intact.
After this correction, `run_fast_7` still jumps **12.87324°** at a joint and
**0.01896846 m** in local translation at its seam; independently skinned vertices
jump up to **0.156444 m** at the normalized scale. `Running` closes within about
**0.000001 m** at the mesh. Only the selected running state is registered.

The model is a developer presentation preview, enabled by `?rivenPreview=1`
when Riven is selected. See [preview instructions](../../../../README.md)
and [Goal 007C verification](../../../../TASK_007C_VERIFICATION.md).
