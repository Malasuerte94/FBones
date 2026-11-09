# Own-console classfile memory recovery — UI/tool boundary gate

2026-11-09, before dependent tooling. Reference worker read existing Windows
JVMTI/DefineClass negatives and the new coordinator proposal. No Windows,
original, debugger, GUI input, process attachment or memory read occurred here.

The coordinator's [single experiment contract](PHYSICS-MEMORY-OWN-CAPABILITY-GATE-2026-11-09.md)
owns the numeric scan limits, execution and result; this note supplies the paired
UI/ownership boundary rather than a separate execution protocol.

The proposed passive signature scan is materially different from the failed
[DefineClass breakpoint route](PHYSICS-CLASS-BUFFER-OWN-TOY-RESULT-2026-10-30.md).
It is a bounded feasibility check on a **new own console JNI toy only**. The
prior experiment's no-broad-scan limitation belonged to that old scenario; it
does not prove this new route works or extend it to original processes.

Require an actual successful ordinary FindClass, no pending JNI exception and
known own class identity. Prefer the already understood own sink as a separate
loading control. The target must not read, embed or retain the classfile bytes
manually; only ordinary loader allocation is relevant. Expected bytes/hash may
be read by the separate scanner, never planted into the target.

The scanner must use only the exact retained CreateProcess handle for the own
toy, with current image/start/source receipts and no OpenProcess/PID or self
fallback. Bound elapsed time, scanned bytes, region/chunk size and candidate
count in advance. Inspect committed readable regions, skipping guards/no-access;
log failed/partial reads and chunk-boundary handling instead of silently claiming
complete coverage. Never infer internal JVM objects or guessed offsets.

Only complete classfile parsing, exact known length and own expected hash count
as a recovery. Record region type/protection and private versus mapped/image
provenance: finding plaintext input-file mapping is not intercepted VM class
definition or proof of a decrypted editor class. Distinguish source bytes from
executed methods; a loaded name or class magic alone proves neither recovery nor
Physics call order.

Use one bounded hold and ordinary own stop/VM destruction/observed terminal
receipt. Keep GUI stdio at NUL/direct files with bounded drains, no kill/global
input or original launch. Zero hits or a failed normal stop remains a useful
negative; it does not authorize a larger scan or changed route automatically.

A positive result proves only recovery for this ordinary own-console loading
route. Original encrypted-loader behavior, editor method identity and actual
Physics Reset/Update/Pose scheduling require separate evidence. Retain F307 and
all old negative receipts; no product solver, tolerance or UI change follows.
