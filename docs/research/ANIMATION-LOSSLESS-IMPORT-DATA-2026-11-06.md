# Lossless known-record import DATA gate — 2026-11-06

The pre-code findings and API agreement were sent to the coordinator before the
codec implementation. This note records that gate for the paired UI audit:
[UI gate](ANIMATION-LOSSLESS-IMPORT-UI-2026-11-06.md). All observations below are
local read-only parses of pinned copies; no original Spine action was performed.

## Direct evidence and decision

The smallest copied real project reaches all known grammar/typed records. An
ignored standalone prototype retaining explicit owner/track order moves first
mismatch142→1765. Retaining67 **typed string field identities**, independently
bound to their semantic owner/tag, moves the next mismatch to27039, with equal
27,253-byte lengths. Exactly one byte remains: Skeleton11/tag46 stores f32=50,
while the old canonical writer hardcodes100. Retaining those known finite scalar
bits produces complete equality of all27,253 bytes and all reference/type checks:
10bones,6slots,19animations. No raw graph, original payload or opaque record cache
is used by the writer. Source Record fields retain their known serializers.

Ignored proof tools/results: `wire-provenance-v{1,2}/`,
`wire-field-provenance-v1/`, `string-provenance-v{1,2}.log`,
`field-provenance-v1.log`, and `string-provenance-selftest.log` under the existing
ignored corpus evidence folder. Selftests additionally prove numeric Setup/key
edit→independent reparse/equality, conflicting alias-text detection in the first
experimental API, and byte-identical canonical encoding when provenance is absent.
The first alias selftest used an empty inventory address and failed before alias
checking; its log is preserved separately and the corrected inventory lookup
passes. These prototypes are feasibility evidence, not editable product acceptance.

## Agreed typed implementation contract

`SceneProject.wire: Option<SceneWire>`; absence preserves the old canonical writer
byte for byte. Decoding tries that canonical representation first. Only if it
fails does it attach known provenance and require complete equality again.

`SceneWire` retains finite Skeleton11/tag46 bits, typed string aliases and complete
animation layouts. String identity addresses are semantic owner+field tag;
abstract alias groups are independent of generic-arena positions. Writer identity
is `(group,currentText)`: unchanged equal strings share their reference, renamed
values split safely. Unsupported field owners/tags, repeated addresses, invalid
indexes or unrepresented aliases reject instead of copying original bytes.

Animation layouts retain owner order and within-owner track order through semantic
selectors: bone+channel, slot+Attachment/RGBA, attachment deform, constraint+kind,
Event definition and DrawOrder. Layout validation requires each current track
exactly once under its actual current owner, bounded sizes and no duplicate/empty
groups. Native edits reconcile addresses through before/after stable IDs before
validation: deleted targets prune, surviving targets remap, owner changes relocate,
new tracks append to matching retained/new groups. No stale index may refer to a
newly allocated object, and imported order must not change visible Tree/draw order.

The single zero-size Region stores width=height=0. Preserve those bits with
nonnegative finite Region dimensions; continue rejecting negative/nonfinite values
and zero-size Mesh images. New PNG placements remain positive. Native DTOs copy
stored values directly and mesh geometry operations reject collapsed mappings;
no texture-size fallback or guessed geometry is permitted. This is a bounded
FBones preservation policy; original zero-size rendering semantics are unknown.

## Acceptance limits

Complete equality on one copied source is proven by the prototype. It does not
prove product integration, native key/history/save/reopen, rendered appearance or
independent new-file acceptance in original4.3.26. Those gates remain required.
Windows interop currently fails before running commands; do not claim original
acceptance or ship an unverified Windows replacement. Other seven projects retain
their unsupported-record boundaries. Generic116/Object123/kind22/14/69 and broader
editor records are not made editable by this profile.

### Correction and source-only zero-size Mesh preservation gate

The first diagnostic logged `attachment.image()` dimensions without its variant.
Calling that attachment a Region was an inference error. The guarded product
check identifies **Mesh46 image metadata** with width=height=0; its separately
stored vertices, UVs, triangles and dense bindings pass the existing checks.
The geometry is not derived from those image dimensions. Earlier Region-only
wording above is superseded by this precise finding.

Before the corresponding implementation, DATA/UI/coordinator agreed:
`SceneWire.zero_size_meshes: Vec<AttachmentAddress>` marks only original decoded
zero-image Meshes. Exact marked-set validation requires finite nonnegative image
dimensions with at least one zero; non-Mesh, stale, duplicate and unmarked zero
addresses reject. Full authored geometry/topology/binding checks still run. The
reader captures markers only in the fully checked fallback profile; authoring
cannot add them. Native stable-ID reconciliation remaps/prunes markers, never
creates one. New Region0→Mesh0 therefore rejects; ResetMesh on a retained marked
Mesh must reject instead of replacing authored geometry with a collapsed quad.
No PNG-size substitution or inferred original rendering semantics is introduced.

Independent review narrowed the dimension policy further before acceptance:
Regions retain the pre-existing **strictly positive** image dimensions. The earlier
nonnegative-Region proposal was based on the wrong variant inference and is not
part of the final profile. Only explicitly marked original Mesh image dimensions
can retain zero; negative/nonfinite values and unmarked zero Meshes still reject.

Family vectors must match their filtered layout traversal, so model equality on
reopen includes track order. `normalize_wire_track_order` provides an atomic codec
helper; native callers remap their parallel stable-key IDs separately. String
normalization removes provenance entirely only when fully validated output is
byte-identical to the old canonical representation (default scalar100, no source
zero markers), preserving canonical decode-as-None behavior after edits.

### Save As / resource-root mutation gate

Source review found a second mutation boundary outside ordinary SceneHistory
edits: `prepare_save` rewrites image/audio roots in its snapshot, and successful
portable Save As rebases those roots across current/undo/redo frames. A root may
share string identity with another known field. Rewriting it can split the alias
partition or make provenance canonical, so each affected typed snapshot must run
`normalize_wire_strings` before encoding/validation. Numeric keys, authored Setup,
resource identities and surviving unrelated alias relations remain unchanged.

Preflight a transactional rebased-history plan **before filesystem writes**:
normalize and validate every affected frame, then commit files and apply the
already validated plan without a new fallible parse/normalization step afterward.
A failed preflight must leave the document/history/resources unchanged; a failed
write must not install the rebased plan. This is an FBones atomic persistence
requirement, not a claim about original Spine Save As implementation. A regression
must use roots aliased with another typed field, Save As to a new directory,
reopen and Undo/Redo across the save with exact metadata/data/resource checks.

## Independent actual native-save comparison

The coordinator's current real Rust Session receipt opens the copied source with
19animations,10bones,6slots and9attachments, including the marked36-vertex Mesh
and4-vertex Clipping, plus one Setup Physics constraint. DATA independently parsed
the original copied source and the actual saved `.fbones`, then constructed the
expected model from the source by inserting only the receipt's Translate key at
frame16. The sole additional permitted change is portable audio root
`./audio/`→`./audio`; images root remains `./images/`.

All checks pass: source27,253bytes→saved27,268decoded bytes;752→753bone/slot keys;
expected entire typed model, entire serialized payload and deterministic compressed
envelope equal the native saved file exactly. Every unrelated key/curve/reference,
constraint, resource path and retained metadata therefore remains unchanged.
Explicit checks cover136Setup f32 bit patterns and312Mesh/Clip geometry f32 bit
patterns, plus topology/bindings/UVs/activation/draw order. Skeleton11/tag46 remains
bits1112014848 (50); the source-only zero Mesh marker and independent authored
geometry remain exact. The original source, both copied inputs and all five PNGs
match their pinned hashes. No raw source graph is persisted in the model.

Evidence in ignored `lossless-import-2026-11-06/`:
`independent-data-result.json`, `independent-resource-check.json`,
`independent-data-check.log` and tool source/lockfile. Manifest
`independent-data-evidence-v1.json` SHA256:
`6c8ecec2e9ace43e7b3656ab949d7e3a7df2feb61b9a45709e9823579849680a`.
The receipt's57start/mid/end samples are native finite-pose checks in Physics
**None** mode, not original solver or rendered-pixel comparisons. Original Spine
acceptance of the newly authored file, browser/native GUI interaction and actual
rendering remain separate pending gates; none is implied by these data checks.
