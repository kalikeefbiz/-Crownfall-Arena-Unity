# Crownfall Arena — PlayCanvas foundation

Task 001 implements the test arena and input/presentation foundation. Unity is a read-only reference; every added file is under this directory. No combat, abilities, bots, Wilderness, networking, or production art is included.

## Run locally

Requires Node **22.23.2+** (verified with Node 24.19.0).

From the repository root:

```sh
cd PlayCanvas
npm ci
npm run dev -- --host 0.0.0.0
```

Open **http://localhost:5173**. For a phone on the same network, open `http://<computer-LAN-IP>:5173` in landscape. The host firewall must allow that port. This static WebGL2 app can also be served over HTTPS from any static host after building `dist/`; relative asset paths support subdirectories. No service credentials are needed.

## Controls and behavior

- Desktop: WASD/arrows move in world X/Z. Hover sets continuous aim; hold either mouse button on the arena or Space to target. Release captures presentation facing for the reference 0.65-second confirmation interval.
- Mobile: drag the left pad to move; hold/drag Basic to target independently with another finger. Release Basic confirms facing; cancellation/blur/hidden page clears held input. Skill 1, Skill 2, and Ultimate are disabled reserved HUD positions.
- Aim owns facing during targeting/pre-cast. Movement owns it otherwise, except during the short confirmation lock. Idle preserves the last facing.
- Front faces the camera (+Z), Back faces away (−Z). Dominant X selects Right/Left; vertical wins ties. Left mirrors only the Right presentation subtree. The root, collision, and continuous aim never mirror.
- The gold line displays continuous aim during targeting/confirmation. Basic is a targeting control in Task 001, not a damaging attack.
- The camera follows at roughly 50° elevation with fixed heading and exponential smoothing. Movement does not depend on camera transforms.
- Diagnostics report movement, aim, facing/owner, lock, position, collision count, frame time/FPS, viewport, device pixel ratio, and all four safe-area insets.

## Layout

- `src/gameplay/`: engine-independent authoritative Kit movement, swept small-step circle/AABB collision, aim and confirmation state.
- `src/input/`: keyboard, mouse, and captured multi-pointer adapters producing intentions.
- `src/presentation/`: pure directional policy and replaceable primitive character/arena/camera rendering.
- `src/ui/`: HUD shell and diagnostics.
- `src/config/`: lane bounds, radius, speed and obstruction geometry shared with rendering.
- `tests/`: non-rendering policy/collision tests and production-browser smoke tests.

The primitive presenter differentiates Front (two eyes), Back (back stripe), and Right (profile eye/nose); Left reuses and mirrors Right. It is intentionally disposable geometry, ready for directional sprites or a true 3D character. Simulation imports no PlayCanvas APIs.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run fmt
npm run build
npx playwright install chromium
npm run test:browser
```

With system Chromium installed, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` instead of downloading a browser. Browser tests serve the production build on port 4173 and cover rendering/startup errors, keyboard movement, aim ownership while moving, commit lock, idle persistence, mirrored presentation, resizing, obstacle collision, and landscape multi-touch release/cancellation. Screenshots are written to ignored `test-results/`.

`npm run start -- --host 0.0.0.0` previews the latest production build at port 4173. WebGL2 is required; unsupported contexts show an explicit startup error. Actual iPhone Safari safe-area, GPU performance and physical touch feel still deserve device QA; Chromium mobile emulation is automated here.

## Scaffold and reference provenance

Created with official `create-playcanvas@0.10.1 --format engine --yes --no-skills` (Engine + TypeScript + Vite), then replaced the starter cube. The lockfile pins dependencies. Removed unused starter Inspector/assets.

Governing documents: [MIGRATION_CONTRACT.md](MIGRATION_CONTRACT.md), [CODEX_TASK_001.md](CODEX_TASK_001.md).
Read-only Unity references: `Assets/Crownfall/Gameplay/SummonerRoot.cs`, `SummonerTuning.cs`, `SummonerContracts.cs`, `TargetingSession.cs`, and `Assets/Crownfall/Presentation/MobaCamera.cs`. Speed 5, dominant-axis classification with vertical ties, follow sharpness 9 and 0.65-second confirmation feedback follow those references. The PlayCanvas camera uses +Z as camera-near to match its coordinate/view conventions.
