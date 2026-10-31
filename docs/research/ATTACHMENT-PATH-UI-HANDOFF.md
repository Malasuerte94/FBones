# F222 image-path editing: UI handoff

2026-10-29; read-only audit before dependent code. Paired data handoff:
[ATTACHMENT-PATH-DATA-HANDOFF.md](ATTACHMENT-PATH-DATA-HANDOFF.md).
No original GUI input, export command or accepted-batch repeat was performed.

## Exact4.3.26 evidence reused

- Original private capture `feature-ui/multi/slot-row-b-selected.png` shows
  **Region: B** selected in Tree and an **Image path** row containing
  `parts\blue`; A remains active/rendered and the title stays clean. The
  attachment name B and image path are visibly distinct. The row has two small
  right-side icon controls; their actions were not exercised, so glyph appearance
  alone does not prove Browse/locate/open behavior.
- Private `auto-scope-ui/weighted-insert-before-editor.png` shows **Mesh:
  scopeMesh** with Image path `scope-grid` in the same compact inspector position,
  above Options and Color. This is layout/path-display evidence, not path editing.
  Both captures were collected on owned exact4.3.26 sessions; see
  [FEATURE-UI](FEATURE-UI-4.3.26.md#f222f301--attachment-selection-and-activation-are-independent)
  and [AUTO-SCOPE UI](AUTO-SCOPE-UI-4.3.26.md). Images remain ignored/private.
- [Regions R03](../FORMAT-REGIONS-4.3.26.md),
  [nested paths](../FORMAT-REFINEMENTS-4.3.26.md) and
  [A/B/none](../SLOT-ATTACHMENTS-4.3.26.md) prove persisted attachment names,
  explicit paths, inventory and active references are independent. They do not
  prove a GUI path-swap transaction.
- [Mesh M04](../FORMAT-MESHES-4.3.26.md) retains stored width96 with a current
  PNG width32 and unchanged geometry. Stored dimensions and loaded PNG dimensions
  therefore cannot be silently treated as the same value.

## Primary documentation fallback — patch unpinned

Read2026-10-29 after the local inventory above:
[Region Image path](https://en.esotericsoftware.com/spine-regions#Image-path),
[Mesh Image path](https://en.esotericsoftware.com/spine-meshes#Image-path) and
[Image file lookup](https://en.esotericsoftware.com/spine-images#Image-file-lookup)
document name fallback for an empty override, explicit-path lookup instead of
name, relative subfolders and multiple attachments sharing one path. This does
not establish raw-override versus effective-key presentation in the current DTO.
The guide's broader PNG/JPEG lookup is not proof that FBones' bounded PNG profile
supports JPEG. [Mesh Image resize](https://en.esotericsoftware.com/spine-meshes#Image-resize)
describes a UV choice when an existing file is resized externally; it is **not**
evidence for changing an attachment's path to a different-size file.

## Implementation handoff and acceptance boundaries

Expose an Image path property on the **inspected Region/Mesh**, distinct from
Name and Owner. Clipping has no image path. Resolve an inactive selection through
its stable attachment ID; preserve selection, inventory, owner, active pointer
and slot draw order. The inactive-row inspection rule is exact evidence; keeping
those identities fixed during path editing is the proposed safe FBones contract,
not an observed original swap result. Do not activate the edited alternative.

A library picker and Enter/blur/Save-flush text handling may use FBones' shared
field workflow; their exact original gestures and icon actions remain unknown.
Keep pending text scoped to document/attachment/revision, report invalid or
missing resources without a silent rewrite, and await the native edit before
Save. Reuse the native resource validation/bundle path, with one undoable native
edit and portable save/reopen. These are implementation safeguards, not original
interaction claims. Same-path reuse must not require duplicate attachment names.

Direct same-size and different-size swaps, region dimension adjustment, weighted
mesh UV/binding changes, missing-image error UI, undo grouping, cancellation and
post-swap save effects have **not been observed in original4.3.26**. Preserve mesh
UVs/vertices/weights/topology and region transforms unless an explicitly recorded
FBones policy says otherwise; never insert an implicit Reset/Bind/Auto. Different
PNG dimensions require an explicit bounded policy or separate evidence, not an
assumed resize rule. Validate active/inactive Region and weighted Mesh swaps,
all coordinate bits, unaffected alternatives, real pixels and native save/reopen
before accepting the product change. Existing path persistence is not that pass.
