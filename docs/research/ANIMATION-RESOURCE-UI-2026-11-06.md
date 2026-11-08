# Image resource generations and zero-duration Sequence preview — UI gate

## Reference and source boundary

Read current STATE/TASKS and accepted `ANIMATION-SEQUENCE-UI-2026-11-06.md`,
including its deferred resource-generation warning. Re-viewed the retained
exact4.3.26 `feature-ui/multi/slot-row-b-selected.png` and supplied
`animare/Spine_vzdTlvDSE9.png`. They establish compact Tree/Images, attachment
selection, shared transform controls, Dopesheet and Preview placement. Neither
shows a resource reload during an unkeyed pose or a lone Sequence Loop key at
zero. The original's preservation and zero-length playback gestures remain
**unknown**. Reuse the current compact controls and panel placement; the policies
below are explicit FBones working-state/source-preservation choices.

Native `project::load_images_folder` validates expected revision, swaps scanned
resources/root metadata and increments both revision and documentId. That latter
number is also the image-cache/geometry generation. It does not establish a new
authored rig, although choosing a new folder changes image-root history. Save's
ordinary same-document publisher therefore cannot simply be reused with a
globally relaxed document check. Normal Open/replacement must still discard.

## Actual workspace reproduction before coding

Ran the production Pinia workspace/composables against explicitly typed resource
replies through the real `chooseImagesFolder` and `refreshImagesFolder` routes:

`node .local/research/animation-sequence-ui-2026-11-06/resource-draft-loss.mjs`

Ignored raw output is adjacent `resource-draft-loss-result.txt`. The own fixture
has19clips, a Mesh, IK, Event and Sequence. Auto Key off stages all seven families:
bone X11/Rotate45, slot RGBA, nonzero deform, custom draw order, IK mix.75, Event
string and Sequence index2. A doc1/revision1 → doc2/revision2 resource reply with
unchanged authored objects/IDs clears every family: bone becomes null, maps
empty, draw order undefined. Selected attachment9 and vertex1 become null;
selected attachment/slot arrays are cleared. The active slot scalar still7
demonstrates that current document-change clearing is not a complete coherent
selection policy. **Explicit Simulate Off stays false** before/after; retain this
already correct behavior.

Delayed typed replies also prove two hazards: a newer working X61 is lost to X0,
and a current replacement doc99/revision9 is overwritten with the old resource
reply doc2/revision2. These delayed-state arrangements are programmatic guards,
not browser input proof; the busy UI normally disables authoring. Setting any of
animationKeyError, eventKeyError, sequenceFieldError or attachmentColorError still
allows a refresh request and generation change. Source inspection additionally
shows raw field contexts reset on documentId changes, while refresh does not
check inspectorError and choose checks only that one error. A field's raw invalid
text is not safely represented by the validated animation overrides.

## Pre-code interaction policy

- Only the explicit successful Images action may bridge a verified resource
  generation. The paired
  `ANIMATION-RESOURCE-DRAFT-DATA-2026-11-06.md` requires a native logical document
  identity stable only within the true opened document, plus strict same-authoring/
  stable-ID comparison and allowed root/library/availability fields. Do not infer sameness from names,
  equal counts or an incrementing document number; reject stale request context
  before summary publication. No blanket cross-document restoration.
- Preserve the latest valid live overrides from all seven families, including a
  newer explicit revert to the old saved value. Capture intent at publication,
  not merely request start. A scrub/clip/mode/discard transition still discards
  earlier drafts; a new draft after that transition may survive only in its live
  current context. Never key or bake these values during resource acquisition.
- Keep surviving stable bone/slot/attachment/constraint/Event selection coherent,
  including multi-selection and the selected vertex when topology is unchanged.
  Do not resurrect selection superseded while the request was pending. Library
  selection may be pruned to the new available keys independently of attachment
  inventory/activation. Missing PNGs still show missing status; no frame fallback.
- Flush the current valid field and await its native transaction before starting
  a resource request. Invalid inspector/timeline/Event/Sequence/tint text must
  block the action with the existing error, preserving the text for correction or
  Escape. Do not let generation-driven unmount/reset silently make invalid text
  disappear. Cancellation/failure leaves current summary, pose and selection.
- Preserve explicit Simulate Off, Auto Key preference and preview speed/range;
  ordinary safe pause behavior may stop active playback. Resource refresh must
  still invalidate image caches, frozen geometry, snapshot epochs and in-flight
  leases. Never preserve old poseEpoch/checkpoint authority merely to retain pose
  values. Root/native owning tests must prove these separate safety boundaries.

## Single Sequence Loop at frame zero

The same production workspace probe creates one Loop key at0, count3,
delay.1seconds/image, FPS30, with native summary duration0. Default Play remains
false at frame0/index0; explicit seek3 samples index1. Setting the existing
**preview End9** then Play advances to frame3/index1 with no native calls and
authored animations unchanged. Thus the sampling is functional; the default
zero-length playback range prevents its use. A second probe stages unkeyed
Sequence index2, then rejected zero-length Play clears that draft and displays
index0 despite never starting. Validate playback before consuming drafts.

Recommended bounded FBones policy: retain authored duration0 exactly and offer
a clearly identified positive **preview range** for this ongoing Loop. The
smallest safe implementation can use the existing editable preview End with a
clear hint/action; an automatic default may derive one finite cycle
`count * delay * FPS` for this single-key Loop case only, within the existing
frame budget. An explicit user range takes precedence. Show the effective
preview End separately from the stored last-key duration and retain ordinary
event bounds/clock guards. Do not add a dummy end key, change exported duration,
pretend an infinite Sequence has a proven finite original clip length, guess a
common period for multiple loops, or extrapolate Once/Hold behavior without a
separate stated policy. No original playback parity is claimed.

No product edits, shared runners, browser retries or original process operations
were performed for this gate. Coordinator owns implementation assignment,
integration evidence and the single STATE/task checkpoint.

## Focused resource regression handoff

`tests/animation-resource-drafts.test.mjs` now passes9/9 against the coordinator's
product wiring. It invokes the actual workspace choose/refresh methods and
production logical-identity/intent retention with explicit typed transport
fixtures. Cases cover all seven working families; latest explicit clean reverts;
clip/discard/new-current-context intent; weighted attachment multi-selection,
vertices/influences/locks and mixed bone/Sequence clipboard; canceled choice and
failed requests; stale document/revision and mismatched/missing logical identity;
strict rejection of authored transform/ID/topology/key/settings/tint/FPS/
constraint/Event mutations; all five invalid-field flags; awaiting a pending
native field transaction; and rejection of the old frozen geometry epoch after
successful resource publication. Simulate Off and existing preview preferences
survive. Raw summary availability and sampled Sequence-frame availability are
asserted separately, because a missing setup frame must not hide a different
available working frame. These are frontend policy/guard tests, not native
resource or renderer proof.

`tests/e2e/animation-resource-preview.native.spec.ts` adds two **unrun** cases:
real UI unkeyed bone/Sequence fields through filesystem PNG removal, Refresh,
canceled/changed folder choice, invalid input, Simulate Off and portable Save;
and a single Loop key at0 playing through a separate derived preview end in
Main/Preview, with no authored end key or duration change. All fixtures and PNGs
are our generated material. UI TypeScript checking passes; no browser execution
or new original observation is claimed. Root owns product changes, integration
checks and STATE/task checkpoint updates.

## Minimal preview-range display handoff

The coordinator's final all-final-running-key Once/Loop policy is recorded in
`ANIMATION-SEQUENCE-PLAY-RANGE-GATE-2026-11-06.md`; it supersedes the earlier
single-Loop-only implementation suggestion above. This remains a labeled FBones
preview policy, with no original duration/gesture claim.

Timeline now accepts optional stored-duration, effective-preview-End and budget
status props. The existing footer shows **Stored duration · Preview End** only
when the two differ; an explicit Loop End takes precedence. An exceeded automatic
range displays **Set Loop End to preview** instead of an enormous frame number,
with status semantics and an English/Romanian policy tooltip. No panel/toolbar
was rearranged. Root bounds the displayed ruler/Last-frame extent to the stored
extent while the automatic range is blocked; it does not truncate the authored
range or create an implicit million-frame grid.

The actual compiled timeline marker test passes, including ordinary callers
without optional props, equal durations, explicit-End precedence, budget status
with a small ruler, no active clip and Romanian labels. The Sequence controls
file is now4/4; product/UI typechecks pass. The native preview case's existing
`timeline-preview-range-hint` locator matches the implemented marker. Browser
layout and native UI cases remain unrun in the restricted environment.

## Pre-code correction: clearing explicit End uses automatic fallback

Paired DATA finding is recorded in `ANIMATION-SEQUENCE-PLAY-RANGE-GATE-2026-11-06.md`
under **Automatic fallback versus displayed end**. The actual compiled Timeline
with the real workspace reproduces the mismatch: a single Loop yields automatic
End9, explicit Start10/End12 is valid, and clearing End displays blank while the
store correctly retains12. Pre-fix command:
`node tests/animation-sequence-controls.test.mjs` (the new fifth case fails with
`'' !== '12'` at the authoritative-value assertion). The component validates
against effective/display duration12, while the store validates null End against
automatic9; its rejected command leaves the local draft blank because no prop
changed. This is a controlled-input synchronization defect, not a new original
Spine observation.

Before the minimal fix, require a distinct typed automatic-preview-End prop in
addition to effective preview End and displayed ruler extent. `changeLoop` must
use the same automatic fallback as the store. Invalid clear restores explicit12
and emits no range action; once Start becomes8, clear End is valid and displays
blank with effective End9. Invalid Start10 then restores8. Clearing both retains
the existing empty-range exception. No adjusted Start, native/key transaction,
source duration change, extra control or layout change is authorized by this
correction. Ordinary callers lacking the optional prop keep their existing
stored-duration fallback. Native original gestures remain unknown.

The minimal Timeline/App automatic-fallback wiring now passes the fifth actual
compiled-control regression, including rejected/accepted clear, rejected Start,
clearing both and exact unchanged project summary. Sequence controls are5/5.
No shared build/full runner was invoked; coordinator owns integration checks.
