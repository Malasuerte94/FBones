# F307: next caller observation and the actual tooling gate

2026-10-29. Read-only local inspection only. No original launch, CLI/GUI input,
attach, class extraction, model run, PNG read, test runner or product change.
Current default-live Setup behavior and the exported-phase gap remain distinct.

## New concrete finding

The existing passive observer is **not a caller-order tracer**. Its own source,
`.local/research/constraint-solvers/observer/observer.rs`, registers a
ClassFileLoadHook, exports Agent_OnLoad, and writes class records. It implements
neither Agent_OnAttach nor a MethodEntry/exit callback. Consequently even a
successful load of that unchanged helper would not record reset/update/Pose
ordering, clocks or the parent input sampled by physics. Retrying its old
startup environment cannot by itself supply the missing observation.

The prior `observe-cli.ps1` supplies JAVA_TOOL_OPTIONS to an owned native
launcher process. `observed-cli.log` records launcher4.3.06 starting **editor
4.3.26**, original export Complete and exit0 for owned99324. The requested
`observed-classes/` directory is absent. That establishes no received observer
record, not why startup injection failed and not that all JVMTI observation is
impossible. Do not turn the successful export into instrumentation success.

## Exact package and available static evidence

Read-only Python hashlib/zipfile inspection confirms:

| Material | Observation |
| --- | --- |
| Installed `updates/updates/4.3.26` |15,221,340bytes; SHA256 `4adf8cff56777d67e6c38de92e3ab293826d8d2df7bd826b547c064547f39de5`; not an ordinary ZIP |
| Existing inspected launcher JAR |27class entries; canonical launcher entry present, no Physics-named class; SHA256 `3b3fe92ea0f7489b4bcbdd5254b6fb977757d255de204d4c8e5a03fb58ce5de3` |
| Own observer source |SHA256 `af2af97eadd3c8894007a1be86cfca03964d79151f4779570a890c6ba261796f`; class-load-only capability above |

The retained CFR output belongs to that launcher, not recovered editor physics
or PNG-export caller code. Its obfuscated indirection supplies no identified
export simulation method in this inspection. Absence of readable names is not
proof that a method/feature is absent in the editor. No package unpacking,
activation change or modification was attempted.

The pinned local Temurin17.0.13+11 toolchain contains Linux java/javap/jcmd/jdb/
jfr and CFR0.152. In the checked bundled Windows `launcher/2/bin` paths,
`server/jvm.dll` exists but java.exe, jcmd.exe, jdb.exe, attach.dll, jdwp.dll and
instrument.dll do not. This is a workspace inventory, not a claim about every
Windows installation or remote-attach capability. Linux tool presence does
not demonstrate attachment to this Windows native-launched JVM. No Java tool or
original application was invoked; no process was enumerated/attached here.

Reproduction: read the named own observer/script/log; inspect JAR names with
Python `zipfile.ZipFile(...).namelist()`; use `zipfile.is_zipfile` and hashlib
on the installed package; test the listed tool paths with `Path.is_file()`.
The toolchain provenance remains `constraint-solvers/tools/toolchain.json`.

### Bootstrap route check: no recovered option or sanitization proof

The CFR summary explicitly identifies the inspected Linux launcher JAR. A
literal search of all27 existing Java files found no JAVA_TOOL_OPTIONS,
_JAVA_OPTIONS, JDK_JAVA_OPTIONS, --jvm, -agentpath, -agentlib, getenv, setenv,
ProcessBuilder, JavaVMOption or JNI_CreateJavaVM. Obfuscated calls/strings mean
this is not proof that the underlying operations do not occur.

Read-only ASCII/UTF16-token checks on installed Windows `Spine.exe`, SHA256
`8a0a2f232f32f5f79aca3be7bb78f0ab60fd1e2488bf44b42e9eacfe4d56f921`,
likewise found none of the environment/JVM-option tokens above. `objdump -p`
lists KERNEL32/SHELL32/SHLWAPI/USER32 imports, not a direct JVM import;
`objdump -h` reports .text and .data at the same file offset0x400. This bounds
the readable static surface; it does not identify a particular packer, decode
the runtime option builder or establish the bootstrap implementation.

**No explicit environment sanitization or supported JVM-options forwarding
route was recovered.** Do not label the old missing observer output an
intentional JAVA_TOOL_OPTIONS filter. Do not invent a --jvm invocation or retry
the old environment probe unchanged. A verified bootstrap route remains a
separate prerequisite before any exact-editor caller trace.

## One useful next observation

The missing datum is a **short ordered call trace around the first half-lattice
parent event**, not another rendered response curve. Once a passive observer
has a separately demonstrated capability and identified the relevant methods,
capture, in one fresh owned exact4.3.26 process:

`output ordinal/target time → reset/update/Pose mode → skeleton clock/delta →
actual parent X at physics entry → restoring constraint step/remainder`, with
an output-emission boundary and stable constraint/receiver identity.

The discriminating window is the first carrier0→80 transition analogous to
the retained new90 frame13 case: output13/60 lies between90Hz boundaries. The
trace must show **where the current authored carrier enters the correction**,
whether a partial Update occurs, and whether a later display/Pose application
uses the same or another frame. Sampling the final visible parent alone is
insufficient. A previous raw versus evaluated translation-anchor replacement
is already excluded by the correction plateau; do not reopen it.

No traced method identity or functioning method-order tool is currently proved.
The next engineering prerequisite is an **own JVM-only** method-order smoke
test and a verified target-platform load/attach route, then independent mapping
of observed method events to these semantic stages. Those are future tooling
tasks, not a claim that the original can already be traced. Do not reuse the
existing class-only startup probe as if it met this gate. Do not infer the
semantics of export rangeStart/rangeEnd from their retained−1 defaults merely
to promise a one-frame collection. A future bounded collection needs a proven
selection/output contract and coordinator approval; it must not rerun the
accepted300/600-frame batches.

## What this does not establish

The pinned public4.3 runtime remains secondary: it describes update/Pose state
roles, not this exact editor's exporter caller. No new documentation question
was needed here. The accepted highest90 event-relative covariance and completed-
ticks-plus-Pose exclusion from
[PHYSICS-NEXT-ACTION-2026-10-29.md](PHYSICS-NEXT-ACTION-2026-10-29.md) constrain
a future trace interpretation; they do **not** prove a hidden clock, event
reset, interpolation law or replay schedule. The four clocks and two stage
operators remain rejected. Without the new tooling/caller datum, stop before
another numeric proposal and retain F307 as active.
