# MCP beta2 macOS retry — DATA operations gate

2026-11-17. User-authorized release automation; no product implementation,
original observation, global agent change or persistent credential setup.

Directly checked: the dedicated release checkout HEAD is
`44fa099220c753f593220e0d4d74757de91554e7`. Retained job API receipts show tag run
44111143281 has successful Linux134136758697, Windows134136759213 and
UI/native-client134136764097 jobs. macOS134136759209 is completed/cancelled,
runner_id0, zero steps; dependent publication134148013166 is skipped. The
coordinator's annotation receipt identifies unavailable hosted arm64 capacity,
not a tested product failure. Main44111143311 independently has all four checks
green at the same SHA. A fresh public run read confirms tag head/ref, push event,
`.github/workflows/desktop.yml`, attempt1 and completed/failure. Successful main
macOS does not replace the required tag signed-package build.

The connector rerun403 is retained as an integration permission limit. It is not
proof the user lacks repository authorization; the user-authorized owner SSH
transport already published the release refs. A repo-owned scoped helper can use
the normal ephemeral Actions token with Actions write without extracting or
reconfiguring persistent secrets.

Official [rerun job API](https://docs.github.com/en/rest/actions/workflow-runs#re-run-a-job-from-a-workflow-run)
documents Actions write, success201 and rerunning the selected job **and its
dependent jobs**. Therefore a successful Mac retry can unlock the existing tag
publication job. This is the already authorized release path, not a claim that
publication has occurred. Other accepted check jobs should be reused.

## Required helper invariants before execution

- Temporary dedicated `ops/retry-mcp-beta2` branch; push-only exact branch trigger
  and runtime repository/ref/event checks. Do not add the helper to the immutable
  tag, main source archive or product manifests. A new workflow_dispatch-only
  workflow may not be dispatchable until present on the default branch; use the
  scoped push event without modifying main just to register an ops helper.
- Job permissions only `actions: write` and `contents: read`; no content write,
  secret reads, tag creation, artifact replacement or credential extraction.
  Prefer inline standard-library REST without checkout/third-party actions.
- Immediately revalidate exact full source SHA above, tag v0.10.0-beta.2 resolving
  to it, run44111143281, workflow path/event/ref, completed/failure, attempt1 and
  target job134136759209 Mac name/cancelled/runner0/empty steps. Revalidate all
  other check jobs success and publication skipped. Stop on any mismatch.
- Perform one POST only to that job's rerun endpoint with debug logging disabled.
  Keep the token solely in step environment, never response/log artifacts.
  Require201; print only pinned IDs/status and an acknowledgement. No blind
  mutation retry after ambiguous response; inspect original run state first.
- Attempt1 check prevents replay after a successful rerun advances the original
  run. Concurrency limits can additionally serialize helper invocations. API
  acceptance is not build/publication completion: coordinator must inspect the
  new original-run attempt, same immutable source, signed assets and publication.

This operations gate authorizes the narrow reusable-check route on existing
session authorization. It does not relax acceptance, substitute main artifacts
for tag artifacts or justify modifying the release tag/contents.

Concrete helper pre-push review: the prepared inline-Python workflow has the
exact branch/repository/owner guards, non-cancelling concurrency, minimal token
permissions, no checkout/actions/dependencies and one pinned POST. The first
review found a missing independent live-tag check: historical run.head_branch
alone does not prove the current tag still resolves to the pinned commit.
Require a fresh git-ref read and bounded annotated-tag resolution to the full
SHA before posting. Also send an explicit JSON content type/debug=false body.
The coordinator owns those ops-only edits, validation and push; no API mutation
was performed by this DATA review.

Final concrete helper review after fixes: current-tag resolution is bounded to
four validated40-hex objects and requires the pinned commit; release existence
must return404, while other failures stop; POST explicitly uses JSON and disables
debug logging. Target/sibling run-attempt checks remain, as do the exact repo/
owner/ops-branch trigger, concurrency and single mutation endpoint. No new
critical source concern remains. Coordinator-reported actual metadata/tag/
release checks and negative fixtures pass; the DATA reviewer performed no POST.
The authorized next step is the ops-only push, followed by observing the original
run's new attempt and actual release assets; acknowledgement alone is not success.
