# Draw Order and deform — native plan before the new record gate

2026-10-30. Initial before-code plan; the authorized0.9.2 native slice is now
implemented, with its current checkpoint below. Root published0.9.1
and transferred its normal103180 window to the user. That process and all older
user ledgers are protected. Working version0.9.2 is not yet delivered; no
Windows/original/process actions were performed by this reviewer. Root remains
the sole original/Windows operator. F307/F308 stay user-deferred.

## Evidence and remaining gate

Read `ANIMATION-DRAW-DEFORM-DATA-4.3.26.md`, including its final correction, and
`ANIMATION-NEXT-UI-4.3.26.md`. The accepted own9b7f composite must not be collected
again. Its full raw research parse and decisive owner/Event/string aliases prove
that deform vectors use a **DOMAIN reference, dimension, BOOLEAN presence**;
the earlier nested-generic hypothesis was wrong despite consuming the bytes.
Count0/presence distinctions and a terminal raw Stepped curve are real retained
data. A generic offsets array must not silently erase them.

Direct retained cases prove Draw Order custom132/kind13, discrete133 keys,
nullable group owner/enum4 and sparse Slot13-linked39 offsets. The positive
raw2→+1 case is proven; a negative encoding is still unproven at this checkpoint.
Deform kind6 has one scalar progress curve and a typed Mesh46 target; the U/W
pair has8/16 offsets and zero/nonzero/zero samples. Its weighted influences were
all positive, so that case does **not** distinguish dense-column from
positive-only offset traversal. Neither a Clip target nor arbitrary mixed deform
curves follows from the older pair.

The new own eed254 recipe is intended to discriminate negative order offsets,
mixed progress curves, U/W/Clip targets and zero-weight membership. Its actual
independent raw gate is still pending. No API implementation below may guess
those unresolved facts. Current official runtime documentation and Setup vertex
editing evidence are separate categories, not original Animate gesture proof.

## Agreed editor DTO and command contract

Root confirmed separate families rather than overloading bone scalar channels:

```ts
AnimationView.drawOrder: {
  id: number; frame: number;
  order: number[] | null; // stable slot IDs; null means Setup reset
}[];
AnimationView.deformTracks: {
  attachment: number; // stable attachment ID, not active slot or image resource
  keys: {
    id: number; frame: number; offsets: number[]; dataPresent: boolean;
    curve: 'linear' | 'stepped' | 'bezier';
    controls?: [number, number, number, number];
  }[];
}[];
```

Deform controls describe **one interpolation-progress curve**, not one curve per
coordinate. Exact editor-frame/progress coordinates and mixed handle presence
remain subject to the new raw gate. Stored values are f32; normalize stored raw
DTOs at the frontend boundary, while continuously sampled geometry stays f64.

Commands:

- `setAnimationDrawOrderKeys{animation,keys}` validates null reset or a complete
  distinct permutation of the current stable slot IDs.
- `setAnimationDeformKeys{animation,keys}` supports numeric/clipboard vector
  authoring, exact target dimensions and optional current pose-epoch guards.
- `setAnimationDeformVertices{animation,attachment,frame,vertices,curve?,controls?}`
  requires `poseEpoch`. Each vertex target is `{vertex,x,y}` in world space.
  Native code derives a complete new offsets vector from the frozen sampled
  deformation and precise frozen bone matrices, changing selected rows only.
- Extend the existing atomic `setAnimationKeyBatch` with default-empty
  `drawOrderKeys` and `deformKeys` arrays, preserving older bone/slot callers.
  Existing move/delete/duplicate operations extend across the same global key-ID
  allocator; new family ID vectors remain separate from bone/slot vectors.

The codec should preserve the raw sparse order records and deform data-presence
state. Public `order:null` retains reset semantics: it follows Setup after a
later Setup reorder. A resolved identity permutation alone cannot represent that
distinction. Existing noncanonical representations remain rejected by complete
reserialization rather than silently normalized. Native full-order→sparse
conversion must use a proven helper, with newly authored canonical policy
distinguished from original gesture chronology.

## Frozen sampling and working poses

`EvaluationSnapshot.drawOrder` is the complete resolved stable-slot-ID order;
`deformPose` contains `{attachment,offsets,worldVertices}` with f64 sampled
geometry. Snapshot selection remains independent of active attachment: an
inactive mesh keeps its own keys, while active-none hides it. Scratch offsets
apply before attachment skinning/rendering; bone animation and constraints feed
the same frozen bone matrices. Never write sampled vertices, preview time,
velocities, UVs, topology or weights into the canonical Setup project.

Add optional temporary `drawOrderPose` and `deformPose` request overrides only
for a selected animation with `mode:none`, consistent with current temporary
bone `animationPose`. Validate every ID, duplicate, permutation, vector length,
finite value and supported bound. Bind the complete override data, target
geometry layout, FPS and selected clip to the private cache/layout. The public
gesture guard checks document/revision/epoch/clip/frame and target identity.
Wrong frame/clip, replaced topology/binding and stale resources reject before
any key/history mutation.

Auto Key off uses root's existing JavaScript scratch binding preview and a
temporary offsets/order draft. A later native freeze validates that draft;
manual keying authors it explicitly. Scrub/clip/mode/document changes discard
working state; an empty clear must remain a no-op. One completed drag creates
one key transaction. Local sampling/rendering continues without per-frame IPC.

Draw order projects a separate rendered slot array, never mutates Setup slot or
attachment inventory arrays. Both viewports, hit testing and clipping consume
the same sampled order/activation. Extend the existing borrowed clipping
interval validator with a validated order/rank map: a clipping end retains its
stable identity; an end before its owner in sampled order or overlapping active
ranges rejects under the existing FBones profile. Validate the union of discrete
attachment and order-key event states. No original clipping-reorder gesture
parity is inferred from this protection policy.

## Existing inverse APIs and exact candidate call path

Source inspection commands were targeted `sed`/`rg` in `binding.rs`, `mesh.rs`,
`solve/math.rs`, `rig.rs`, `evaluation.rs`, `project.rs`, `scene_edit.rs` and
`scene_bridge.rs`; no build, original run or product mutation was required.

- `mesh::move_vertex` computes a current world point, then calls
  `binding::move_vertex`. That function applies the world delta divided by total
  row mass through each **positive** column's inverse basis, preserving dormant
  coordinates and all weights. It stages positions and assigns only after all
  required inverses succeed. This is existing FBones Setup binding behavior;
  it does not prove original Animate weighted-deform gestures or vector layout.
- That existing path takes f32 `rig::Pose`. `Pose::inverse` rejects nonfinite or
  absolute determinant below1e−8. Do not change it or redirect old Setup callers.
- Precise native caches already retain `CachedEvaluation.evaluated` with f64
  `solve::Affine` worlds. `Affine::{point,vector,inverse}` are reusable directly.
  Its existing scale-aware guard rejects nonfinite determinants, zero norm or
  `abs(det) <= 1e−12 * norm²`. Do not change that epsilon. Avoid round-tripping
  precise matrices through public f32 snapshot worlds or `cache.poses` before
  interpreting a new deformation gesture.
- `Session::geometry_poses` currently returns those f32 poses. Reuse its
  document/revision/epoch checks, but add a narrow new precise deform context
  accessor using the private evaluated worlds and frozen offsets. The existing
  `authoring_evaluation` Match accessor demonstrates private precise cache/ID
  checking; its constraint-specific target/prefix solve is not reused for deform.

Planned path: `Session::edit_impl` → validate required deform epoch/context →
derive a complete scratch key using precise worlds → existing Scene history
clone/validate/encode/commit → one revision/history action. For each selected
row, obtain its already-deformed current point, compute desired world delta,
and inverse-transform the vector for each relevant nonzero influence using the
existing mass-corrected binding pattern. Convert back to stored offsets once,
with the DATA-proven traversal. Perform every inverse/bounds check before
committing. A singular **relevant** inverse rejects the entire gesture; a
zero-weight/dormant singular column must not be inverted merely because it is
present in dense Setup storage. Do not zero, initialize or activate its fields.
Whether dormant columns have stored deform entries is still a separate raw gate.

This precise gesture policy is an explicit FBones integration choice. It must
not be called measured original weighted authoring arithmetic. Existing solver,
Setup binding policy, inverse epsilon and original F307 clock remain unchanged.

## Reference maintenance and acceptance cases

Stable attachment targets survive rename/inventory reindex/slot reorder through
the same stable-ID remapping used by current slot keys. Reject deletion of a
keyed target. A binding/positive-mask/vertex-order change can alter deform-vector
meaning despite the same vector length: compare the complete target layout and
reject atomically until a lossless reviewed remap exists. Do not silently drop
keys. A resource-path-only edit can preserve keys when layout is unchanged.
Reparent/owner changes need an explicit preservation policy rather than guessed
offset rotation. For Setup slot reorder, root permits either preserving explicit
draw-key stable-ID orders and null reset semantics through proven sparse
re-encoding, or an atomic rejection until that remap is justified.

Required focused tests before delivery:

1. Raw new-record roundtrips, presence/terminal-curve bits, signed offsets, arena
   ownership, mixed curves, malformed dimensions/indices/unknown rejection.
2. Reset vs explicit permutation before/at/after keys; Setup reorder behavior;
   active/none and sampled clipping order, without history on scrub.
3. U/W/Clip target-specific dimensions and the measured zero-column traversal;
   nonzero dormant Setup positions remain bit-identical under world-target drag.
4. Actual frozen nonzero Setup plus sampled offsets and constrained bones:
   selected rows hit intended targets, others stay identical; raw geometry/UVs/
   weights/topology/Setup snapshots do not change. Undo/Redo and Save/Close/Open.
5. Relevant singular inverse fails the whole multi-vertex batch; irrelevant
   dormant singular columns do not fail it; no global epsilon changes.
6. Required/stale/wrong-clip/wrong-frame epochs and changed layout reject with
   no consumed IDs/history. Temporary Auto Key off pose freezes and cancels
   cleanly without serialization; actual manual keying is one transaction.
7. Mixed-family key batches/clipboard/move/delete/duplicate keep globally unique
   identities and canonical group order; Bezier neighbor policy remains explicit.

Useful scratch arithmetic independent of pending wire layout: two positive
weights.25/.75 and one dormant0; worlds A=(scale2×1,translation10,−5),
B=(90° rotation,translation−3,7); current local positions A=(2,4), B=(5,−2),
dormant=(91,−13). World point=(2.75,8.75). A requested world delta=(3,−4) yields
local deltas A=(1.5,−4), B=(−4,−3), dormant unchanged, and target=(5.75,4.75).
This is an own arithmetic expectation for future tests, **not original evidence**
and not permission to choose a weighted wire traversal before the new raw gate.
Exact rational arithmetic verified this expectation independently; the ignored
`.local/animation-draw-deform-arithmetic-expectations.json` retains the matrices,
old/new dense rows, target and explicit unmeasured wire boundary. This is not a
native product test or an original animation observation.

The additional ignored `animation-deform-near-unit-mass-expectation.json` uses
stored f32 weights.1/.2/.7 whose positive f64 sum is.9999999925494194, three
different positive-influence matrices and a singular dormant column. Exact
rational verification shows why the inverse-column delta must divide by that
actual sum: omitting it misses the target by roughly2.33e−8/3.03e−8. Its requested
world targets contain genuine f64 precision. The new command's vertex input
must therefore use f64 `x/y`, rather than reuse legacy f32 `VertexMove`. This
remains a geometric policy expectation, independent of pending wire traversal.

## New492c raw gate received, public model handshake pending

DATA's independent complete new parser reaches all6552 decoded bytes. The WZ/Z
target retains two dense binding columns, including row weights `[1,0]`, and a
16-coordinate deform vector for four rows/two columns/two coordinates. Runtime
JSON reduces it to eight coordinates by pruning dormant entries. Thus the
weighted **editor wire layout is dense, including zero-weight columns**; the
positive-only hypothesis is false. Native vector dimensions and persistence
must use dense Setup membership, not the smaller runtime JSON array. World-target
geometry edits still affect only positive columns; every dormant offset and bind
position is retained, even when its matrix is singular.

The same new gate directly proves Clip84 as a kind6 target and negative Draw
Order offset39 values raw1→−1 and raw5→−3. U/Clip unweighted vectors are
dimension8 with present data on all keys; weighted W/Z all-zero keys retain
`data_present:false`. These observations close those old unknowns without
granting general original gesture/GPU parity. Product implementation still waits
for the exact final DATA public-type/helper handshake and mixed-curve report.

Native ownership after that gate: new `animation_order.rs`, `animation_deform.rs`
and focused tests, with minimal existing animation/SceneFrame/RigEdit/Session/
evaluation integration. DATA owns the codec; root owns editor DTO/store/sampling;
UI owns the reference-backed controls. Root owns final rebuilt UI, independent
new UI-source original acceptance and targeted Windows delivery. Keep broader
deform geometry/skins/constraints/events inspection-only until their own gates.

## Final coordinator and DATA handshake

Root's authoring policy normalizes a requested non-null Setup identity order to
the empty-offset reset. There is no separate locked-identity authoring mode and
no invented zero-offset marker. Existing nonempty raw literal offset lists are
still retained losslessly. Setup reorder preserves their resolved stable-slot-ID
order by recomputing offsets; empty reset follows the new Setup. The nullable
`order` input field is required to be present; explicit null means reset, while
omission rejects like current nullable attachment keys.

The final independent new raw gate is GO:
`analysis/animation-next-draw-deform-reference-check.json`, report140d123a prefix,
6552 decoded bytes,25 keys and505 scalar comparisons with arena aliases checked.
The agreed crate API adds `Animation.draw_order: Vec<DrawOrderKey>` and
`deform_tracks: Vec<DeformTimeline>`. `DrawOrderKey` retains raw
`Vec<SlotOffset{slot,offset:i32}>`; `DeformTimeline` targets `AttachmentAddress`;
`DeformKey` retains `frame`, full dense `offsets`, Boolean `data_present` and
`DeformCurve::{Linear,Stepped,Bezier{controls:[f32;4]}}`. Helpers resolve/recompute
draw-order permutations and provide the canonical deform-track permutation.
Native applies that permutation to its parallel key identities. The codec owns
unrepresentable all-zero signed-zero and arena-budget rejection. Root authorized
native implementation once this exact public API checkpoint is present.

Root also confirmed `DeformKeyView.dataPresent:boolean` and optional raw-key
input `dataPresent`. A same-frame replacement retains its old flag unless
explicitly supplied. New zero keys use measured weighted=false/unweighted=true
presence; nonzero coordinates need present data. Absent data requires every
coordinate to be positive zero. Present full vectors retain representable
dormant signed-zero bits; the codec rejects an unrepresentable compact
all-numerically-zero vector containing negative zero. Snapshot deformation
includes default zero offsets and f64 world vertices for explicitly requested
Mesh/Clip targets, allowing an authoritative first gesture before any deform key
exists. The scoped-geometry decision below supersedes the all-inventory proposal.

## Implemented native checkpoint

New `animation_order.rs` and `animation_deform.rs` plus minimal existing Session,
history, binding-context and snapshot integration implement the agreed DTOs and
commands. Existing bone/slot APIs remain. Full default native checks pass232
tests with2ignored, including all previous222 cases and10 new cases. Strict
default Clippy passes. Logs are `.local/animation-deform-native-all-final.log`
and `.local/animation-deform-native-clippy-final-2.log`; legacy/e2e-host profile
checks are recorded separately. Rebuilt frontend interactions, independent new
UI-source original acceptance and Windows delivery remain root's separate gates.

The final performance contract adds optional `EvaluationRequest.deformTargets`,
defaulting to no explicit targets. Native public deformation and private cached
geometry cover only the union of keyed, temporary and requested attachments.
Ordinary Setup/no-animation checkpoints stay empty. Requests are bounded,
distinct, target-validated and available only for a None-mode freeze. Root sends
the selected unkeyed target for a first drag and merges partial native poses with
local sampled/draft poses. There is no default full-inventory zero allocation or
geometry transfer. `drawOrder` remains a small complete slot-ID list.

The f64 world-target command requires a current clip/frame/target epoch, uses
precise private Affine worlds and divides by actual positive f64 row mass before
inverting only positive columns. Selected rows change; dormant/unmoved offset
bits and Setup bindings/UVs/topology stay untouched. Stored offsets round once
to f32 at authoring. Temporary overrides do not serialize or create history.
Relevant singular inverses reject atomically; all existing inverse thresholds
and Setup callers remain unchanged. This remains a labeled FBones gesture policy.

Draw-order remapping is a no-op on unrelated Setup edits, preserving exact
literal offset records. Actual Setup reorder preserves nonempty keys' resolved
stable IDs. If one becomes identity relative to the new Setup, its existing
record-slot identities are retained with zero relative offsets; no new marker
record is invented. Only newly requested identity authoring becomes reset.
Explicit draw keys reject slot addition/deletion until a membership policy is
implemented. Keyed deform targets reject binding/vertex-layout/owning-slot
changes; rename and pure slot reindex preserve references and stable key IDs.

The10 new tests cover mass-corrected precise scratch math; nullable reset and
literal remap collision; U/W/Clip dense vectors/presence/signed bits/resource
Save/Close/Open; epoch-guarded world targets; temporary poses and cancellation;
four-family key identity/history/move/delete/duplicate; structural rejection;
combined attachment/order clipping validation; sparse first-gesture geometry;
and exact literal preservation under unrelated Setup edits. Original GPU/gesture
parity and other animation families are not implied by these native checks.

## JSON transport signed-zero correction

The pinned Tauri2.11.5 `scripts/process-ipc-message-fn.js` uses ordinary
`JSON.stringify` for object command payloads; its replacer leaves numbers
unchanged. The local file SHA256 is
`d51917f89e4d3d318d63f1f4f5a7ac7ea1399a5b85c81a840c4d606597f29132`.
A direct Node check of `JSON.stringify({offsets:[1,-0]})` yields numeric `[1,0]`.
Thus a supported present vector containing a nonzero coordinate and dormant
negative zero can lose its zero sign before raw manual/clipboard authoring.
Existing native-only serde Value tests did not exercise that JS transport.

Raw deformation inputs now accept optional `offsetBits` (u32 coordinates).
Native requires equal vector lengths, finite decoded f32 values and numerical
agreement with `offsets` (the two zero signs compare equal), then uses the
decoded bits before all existing bounds/presence/codec guards. This is input-only
IPC metadata, with no new project container or duplicated summary payload.
Temporary f64 deformation requests instead accept sparse `negativeZeroIndices`;
private deserialization requires distinct in-range numeric-zero indices and
restores only their f64 signs. Other f64 values are untouched, and the effective
offset bits enter the existing frozen-layout guard. Native world-target inputs
already preserve signs internally and do not require either transport carrier.

Three new tests cover direct/combined real-JSON raw keys, portable persistence
and Undo/Redo; malformed bit vectors with atomic mixed-batch rollback; and
precise temporary JSON freeze followed by a world-target edit retaining dormant
negative zero. The prior232-case checkpoint remains a historical baseline;
final signed-zero checks are recorded separately in the local native report.
