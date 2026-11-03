# Set: panther run proof (2026-11-02)

Founder ask: Set (humanoid panther) should run like a panther, not with the supplied upright human clip.

- `src/presentation/set-panther-run.ts` builds a four-legged half-bound in code on Set's own 87-joint skeleton (no new
  asset, no download). Baked once at model load: each of 34 samples is posed with two-bone IK in bind space and the
  bones' local rotations become an ordinary `AnimTrack` (`PantherRun`, 0.34 s per stride). Runtime cost = any clip.
- The pose: body dropped (hips 0.5 bind units), spine near level, arms as forelegs (elbows back, paws flat, tucked in
  swing), hind legs in a deep digitigrade crouch, spine flexing/stretching per bound, head kept level, tail rising in an
  S and counter-swinging, sash strips hanging with gravity. Footfalls: hind pair then fore pair, duty 0.38; paw travel
  in stance matches the 6 m/s run so planted paws do not skate.
- `PantherRun` replaces `Running` for Set's movement. `?setRun=human` restores the supplied clip for comparison.
  Ready (standing guard) is unchanged; the blend between them is 0.2 s (was 0.12).
- Review frames: `evidence/summoners/set-panther-run-sheet.png` (side and three-quarter, six points of the stride),
  made with `scripts/summoners/set-run-capture.mjs` (headless; judge pose, not lighting).
- Suite: 263/264, the one failure is the known unrelated `solrahn-surface` weights re-encode issue.
- Known limits of the proof: standing up into the upright guard is a quick blend (no dedicated stop/start), and the
  run does not yet speed up or slow down with the wilderness speed passive.
