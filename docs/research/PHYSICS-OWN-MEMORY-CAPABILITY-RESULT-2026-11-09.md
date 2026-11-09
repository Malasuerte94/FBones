# Own classfile-memory recovery capability — bounded positive result

2026-11-09. This is a tool capability result, **not recovered original Physics
code, methods or caller ordering**. The parent coordinator alone ran the Windows
samples; DATA independently checked static sources/pins, raw results/captures
and normal lifecycle. No original editor, user window, project, package class,
JVMTI/debugger/VMStruct or process-memory write was used.

The unchanged own Java class loads through ordinary JNI FindClass and runs its
known main. The host never reads or retains its classfile bytes manually. A
separate own controller holds the expected bytes and reads only the process
handle returned by its own CreateProcess. This avoids planting the sought bytes
inside the target. The pre-observation [DATA gate](PHYSICS-MEMORY-OWN-CAPABILITY-GATE-2026-11-09.md)
and [UI/lifecycle gate](PHYSICS-OWN-MEMORY-RECOVERY-UI-GATE-2026-11-09.md)
remain frozen with their source/tool ledgers.

## Discriminating samples and preserved failures

| Sample | Actual observation | Interpretation |
| --- | --- | --- |
| v1 | Own main/Destroy/exit0; image-string guard fails; zero reads. | Not a class-recovery negative. Actual queried path was not logged, so cause remains unknown. |
| v2 | Documented file-handle identity proves different W/UNC path spellings name the same executable.512MiB read, no errors, no exact own class; byte cap leaves827,289,600bytes of a large private region unread. | Bounded negative, not absence or proof that region is heap/G1. |
| v3 | New explicit-Xmx64m input; standard Runtime.maxMemory reports128MiB. Original64MiB precondition refuses before targeted FindClass/scan. | Measured requested/reported mismatch, not a negative scan or a diagnosed VM cause. |
| v4 | Same-Xmx64m input, exact already-observed128MiB predicate; unchanged scanner/budget. Full collected readable coverage and two exact natural own-class captures; normal main/Destroy/exit0. | Capability positive only for this tested configuration. |

No heap-flag grid, larger read budget or unchanged scan retry was used. Requested
64MiB and reported128MiB remain distinct facts; no minimum-heap, GC layout or
flag-honoring cause is inferred.

## Positive evidence

V4 root freeze SHA256 is
`426c787b3af0b217b8e062fa5309a8cdf906928f1a738e2c451ebfae51eb5281`;
all41inputs remain exact after the run. It reads421,531,648bytes across all419
enumerated committed readable regions in266ms, with zero failed/partial reads,
under the unchanged512MiB/15second/64known-prefix-candidate bounds. Enumeration
and content coverage are separately checked.

Two distinct MEM_PRIVATE locations inside the same128MiB allocation contain
byte-identical copies of the known own class: each1764bytes, SHA256
`de85a852b9a9f8103b689a74eb2d440fca16cb6dda96511e9566c3328ca2b3a6`.
An independent structural parser consumes every byte: class OwnPhysicsCallerToy,
major61, constant-pool count86, six methods with the expected descriptors.
Pinned Temurin javap independently parses an actual captured file successfully;
the second capture is byte-identical. Structural parsing is not a bytecode
verifier. Exact whole-byte equality supplies a separate validation boundary.

The three known-prefix candidate addresses are distinct: one fails the complete
byte comparison, while the other two match. The unmatched prefix is not proven
to be a chunk-overlap duplicate or interpreted as another valid class.

Own child65484 and controller53500 have retained identity/terminal receipts;
the child reports the known sink, hold completion, Destroy0 and exit0. There is
no timeout/forced termination. Raw captures, stdout, events, source/PE manifests
and the independent `data/memory-v4-independent.json` remain ignored under
`.local/research/physics-phase-sprint-2026-11-09/`. Independent result SHA256:
`506915ddf12b8ffc774be8a954aeaaf1535bfac820ee4f2d3eb7eccee72f09e4`.

## Decision and remaining boundary

Documented passive memory reads can recover natural complete own classfile
copies on the tested bundled Windows JVM/configuration. MEM_PRIVATE provenance
excludes a plain mapped-classfile location; it does not distinguish a live VM
definition from a leftover class-input copy.

A later exact-editor investigation still needs a specific loading/source
question, fresh own-instance isolation, bounded class selection/validation and
its own reviewed scenario. No original-memory scan follows automatically from
this capability result. Original method identity, execution ordering, parent
input timing and the moving-parent/export phase remain unknown. F307, the
existing numeric bounds and production solver arithmetic remain unchanged.
