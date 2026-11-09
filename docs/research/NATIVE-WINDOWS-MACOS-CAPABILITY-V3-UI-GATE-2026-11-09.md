# Native Windows/macOS v3: diagnosed readiness observations

Paired UI finding before tooling changes. Read-only review of the retained
run42645345499 and v2 sources; no application/process operation by this worker.
The [native acceptance gate](NATIVE-INSTALL-UPGRADE-UI-GATE-2026-11-09.md)
still owns the unchanged stock installation/provider/normal-close requirements.
Keep consumed v1/v2 sources and raw failures immutable.

Windows directly reports NSIS exit0, registry0.9.5 and the independently pinned
bundled executable hashaa57d9bc. It then fails the aggregate visible-window
identity assertion; identity-checked cleanup observes normal app exit0. The
loop currently stops at any nonzero MainWindowHandle before checking visibility,
owner PID, start and image. That is a concrete readiness-gate gap, not proof
that visibility timing caused this run's failure. A fresh v3 may poll the
complete existing identity/visibility predicate within the same bound and log
the actual component tuple/errors, including retained process liveness. Keep
all conjuncts; do not merely wait longer, drop visibility or assume a race.

macOS directly reports real Aqua, AX permission and stock0.9.5 bundle/native
hash6824b30a, then stops at owned native launch Code5. There is no observed
frontend, normal close, early-exit status or candidate bundleURL/start tuple.
The fresh diagnostic should retain the same Process launch and record bounded
own stdout/stderr plus Process PID/liveness/exit reason/status, actual
NSRunningApplication bundleURL/launchDate and visible-window candidates. Report
which binding failed before any UI action. Aqua/AX presence alone is not native
frontend capability. No LaunchServices alternative, security/TCC/Gatekeeper
change, automatic fallback or success relabeling is authorized by this finding.

These are new discriminating readiness diagnostics after material observations,
not unchanged retries. Both routes remain capability-only: no project mutation
or installed upgrade. Normal cleanup stays confined to verified created apps;
failure or ephemeral-job teardown is not normal-close proof. Bounded retained
log prefixes must not be described as hard disk/write quotas.
