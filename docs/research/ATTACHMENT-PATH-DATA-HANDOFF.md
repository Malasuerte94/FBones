# Attachment image-path editing: data handoff

Recorded2026-10-29 before dependent implementation. Paired UI findings are
`ATTACHMENT-PATH-UI-HANDOFF.md`. This audit reuses accepted exact4.3.26 files;
it runs no original command, sends no original input and changes no product code.

## Directly proven existing format, not a swap gesture

| Attachment kind | Name | Raw image override | Stored dimensions | Geometry |
| --- | --- | --- | --- | --- |
| Region43 | tag1 | tag13 | tags11/12 | x/y/rotation/scale, owner bone |
| Mesh46 | tag1 | tag14 | tags16/17 | UV tag12, faces tag13, edges tag8, Binding71 tag28 |
| Clipping84 | independent name | none | none | real clipping vertices/binding |

Sources: `FORMAT-REGIONS-4.3.26.md` R03, `FORMAT-MESHES-4.3.26.md`,
`analysis/regions-check.json`, `analysis/refinements-format-check.json`
(`nested-path`, `image-folder`), and the typed Scene codec acceptance.
They establish independent names/overrides and exact round-trip path handling.
They do **not** demonstrate an original interactive path swap, automatic
dimension adjustment or a different-size replacement.

`analysis/slot-attachments-check.json` and the later delivered Scene evidence
establish inventory and nullable slot activation separately. Changing a texture
reference does not require another slot, attachment identity or active pointer.
The early report's legacy rejection describes its historical profile, not the
current Scene implementation.

## Official documentation, patch version unpinned

The primary [Region guide](https://en.esotericsoftware.com/spine-regions#Image-path),
[Mesh guide](https://en.esotericsoftware.com/spine-meshes#Image-path) and
[image lookup guide](https://en.esotericsoftware.com/spine-images#Image-file-lookup),
read2026-10-29, describe empty override→attachment-name fallback and explicit
override lookup. Attachment name uniqueness is separate from shared image paths.
The Images folder is another, skeleton-level path; do not confuse it with the
attachment's relative resource key.

The [Mesh image-resize guide](https://en.esotericsoftware.com/spine-meshes#Image-resize)
describes a UV-adjustment choice when an **existing image file** changes size.
That is not proof of the behavior of changing an attachment to a different
path. No current primary guide settles every Region/Mesh dimension field or
binding mutation for that direct swap. Older-version material is not used.

## Current FBones behavior and preservation requirements

`Region.path` already stores the raw string; empty is significant.
`scene_bridge.rs::region_view` currently exposes only the effective `image`
key through `image_key`, not the raw override. A new inspector must receive a
separate raw path; displaying the effective key as authored override loses the
difference between empty fallback and an explicit equal-to-name path.

Current RenameAttachment deliberately preserves the old PNG reference while
renaming an attachment. Do not reuse that command for resource editing.
`UpdateAttachment` currently writes only five transform channels. No direct
path mutation API exists. Clipping must reject an image-path command; it must
not acquire dummy Region metadata.

For a **path-only** operation, preserve stable attachment ID, name, kind,
ordered inventory, slot owner, active reference (including inactive/none),
draw order, tint/blend, constraints and all unrelated resources. Region transform
channels and Mesh UVs/faces/edges/bones/weights/local-position bits must not be
implicitly reset, rebound, retraced or converted. Identical paths may be used
by multiple attachments; path sharing is not a name collision.

Current ImageLayer uses stored Region width/height to fit the loaded texture.
For Mesh it uses existing world vertices and normalized UVs with the new texture.
Therefore blindly changing only the key to a different-size PNG preserves the
current FBones shape and stretches the sampled artwork. That observation of
our renderer is **not** evidence of original path-swap resizing semantics.

## Proposed bounded native command; decisions required first

Suggested internal shape: `setAttachmentImagePath {id,path}` using a stable
attachment ID and a raw string; `""` explicitly clears to name fallback.
Resolve effective key after applying fallback. Do not rename the attachment,
switch activation, overwrite PNG files or alter the Images folder. A pure
resource-reference update interprets no world target, so it should not require
a frozen geometry pose merely to choose a PNG.

Use the existing portable PNG-key validator and exact library key lookup, with
revision/type/bounds checks before mutation. Reject absolute/traversal/backslash/
reserved names and case collisions under the current portable profile. Do not
blindly strip an extension: a legitimate scanned stem can itself contain a dot.
The coordinator must choose whether missing assets are accepted as placeholders
or rejected by this new operation. Existing missing-image save safeguards and
inspection-only unknown profiles must remain intact either way.

**Dimensions remain an explicit policy choice, not original proof.** Options:
initially require an existing same-size PNG; or define a geometry-preserving
replacement policy and separately decide stored width/height updates; or add a
deliberate resize/UV operation. Do not silently infer an original resize choice,
scale bind coordinates, or change mesh UVs from the external-file-resize guide.
Any different-size rule must be approved and labeled before implementation;
keep remaining F222 scope open if an initial bounded profile excludes it.

## Profile, save and actual-interaction gates

- Keep complete canonical reserialization equality. New editing needs no new
  wire record or arbitrary opaque field. Unknown skins, linked meshes, sequences
  or unsupported metadata remain inspection-only; a path field does not license
  rewriting those structures.
- Resolve explicit inactive attachment IDs, not the slot's active image. One
  successful change is one undo step; identical raw value is a data no-op.
  Native historical focus must not jump selection after a no-op; test that
  separately from author data, as done for the earlier weight no-op fix.
- Save traverses **all** image attachments, including inactive alternatives.
  Keep image caches/resources needed by undo, validate the complete image bundle,
  retain missing-image failure behavior and never overwrite different PNGs.
- Test Region and weighted Mesh path changes, active/inactive/none, shared PNG,
  empty fallback, name/path independence, malformed/stale requests, missing or
  differently sized targets under the chosen rule, and exact unchanged geometry/
  bindings/order. Native save/close/reopen must retain the raw override.
- Actual inspector Enter/blur/Escape/save flush and selected inactive pixels
  need UI checks. Existing rename/slot/browser drops do not prove path-input or
  Browse-button interaction. No fresh original swap or GPU claim is made here.

Implementation remains gated on the paired findings and the coordinator's
explicit dimension/missing-resource decisions. No original rerun is needed to
re-read the accepted static field evidence.

## New actual UI source and original-export limit, 2026-10-29

The newly UI-authored source SHA256
`537d66b0edef444b0e1c7c67bf5e8058b9aff4eb1d5bf1cf4fbfc25fc7b7100b`
was accepted by original4.3.26 in **one** export (exit0). Independent checker
`.local/check-f222-path-export.py` runs zero original commands and validates
the complete portable snapshot, before/swapped/saved stages and existing
original output. Aggregate: `analysis/f222-path-original-check.json`.

**New directly observed difference:** the active red Region retains raw/native
stored96×96 dimensions after its path changes to strip, whose PNG is160×48.
Original runtime JSON exports that Region as160×48, without scale compensation.
Its reconstructed runtime corners therefore differ from FBones' retained96×96
shape. This is not a failed binary import, but it is a material runtime geometry
difference. Do not label this comparison complete geometry parity or infer a
matching original GUI path-swap operation. The approved geometry-preserving
FBones policy remains an explicit own behavior with this observed limitation.

The inactive weighted blue Mesh changes to `parts/skin.v2` while retaining all
UV/topology, eight positive weights and16 local-coordinate components. Its raw
source bits and runtime values match; maximum reconstructed runtime world error
is about0.00000501 due to exported decimal weight rounding. This particular
fixture has **no** zero-weight columns: dormant-bit tests remain separate native
evidence. Green's empty raw override/name fallback stays unchanged throughout;
there are exactly two recorded changed path actions, not a third clearing action.
All10 snapshot files and seven portable PNG hashes/dimensions are verified.
