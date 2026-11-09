# macOS known own nonchild: lifecycle feasibility only

Pre-code ownership finding, paired with the
[DATA gate](NATIVE-MACOS-OWN-NONCHILD-EXIT-DATA-GATE-2026-11-09.md).
One small fixed own controller→launcher→worker fixture may test actual nonchild
normal-exit observation on the hosted macOS SDK. No GUI, product/original app,
personal process, installation, LaunchServices action or native control occurs.

Record own source/image hashes, UID and worker PID/kernel start/image/original
own parent in a fresh private directory. Require real waitpid launcher exit0,
then actual worker waitpid−1/ECHILD while it remains alive and identically bound;
zero/pending wait is not nonchild proof. Accept no arbitrary PID argument or
global process discovery. Recheck this same worker UID/start/image/liveness.

Only SDK-typed kqueue EVFILT_PROC registration for that worker, NOTE_EXIT plus
NOTE_EXITSTATUS, is in scope. Successful registration precedes one file ACK that
lets the worker voluntarily _exit(7). Retain raw event fields/errors and require
SDK WIFEXITED/WEXITSTATUS to prove normal7 for that exact PID. Do not select a
convenient status interpretation, infer from disappearance or send a signal to
test permissions. No NOTE_TRACK, attach, forced termination or global setting.

Use NUL/direct-file streams, bounded waits/diagnostics, a distinct voluntary
worker timeout code and normal known-own cleanup only. Preserve pending/negative
capability instead of force or retry; free/reap only known local resources.
Positive evidence proves this exact own nonchild/provider, not automatic updater
successor discovery, bundle/window ownership, launchd behavior or a real app exit.
Those remain separate questions. Root reviews final sources/pins and alone runs
one remote hosted scenario; no target/provider call occurs during this finding.
