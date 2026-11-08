# Two-color capacity feasibility DATA — 2026-11-06

Disposable research only, before any product capacity decision. Copy of the
current independent format crate changes only aggregate tracks512→4096,
keys4096→8192 and domains8192→16384, with explicit unchanged per-clip512tracks/
4096keys. Standalone Cargo metadata is adjusted for isolation. Other bone/slot/
attachment/geometry/generic/depth/byte/resource caps, schema and complete payload
equality stay unchanged. A separate traced copy only logs rejection locations.
No production file or original/user process changed.

The proposed-capacity copy still rejects source A. The traced rejection is the
existing combined-bone Bezier interval-control guard; the complete retained graph
confirms one Rotate segment348→353 with outgoing time353.467193603515625 and
incoming351.08648681640625. No handles were clamped, no schema was skipped, and
no equality guard was removed. Actual A decode/full typed reencode/100-A-model
clone proof is therefore **not available in this first attempt**. It takes about
24.6ms to reach rejection in this debug probe. The diagnosed mathematical guard
has its separate [pre-code gate](ANIMATION-BONE-CURVE-TIME-DATA-GATE-2026-11-06.md).

A fully authored synthetic maximum case does pass with128bones,8clips,
4096tracks and8192keys. Its173,850-byte payload decodes to the entire expected
model and independently reencodes identically. One debug run reports9.39ms
encoding and32.35ms for decoding with equality plus another encoding. One hundred
cloned codec models add59,664KiB RSS (~58.3MiB), taking57.58ms. These process RSS
measurements include allocator behavior, are not a release benchmark, and do not
include native stable-ID/history wrappers, caches, DTO/IPC, frontend or rendering.
They cannot alone authorize a new application memory/performance budget.

Synthetic aggregate4097tracks and8193keys reject; per-clip513tracks and4097keys
reject independently below their aggregate bounds. Truncations and an invalid
payload marker reject. This does not exhaust every arena/structural malformed
case; existing file/arena tests remain separate required regressions. The initial
isolated manifest typo and its corrected run are retained.

Recommendation at this checkpoint: defer production cap increases until the
known curve guard is independently corrected, source A passes full typed payload
equality, and native/history/resource/UI costs are measured. Do not describe a
successful synthetic model as real-project admission. Raw patch, source pins,
runner, rejection trace and `capacity-result-v1.json` remain ignored under
`animation-two-color-capacity-2026-11-06/`.

The diagnosed private retry with the exact bone-time guard reaches a second
existing semantic boundary: Transform65 fields4/23 store−1, yielding Setup mix
`[0,-1,-1,0,0,0]`. Its current0…1guard rejects before full reserialization equality.
The same synthetic capacity cases still pass/reject as intended. No additional
unknown/profile guard or product capacity was relaxed; actual A admission and
native-history performance remain unproven at this checkpoint.

## Diagnosed fixes and measured capacity decision before product code

After the separately gated exact bone-time correction, finite Transform Setup
mix preservation and typed Skeleton11/tag24 metadata, the final ignored copy
passes **the entire363,416-byte A payload** and complete typed-model reopen
equality. No unknown record or equality guard was bypassed. A contains116bones,
112slots and12clips, with2203tracks/6764keys/10589domains/5017generics. Its busiest
clip remains357tracks/2418keys, below the existing per-clip512/4096policy.

One debug A-only run reports35.48ms decode,15.90ms encode and59.21ms to clone100
actual A codec models. Their RSS delta is74,308KiB (~72.6MiB), with process RSS
85,844KiB afterward. `/proc` reports5/1/6 CPU ticks for those phases at100ticks/s;
these are coarse process counters, not high-resolution CPU timing. Native parallel
stable IDs/history, DTO/IPC, PNG/GPU resources and rendered-frame performance are
not included. The earlier synthetic maximum and malformed-boundary results remain
valid independent evidence; allocator experiments are not interchangeable.

Based on the full equality proof and these bounded measurements, the coordinator
now authorizes aggregate **all-family** limits4096tracks,8192keys and16384Scene
domains, with **explicit per-clip limits512tracks/4096keys unchanged**. Per-track
and authoring batches remain4096. Generic16384, depth256, all array/bone/slot/
geometry/PNG/file-byte guards stay unchanged. Legacy non-Scene domain budget stays
8192. Use named distinct format constants and coherent reader/writer/constraint
registration checks; do not confuse a per-batch/per-track limit with an aggregate
project limit. The paired UI capacity confirmation must be recorded before those
product limit lines change. This is a measured FBones budget decision, not an
original range claim.

Required product checks include all-family aggregate and per-clip boundaries,
malformed/truncated/reference/domain records, prior canonical profiles and one
full actual-A equality run with the new product profile. Native must remove its
obsolete bone-only aggregate512/4096precheck and still validate the entire model;
its batch limit does not increase. Coordinator requires native edit/history/Save/
reopen/resource/DTO performance integration before claiming actual-source
admission. Original compatibility, GUI/pixels and Windows delivery remain open.

Final private A proof: `actual-a-capacity-result-v2.json` and
`diagnosed-bounds-values-v1.log`, with the complete chain of narrowly scoped
prototype copies/patches. Current product format70tests, legacy16tests and strict
all-target format Clippy passed **before** changing product capacities.

Native counteraudit identifies the exact mismatch in
`animation.rs::set_keys`: its end-of-operation global sums include only bone
tracks/keys and still use512/4096. A has860bone tracks/3975bone keys, so a
property-only bone overwrite fails that obsolete guard. The complete cloned
candidate already reaches `SceneHistory::apply`'s final independent format
encoding before history publication; native can remove only those two redundant
family-global checks after paired confirmation. Its4,096-key command/selection
limits remain separate. Other family setters have no competing project-global
limit. The fuller read-only inventory is in the guarded-source triage note.

Prepared native test `scene_animation_capacity_tests.rs` uses45own bounded clips,
540bone tracks/2700keys, encoded as an own source file and opened by real Session.
It exercises existing-key editing, Undo/Redo and Save/reopen. Its allowed-size
4,096-key request would produce4151keys in one clip but6791globally, isolating
the unchanged per-clip rejection and atomic state preservation. The coordinator
will attach/run this test; no execution result is claimed at preparation time.

After the paired
[UI capacity confirmation](ANIMATION-CAPACITY-UI-GATE-2026-11-06.md), native
`animation.rs::set_keys` removes only the obsolete bone-only global512/4096
checks. `MAX_KEYS=4096` still guards a bone request and selected-key operations;
all family request bounds, finite/curve/neighbor validation and final complete
format encoding before `SceneHistory` publication remain intact. No new combined
multi-family command-length clamp was added: existing behavior bounds each family
and validates the complete resulting per-clip/project model. The earlier audit's
combined-request suggestion is a separate possible policy question, not a
previously implemented aggregate command rule or part of this change.

Source inspection confirms the two obsolete project sums are gone and both
native4,096request/selection uses remain. Own focused regression source is ready;
coordinator compilation, execution and actual-A native cost/persistence proof are
still required before an admission result. No shared test/build was run by the
native implementer during this change.

## Product format outcome

After both pre-code gates, the product format now uses distinct named aggregate,
per-clip, per-track, domain and generic limits described above. All-family
aggregate4096tracks/8192keys and explicit per-clip512tracks/4096keys are checked
together. Scene registrations use16384domains in every reader path, including
custom tracks/Event/deform references; legacy non-Scene remains8192. The encoder
counts its real arena, retaining complete reserialization equality.

Focused format73/73, legacy16/16, strict all-target format Clippy and recursive
format checking pass. New own cases exercise mixed-family maximum roundtrip,
aggregate/per-clip overflow, real domain overflow with otherwise fitting counts,
malformed/truncated inputs and old canonical profiles. Two old arena tests were
updated to exercise the new16k closure across multiple bounded clips; initial
failures are retained beside the final logs.

The current product codec independently re-encodes all363416bytes of A exactly.
The two earlier admitted source copies also retain exact27253/18674byte payloads.
All three original and copied hashes remain unchanged. This verifies the actual
product format after the narrowly diagnosed bone-time, finite Setup-mix and typed
Skeleton24 corrections; it is not native, GUI, rendering or original acceptance.
Private receipts are `product-equality-result-v1.json`, `product-equality-v1.log`,
`product-capacity-format-v3.log`, `product-capacity-clippy-v1.log` and
`product-capacity-legacy-v1.log` under the same ignored experiment root.

The coordinator now owns native history/DTO/resource cost, actual edit/Save/reopen
and required shared checks. No further format change is planned before that
integration result; full F105 and original acceptance remain open.
