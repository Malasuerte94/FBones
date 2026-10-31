# Own Windows class-buffer capability — DATA gate

2026-10-30. Read-only DATA review before the proposed own-toy implementation.
No Windows command, live process query, debugger, attach, original invocation,
memory observation or product change by DATA. Root separately authorizes only
the new own-toy capability and remains the sole Windows operator.

## Independently checked direct evidence

The static files in `.local/research/f307-windows-loader-static/check.json`
all match their recorded hashes. Actual bundled Windows files also match:

- `java.dll`:139264bytes, SHA256
  `c0d54a92cede9b6eb9a429809e2c872583885be1b33a5d1fe4680727adcba427`.
- `jvm.dll`:54516224bytes, SHA256
  `4b63613eca99ca1f5a53da6a9c5ff8dd13e8437f21cfd4e5a43f7b228163d225`.
- Exact editor package4.3.26:
  `4adf8cff56777d67e6c38de92e3ab293826d8d2df7bd826b547c064547f39de5`.

File-only `objdump -d -Mintel` verifies the java.dll call at RVA18d7 forwards
through thunk145df/import-IAT17728 to `JVM_DefineClassWithSource`; the pinned
JVM export inventory gives a non-forwarded RVA35b330. Before this call, four
register arguments are set and the caller places a32-bit fifth argument at
stack+20hex, then two pointer arguments at+28/+30hex. This identifies a real
native argument boundary, not an inferred VM object layout.

## ABI reference and remaining proof obligation

[Primary OpenJDK17.0.6 jvm.h](https://github.com/openjdk/jdk17u/blob/jdk-17.0.6-ga/src/hotspot/share/include/jvm.h#L401)
declares seven parameters: JNI environment, name, loader, byte buffer, signed
32-bit length, protection domain and source. This source is an ABI reference,
not proof of the proprietary bundled VM's exact build contract.

The [Microsoft x64 ABI](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention)
places the first four integer/pointer arguments in RCX/RDX/R8/R9. At the callee
**entry**, the remaining three positions follow the return address and shadow
space:

| Argument | Entry location | Observation policy |
| --- | --- | --- |
| JNI environment | RCX | Opaque; do not dereference |
| Name | RDX | Bounded plain C string only for the own expected class |
| Loader | R8 | Opaque JNI handle |
| Class bytes | R9 | Read only the declared, bounded own-class argument |
| Length | low signed32bits at RSP+28hex | Must equal pinned own-class length |
| Protection domain | pointer at RSP+30hex | Opaque JNI handle |
| Source | pointer at RSP+38hex | Not needed for capability proof |

The actual own run must establish known name/length, CAFEBABE and complete
byte/hash equality. A breakpoint request or static symbol alone proves none of
these. Main-created-thread DR0 interception is a hypothesis until observed.

## Narrow authorized capability and stop condition

- Create only a new pinned own Windows JNI console toy under
  `DEBUG_ONLY_THIS_PROCESS`; never attach to or inspect an existing process.
  The [documented creation flag](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags)
  scopes debugging to the newly created process. Verify actual module identity
  and base before using its known export RVA.
- Exercise an own Java `ClassLoader.defineClass` path with pinned own target
  bytes. Standard JNI DefineClass alone may bypass the identified export; do
  not call an internal JVM function directly using an assumed signature.
- Own classpath only; no editor package, launcher classes, personal fixtures,
  activation changes or application forwarding. No JVMTI/VMStruct retries.
- Observe one declared hardware execution breakpoint on the created main
  thread. No code-byte patches, object-offset guesses or broad memory scanning.
  Other classes/threads/variants remain outside the proved scope.
- Bound time/events/bytes before execution. Keep raw failures; no event is a
  negative result for this route/configuration, not proof that every loading
  variant is unavailable. No automatic alternate-hook or thread expansion.
- Preserve debuggee lifecycle: disable kill-on-debugger-exit, restore/clear
  owned debug registers, continue normal exit, never force kill on timeout.
  Unexpected exception/lifecycle facts remain explicit. UI/lifecycle reviewer
  and root review the concrete implementation before any Windows execution.

Even success establishes only own-toy interception of a declared argument
buffer. It is not exact-editor class recovery, original exporter call ordering,
normal timing equivalence or permission to operate protected personal61048.
Any later exact-editor collection requires its own narrowly reviewed scope and
actual original-instance isolation. No solver change follows from this gate.
