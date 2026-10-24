# Goal 007L — CI validation, release gates and safe publication

Date: 2026-10-24 UTC. Repository: `kalikeefbiz/-Crownfall-Arena-Unity`.
Source branch: `playcanvas-port`.
Verified starting revision: `c292b8566ca31323bb1d0cc99f82418ac5f28278`.
Implementation: `60c2907e29e11d105ecac3319c9edc8e6d1935f9`.
Scope: CF-015 in [the historical code health audit](CODE_HEALTH_AUDIT.md).

## Previous and new behavior

The old `build-and-publish` job had a workflow-wide write token, checked out the
moving `playcanvas-port` ref, and published after installation, unit tests,
typecheck and build. Browser, lint and formatting failures could not block that
publication. All `PlayCanvas/**` changes, including reports, triggered deployment.
There was no PlayCanvas PR-validation trigger.

The revised [workflow](../.github/workflows/publish-crownfall-playcanvas.yml)
separates `validate` from `publish` with `needs: validate`. Validation runs for
relevant source-branch pushes, PRs from any branch, and explicitly authorized
manual dispatches. Publication is eligible only for a successful source-branch
push or a manual dispatch on `playcanvas-port`. No PR can publish.

| Stage                  | Required behavior                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate`             | Read-only token; checkout immutable event SHA; clean install and all seven required checks; retain browser evidence; upload validated build only on success                                                            |
| `publish`              | Depends on successful validation; source-branch push/manual events only; write token limited to this job; download same run/attempt artifact; verify identity/checksums/freshness; publish artifact without rebuilding |
| Existing Pages service | Continue serving the root of `gh-pages`, including `/playcanvas/`; no Pages configuration change                                                                                                                       |

## Required validation and browser environment

The validation job executes, in order:

1. `npm ci`, using the existing committed `PlayCanvas/package-lock.json`.
2. `npm test`.
3. `npm run typecheck`.
4. `npm run lint`.
5. `npm run fmt`.
6. `npm run build`.
7. `npx playwright install --with-deps chromium`, then
   `npm run test:browser -- --workers=1 --retries=0 --forbid-only --global-timeout=3600000 --reporter=line,html --trace=retain-on-failure`.

Node 24 and `ubuntu-24.04` are selected explicitly. The lockfile resolves
`@playwright/test@1.64.1`; its supported Chromium build is installed together
with the Linux libraries. CI clears `CHROMIUM_PATH` so a developer's system
browser cannot override the supported installation. The existing Playwright
configuration uses Chromium with its original SwiftShader flags and serves the
already-built `dist` through `vite preview` on `127.0.0.1:4173`. `CI=true`
prevents reusing an unrelated existing server. Vite's relative `base: './'` and
output directory are unchanged.

The existing **complete discovered suite** is used: currently **108 tests in
16 files**, without a permanent count assertion. There are no filters, disabled
cases, automatic retries or fail-fast cutoff. `--forbid-only` also rejects focused
tests. The known Riven render-frame assertion and all its original expectations
are unchanged. Coverage includes normal 3v3 combat/completion; six animated
summoners; shared assets/rematches; Kit, Set and Riven controls; soft aim;
touch/cancellation; destroy/remount; Wilderness; carved lanes; results/restart.
[Discovered cases](evidence/007l/browser-discovery.txt).

One worker avoids parallel software-rendered test workers competing for CPU.
The browser global timeout is **60 minutes**, browser step timeout **65 minutes**,
and validation job timeout **90 minutes**, allowing installation and evidence
upload. The baseline full run took 25.7 minutes. Existing per-test timeouts are
retained, including the natural-play test's 15-minute allowance. Publication has
a 10-minute timeout. No paid/custom runner dependency is introduced.

Browser HTML reports, test-result attachments and retained failure traces upload
with `always()`, including when browser checks fail. They are retained for 14 days.
Cancellation/runner termination can prevent an upload from finishing; neither can
make publication eligible. There is no `continue-on-error` on required checks.

## Immutable build and release chain

Both jobs check out `${{ github.sha }}` with persisted Git credentials disabled.
PRs validate their event merge revision and never publish it. Push/manual releases
validate and publish their exact event revision.

After every check succeeds, validation records the SHA in `validated-sha.txt`
and SHA-256 hashes of all built files in `dist.sha256`. Artifact v4 stores the
build plus those records as
`validated-playcanvas-<SHA>-<run_attempt>`. The download is scoped to the current
workflow run and the same attempt; no branch-latest or cross-run artifact lookup
is used. A failed/cancelled validation never uploads an eligible release artifact.

Publication downloads that artifact, checks its SHA against the event SHA, verifies
all file hashes, checks `dist/index.html`, and queries the current source ref. A
mismatched source head fails closed. It runs no install/build commands. Thus the
published bytes are the bytes that passed the production-browser checks.

Source pushes, manual releases and reruns share the existing
`crownfall-playcanvas-preview` concurrency group with `cancel-in-progress: false`.
An active release finishes before another release starts; GitHub replaces older
pending runs with the newest pending run. The source-head guard rejects stale
queued/rerun revisions. Each PR has its own cancellable group, so PR work cannot
cancel a production release. A cancelled job cannot start publication because
`publish` retains the default success condition; it has no `always()` override.

The retained publishing action uses a normal, non-force Git push with
`force_orphan: false`. Concurrent changes to `gh-pages` therefore cannot be
silently force-overwritten by this workflow. Other existing Unity/recovery
publishing workflows and their configuration have not been changed.

## Documentation and existing Unity hosting

Push and PR path filters include `PlayCanvas/**` and `.github/workflows/**`, then
exclude `PlayCanvas/**/*.md` and `PlayCanvas/evidence/**`. Reports, audit/history,
non-runtime Markdown and historical binary/text evidence do not start automatic
validation or deployment. A mixed documentation/source commit still matches an
included runtime/test/config/dependency path. All workflow modifications trigger
validation. Manual dispatch has no path filter and always requires all gates.
These exclusions reflect the current project, which does not load Markdown or
historical evidence at runtime; introducing such runtime inputs requires updating
the filter too.

Publication retains `peaceiris/actions-gh-pages@v4`, `publish_branch: gh-pages`,
`destination_dir: playcanvas`, `keep_files: true`, `force_orphan: false` and
`enable_jekyll: false`. Only the validated artifact's `dist` is copied into the
existing `/playcanvas/` subtree. The Unity root, `Build/`, `_headers` and unrelated
published files are not cleaned or replaced. The existing legacy Pages source
remains `gh-pages:/`. Root preservation is checked against recorded Git tree IDs.

## Results and failure-case evidence

Implementation CI: [run 40049536927](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049536927).
Hosted negative probes used the unchanged release workflow on draft
[PR #1](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/pull/1):

- Unit failure: [40049708358](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049708358).
- Typecheck failure: [40049836411](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049836411).
- Lint failure: [40049917874](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049917874).
- Formatting failure with a mixed documentation/test-fixture diff: [40050150577](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40050150577).

All four hosted validations failed at their intended check and **skipped
publication**. The Markdown-only PR revision
`49dca68da991bc918f6122f07636c7eec6b58515` had zero workflow runs;
[query result](evidence/007l/docs-only-pr-runs.json) and
[complete PR diff at that revision](evidence/007l/docs-only-pr.diff).
The draft PR is closed without merge and its remote branch is deleted.

Manual [40049627178](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049627178)
queued behind the release and was explicitly cancelled, with no jobs/publication.
Manual [40049928442](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049928442)
was automatically cancelled when the newer pending manual
[40049930445](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049930445)
replaced it. The newest queued probe was then explicitly cancelled. The active
release validation continued throughout.

The real CI run completed all required validation commands. Installation, **224
unit tests**, typecheck, ESLint, Prettier and production build passed. The complete
browser suite discovered and executed **108 tests: 107 passed / 1 failed in
23.1 minutes**, with zero retries. The validation job failed and publication was
**skipped**. No validated-build artifact was created; only the failure-evidence
artifact was uploaded.

The failure is `tests/browser/ergonomics.spec.ts:127`, landscape HUD at 640×360
with a 44px safe inset. The unchanged assertion at line 223 reported
`#scoreboard / #team-status`, expected `true`, received `false`. This is an actual
layout-separation assertion, not the known Riven frame-sampling failure. Riven's
original case and the natural match/results/restart case both passed in CI.
No test, HUD code, font policy or expectation was changed to make the run green;
there was no rerun. Investigating/correcting the layout failure needs separate
authorization outside this deployment-only milestone.

[Complete CI log](evidence/007l/ci-log.txt),
[job/step conclusions](evidence/007l/ci-run.json),
[error context](evidence/007l/ci-browser-error-context.txt),
[last recorded frame](evidence/007l/ci-browser-last-frame.jpeg).
The [browser artifact](https://github.com/kalikeefbiz/-Crownfall-Arena-Unity/actions/runs/40049536927/artifacts/12543197281)
is 64,107,546 bytes and expires on 2026-11-07 UTC. It contains the HTML report,
screenshots and the original failure trace. Its downloaded archive's SHA-256 was
verified against GitHub metadata:
`3d184873a483b111357cdfbe097dc9e260eaa297be6b3a33558cd41c22ba48c2`.
[Artifact metadata](evidence/007l/ci-artifacts.json) /
[failure identity](evidence/007l/ci-browser-failure.json).
The CLI's signed storage redirect returned HTTP 403 in this workspace; the
connected GitHub artifact-download tool successfully retrieved the same artifact,
and its digest matched. This did not impede CI execution or bypass a release gate.

The independent local full suite completed **108 tests: 106 passed / 2 failed
in 36.2 minutes**, with zero retries. Both failures were the existing 844×390
HUD-layout cases, with safe inset 0 and 44 respectively, timing out at the
unchanged 60-second test limit while `page.screenshot` was pending. The local
workspace has a 2-CPU / 8-GiB cgroup limit. The CI failure was the separate
640×360 overlap assertion described above; its other 107 tests passed. No timing
cause is inferred from these differing observations.

The original Riven case passed on the first execution in **both** full runs.
All remaining local cases, including ordinary match completion, six actors,
asset sharing/rematches, touch, lifecycle, terrain and Wilderness, completed.
[Complete local browser log](evidence/007l/browser-full-local.txt) and
[local failure contexts/trace identities](evidence/007l/local-browser-failures.json).
Raw local traces and the HTML report remain in the generated `test-results/` and
`playwright-report/` directories of this workspace. The original downloaded CI
archive is also retained at `/workspace/007l-ci-browser-evidence.zip`. Committed
logs, contexts, frame and artifact/trace hashes preserve durable evidence without
adding the large trace archives to source control.

Local clean installation, **224 unit tests in 22 files** (38.02 seconds), typecheck,
ESLint, formatting and production build also completed. The unchanged Vite
large-chunk advisory remains. [Unit log](evidence/007l/unit.txt),
[typecheck](evidence/007l/typecheck.txt), [lint](evidence/007l/lint.txt),
[formatting](evidence/007l/format.txt), [build](evidence/007l/build.txt).

| Scenario                                | Expected release behavior                                               | Verification                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gameplay/source change, all checks pass | Validate exact SHA, then publish its artifact                           | Workflow-change run exercised all gates but failed a browser assertion; successful live handoff remains unexercised, with provenance guard positive case tested locally |
| Unit failure                            | Validation fails; publish skipped                                       | Hosted intentional-failure PR run; later checks and release artifact skipped                                                                                            |
| Typecheck failure                       | Validation fails; publish skipped                                       | Hosted temporary PR probe                                                                                                                                               |
| Lint/format failure                     | Validation fails; publish skipped                                       | Hosted temporary PR probes                                                                                                                                              |
| Browser failure                         | Validation fails; preserve report/trace; publish skipped                | Actual full CI browser failure skipped publication and retained evidence; isolated synthetic failure also returned nonzero                                              |
| Documentation only                      | No automatic validation/publication                                     | Actual docs-only temporary PR revision plus offline push/PR path cases                                                                                                  |
| PR from non-publication branch          | Validation only; never publication                                      | Draft PR #1, from `ci/007l-nonpublishing-probe`; skipped publish jobs                                                                                                   |
| Workflow configuration change           | Full validation; publication only after success                         | Implementation commit changed only the publishing workflow and started the real release run                                                                             |
| Interrupted/superseded release          | No unvalidated publication; serialized releases and stale-SHA rejection | Real queued manual cancellation/supersession plus local execution of the exact freshness guard                                                                          |
| Manual invocation                       | Same validation/artifact gates; publication only on `playcanvas-port`   | Actual authorized dispatches queued behind active release and were cancelled for the safety exercise                                                                    |

Intentional failures were confined to a separate local copy and a temporary draft
PR branch, never `playcanvas-port`. The original production workflow was used by
the hosted failure probes. The draft PR is closed without merge and its temporary
branch is removed after evidence capture. No gameplay/rendering/assets/lifecycle/
contract files are changed in the delivered source branch.
[Source/configuration parity](evidence/007l/scope-parity.json) records identical
Git objects for the complete source, test and asset trees, dependency/configuration
files, and other hosting workflows.

Local negative probes executed the actual unit, compiler, lint, formatting and
browser commands and returned nonzero as expected. The browser-only synthetic
probe explicitly selected one temporary failure test in an isolated copy using
port 4273; it is **not** presented as full-suite coverage. The real release suite
uses full discovery without that temporary test or selection.
[Negative results](evidence/007l/negative-probes.json),
[browser failure log](evidence/007l/negative-browser.txt).

The checked-in workflow's actual provenance shell was also executed in a
nonpublishing sandbox with a local-only stub for the source-ref query: matching
validated build accepted; wrong SHA, modified bytes and stale source rejected.
[Provenance results](evidence/007l/provenance-probes.json).
Offline structural/trigger assertions and `actionlint v1.7.12` passed.
[Workflow safety checks](evidence/007l/workflow-safety.json).
These offline checks supplement hosted execution; they do not emulate the entire
GitHub Actions scheduler.

## Publication result and limitations

**No publication occurred.** The automatic release was blocked by its browser
failure. The prior live PlayCanvas release remains served at publication revision
`cd43d91352f4906925f73600542c83ac2a8f3493`, and the publication
branch commit, complete root tree, Unity `Build/`, `_headers`, `.nojekyll` and root
`index.html` are unchanged.
[Before tree](evidence/007l/pages-tree-before.json),
[after tree](evidence/007l/pages-tree-after.json),
[before ref](evidence/007l/gh-pages-before.txt),
[after ref](evidence/007l/gh-pages-after.txt).

All ten files in the local rebuilt output have the same Git blob hashes as the
previously published files, including the entrypoint
`assets/index-BSBNewh8.js`. This corroborates unchanged application output; it is
**not** substituted for CI validation.
[Output comparison](evidence/007l/local-build-vs-previous-publication.json).

The positive build-artifact download/publication path is validated structurally
and the exact provenance guard has positive/negative sandbox coverage. Its
successful hosted artifact transfer and live publication have **not** been
exercised because the required browser check failed. An authorized future
revision must pass the complete gates before that path can run. No deployment
settings/permissions blocked validation; the remaining release blocker is the
reported browser assertion.

Manual release remains available to an authorized GitHub actor:

```sh
gh workflow run publish-crownfall-playcanvas.yml \
  --repo kalikeefbiz/-Crownfall-Arena-Unity --ref playcanvas-port
```

This executes the same complete checks; it does not bypass the observed failure.
Git ref updates are atomic. Cancellation cannot undo a validated Git push that
has already completed; cancellation before/during validation prevents the
publication job from becoming eligible.

Live HTTP checks also confirmed that the PlayCanvas index and entry bundle match
the rebuilt bytes and that the Unity root index matches its original Git blob.
[Live checks](evidence/007l/live-checks.json). Committed text logs trim trailing
whitespace only; raw CI artifact bytes and traces are retained unchanged.

The historical Riven timing assumption remains outside this infrastructure goal;
any failure must block release until a separately authorized correction or later
validated revision. There is no automatic retry or test weakening. Artifact
retention is 14 days; committed text evidence preserves the reported results.
Administrative/manual pushes to `gh-pages` and future modifications to other
publishing workflows remain outside this workflow's enforcement. No branch
protection or account-wide Actions settings were altered.

Artifact names also include `run_attempt`. A new dispatch or a full workflow
rerun validates and uploads its own artifact. Rerunning only a failed publication
job from a later attempt cannot fall back to an earlier attempt's build; it fails
closed if that attempt has no artifact. Use a full workflow rerun or a fresh
manual dispatch to validate and release again.

The freshness guard is intentionally conservative: a documentation-only source
commit arriving while an older release is validating makes that older SHA stale.
It will refuse publication even if runtime files match; an authorized manual run
on the current revision can validate and release it. Documentation alone still
does not trigger an automatic rebuild.
