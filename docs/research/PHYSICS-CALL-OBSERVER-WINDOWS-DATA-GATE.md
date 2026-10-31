# Windows own-toy observer: independent DATA gate

2026-10-29. Read-only source/PE/hash inspection, **no Windows, Java, original
application, attach or smoke-test execution by this worker**. Personal original
window and all user ledgers remain protected. This gate is about our own console
program and the standard bundled JVM library, never editor classes/projects.

## Proven offline

Private independent checker: `physics-call-observer-v3-data/check.py` under
ignored local research. Its `preexecution-check.json`, SHA256
`cbeab8496da14ed613fd597cdb1554a98629e118f3290dec1539b3ddc2c6d66e`,
verifies29 frozen build inputs,21 byte-identical Linuxv2 files and10 bundled
runtime dependency hashes. It parses PE headers/imports/exports independently
with Python struct, without importing the build helper or executing images.

- Own console EXE `41d227626e3d90b12f449c0c2fb669bd26fa67aa3fe9f8c1dcd5813fe3fa89b5`
  is AMD64/PE32+, console subsystem, importing only Kernel32.
- Own agent DLL `aec37b2fd46371196971acb5ddc6ddf96e525308a750ad6f309c8b3de74166ca`
  is AMD64/PE32+, with Agent_OnLoad/Unload and no Agent_OnAttach export.
- Explicit bundled JVM `4b63613eca99ca1f5a53da6a9c5ff8dd13e8437f21cfd4e5a43f7b228163d225`
  exports JNI_CreateJavaVM. Its existing standard-library dependencies are
  separately pinned; its User32 import does not imply an editor or GUI launch.
- Bootstrap code permits one application-classpath directory containing only
  the byte-identical OwnPhysicsCallerToy.class, invokes that literal class,
  passes -Xint and an optional explicit agentpath, and refuses inherited JVM
  option variables. DLL-directory changes are confined to the new process.
- Agent filters the exact own class and `(IDDDD)V` descriptor, requesting only
  locals/entry/exit capabilities. It reads static slots0/1/3/5/7 and implements
  no class hook, bytecode modification, SetLocal, redefine/retransform or attach.

The unchanged Linux frozen plan supplies five known calls and10 entry/exit
records:50 GetLocal reads. The new independent parser validates the retained
Linux event text as a **parser-only check**; no old toy command was repeated.
It checks all argument double bits, mode values, error codes, sequence numbers,
exception flags, granted capabilities and monotonic timestamps. Each Windows
stdout must contain the known sink and its own PID/agent banner; buffering may
reverse their line order. No Windows event/result is claimed before collection.

## Remaining execution gate

Root alone may approve/run two fresh own console processes, baseline first,
after its exact frozen execution-plan and runner review. Bind new process PID,
start time, image path/hash, exit code and exclusive stdout/stderr/events files.
Baseline must exit0 before the observed run. Preserve failures; do not change
original processes, global environment, tuple values or classes to force a pass.
The independent event parser alone is not process provenance; final acceptance
must also bind Root's actual run receipts and all frozen binary/runtime hashes.

A future success proves Windows interpreted JNI/JVMTI capability for **this own
toy and explicit embedding route only**. The selected toy call order/clock values
are authored inputs, not observations of Spine physics or its exporter. It does
not recover original launcher option forwarding, editor method identities,
JIT-frame access, attach, reset/update/Pose scheduling or numerical phase parity.
The personal original window remains unrelated to every toy process.

## Actual Root-owned Windows result: partial, no JVMTI record

Root subsequently ran the two approved **own console** phases. Baseline79124
and requested-agent48136 both have actual observed image/start/terminal exit0
receipts, the correct known sink and their own banner, and empty stderr.
Baseline's standard class loading/main succeeds despite the missing conventional
modules/rt.jar inventory lead. The inventory alone was not a bootstrap failure.

The second banner's `agent=1` and receipt's `agentEnabled:true` describe the
**request**, not a successful DLL load or Agent_OnLoad callback. The expected
observed-events.tsv is absent; neither own working directory contains another
file. No capability/error header, method event or GetLocal result was received.
Actual agent load/callback/capability/ABI success and the missing-output cause
remain **unknown**. Exit0 and an unchanged toy sink cannot supply that proof.
Do not rerun startup unchanged, attach to an original, or infer unavailable
JVMTI in every JVM from this one negative route result.

The independent [aggregate](../../analysis/physics-call-observer-windows-check.json),
SHA256 `3da90602ba393eb46fb0dc3d81740a3b2eda57ae46f5b2ff825e2850fd3d6768`,
sets **passed:false, evidenceVerified:true**. It independently rechecks all
29 build pins,21 unchanged Linux files,10 runtime dependencies, both process/
image/stream identities, baseline-before-agent ordering and old/new approval
hashes. Zero recorded events/verified local reads are distinct from unknown
actual callback execution. No Windows command/input was run by this checker.

All15 Root raw files and this result are preserved in a new private immutable
negative snapshot, manifest SHA256
`0ace0eea5f2715121973bbfcca9a0218f6c0946ddfd23043da1704144e96cb17`.
No original class/package/project was used. Original bootstrap/method identities
and exported Physics caller semantics remain unproved; no solver change follows.
