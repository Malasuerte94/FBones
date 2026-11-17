# Beta2 scoped retry — release operations/evidence gate

Coordinator-provided current state: immutable source
`44fa099220c753f593220e0d4d74757de91554e7` / `v0.10.0-beta.2` has green
Linux, Windows and Ubuntu UI/native-SDK release jobs. macOS job134136759209
was cancelled before runner/steps, with hosted ARM capacity annotations. Main's
four jobs are green. These are supplied hosted observations, not new native
platform interactions by this reviewer. The connector's rerun403 is an Actions
write-capability limit; it does not invalidate existing green product checks.

Direct workflow review: `.github/workflows/desktop.yml` keeps platform jobs
independent with `fail-fast:false`; publication depends on the desktop matrix
and Ubuntu UI job. Tagged builds produce signed updater packages. Publication
then verifies source, installers, runtime and installed version before creating
the release. Do not bypass these existing dependencies or collect packages from
a different source/run to manufacture a completed release.

GitHub documents that a targeted rerun also schedules dependent jobs, while
retaining outputs from jobs outside the rerun; the original event ref/SHA are
retained. Therefore one cancelled macOS job plus dependent publication is the
appropriate scope, preserving accepted Linux/Windows/UI cases.
[Official rerun behavior](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

## Preimplementation review of the proposed temporary route

An own temporary `ops/retry-mcp-beta2` branch/workflow can supply a short-lived
job token with explicit `actions:write` and `contents:read`, then request only
the pinned macOS job rerun. Keep this operations workflow off main and outside
the immutable release snapshot. This requires no UI, native model, persistence,
reference, signing-key, global Git setting or repository-global permission
change. The user's existing commit/push/release authorization covers the stated
operation; no new product approval flow is implied by this review.

Before any write, validate repository, exact release tag target/source SHA,
workflow path/run ID/event/ref, completed cancelled macOS job ID/name/labels,
empty runner/steps and successful sibling job identities/conclusions. Refuse
unknown or changed states, an active retry, existing publication or a moved tag.
Do not accept arbitrary user-supplied job/ref inputs, request a full rerun or
expose the token in output/artifacts. Do not broaden credentials after a403 by
changing global settings; record a denied route as such.

Reviewable tests should exercise these preflight decisions using sanitized
metadata: matching state permits the one exact request; changed SHA/tag/job,
noncancelled status, active rerun or failed sibling rejects without API write.
Use a concurrency guard/idempotent current-state check so duplicate ops triggers
cannot schedule multiple retries. HTTP acceptance proves scheduling only;
observe the actual new job attempt and dependent release, then inspect uploaded
asset hashes/signatures/version metadata before declaring publication complete.

Preserve old cancellation/403 receipts and the successful sibling evidence.
After a terminal result, delete only the own temporary branch/trigger and
disposable checkout/workflow scratch, retaining a concise sanitized operation
receipt. Do not delete workflow history, accepted artifacts, immutable tags,
release assets, native test evidence or a still-running operation's files.
Cleanup must not cancel or relabel the macOS attempt or its dependent publish.
No implementation or hosted mutation was performed by this audit.

## Concrete helper review before push

Reviewed the private `retry-mcp-beta2.yml` and `retry.py`: the workflow limits
its trigger to the exact operations branch and workflow path; its job additionally
pins repository, owner actor and branch. It requests only contents-read /
Actions-write, uses one fixed concurrency group and performs one exact macOS-job
POST after validating release-run attempt1, cancelled unassigned job, green
siblings and skipped dependent publication. Python syntax parses and the embedded
workflow code exactly matches the reviewed helper. Output does not print tokens,
headers, private source paths or API response bodies. The parent reports actual
metadata and five negative preflight checks passed; this review did not rerun
the API operation or substitute a new status for those checks.

Two remaining preflight checks were sent to the coordinator before push: resolve
the **current** tag ref (peeling an annotated tag if needed) to the pinned source
SHA, rather than relying only on historical run metadata; and establish that no
release object already exists for the tag, treating only404 as absent. A skipped
publish job alone does not exclude a later manually created release. Preserve
these refusal checks in the concrete helper tests before the one write. Remove
the own temporary branch and Python cache only after the operation reaches its
recorded terminal result; never rewrite main/tag or erase accepted job history.
