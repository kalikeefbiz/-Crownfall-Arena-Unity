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
- The complete release gate is executed once on the committed correction. Its
  result and publication disposition will be recorded below; local partial success
  is not release approval.

[Evidence directory](evidence/011r): baseline/group/isolated logs, CI trace analysis,
controlled renderer/capture probes, unit and affected-case logs. These are desktop
software-renderer observations, not physical iPhone performance results.
