# Goal 011R — final release recovery

Implementation retained: `d1d7ed59d27176119767a1dd15687f9345a883a7`;
starting branch HEAD: `c6ce684f802983a543fb59386bc03210c06c33ea`.
Failed release reviewed:
[40241993599](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40241993599).
The seven retained traces were downloaded from artifact `12618990636` and inspected
alongside the permanent Goal 011 CI log.

## Evidence and cause

This is not a demonstrated queue deadlock or solely full-suite accumulation:

- The unchanged affected group (the seven failures plus the 640×360 landscape
  counterpart) failed 8/8 locally with the locked Chromium, one worker and tracing.
- The deliberately failed Set shared-asset case also failed in isolation: only two
  rather than four other detailed models became visible within 15 seconds.
- CI's Kit-only trace had one outstanding GLB and Wilderness was still idle.
  Thus neither serializing multiple GLBs nor Wilderness initialization alone
  explains that failure.
- CI diagnostic reads blocked for 4–7 seconds. Screenshot operations took 10–20
  seconds, consuming the existing three-identity landscape cases' 60-second budget.
- In a controlled isolated roster experiment, ordinary rendering reached six
  mounted models in 9.684 and 10.145 seconds. With draws withheld as a diagnostic
  control, the same model work took 2.816 seconds. Simulation/animation updates
  and the same sequential containers remained in use. This control establishes
  rendering/import contention; it is not a GPU-readiness or phone-performance claim.
- Removing only automatic trace filmstrips did not solve it: 7/8 affected baseline
  cases still failed. Direct CDP capture and completed-frame/update-freeze probes
  also failed to provide a reliable capture speedup. None of those changes ships.

The direct inspection entry bypasses the public front-end's explicit render gate.
It was continuously drawing an idle battlefield while its serial imports were
pending. That extra rendering contends with decoding/uploads and delays browser
protocol work. During the protected countdown, rendering stalls also reduce update
frequency; the existing capped fixed-step clock then takes longer in wall time to
consume its unchanged three seconds. Capture cost remains a separate measured
problem after readiness: it must not be described as a proved asset-queue bug.

## Bounded correction

- Expose pending work from the existing container owners through the scene.
- In direct inspection/practice entry, yield idle GPU drawing while imports are
  pending. Updates, animation, input and simulation remain live; accepted actions,
  commits, aiming and movement can still render the supported fallback.
- In that same direct entry, retain the world frame during the protected countdown
  while HUD and updates continue. Restore ordinary rendering when active. No clock,
  match rules, elapsed-time clamp, damage, movement or AI code changes.
- The managed public menu/loading/gameplay path remains unchanged. Asset ordering,
  sharing, timeout/retry logic, disposal, Wilderness composition, shaders, quality,
  camera, character scale and animation files are unchanged.

No browser assertions, fixtures, dimensions, trace recording, timeouts, worker
counts, GPU equality checks or publication safeguards are changed. The new unit
case verifies that queued network/decode work is tracked and failure releases it.

## Focused verification

- 239 unit tests / 26 files passed; typecheck and lint passed.
- Affected cases ran together with tracing, unchanged detailed scenes and existing
  limits: **5/8 passed**. Environment comparison, Kit lifecycle, failed-Set fallback,
  844×390 mobile countdown/touch and 667×375 layout passed. The 844×390 safe 0/44 and
  640×360 safe 44 landscape captures still exceeded their existing 60-second cases
  on this two-core software renderer.
- All **14/14** front-end and application-lifecycle preservation checks passed,
  including the unchanged full GPU allocation equality assertion. The eight public
  front-end cases cover all three menu sizes, real readiness/retry, results/replay,
  practice, saved touch positions after rotation and the preparation deadline.
- The complete release gate ran **once** on the committed correction. Its final
  result and publication disposition are recorded below.

[Evidence directory](evidence/011r): baseline/group/isolated logs, CI trace analysis,
controlled renderer/capture probes, unit and affected-case logs. These are desktop
software-renderer observations, not physical iPhone performance results.

## Final release gate and publication

Tested source: `5227f2e02302b21e316cdbdf03f54c8737b509ea`.
[Release run 40269368420](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40269368420)
completed successfully:

- **239/239 unit tests** across 26 files.
- Typecheck, ESLint, Prettier, production build: passed.
- **127/127 browser tests passed in 33.0 minutes**, one worker, zero retries,
  unchanged assertions, timeouts, tracing and full resource/GPU validation.
- All seven original CI failures passed in that complete run, including the three
  landscape capture cases and the original model/fallback/countdown checks.
- The eight public front-end cases and six lifecycle cases also passed.

The existing workflow published the same validated artifact `12628928296`, without
rebuilding it. The artifact ZIP SHA256 is
`07ff48adc0d13102f0a6957aa10ee02e14dd14feb1e7d73c727487e983807d6e`.
The publication job's source/provenance/staleness checks all passed.
Published `gh-pages` commit: `2711b05e3232af5ea7dfdb5b533a7767c9c2b545`.
[Pages deployment 40272370689](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40272370689)
also completed successfully.

All **48 production files** in that published commit were independently hashed
against the validated artifact's `dist.sha256`. The live HTTP entry, JavaScript
and CSS were also checked against the same manifest. See
[publication-manifest.json](evidence/011r/publication-manifest.json).

[Live Crownfall](https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/playcanvas/)
opened at 844×390 with the official menu, zero GLB requests, zero game-module
requests and no simulation. Selection showed Riven without a GLB download;
confirmed entry reached real readiness with Riven's combat identity and all six
models visible. [Live menu capture](evidence/011r/live-menu.png).

An additional local live probe then exceeded a **15-second** countdown wait under
SwiftShader. That was a new probe using the legacy inspection limit; the existing
public-flow release test uses 30 seconds and passed unchanged. The probe stopped
there, so it supplies no live pause/return claim. Its failure is retained in
[live-probe.txt](evidence/011r/live-probe.txt) and
[live-publication.json](evidence/011r/live-publication.json), alongside the probe
source. No timeout was increased and no further runtime correction or release
rerun was made. This observation does not establish a physical-device failure.

**Remaining CI or publication blockers: none.** The exact tested build is live.
Goal 011's release gate is closed; no additional maintenance work was started.
