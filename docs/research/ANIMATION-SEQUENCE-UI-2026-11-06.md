# Numeric-suffix Sequence UI and sampling gate —2026-11-06

Read current STATE/F105, `ANIMATION-SEQUENCE-DATA-2026-11-06.md`, the accepted
slot UI audit, supplied Animate screenshots and current attachment/resource/
timeline code. Reuse the already viewed exact4.3.26 Setup capture with its
unchecked Sequence control. No original/browser retry or product edit occurred.

## Evidence boundary

The exact Setup capture proves a Sequence checkbox exists beside Mesh; it does
not prove the expanded settings, key editor, gestures or sampled playback.
The supplied Animate image proves dense shared HUD/Tree/Dopesheet/Preview layout,
not Sequence controls. Preserve that layout rather than introducing a wizard.

The final DATA correlation supersedes the earlier numeric hypotheses:216setup
records across Region43 and Mesh46 correlate count/start/digits/setupIndex, and
729keys correlate mode/index/delay with target slot+attachment. All4,826derived
numeric-suffix PNG paths exist. This is paired data/resource evidence, not pixels
or original editor playback. Imported raw frame/delay bits must remain intact;
do not normalize the existing conversion residuals against runtime inputs.

The installed official public runtime4.3.13 was read only at its Sequence and
SequenceTimeline methods. It corroborates minimum-digit suffix construction and
names modes0/1/2 Hold/Once/Loop. Its clock/boundary logic is secondary guidance,
not exact editor4.3.26 behavior. No runtime implementation or original assets may
be copied into product sources or distributables.

## Bounded independent implementation policy

**Data retention:** retain typed settings and keys for the observed numeric-
suffix Region/Mesh profile, preserving slot/attachment ownership, raw bits,
reference pools and complete payload equality. Do not flatten frames into new
attachments, drop unknown records, or equate a retained file with a complete
editable/render-compatible profile. Reverse/ping-pong, negative/fractional
indices, shared setup identities and nonzero curve codes remain outside the
observed data boundary until separately established.

**Resource lookup:** form a frame key from the authored resolved base path plus
the nonnegative decimal `start + index`, left-padded only to the specified minimum
digit count. Do not strip digits already in the base path, alter authored names/
paths, or use natural PNG dimensions as geometry. Reuse native portable PNG/path
validation and bounded resource/cache budgets. Indexing selects image content;
Region bounds and Mesh vertices/UVs/weights remain authored data. Main and
Preview must share one sampled frame/key result, including inactive alternatives
when activated. No per-frame full-scene IPC or CSP change is needed.

**Preview sampling, explicit FBones policy pending original measurement:** use
setupIndex before the first applicable key; select the last key at/before the
current frame. Hold keeps that key's index. For a positive delay, Once advances
by elapsed image intervals and holds the final image; Loop wraps through count.
Compute elapsed seconds from the same frame/project-FPS clock as other tracks,
using raw stored f32 endpoints/delay semantics consistently in native and
frontend samplers. The public runtime has a small interval-boundary bias;
whether to use that exact bias must be declared and tested, not silently claimed
as original-editor parity. A zero/invalid running delay must not divide by zero
or spin: retain source data only if its schema permits it and report unsupported
preview explicitly. Do not invent reverse, mixing or unrelated-slot behavior.

**Missing frames:** enumerate and validate every referenced suffix frame for
portable Save As, including setup and inactive alternatives. The existing
`project_images`/missing-resource flow currently understands one base PNG and
must be extended before Sequence support can be considered resource-safe. Never
silently show another frame/base image when the sampled resource is missing;
retain authored geometry/selection and an honest frame-specific warning.
Renderer loads remain document/resource-generation guarded. Missing resources
do not justify changing binary settings, dimensions or keys.

## Controls after DATA/native capability exists

Keep Setup settings beside the selected attachment: compact labeled Count,
Start, Digits and Setup index fields, plus a sampled resolved frame/path preview.
Those labels/placement details are **FBones policy**, since the exact expanded
editor UI is unobserved. Preserve independent attachment selection/activation.
Change settings through one validated native transaction/history entry; reject
settings that invalidate existing keyed indices instead of silently clamping or
renumbering them. Imported unrepresented variants remain inspection-only.

Animate can add a real Sequence property row under its owning attachment/slot
with ordinary Dopesheet key selection/movement/clipboard/history. Its key editor
uses an observed-mode dropdown (Hold/Once/Loop), an integer index and precise
seconds per image. Add a manual key action and Auto Key only when they route
through real native commands and preserve unrelated drafts. These are discrete
state/timing parameters: do not enable ordinary linear/Bezier interpolation
merely because their wire lanes are f32. Graph representation and precise
original icon/gesture behavior remain unknown; a disabled/explained unsupported
Graph operation is preferable to invented active handles.

Unknown original gestures block exact interaction-parity claims and controls
whose meaning depends on those gestures. They do not block typed lossless
retention, independently specified path lookup, or explicitly labeled
runtime-guided FBones sampling and basic command-backed controls. Native/source
resource/persistence gates and new independently encoded original acceptance
remain required before claiming the expanded compatible profile.

## Verification scope

Use own distinct colored suffix PNGs with nonzero start, minimum digit widths,
nonzero setup index, both Region/Mesh, and two keyed modes/indices/delays. Compare
shared Main/Preview/native samples before/at/after keys and delay boundaries,
fractional frames, loops, backward seeks and project24/30FPS. Cover missing
frames, inactive activation, resource generations, all-frame portable Save As,
exact untouched Setup geometry and history/key identity. UI tests should operate
actual controls; parser equality and resource existence alone prove no pixels.
Current platform limits and original acceptance gaps remain explicit in STATE.

## Next concrete workflow defect: Save discards unkeyed working pose

The current `workspace.ts::save` directly assigns its returned ProjectSummary,
outside the animation draft-retention boundary. That new animations array
triggers the composable's project watcher and clears every working family.
Save therefore discards a valid Auto Key off pose despite no scrub, clip change,
history action or explicit discard. Saving unkeyed values into Setup or silently
creating keys would also be wrong; preserving the current working view is the
separate behavior required here.

Reproduced with actual `useWorkspace`, `setEditorMode`, `editRig` and `save`
against an explicitly typed fake native Save reply on an own19-clip project:
working X11/Rotate45 becomes X0/Rotate0 after successful Save. Native Setup stays
X0/Rotate0 and every animation remains without keys; exactly one `save_project`
intent was sent. Probe and result are ignored under
`animation-sequence-ui-2026-11-06/save-working-pose-{probe.mjs,result.json}`.
The initial probe did not establish its pose because it assigned mode directly;
that fixture limitation is retained separately. The corrected probe awaits the
real mode command and Vue flush before staging, so its pre-Save pose is proven.
This is actual workspace/composable routing with collected native replies,
**not a real file write, OS dialog or original behavior observation**.

Pre-code fix policy: successful Save/Save As may update native summary, portable
roots, checkpoint and revision while retaining same-context live unkeyed view
fields. It must neither key/bake them nor consume unrelated working intent.
Cancel/failure preserves it; a document/frame/clip/discard transition during an
awaited save must not resurrect prior drafts or overwrite a newer summary.
Reuse guarded per-field intent retention, including clean reverts and cross-
family fields, rather than snapshotting/restoring a stale whole pose. Test binary
contents independently to prove retained view fields were not persisted.

## Save correction and separate resource-generation limit

The Save-only correction now has an explicit internal publication kind (edit or
save), rather than a fabricated authoring command. Save consumes no draft fields
and reuses live intent/document/revision/epoch guards. Actual workspace collecting
tests in `animation-save-drafts.test.mjs` pass6/6: Save/Save As retain every family,
authoring summaries/keys stay untouched, cancellation/failure/newer intent/stale
replies are guarded, and Save-and-continue still discards through its explicit
project-close lifecycle. Existing keyboard/draft14 tests also pass on this helper.
These are frontend/typed reply checks; coordinator owns real binary proof.

Choose/refresh Images has a related direct-summary publication path, but native
`load_images_folder` increments documentId as a **resource generation** and
invalidates cached/frozen geometry. The ordinary same-document helper correctly
does not retain across that rollover. Do not relax its document guard globally.
A future dedicated resource publication requires strong same-authoring proof
against stable IDs and typed rig/clip/attachment data while permitting only known
resource/path fields to change. Preserve geometry-lease invalidation and normal
open/replacement discard semantics. Resource-generation retention is pending;
the Save correction leaves these methods untouched.

## Attachment setup color — paired pre-code UI gate

The retained exact4.3.26 selected-Region capture and
`ANIMATION-SLOT-UI-4.3.26.md` directly show an attachment **Color** swatch beneath
its Mesh/Sequence controls. That attachment setting is distinct from the slot's
light RGBA. Reuse F304's accepted slot RGBA/blending controls and evidence for
the existing slot behavior; they do not prove newly implemented attachment tint
arithmetic, alpha controls or an attachment-color timeline.

DATA is correlating the newly encountered Region/Mesh color fields before typed
preservation. Once that gate is recorded, expose a compact **Setup-only**
attachment color control, preserving packed source bytes including alpha and
default white. A native transaction changes only the addressed attachment color,
with one history action. Region, Mesh and inactive alternatives retain their
own color; selection/activation, slot light color, PNG data, dimensions, geometry
and Sequence settings/keys remain distinct and unchanged. Preserve source color
through animation edits, Save/Undo/reopen and Sequence frame selection.

RGB picker plus a bounded opacity slider/precise entry is an explicit FBones
control policy: the exact expanded alpha UI and gestures were not observed.
Animate shows the stored color read-only or a Setup hint; do not invent an
attachment RGBA timeline or route this control into slot RGBA keys. Color must
not be the only status signal. Root owns independent tint composition/renderer
math and tests; no new original tint pixels or gestures have been observed.

## Frontend implementation and bounded validation

The typed native contract is now wired into the existing attachment inspector,
shared Main/Preview slot projection and timeline. Setup exposes Enable, Count,
Start, Digits and Setup index; Animate exposes Hold/Once/Loop, Image index,
seconds per image, manual Key and the existing Auto Key policy. A working image
index freezes until keyed or explicitly scrubbed. The numeric-suffix sampler's
f32/+1e-5 interval policy is recorded in
`ANIMATION-SEQUENCE-SAMPLING-POLICY-2026-11-06.md`; it is not an original gesture
or exact original pixel claim. Authored image paths, attachment activation,
geometry and source dimensions stay independent of sampled PNG selection.

Sequence tracks use real stable key IDs and the shared selection/move/delete/
clipboard batch paths. Graph retains discrete Sequence diamonds with a dedicated
mode/index/delay editor; Sequence has no fabricated value curve or Bezier
handles. Unkeyed Sequence intent participates in Save and unrelated native-edit
publication retention, with ordinary seek/clip/document discard guards.

Attachment color is a separate compact Setup RGB picker and precise opacity
slider. It preserves packed alpha bytes when changing RGB, emits one native
color transaction per completed slider gesture, and shows a disabled Setup hint
in Animate. It never creates slot-color or attachment-color animation keys.
Invalid Sequence/color fields block Save; Escape restores the stored values.

Focused executable evidence: `animation-sequence-workspace.test.mjs`5/5,
`animation-sequence-controls.test.mjs`3/3 and
`attachment-color-controls.test.mjs`2/2 pass. The controls are actual compiled
Vue SFCs; the workspace uses production composables and explicit typed reply
fixtures. The actual App K handler has a new selected-Sequence routing case
(total15/15); existing Save6/6 and timeline-control4/4 regressions pass. Product
and UI TypeScript checks pass. These tests do not prove browser layout, native
encoding, OS input, or reference parity.

`tests/e2e/animation-sequence.native.spec.ts` adds two **unrun** cases for the
production Rust Session and real UI: isolated Region settings, unkeyed Save, K,
discrete Graph key edit/history, tint and portable reopen; and zero-metadata
Mesh numeric frames in both Main and Preview. Pixel probes count generated
fixture colors inside each canvas, avoiding guessed camera/constraint
coordinates. Fixture isolation leaves the attachment inventory intact; the
Mesh case explicitly replaces the Region's activation key with none because a
Setup-only hide would be overridden by that existing timeline. The sandbox's
previous server/browser EPERM failures still block running these cases; no new
browser/original attempt or visual pass is claimed. Coordinator owns full
integration runs, native proof and the current STATE/task checkpoint.

## Pre-code correction: existing negative-zero key frame

A source-only precision edge is directly reproduced through the production
`updateSequenceAnimationKey` route. With key91 at JS `-0`, editing only
mode/index/delay yields an in-memory command frame for which
`Object.is(frame,-0)` is true, and retains `keyId:91`. JSON serialization yields
`{"type":"setAnimationSequenceKeys","animation":1,"keys":[{"frame":0,"mode":2,"index":1,"delay":0.25,"attachment":9,"keyId":91}]}`;
parsing that transport value produces positive zero. Command:
`node .local/research/animation-sequence-ui-2026-11-06/negative-zero-key-update.mjs`.
Its ignored result records all three checks. This is a frontend/JSON reproduction,
not an observation of original editor gestures or native persistence.

Source inspection of native `animation_sequence::set_keys` confirms the defect:
it identifies the existing selected ID (or existing numerically equal frame),
then replaces the key using the transported `position`, overwriting the source
frame bits even though the interaction changed no key time. Native must preserve
the existing addressed key's stored frame bits for an equal numeric address,
using its existing ID/time lookup and stale-key checks. A genuinely new key still
uses the validated requested frame; explicit timeline moves keep their separate
time-changing behavior. Do not add negative-zero fields or controls, alter
sampling, select another key, canonicalize unrelated source fields, or weaken
stale/revision guards. The visible payload editor and its stable-ID update route
already express the intended property-only edit and need no TS change. This is
a FBones source-preservation correction required by the accepted exact-bits
contract; native owning tests must establish no-op, history and Save/reopen bits
before integration. Exact original negative-zero UI behavior remains unknown.
