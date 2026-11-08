# Sequence animation: next discriminating probe

2026-11-06. This is a research plan, not an implemented profile or a claim of
original acceptance. The eight user-authorized project copies remain ignored
under `.local/research/vampir-2026-11-06/`; the source manifest pins their bytes.
No personal source, texture or extracted original implementation belongs here.

## Observed and inferred separately

The traced disposable copy of the current decoder rejects two projects at
object class123, reached through Region43 field15. The current writer emits
Null for this field. The first retained instance begins with a new-object
marker and four tagged values compatible with unsigned integers:
`4:0, 2:32, 3:4, 1:0`. This is a byte observation, not a verified field schema.

Another project reaches custom timeline132 kind22, which the current decoder
does not support. Its first apparent key contains frame0 followed by three
four-byte values interpretable as float32 `2`, `0`, and approximately `1/27`.
The ignored `diagnostic-second.log` preserves positions and the first rejection;
the isolated copied inputs and tool sources allow reproduction. Nothing was
skipped in the production reader, and all eight projects remain inspection-only.

**Hypothesis:** class123 stores attachment Sequence settings, with count32,
digits4, start0 and setup index0 in this sample; kind22 stores Sequence keys,
possibly Loop mode2, index0 and delay1/27. The tag-to-property assignment and
the numeric representation of mode/index are unproven. Do not add guessed
class123 or kind22 support from these values.

The [official Keys guide](https://us.esotericsoftware.com/spine-keys) and the
4.3 runtime API corroborate that Sequence setup and animation exist. Runtime
JSON and public runtime types do not establish the editor's `.spine` class IDs,
field tags, pool behavior, key layout or editor gestures.

Four other projects first reject a nonempty generic class116 in animation18
field8. After its observed count1 or2, the bytes begin a Bone12 object. This
suggests a reference collection, but neither its semantics nor element grammar
is established. Treat it as a separate question; do not call it Sequence data.

## Controlled own fixtures

The question is whether the two unknown records encode Sequence setup and keys,
and which exact fields change. Use newly generated, visibly distinct own PNG
frames with a single Region, a single bone and one animation. Keep all unrelated
fields and FPS fixed, and use fresh fixture copies for independent changes.

1. Retain a no-Sequence baseline. Create a Sequence with small count, start,
   digits and setup index values. Vary only one setting per copy, using different
   nonzero values that cannot be confused (for example count3/5, start1/7,
   digits1/2, setup index0/2). Confirm the selected setup image and exported
   runtime settings. These comparisons determine class123's field types,
   tags, identity/reference pool and Region owner relationship.
2. Add two Sequence keys at frames0 and12 at24FPS. Isolate Hold, Once and Loop
   modes, a nonzero index, and two distinct delays. Compare raw fields with the
   original runtime export. Determine the complete key record, numeric mode
   representation, frame units, outgoing curve/discrete metadata and target.
   Do not equate plausible float bit patterns with a proven primitive type.
3. Check whether Mesh supports the same Sequence record using one fresh own
   fixture, after the Region question is resolved. Test missing/end frames and
   reverse/ping-pong modes only when needed by the intended supported profile.
   Unmeasured variants stay unsupported rather than being silently flattened.

Use the existing exact4.3.26 installation and reusable retained-handle driver,
after current ownership/isolation checks. The present Windows interop attempt
failed at WSL vsock initialization before any original command was issued.
Do not infer a live original session or successful export from that attempt.
Keep one manifest, raw output and concise result per new experiment; do not
rerun accepted unrelated reference batches.

## Acceptance before implementation

- Record exact4.3.26 provenance and full consumed-byte/reference accounting for
  each own fixture. Compare setup and key values against its original export.
- Specify the supported setup/key variants and unknown fields explicitly.
  Retain source copies and all failures; no stripped project becomes editable.
- Independently encode the newly understood records with complete payload
  reserialization equality, bounded counts and exact f32/reference preservation.
  A fresh independently encoded candidate must be accepted by original4.3.26
  before claiming compatibility for the new profile.
- Then implement sampled frame selection in Main and Preview plus native
  history/save/reopen and timeline controls. Verify boundary modes, delay and
  seeking with real UI tests. Persistence alone does not prove animation playback,
  and a runtime export alone does not prove original editor gestures.

The next action is the minimal own Region Sequence setup fixture, followed by
the one-setting comparisons above. This plan does not reopen deferred Physics
solver, Match or JVM instrumentation investigations.


Later [conversion findings](ANIMATION-CONVERSION-PROVENANCE-2026-11-06.md)
correct Generic116's tentative element shape to Bone-reference/varuint pairs and
show that kind22 can include a Slot reference followed by a Region/Mesh object.
Use that fuller target question in the controlled fixture; a single attachment
reference or ordinary bone array is insufficient. These remain research grammar
observations, not implemented Sequence or Generic116 semantics.
