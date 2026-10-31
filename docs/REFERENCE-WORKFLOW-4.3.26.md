# Reference workflow audit — Spine 4.3.26

Audit date: 2026-10-28. Evidence priority is **direct reverse engineering →
official documentation → an explicitly identified inference**. A feature
working in FBones does not prove original-editor behavior. This document
records evidence, not full compatibility or acceptance of an unfinished change.

## Evidence classes

- **Observed screenshot:** the user's three ignored `spine_pictures/*.png`
  references were inspected directly. Their cropped frames contain no version
  banner, so they establish appearance but cannot independently pin a patch.
- **Controlled 4.3.26:** new owned fixtures imported/exported by the installed
  original explicitly selecting `--update 4.3.26`. Binary conclusions retain
  exact record/order/default evidence; see linked format notes.
- **Documented, patch not pinned:** official Esoteric Software guide read on
  the audit date. Its live pages do not certify these interactions specifically
  for 4.3.26; it is the next source when direct observations are unavailable.
- **FBones choice / inferred / unknown:** no stronger observation establishes
  the original's behavior. Do not promote these to proven parity.

No original GUI was launched for this audit. No personal project, activation
state or editor preference was changed. Only written observations are retained;
the screenshots and their original artwork are not redistributed.

## Appearance and interaction matrix

| Area | Evidence | Conclusion and boundary |
| --- | --- | --- |
| Tree hierarchy | **Observed screenshot**, `Spine_eH8VIB7TXl.png` | A bone row has a distinct slot-like row and a further image/attachment child. This establishes separate visible node levels. The crop shows one attachment per visible slot, not multiple alternatives. |
| Attachment inventory and active item | **Controlled 4.3.26 data**, [three cases](SLOT-ATTACHMENTS-4.3.26.md); **documented interaction**, [Attachments](https://en.esotericsoftware.com/spine-attachments#Hiding-attachments) | Original imports/exports retain A and B with one nullable active pointer. The paperclip action is documented, not GUI-observed here. Multiple alternatives must not become simultaneously rendered siblings. |
| Selection versus activation | **Documented**, [Tree selection](https://en.esotericsoftware.com/spine-tree#Selection), [attachment selection](https://en.esotericsoftware.com/spine-attachments#Select) | Tree selection chooses the item being inspected; attachment activation has its separate paperclip action. Selecting a row must not be treated as evidence that the slot switched its active attachment. Editor selection's binary representation remains unknown. |
| Slot draw order | **Documented**, [Slots draw order](https://en.esotericsoftware.com/spine-slots#Draw-order) | The ordered objects are slots, not every alternative attachment. Higher displayed slots render in front. Dragging slot rows changes that order. |
| PNG multiselection and placement | **Documented**, [Images / creating attachments](https://en.esotericsoftware.com/spine-images#Creating-region-attachments) | Ctrl/Cmd and Shift select several source images for one viewport drag. The guide places viewport drops under root; tree drops onto a bone/slot center on that bone. Selecting a folder only lists source images. |
| Attachment reuse / paths | **Documented**, [Image lookup](https://en.esotericsoftware.com/spine-images#Image-file-lookup) | Image lookup uses the root plus attachment name or explicit path, including subfolders. Same-slot names must be unique; paths can be shared. |
| PNG selection gestures | **Documented**, [Tree selection](https://en.esotericsoftware.com/spine-tree#Selection) | Ctrl/Cmd adds multiple rows; Shift selects the interval. The exact drag-start selection retention and placement layout need direct original interaction evidence. |
| Rotation pivot | **Documented**, [Rotate tool](https://en.esotericsoftware.com/spine-tools#Rotate-tool) | Each bone rotates about its own origin. A shared-centroid Group mode is an FBones option, not demonstrated as the original's ordinary Rotate behavior. |
| Scale axes | **Documented**, [Scale tool](https://en.esotericsoftware.com/spine-tools#Scale-tool) | Scaling uses each item's local axes; X follows its orientation. World scale is a combined display and numeric editing uses local scale. The guide gives no multiselection exception. |
| Shear handles | **Documented**, [Shear tool](https://en.esotericsoftware.com/spine-tools#Shear-tool) | X/Y handles alter the axes' angle. The exact multibone drag conversion under an affine parent is not established by this description. |
| Lower transform controls | **Observed screenshot**, `Spine_qINTitRPSQ.png` and `Spine_5qk2u6L0xb.png` | A lower viewport block contains Rotate/Translate/Scale/Shear numeric rows and Local/Parent/World controls. The screenshot proves their arrangement, not a draggable HUD or exact full-window centering. |
| Bone properties | **Observed screenshot**, `Spine_eH8VIB7TXl.png` | The tree's lower property panel contains bone Length, inheritance toggles and Color. A combined eight-field numeric HUD is an FBones layout choice; the screenshot keeps Length in bone properties. |
| Numeric editing | **Documented**, [Numeric entry](https://en.esotericsoftware.com/spine-tools#Numeric-entry) | Enter/Tab applies a number. Displayed channels depend on selected axes. The current fixed Local HUD must be labeled accordingly. |
| Gizmo appearance | **Unknown exact parity** | Supplied frames do not establish FBones' ring radius, fixed screen size, diamonds, satellites or hit padding. Those are our interaction choices until stronger reference evidence exists. |

## Controlled binary evidence

The nine completed owned 4.3.26 cases in
[FORMAT-REFINEMENTS-4.3.26.md](FORMAT-REFINEMENTS-4.3.26.md) prove bone affine
channels and RGBA, slot light tint, image root and nested path persistence.
They do not prove multiselection gestures, pivot controls or selection semantics.
Do not repeat those accepted cases to answer an unrelated UI question.

The new [two-attachment / one-slot investigation](SLOT-ATTACHMENTS-4.3.26.md)
now proves A/B/none in original 4.3.26 import/export. All three owned cases
retain both regions in Skeleton 11 tag 6; Slot 13 tag 9 selects A, B or null,
and both Region 43 tag 0 links identify the same owning slot. The current
bounded reader correctly rejects the richer inventory without changing bytes.
This proves the data model, not paperclip hit behavior or GPU overlap. Editor
selection remains independent and its persisted representation is unknown.

## FBones boundaries to keep explicit

The initial 0.6.1 batch implementation targeted a selected bone on viewport
drop. After this audit, that assumption was replaced by the documented root
destination; dropping on a Tree bone explicitly chooses it. PNG-sized grid
cells, one-undo batching and save-bundle policy remain FBones choices whose
exact original behavior was not observed. Creating an alternative attachment
by dropping onto an existing slot is documented but remains unimplemented.
The Windows native-drop interception fix is an FBones/Tauri integration
requirement, not a Spine format fact.

The first 0.6.1 gizmo pass used world-axis Scale. This audit identified the
documented mismatch. The corrected native local-axis operation multiplies
each selected top-level bone's own scale channels, preserving its origin and
other local channels; rotated/sheared-parent and canonical/history tests cover
the implementation. The viewport Scale tool must send that explicit operation.
This is documentation-led alignment, not a claimed original gesture recording.
A fixed Local numeric HUD is a partial axes workflow;
Parent/World display switching remains separate work. Bone translation's stored
coordinates are parent-relative even when the HUD uses a compact Local label.

The user's B-to-create preference is retained deliberately. Original default
tool shortcuts must not be inferred from FBones bindings. Pose currently has
no chain IK, and separate Length editing is an explicit FBones interaction.
These limits remain visible in TASKS/STATE until individually implemented and
verified. Full project compatibility and Linux/macOS GUI verification remain
separate progressive goals.
