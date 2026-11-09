# F307: exact observed own-runtime configuration

V3 requests `-Xmx64m` but standard JNI Runtime.maxMemory reports134217728bytes
(128MiB), with no JNI exception. Its64MiB precondition refuses before the own
class is loaded or any memory is read. VM destruction returns0; the host exits5
and controller7. This is a configuration-precondition result, not a class-retention
negative. No ignored-flag, minimum-heap or garbage-collector cause is established.

Before coding, DATA/UI accept one targeted guard correction: retain the literal
requested `-Xmx64m`, and accept **only the already observed134217728-byte report**.
Record requested67108864 and reported134217728 separately. No heap-value search,
new GC flag, range of accepted heap values or enlarged scan follows.

The own class, ordinary loader/main/sink, scanner source and512MiB/15s/64prefix
limits remain fixed. Full known-class bytes/hash/independent parsing and normal
hold/Destroy/terminal are still mandatory for a positive. Actual readable-range
coverage is measured, never deduced from reported Java heap maximum. Different
reported configuration, failed coverage or no capture stops this branch; no
automatic retry or further precondition adjustment is selected.

This fixes an overrestrictive own research prerequisite after a direct observation.
It changes no Physics numeric bound, solver, original configuration or editor
process. All [V3](PHYSICS-MEMORY-OWN-HEAP-GATE-2026-11-09.md) inputs/results remain
frozen, and a positive remains limited to requested64/reported128MiB own runtime.
