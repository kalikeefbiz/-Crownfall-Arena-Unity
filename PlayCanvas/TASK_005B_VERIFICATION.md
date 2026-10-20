# Task 005B — natural total control

The unconditional two-team endpoint inset made exact control 0/1 unreachable
while a defender remained alive in lane. The inset now applies only to crossed
formations (`b > r`). Normal ordered formations retain the midpoint and ordinary
endpoint clamp; no spawn special case, CP or grace requirement is involved.

Four unit cases cover exact/past-goal ordered formations for Blue and Red.
Crossed cases preserve the prior-front clamp and strict interior endpoints.
Production browser checks reproduce both living, lane-eligible formations,
0 CP, immediate result and the actual goal-line frontier. A separate crossed
browser check proves no result. All three new browser checks passed.

Phase A unit baseline: 140 passed (12 files). Typecheck/lint/build passed.
The supplied Goal/005B/006 Markdown needed formatting normalization.
Locked camera, smoothing and controls are unchanged.
