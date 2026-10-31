# Parent picking implementation contract — FBones policy

Recorded2026-10-29 before dependent code. Paired DATA/UI F309 audits distinguish
documented P parenting from unknown original attachment-to-bone slot creation.
The user explicitly wants P then a bone click for a selected bone/image/group.
The following group/slot policy is our choice, not recovered Spine parity.

- Capture the document/revision and stable selected source IDs. One parent pick
  is one native edit/history entry, including a group. Reject stale/duplicate/
  missing/root-invalid/cyclic sources and invalid resulting constraints before
  any assignment. Keep authored world bone transforms and all attachment world
  geometry. Exact evaluated-constraint parenting behavior remains separate.
- Bones: move only selected top-level bones; selected descendants follow their
  selected ancestor once. Reject a destination inside any moved subtree.
- Attachments: change only the selected authored attachments, never library
  assets or unselected alternatives. If every alternative of an owner slot is
  selected, reparent that slot in place while retaining metadata/activation.
- If an owner slot contains unselected alternatives, create one destination
  slot under the chosen bone for that source slot's selected subset. Use a
  unique derived slot name and copy RGBA/blend. Insert adjacent to the original
  slot while retaining relative order of every pre-existing slot. Preserve the
  global attachment order through correct remapping.
- Transfer the original active reference only if its attachment is selected;
  clear it in the source then. Otherwise retain source activation and leave the
  new destination inactive. Never activate an inspected inactive alternative
  merely because the user reparents it. Preserve selected stable attachment IDs.
- Rebase rigid Region/Mesh/Clipping data as needed for the new owner while
  retaining the world geometry. Weighted bindings and every local coordinate
  bit remain unchanged when bone membership is independent of the slot owner.
  Keep current shear-to-quad behavior for a rigid image that cannot express the
  preserved world shape as Region channels. Do not retrace/Auto/rebind.
- Slot/vertex/constraint/resource bounds and unsupported structures retain the
  existing canonical guards. Stage the whole graph and stable-ID arrays;
  failed geometry, singular inverse or clipping/constraint validity is atomic.
- P replaces the Pose shortcut per user instruction; Pose stays on the toolbar.
  Tree and viewport bone picks share one captured store action; Escape cancels.

This policy deliberately avoids calling UpdateSlot with UI transform/visibility
fields, because that route can change an inactive sole attachment's activation
and active Region channels. It also avoids serially looping old one-item edit
commands, which would produce partial success and multiple Undo entries.
