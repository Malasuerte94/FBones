# Own JVM debug transport: DATA gate before implementation

One new capability question is justified before any new class-boundary probe:
does ordinary Windows debug-event transport alone allow the already positive,
unchanged own V4 bundled-JVM host to finish normally? The old hardware
DefineClass route combined transport, breakpoint/context operations and a
FindClass boundary assumption; its zero qualifying hits and hung own toy did
not isolate them. Its source already forwards unrecognized exceptions using
DBG_EXCEPTION_NOT_HANDLED. No exception-swallowing bug is claimed or fixed.

The causal baseline is the [accepted V4 result](PHYSICS-OWN-MEMORY-CAPABILITY-RESULT-2026-11-09.md).
Reuse its exact host binary/source, class, JVM and arguments. Host source SHA256
is `42c0cf7ff5fdf9da316e54ae488a8a9ff8de3dbb911a6d1438f9299f517f6597`.
Keep ordinary FindClass/main, sink -36.6875, requested64MiB/reported128MiB and
20-second hold unchanged. Change only creation under DEBUG_ONLY_THIS_PROCESS
and standard event-metadata continuation. No original/editor/user process,
attach, hardware breakpoint, context operation, memory read/write, agent,
guessed address or new class source is permitted.

Implementation stays in a fresh ignored own-tool directory. The controller
creates and retains only that known host; no PID/image selector is accepted.
Verify pinned files, actual created image/file identity, PID and start time.
Use the previously proven three-handle inheritance allowlist: NUL stdin and
direct own stdout/stderr files, with no anonymous pipes/root GUI transport.
Set DebugSetProcessKillOnExit(FALSE) immediately after successful debug creation.
If that call fails, record the failure and retain the controller rather than
exit under the default kill policy. Other failures/overruns preserve the child
and controller; no forced kill, automatic retry or unchanged old-route repeat.

Recognize only one demonstrably identified expected initial system breakpoint.
The proposed discriminator uses the controller's actual system ntdll file and
exported DbgBreakPoint RVA, matched by file identity to the child's load event,
then its actual load base plus that RVA. It is not a guessed target offset or
remote-memory read. A nonmatching breakpoint is forwarded and cannot be
reclassified after observation. Forward all other exceptions; retain code,
first/second chance and address metadata without dereferencing the address.

Freeze a45-second watchdog,4096-event ceiling and512KiB controller-metadata
ceiling. Child stdout/stderr each have a64KiB acceptance ceiling checked through
owned file handles. Direct-file writes are not hard-cancelable; crossing their
acceptance ceiling is a negative with preserved processes, never a claim that
the target was forcibly constrained to that byte size. Record failures before
preservation and stop successful collection at declared bounds.

Success requires exact ordinary FindClass/main/sink/heap/hold/Destroy0 markers,
debug EXIT_PROCESS metadata, retained-created-handle terminal0 and unchanged
pins, with no watchdog/budget/API failure or forced cleanup. A negative stops
this route. A positive proves only this own transport baseline and may inform
a separately reviewed explicit own Java ClassLoader.defineClass test. It does
not prove class interception, editor methods, Physics clocks or caller order.

Primary API contracts: [WaitForDebugEvent](https://learn.microsoft.com/en-us/windows/win32/api/debugapi/nf-debugapi-waitfordebugevent)
specifies creator-thread event consumption and debugger-owned file-handle
cleanup; process/thread event handles are closed by the system after their exit
event is continued. [DebugSetProcessKillOnExit](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-debugsetprocesskillonexit)
requires an established debug connection and otherwise defaults to killing its
debuggees on debugger-thread exit. [Debugging events](https://learn.microsoft.com/en-us/windows/win32/debug/debugging-events)
document that continuation releases the suspension caused by an event. These
contracts do not establish bundled-JVM success before actual observation.
