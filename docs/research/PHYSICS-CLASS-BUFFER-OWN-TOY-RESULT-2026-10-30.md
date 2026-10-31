# F307 — own Windows class-buffer probe failed

2026-10-30. **No class-capture capability was demonstrated.** This experiment
created only our pinned console JNI toy, never an original editor process.
Source/target checks, two independent reviews and compile/link succeeded;
those checks did not establish a functioning runtime observation tool.

Actual records verify created toy64668/start10:22:27.3480805Z, main65948,
exact own image and the bundled JVM module/export address. The hardware
breakpoint request succeeded, but there were **zero qualifying hits**, no
captured class and no observed normal toy/VM destruction. After60seconds the
controller detached its own child and exited5. Its raw `observedExit:false`
means the adjacent initialized `exitCode:0` is NOT a successful toy exit.
Likewise the internal API-error flag `failed:false` is not a capability pass.

The toy remained active with sustained CPU. Root explicitly revised this
experiment's no-force cleanup policy for this expendable, data-free fixture:
verified the same retained process handle, exact PID/start/image hash/full
run-specific command line/no window, and excluded all16 protected ledgers.
Only that own toy was terminated; cleanup reports forced=true/exited=true.
There was no user/original-process input, attach, save, close or termination.
The experiment remains failed; normal exit and Destroy are not claimed.

The outer runner drained immediately after cleanup. Source inspection shows
the child inherited the controller's output pipe handles and the runner waited
unboundedly for EOF. This supports that transport diagnosis; it does not explain
why the JVM made no qualifying export hit or consumed CPU. Those causes remain
unknown. A handle allowlist and bounded drain are identified future transport
fixes, not a demonstrated repair of the class-capture route. Do not rerun this
observer unchanged or expand hooks/threads on speculation.

Independent report: `analysis/physics-defineclass-own-data-check.json`.
Private raw receipts, both programs and cleanup identity checks are retained in
`.local/research/physics-defineclass-own-v1/`. Runtime DLL/source hashes remain
unchanged. No numerical fit, physics solver or tolerance changed.

A later read-only OS module observation in owned original76268 independently
binds the previously inspected JVM/java DLLs to the actual exact4.3.26 editor.
That does not convert the failed own-toy probe into an original observation.
The loaded native editor DLL exposes only licensing/registration JNI names;
its internals were not pursued and no useful archive/Physics boundary follows.
