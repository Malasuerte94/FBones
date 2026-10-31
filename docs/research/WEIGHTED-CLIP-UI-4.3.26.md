# Weighted clipping UI audit — original4.3.26

Recorded2026-10-29 before dependent production edits. Pair with
WEIGHTED-CLIP-DATA-4.3.26.md. No user window received input. Existing accepted
weighted-clip codec and static masking evidence were reused, not re-exported.

## New exact-version owned observations

New own asymmetric four-vertex clipping alternatives, one red image, root and
two already affine/rotated child bones were imported using actual original
`--update 4.3.26 --import skeleton`; exit0/Complete. The immutable baseline
and independently editable copy live under ignored
`.local/research/weighted-clip-ui/`. Fresh own original PID69288 was launched
only after confirming no existing visible original GUI. Its start timestamp,
image path, HWND and exact title were verified before every operation. User
windows33932/67032 and all prior original handles were excluded.

- **Observed:** selecting an unweighted clipping attachment exposes the same
  Weights panel as image meshes. The initially empty Bones list is distinct
  from its implicit owner transform. Bind is enabled; Auto/Remove are not
  presented as existing computed membership. Selecting an inactive alternative
  leaves the active clipping's paperclip unchanged.
- **Observed:** Bind enters a dedicated `Weights: Bind Bones` state and lights
  the Bind button. On the active clip, actual guarded viewport clicks added
  boneA, then boneB, then root to the list. Bind again exits that state.
  Each list row has its influence color; these colors also identify viewport
  bones when the Weights tool is active. The original uses Remove for selected
  list members rather than a separate observed Unbind-all button.
- **Independently data-proven for this sequential action:** saved
  `bound-three.spine` binds `[boneA,boneB,root]`; every vertex is `[1,0,0]`.
  Adding the later bones did not silently distribute weights. All local
  influence coordinates, including zero influences, are initialized from the
  then-current posed bones. Setup world vertices agree with the unweighted
  baseline to approximately1.01e-5. See paired DATA audit for exact checks.
- **Observed layout:** Mode menu contains Direct, Add, Remove and Replace.
  Direct replaces brush sliders with a Weight numeric/slider control. Add/
  Remove/Replace display Strength, Size and Feather. Smooth/Auto/Weld and
  Pies/Overlay/Selected controls are separate. Selecting a vertex exposes per-
  influence percentages in the Bones list. These controls act on real clip
  vertices; no image/UV conversion is required.
- **Observed and independently data-proven numeric boundary:** with one vertex selected,
  boneA displayed100%. Entering50 into Direct Weight restored the displayed
 100%; the project nevertheless acquired a dirty marker. Both before and
  clean saved `numeric-dominant-lower.spine` are preserved. The paired binary
  audit confirms all four weight rows and all24 local-position components
  unchanged. A dirty marker therefore does not establish a geometry change.
- **Limit:** for the initially inactive clip, guarded synthetic Tree/viewport
  picks and two guarded actual viewport picks in Bind mode did not add bones.
  Switching to the active clip made the same actual viewport positions work.
  This does not prove a universal inactive-binding prohibition. Inactive
  authoring remains an explicit FBones requirement, without claiming identical
  original interaction.

Private captures: `inactive-before-bind.png`, `active-bind-one.png`,
`active-bind-three.png`, `direct-dominant-lower.png`. Private stage JSON files
record save completion, source size/hash, PID/start timestamp and collection
UTC before copying. Original-control clicks use either clearly identified
synthetic background Win32 messages or actual pointer/keyboard batches guarded
by exact foreground+ownership checks. A later actual click was rejected when
foreground changed; guards were retained. No original screenshot/code is
included in product assets.

## Primary documentation fallback, patch unpinned

Consulted2026-10-29: [Weights](https://en.esotericsoftware.com/spine-weights)
explicitly includes clipping. It documents separate bind membership, numeric
Direct mode and brushes; removing all influences restores owner-based motion.
[Adjusting weights](https://en.esotericsoftware.com/spine-weights#Adjusting-weights)
forbids reducing a sole100% influence. This documentary rule is not itself
proof that every numeric/brush boundary follows it in4.3.26.
[Update bindings](https://en.esotericsoftware.com/spine-weights#Update-bindings)
is a separate position-rebinding action. These pages are not patch-pinned.
Standalone Normalize parity was neither observed nor documented here.

## Implementation contract and remaining limits

Use the same compact existing Weights panel for real Mesh or Clipping dense
bindings. The selected stable attachment, not an active-image projection,
addresses every Scene command. Preserve active/none pointers and unrelated
inventory. A rigid clip's implicit owner is not bound membership: initialize
Bind choices/list labels/counts accordingly. Pending checkbox choices are
separate from the selected brush influence and future Auto scope, and must
reset when attachment identity changes even within one slot with the same
bone list. Show the inspected target name. Disable painting until a real
weighted target has at least two bound influences.

Root's proposed Scene commands: bindAttachment (empty list removes all),
setAttachmentWeight, paintAttachmentWeights, normalizeAttachmentWeights and
autoAttachmentWeights, all addressed by attachment ID. These are FBones API
choices, not recovered original command names. Keep legacy mesh command routing
separate. A Normalize convenience is an own action, not an observed original
button. Auto remains explicitly whole-attachment/all-bound-influence until
F302 selected-scope research is complete; do not reuse membership checkboxes
as that scope. Numeric validation/Enter/save flushing and revision/frozen-pose
safety must use the existing shared edit path.

Additional new exact observations remain pending: positive numeric/brush
changes, posed zero-to-positive dormant-coordinate retention, sole-influence
Remove brush, explicit clip Auto, repeated/added/removed membership and posed
Remove-all world geometry. Unknowns must stay explicit until paired analysis
settles them. Initial sequential Bind is now proved; selecting several bones
before binding a clip may follow a different automatic-weight workflow and
was not tested by this action.

The own reference process later disappeared before the posed/brush/Remove-all
probes; input/capture guards rejected its absent PID before sending any input.
No agent quit/close was issued by this worker; cause is unknown. Completed
saved snapshots remain immutable. Remaining manual and membership outcomes
are unknown, rather than being inferred from the documentary descriptions.

### Direct implementation contract, recorded before coding

Direct provides selected-vertex/influence numeric and slider edits while
hiding brush Strength/Size/Feather. A viewport click selects a vertex without
painting. The primary guide documents vertical dragging, but does not define
its gain; a single-vertex vertical-drag sensitivity is an explicit FBones
policy if implemented, not exact-patch numeric parity. Current selection
contains one focused vertex/influence; broader vertex or influence subsets
remain separate scope. The pre-existing Smooth brush is an explicit FBones
extension, distinct from the original's separate Smooth action.

The coordinator approved a bounded Direct vertical drag sensitivity of0.5
percentage points per CSS pixel (200pixels for a full unit), with0.1 percentage
points per pixel when Shift is captured at pointer-down. This is explicit
FBones interaction policy because the guide does not publish its gain; no
numeric original-parity claim follows. The viewport owner implements it from
one captured selected vertex/influence, with click selection producing no edit.

## Core UI slice after the paired gate

WeightsPanel now reads the real selected Mesh/Clipping dense binding and routes
Scene edits through the five attachment-addressed commands; legacy image meshes
retain their slot-addressed path. A rigid implicit owner is not labeled as bound
membership. Pending choices reset on attachment identity changes within the same
slot; the target name is visible. The existing Tree bone-click route chooses a
bound influence without clearing the clip target. A clipping inspector Weights
action opens the common panel even when its dock was hidden.

Direct exposes functional selected-vertex/influence numeric and slider edits,
hides Strength/Size/Feather, and enters the real Weights tool for a weighted
multi-influence target. The visible subtract label is Remove, matching the new
original menu observation; Smooth remains the explicit existing FBones brush
extension. Normalize is an independent FBones convenience, with no assertion
that an equivalent original button was observed.

`node tests/weights-panel.test.mjs`: five actual compiled Vue component tests
pass, covering rigid membership/same-slot target reset, inactive clipping typed
commands/numeric validation, legacy routing, Tree selection retention and Direct
numeric/slider/Enter controls. TypeScript and changed SFC compilation pass at
this integration point. These component checks do not substitute for native
Windows pointer interaction, a new weighted UI-save original export, or actual
deformed-mask pixel comparison; the coordinator owns those acceptance gates.

## Brush Replace review before the dependent correction

Re-read the primary [Weights: Brushes](https://en.esotericsoftware.com/spine-weights#Brushes)
section2026-10-29 after the own exact-version GUI had exited. **Documented,
patch unpinned:** Add increases selected influences, Remove decreases them,
and Replace assigns a chosen weight; Strength limits the amount/value applied.
Feather reduces brush effect toward its edge. The separate Smooth action uses
connected neighboring vertices; our pre-existing Smooth brush is an extension,
not an observed fourth original brush mode.

**Proven own-code defect, documentary interpretation:** the current Replace
formula uses target1 and multiplies its interpolation amount by Strength. At
full coverage, base0.4/Strength0.5 therefore produces0.7. That treats Strength
as an attraction rate toward1 instead of the replacement value described by
the guide. Correct full-coverage Replace to the requested Strength value0.5.
This is a correction to match the documented operation, not a new exact4.3.26
numeric brush observation; the original process is no longer available.

**Explicit FBones edge/stroke policy:** blend the captured base toward Strength
by feather coverage; e.g. half coverage between0.4 and0.5 gives0.45. Preserve
captured Add/Remove delta behavior and maximum coverage per stroke. The guide
does not establish exact feather curves, sampling accumulation or numeric
sensitivity, so those remain own implementation policy. Test Replace from both
above and below its target, partial coverage, and Strength0; do not skip a
zero-strength Replace merely because an additive amount would be zero.
Apply the shared corrected brush calculation to both Scene clip/mesh and legacy
image paths; fixing the documented operation does not require preserving the
old legacy defect.

## Numeric draft repaint defect, recorded before its fix

A new actual Windows0.8.2 check on the owned06ee candidate typed37 into the
Direct numeric field without Enter, then only hovered another Weights bone
row. The field reverted to authoritative50.0 while influence1 and vertex3
remained selected. Private evidence: `.local/weighted-clip-draft-hover-observed.json`.
The six-group b6bd weighted-source/pixel acceptance snapshot remains unchanged;
this later interaction is separate evidence and does not invalidate its source.

The actual original Direct numeric control and the existing official numeric
entry contract support staging text until Enter/blur. Source inspection found
that the FBones field used only an authoritative `:value`, without preserving
input text. Hover changes repaint the parent, so Vue rewrites the focused
field. The per-bone numeric fields share this source pattern. This is now an
observed FBones defect, not a hypothetical issue inferred from documentation.

Correct both paths with per-document/attachment/vertex/bone field drafts.
Unrelated hover repaint must preserve pending text. Enter/change/blur share
one synchronous-start native edit; Save's existing blur/await path must see
that edit. A successful no-op returns the authoritative value. Escape cancels
without editing and clears only the field's own error. Replacement of target,
vertex or document discards its draft and prevents late old handlers from
editing another binding. Invalid text/ranges block commit synchronously and
must not leave a stale global error after cancellation.

The draft correction now uses `useWeightFieldEditor` for both Direct and
per-bone numeric fields. Draft identities include document, attachment/legacy
slot, vertex and influence. Captured old field handlers cannot write to a new
target. Successful native no-ops restore authoritative text; range/finite errors
are synchronous, own-error cleanup is guarded, and Escape discards text without
sending an edit. Enter/change/blur deduplicate the same pending value.

Nine compiled Vue control tests pass, including the actual hover repaint
regression on both numeric paths, late old-target handlers, Enter/blur single
commit, sole100% no-op display reset, invalid Escape/target cleanup and a real
workspace Save awaiting the native edit initiated by numeric blur. Invalid
blur blocks Save before native writing. TypeScript passes. The earlier06ee
six-group Windows/pixel proof is historical for that image; a later candidate
must receive fresh focused/full Windows acceptance before being called current.

Pre-build review then found a precision defect in the new draft helper: the
one-decimal displayed37.1 was compared with full native37.123… on every blur,
which could round an untouched field. A new compiled Vue regression with
`Math.fround(.37123456)` reproduced the unwanted edit before correction.
The helper now treats the unchanged formatted display as unchanged authoring
intent; untouched blur and Escape perform no native operation. Explicitly
typing37 still commits37%. All ten compiled control tests and TypeScript pass.
The failed pre-fix private log remains `.local/weights-draft-precision-before.log`.

## Final current-candidate interaction acceptance

The corrected final0.8.2 candidate7dcb…2e5c16 passed seven actual Windows groups
on its own new instance21308/9244, including numeric hover drafts, one Enter
commit, Escape cancellation, untouched fractional precision and no-op vertex/
influence retention. Frozen evidence is
`.local/weighted-clip-082-final-acceptance-snapshot/`;41 typed action records
were independently checked, alongside the final saved source and native frozen
pose observations. This supersedes the06ee interaction checkpoint as current
candidate evidence; its historical file/pixel proof is retained separately.

Final source bytes exactly match the accepted b6bd original-source oracle, so
no original export was repeated. `analysis/weighted-clip-authoring-check.json`
and `analysis/weighted-clipping-pixels-final-check.json` record that explicit
historical-original/current-GPU split. The new current-editor capture passes
the same independent deformed-mask comparison. This establishes the bounded
FBones workflow while preserving the documented/inferred/unknown original
interaction distinctions recorded above.
