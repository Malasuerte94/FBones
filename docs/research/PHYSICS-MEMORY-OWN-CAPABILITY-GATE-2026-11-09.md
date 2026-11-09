# F307: bounded own classfile-memory capability gate

Question: can documented passive memory reads recover the complete naturally
loaded **own** classfile from a newly created Windows bundled-JVM console toy,
without the already failed JVMTI/debugger routes? This changes whether a later
private exact-editor loading inspection is worth proposing. It cannot establish
Physics methods or caller ordering by itself.

DATA and UI reference agents first reviewed STATE, prior toy/capability failures
and this proposal. No prior VirtualQueryEx/classfile-signature scan was found;
the failed debugger read only declared arguments at a breakpoint that never hit.
Both agents accept this distinct **own-console-only** feasibility question.
Existing Windows no-agent JNI/main success is retained; the standalone bundled
Linux startup failure is separate and will not be retried.

## Pre-observation contract

- Create one pinned own console host; retain its creation handle and exact
  image/start identity. No PID selector, attach/debugger, OpenProcess lookup,
  privilege adjustment, GUI/global input, byte patch or guessed VM offsets.
- The host loads the known own class using ordinary JNI FindClass. Neither host
  nor class reads, embeds or retains its classfile bytes manually. Require known
  class/main output and a bounded ordinary hold, then VM destruction/normal exit.
- Query only that retained handle. At most512MiB of committed readable memory,
  15seconds and64known-prefix candidates; count other magic hits separately
  without saving them. This prefix filter is fixed before any execution and
  does not enlarge the byte/time budget. Skip guards/noaccess. Record overlap, read
  failures/partial reads and private/mapped/image provenance. No whole-heap dump.
- Success requires a complete parsed classfile, exact own length/bytes/hash and
  normal toy exit. CAFEBABE alone or a deliberately planted sentinel cannot prove
  class recovery. A mapped plaintext classfile is labeled as such, not a recovered
  VM definition. A negative after FindClass may mean freed/erased input bytes.
- One source/tool manifest, raw files and concise result under the ignored
  physics-phase-sprint run. Root alone executes Windows after source review;
  agents independently inspect captured bytes and lifecycle. Stop after this
  bounded sample; no unchanged retry or expanded scan follows a negative.

Pre-execution source review requires successful nonzero creation-time and image
checks before reads, allocation failure guards and a real signaled terminal
handle before claiming exit. Persist an explicit overrun receipt before any
retained-handle wait; never silently turn a missing terminal record into success.

## Documented API surface and evidence limits

[Microsoft VirtualQueryEx](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualqueryex)
describes process page ranges/protections;
[ReadProcessMemory](https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-readprocessmemory)
describes passive readable-range copying. The
[Java17 classfile specification](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-4.html)
supplies the parser contract. These primary sources document interfaces/formats,
not exact Spine4.3.26 runtime availability or class retention.

Even a positive proves only own classfile-memory recovery in the tested loader.
A later original process needs its own reviewed isolation/source/question gate;
no original scan is authorized by this toy proposal. Exact-editor definition,
method identity and executed reset/update/Pose/export ordering remain distinct
unproved stages. No production solver/clock/bounds change follows this gate.
