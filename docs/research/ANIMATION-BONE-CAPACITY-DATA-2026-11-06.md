# Scene bone capacity feasibility and depth closure — 2026-11-06

Research before product changes. Question: can a Scene-only256bone inventory
preserve IDs, sparse/dense geometry and bounded animation work without silently
raising unrelated limits? Retained B has157bones/depth12; H221bones/depth6.
DATA's separate source proof finds a nonmonotone B curve and H's sole522-track
clip, so bone capacity alone admits neither. H is the coordinator's next target;
its per-clip1024proposal is independently measured below, with4096keys unchanged.
No original, JVM, Match, user-window or shared build/test operation was performed.

## Inventory and representation audit

The current inventory128guard is in `minimal::validate`; Scene and legacy share
it. Scene/Rig Create and BoneHierarchy's Add button also use128. A future measured
Scene-only constant should use shared structural validation with an explicit
bone limit; legacy validation/Create must stay128. Rust indices are usize,
native stable IDs u64 and wire object references varuint. No7-bit bone-ID mask
or u8/u16 inventory-index cast was found. JS uses safe integer IDs, Map/Set and
number arrays. The ordinary reader array512 and domain/generic/byte/depth budgets
remain independent. Both ordered evaluators already allow4096bones.

Binding columns128 in format Mesh/Clipping, native binding/AutoWeights and
sparse-deform parsing are **per attachment**, not inventory limits. They bound
vertex×influence storage and should stay128. Mesh triangles are u16 vertex
indices, not bone indices; renderer skinning resolves CPU world positions and
passes Float32 positions/Uint32 triangle indices, without a GPU bone palette.
Default-skin restrictions, topology, source/target membership and all geometry
limits remain independent. This static source finding is not GPU proof.

Other native128limits bound Transform constrained-member lists, Match, Physics
creation batches, colors, multi-bone transform and reparent requests. The first
three are independent policies and remain unchanged. Whole-inventory AutoColor
currently sends every bone, so inventory-only admission would make it reject
above128; whole-selection transform/reparent likewise need a measured coherent
request policy or an explicit UI limit. Do not split one action into multiple
history commits. New Scene256whole-bone commands, if approved, require valid256
and atomic257negative tests; legacy requests remain unchanged. Selection itself,
Tree/hierarchy/world-bone projection and DTO IDs contain no128mask. Recursive
hierarchy traversal and ancestor/remap scans have bounded depth/O(n²) costs.
Setup Replay retains262144complete bone-pose rows, so a larger inventory reduces
retained motion duration; keep that memory limit/checkpoint behavior unchanged.

## Isolated own-fixture results

A private format clone changes only Scene inventory128→256 via a dedicated
`validate_with_bone_limit`; legacy remains128. A second explicit prototype
change allows1024active tracks, retaining4096keys and all other limits. It imports
a frozen actual native solver and extracts the actual pure native bone sampler.
No product source was edited. Own models use128/157/221/256bones, star/chain
topologies,4weighted vertices,2or128binding columns, and high referenced bone
indices127/156/220/255. Successful cases retain complete model/payload equality,
negative-zero key bits and exact high binding references. Scene257, legacy129,
forward parent and129binding-column negative controls reject.

One debug process per case gives these illustrative measurements:

| Own case | Decode+equality |100native samples |100frame-shape clones RSS delta |
| --- | --- | --- | --- |
|221bones/522tracks/4096keys/2columns |10.98ms |3.99ms |29.4MiB |
|256bones/1024tracks/4096keys/128columns |17.43ms |7.05ms |35.1MiB |

Those clones include the complete typed model and the native identity-family
vector shape. They are **not actual Session/history transactions**, cache/PNG,
DTO/IPC, browser heap or GPU costs. Allocator/debug/process timing is not a
performance guarantee. The small one-track256star case adds about2.3–2.9MiB
for100frame-shape clones; existing geometry×binding worst cases remain separate.
The full allowed4096vertices×128dense influences already imply about6MiB of
weight/position scalars per model; raising inventory alone does not raise that
pre-existing bound, and this study does not allocate100such worst cases.

Actual TS world/hierarchy/AutoColor/sample/whole-selection transform helpers
agree with the frozen native solver/sample worlds on every successful own case,
including stable IDs above2^32. Maximum absolute world residual is9.1e-13.
TS100samples take11.72/14.70ms for522/1024tracks;100whole-selection previews in
those cases take16.32/12.04ms. These are Node source checks, not DOM/Tree rendering,
actual native request transactions or browser/pointer responsiveness.

## Pre-code finding: encoded depth must remain reopenable

The256chain prototype encodes successfully but its own decoder rejects at the
unchanged reader depth256. The independent targeted boundary for this exact
fixture is245bones/depth244pass,246/depth245reject. Star256and chain221pass.
The wire recursion includes owner/metadata/object frames; bone ancestor count
alone is not the reader-depth budget. The initial exploratory run's panic is
retained; instrumentation identifies `Reader::object`'s depth guard. No input or
reader guard was relaxed to produce a success.

Before any Scene inventory increase, the writer/native precommit path must reject
an output that cannot pass the unchanged structural reader depth budget. Possible
bounded implementations are complete writer depth accounting over ordinary and
custom records, or an authoritative structural-read closure pass after encoding
without recursive semantic reencoding. DATA owns that design after the paired UI
gate. Do not raise depth, clamp/reparent user bones, drop records or return success
for an unreopenable Save. Rejection must preserve the candidate's prior authored
model, stable IDs, history, dirty/revision state and existing target/source files.
No additional control is required; report a clear bounded-profile error.

The next evidence is an own accepted-boundary/rejected-depth source test and
actual H complete equality/native authoring/history/Save/reopen under separately
approved inventory and active-clip bounds. H's retained full graph already parses
under depth256, but this does not prove newly authored worst-case graph closure.

Private tools/results: `animation-bone-capacity-2026-11-06/`, source manifest,
`aggregate-v4.json`, `depth-boundary-v1.json`, `js-result-v2.json`. All cases run
in isolated Cargo workspace/target with offline cached dependencies. Initial
manifest inheritance typo, first unhandled depth rejection and first JS collector
world-field-name error remain retained beside corrected collectors. There is no
actual B/H typed/native/GPU admission claim from this experiment.
