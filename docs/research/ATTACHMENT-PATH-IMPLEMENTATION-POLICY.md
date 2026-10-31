# F222 image-reference replacement policy — FBones

Recorded2026-10-29 before dependent implementation, after the paired
`ATTACHMENT-PATH-{DATA,UI}-HANDOFF.md` audits. Existing exact4.3.26 static files
prove independent attachment names/paths and stored dimensions. The actual
path-swap gesture and different-size arithmetic remain unknown in the original.
The following is the coordinator's authorized implementation choice.

Expose raw Image path on the inspected Region/Mesh. A typed command
`setAttachmentImagePath {id,path}` changes only that raw override. Empty string
means explicit attachment-name fallback; effective lookup is a separate DTO
value. Do not rename, activate, move, clone, rebind or retrace an attachment.
Clipping has no image and rejects this command.

Accept an existing, exactly cased PNG key from the loaded Images library,
including safe nested keys and stems containing dots. Use existing portable
key validation. Do not trim/strip an apparent extension or guess another case.
Missing, malformed, stale, unsupported or unavailable resources reject atomically
before any state/history/write. An identical raw value is a true no-op.

**Allow same-size and different-size PNGs while preserving geometry.** Keep
Region channels and stored width/height, plus Mesh UV/face/edge/bone/weight/
local-coordinate bits. Artwork uses existing Region bounds or normalized Mesh
UVs, so a different aspect ratio stretches through that unchanged shape. Show a
concise geometry/UV preservation hint. Do not imply automatic resizing matches
Spine; a later explicit resize operation is separate from path replacement.

Native Session preflights the effective key against its authoritative image
cache, then performs one staged revision-checked edit and one Undo entry. A pure
resource reference needs no geometry pose epoch. Preserve active/none,
unselected alternatives, owners, draw order, tint/blend, constraints and unknown
file guards. Keep old/new cached PNGs for Undo/Redo and complete portable
Save/SaveAs, including inactive alternatives.

Use the shared field workflow for Enter/change/blur/Escape and Save-awaits-edit,
with stable document/attachment/revision identity and raw-empty preservation.
A library selector chooses a key, independently of attachment naming. Test
active/inactive/none, shared keys, fallback, differing aspect ratios, real changed
texture pixels, untouched geometry/bind bits, stale/missing/error atomicity,
history and native binary save/reopen. Add one new own UI-authored original
export; do not repeat accepted batches or claim original swap-gesture/dimension
behavior from structural acceptance.
