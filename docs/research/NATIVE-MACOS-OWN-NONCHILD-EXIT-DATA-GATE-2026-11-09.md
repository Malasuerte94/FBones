# macOS own nonchild exit-status capability: DATA gate

The identified missing capability is actual normal-exit status for a known own
same-user process that is not a direct child. This is a capability toy, not an
app upgrade or LaunchServices successor observation.

Pinned static feasibility189b46c6 records both published Cargo.lock files using
Tauri2.12.5. Cached process.rs4bd9af75 is byte-identical to the verified crate
5fb02443 member. Its packaged macOS restart first uses `/usr/bin/open -n` on the
bundle, with a source comment intending a launchd-owned successor; only failure
uses a direct executable fallback. Actual updater branch and successor identity
have not been observed. Linux subreaper and direct-child wait tests do not close
this macOS gap; NOTE_TRACK on the old process cannot be presumed to track a
LaunchServices-owned app.

Primary documentation inspected by root is Apple's XNU
[sys/event.h](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/event.h)
and archived kqueue(2). The header documents NOTE_EXITSTATUS for a child or a
process the caller is permitted to signal; documented registration visibility
alone does not prove status encoding/permissions on the hosted platform. Do not
send a signal to test permission. Actual SDK declarations/constants/layouts must
be used, not handwritten Darwin offsets or Linux substitutes.

One fresh own controller launches one own launcher, which starts one fixed own
worker. All executables/source hashes, current UID, worker PID/start time/image
and its original parent are recorded through bounded own files. The worker
waits for one own file ACK before its ordinary `_exit(7)`. The launcher exits
normally0; controller requires actual waitpid status0 for that launcher, then
proves the live worker is not its child (waitpid with WNOHANG yields -1/ECHILD)
and still matches the recorded PID/start/image/UID. A zero return from waitpid
is not the required nonchild proof. No arbitrary PID selector is accepted.

Create an actual SDK-typed kqueue and register only that verified worker with
EVFILT_PROC, NOTE_EXIT|NOTE_EXITSTATUS before ACK. Retain raw registration return,
errno/receipt flags/data. Only successful registration permits the once-only ACK;
recheck worker identity/UID/liveness immediately before it. Wait boundedly for
that PID's event and retain every raw ident/filter/flags/fflags/data value. Require
exact PID, EVFILT_PROC, NOTE_EXIT, no EV_ERROR and actual SDK WIFEXITED/WEXITSTATUS
interpreting data as ordinary exit7. Do not accept process absence, an inferred
status, signal death or whichever interpretation produces7. Input/output widths
and conversions must be explicit and reject overflow.

Use fresh owned directories and fixed own worker paths/arguments, NUL/direct-file
stdio, <=64KiB retained diagnostics and bounded registration/event/worker ACK
waits. Worker timeout exits normally with a distinct failure code; controller
records pending/unknown terminals without force. No signals, killing, attaching,
NOTE_TRACK, global process scans/settings, GUI, product install/launch, auth or
network calls. Free only locally owned descriptors; do not reap unknown processes.
Retain useful negative receipts and stop this route on a negative capability.

Success proves only that this exact known nonchild's normal exit7 is observable
on the actual platform/SDK. It does not prove discovering an automatic updater
successor, NSWorkspace identity, bundle ownership, LaunchServices behavior or a
native app's exit. Those need separate observed contracts before full macOS
upgrade work. Paired UI/ownership and final source/manifest review precede root's
single hosted execution; no target/provider operation was performed by DATA.
