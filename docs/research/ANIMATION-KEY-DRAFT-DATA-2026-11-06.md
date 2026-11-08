# Animate manual key draft DATA gate — 2026-11-06

Before dependent correction. Source `App.vue::keyboard` currently routes bone
context K to `insertAnimationKeys('translate')`, regardless of edited channels.
`useAnimationWorkspace::boneAnimationEdit` already computes supported Translate,
Rotate, Scale and Shear keys relative to Setup; with Auto Key off it retains a
whole transient local-bone pose. `insertAnimationKeys` keys just its requested
channel, then clears all animation drafts. The synchronous project-animation
watch also clears drafts on the native response. Therefore a Rotate/Scale/Shear
working change can be discarded while K authors an unchanged Translate key. A
channel-specific button can likewise discard other unkeyed properties/bones.
This is a source-proven data-loss path, separate from original gesture parity.

Reuse accepted exact4.3.26 four-channel/frame/curve evidence in
`ANIMATION-DATA-4.3.26.md` and the existing native atomic `setAnimationKeys` batch.
The UI audit's unpinned official Keys documentation describes K for **edited
properties**, but no original4.3.26 K gesture is observed. The following is an
explicit FBones preservation policy, not a new parity claim.

- In bone context, K commits all changed supported channels of the selected bones
  in one native batch/history action. Determine unkeyed change against the stored
  animation sample at the same frame, not against Setup (which may differ because
  an existing key is already active). Keep Setup/parents/name/length untouched.
  Retain existing same-frame curve/Bezier controls and fractional frame bits.
- A manual per-channel button commits only that channel for selected bones.
  Neither action may discard unrelated staged channels, unselected bone drafts,
  slot/deform/constraint drafts or newer user intent. Rebase surviving working
  changes onto the returned sample; do not silently key them as a preservation
  workaround. Failure leaves the working pose intact.
- Preserve current document/clip/frame/revision and draft-generation protection
  around asynchronous authoring. A stale success cannot resurrect a draft in a
  different document/frame or overwrite a newer intention. Publishing a residual
  draft must invalidate stale geometry leases through the existing version path.
- With no changed supported channel, K's fallback must be an explicit UI policy
  (for example the active transform property). It must not fabricate an unrelated
  Translate key merely because Translate was the old hardcoded branch. Contextual
  slot/Event/constraint routes remain distinct and cannot mutate bone Setup.

Tests must reproduce Auto Key off, edit at least Rotate/Scale/Shear, press the
actual App key handler, and compare native command intent plus surviving draft.
Cover multiple changed channels/selected bones in one batch, partial channel key
followed by K, unselected draft preservation, native rejection and stale-context
responses. Real Session history/save/reopen must separately prove authored keys
and unchanged Setup. Compiled handler tests do not establish actual OS keyboard
input or original editor gestures.

Independent review found a further pending-reply boundary before finalizing the
fix: a newer working value can equal the **old stored sample**. Filtering only
old-sample differences drops that newer explicit revert when the returned key
changes the saved sample. Retention must compare the live explicit draft fields
with their invocation values as well, including clean values that changed while
pending. Unchanged clean fields in a full bone/constraint draft must still follow
the returned sample; absent/cleared drafts must not be reconstructed. The own
composable reproduction is retained under ignored `animation-key-draft-review-
2026-11-06/revert-async.mjs`; it is not original-editor evidence.

The final policy tracks per-property working intent generations. A newly created
whole-pose draft marks only properties changed from its current stored sample;
subsequent property changes also record explicit clean reverts. Native publication
and residual restoration do not generate new user intent. This distinguishes a
newer explicit Rotate revert from the incidental old Rotate value in a new
X-only draft after seek-away/back. Draft-free invocation followed by edit/revert
is included. Old-document or old-revision replies cannot publish a summary.

## Save publication boundary — pre-code DATA finding

Independent source review finds another concrete loss path:
`stores/workspace.ts::save` assigns the successful `api.saveProject` summary
directly to `project.value`. Its new animation-array identity triggers the
synchronous `useAnimationWorkspace` draft reset, outside the retention helper.
Save and Save As can therefore erase an Auto Key off working pose even though
the native file correctly contains only authored keys. This is source-proven;
the UI audit owns the actual-workspace reproduction. No original Save gesture
was observed, and no Sequence support is needed to correct it.

**FBones policy:** successful Save/Save As preserves the live unkeyed Animate
working pose without adding keys, changing Setup or baking that pose into the
saved binary. Reuse per-field intent retention with an empty consumed-field set,
including all supported bone, slot, draw-order, deform, constraint and Event
draft families. Take document/revision guards before the request; collect live
dirty/newer intent immediately before publication. A context change must not
resurrect cleared drafts, and a stale document/revision reply must not publish.
Suppress intent generation during summary publication and restoration. Newer
edits and explicit reverts retain their existing generation rules. Cancellation,
null results and failures perform no summary publication or draft clearing.

Required regressions use the actual workspace Save and Save As paths, including
unchanged saved key/Setup payloads, multiple draft families, newer intent while
pending, scrub/clip changes, stale document/revision, cancellation and failure.
Save-and-continue still performs its intentional lifecycle transition after a
successful save; preserving before that transition must not override its discard
policy. This finding precedes dependent implementation.
