# Own JVM debug-transport baseline: UI/ownership gate

Pre-code review only. No debugger, process operation or original input by this
worker. The [old hardware DefineClass probe](PHYSICS-CLASS-BUFFER-OWN-TOY-RESULT-2026-10-30.md)
recorded zero qualifying hits and a hung own toy. Its debug/event transport was
not isolated from the breakpoint instrumentation. The later
[positive own V4 host](PHYSICS-OWN-MEMORY-CAPABILITY-RESULT-2026-11-09.md)
now supplies a normal ordinary FindClass/main/sink/Destroy/exit baseline.

One new discriminator is justified: can that same unchanged positive console
host complete normally when created with DEBUG_ONLY_THIS_PROCESS, collecting
debug-event metadata only? Keep its20-second ordinary hold and requested/
reported heap configuration unchanged. A new5-second hold would introduce an
unnecessary additional variable. This is not an unchanged breakpoint retry.

Create only that new own console child; retain creation handle, exact PID/start,
image/file identity/hash, JVM path and class/source pins. Use the proven explicit
NUL/direct-file three-handle inheritance allowlist. No OpenProcess/PID selector,
existing-process attach, GUI/window input, hardware breakpoint, Get/SetContext,
memory read/write, JVMTI, original editor execution or guessed VM offsets.
Personal original87668 and all protected windows/transports remain untouched.

Handle the initial system breakpoint once; forward other exceptions under the
documented debug contract, preserving JVM exception handling. Bound event count,
serialized metadata and the45-second watchdog in the source/manifest. Release
documented debugger-owned resources without closing a debuggee's arbitrary
handles or losing the original creation handle before terminal observation.

The controller's exit/watchdog cleanup must be explicit before execution.
[DebugSetProcessKillOnExit](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-debugsetprocesskillonexit)
defaults to terminating debuggees when the debugger thread exits. Do not leave
that behavior implicit. Any declared forced cleanup may target only this
verified disposable child and must be recorded as a failed diagnostic, never
normal lifecycle. Record timeout/failure before cleanup and preserve raw output;
do not retry or widen the route automatically.

Success needs actual ordinary class/main/sink/hold completion, DestroyJavaVM0,
debug exit metadata and retained-handle exit0 with no timeout/forced cleanup.
A negative stops this route. A positive proves debug transport for this own
fixture only and permits consideration of a separately reviewed explicit own
ClassLoader.defineClass target test. It proves no editor method identity,
class buffer interception, Physics clock or executed caller order.

Primary API guidance: Microsoft
[debugger exception handling](https://learn.microsoft.com/en-us/windows/win32/debug/debugger-exception-handling).
API documentation describes mechanisms; only the new own result can establish
the bundled target-platform capability.
