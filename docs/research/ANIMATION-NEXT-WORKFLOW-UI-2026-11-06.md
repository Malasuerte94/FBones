# Next animation workflow and Sequence UI gate —2026-11-06

Recorded before dependent product fixes. Read current STATE/TASKS/F105 and the
accepted animation, slot UI, lossless-import and Sequence probe notes. Re-viewed
the controlled exact4.3.26 `feature-ui/multi/slot-row-b-selected.png` capture and
supplied `animare/Spine_vzdTlvDSE9.png`. No original process/window was operated;
no accepted reference batch or full test runner was repeated.

## Sequence: present control is not a recovered feature

The retained exact-version Setup capture visibly has an unchecked **Sequence**
checkbox beside Mesh in the Region inspector. It proves that control is present,
not how enabling it works. The supplied Animate screenshot has bone transform
tracks, not expanded Sequence settings/keys. Exact Sequence field layout,
commands, numerical units, modes, filename rules and interaction semantics remain
unknown. The paired DATA probe plan identifies class123/kind22 as hypotheses;
do not expose editable guessed records from a plausible runtime JSON mapping.

Current FBones image paths resolve one PNG key; typed AttachmentView/RegionView
has no Sequence settings, the native summary has no Sequence tracks/capability,
and Timeline has no real Sequence key editor. Existing attachment visibility
keys switch inventory references; that is distinct from sampling frames within
one Sequence. Main/Preview share ImageLayer, making one resource-frame sampling
path possible later, but no such behavior is implemented now.

If DATA proves the schema and a bounded authoring profile, extend the existing
attachment inspector with compact measured settings and the existing Timeline
with real discrete/appropriate mode/index/delay controls. Keep Setup settings,
animation keys and selection/activation distinct. Main and Preview must resolve
the same sampled image without mutating authored paths, dimensions, geometry,
UVs or slots. Resource lookup must respect the proven frame naming/count/range
rules and existing PNG/path safety. Missing/end-frame and seek/loop behavior
require their own exact observations or explicit FBones policies. Do not display
invented active controls or flatten frames into extra attachments as a shortcut.
This gate enables research/design only, not Sequence implementation before DATA.

## Confirmed blocking bone-key workflow defects

1. **K keys Translate regardless of active transform.** The actual `App.vue`
   keyboard function calls `insertAnimationKeys('translate')` for bone selection.
   An Auto Key off Rotate/Scale/Shear working pose therefore writes an unchanged
   Translate key and then discards the intended edited channel.
2. **Partial keying discards unrelated working pose channels.**
   `insertAnimationKeys(channel)` calls `clearAnimationDraft()` after success.
   The project-animation watcher also clears all drafts on a native animation
   reply. Manual Rotate can therefore remove an unkeyed Translate working pose.
   An Auto Key Rotate edit after an earlier unkeyed Translate edit has the same
   loss on project publication, although its command correctly contains Rotate.

These are directly reproduced own frontend/composable defects, not new original
gesture observations. The accepted UI note cites the version-unpinned official
Keys guide for **K keys edited properties**. Exact4.3.26 K/partial-draft gestures
remain unknown. The fix must be labeled an FBones interaction policy.

Ignored reproducible probes:

- `node .local/research/animation-next-ui-2026-11-06/ui-keyboard-probe.mjs`
  parses the current App SFC, extracts its actual keyboard function with the
  TypeScript AST, transpiles it unchanged, and calls that handler against the
  actual `useAnimationWorkspace` composable. On an own19-clip fixture, three
  Rotate/Scale/Shear cases each emit only a Translate key at frame15 and clear
  the intended draft. Setup/project remains unchanged in the collecting sink.
- `node .local/research/animation-next-ui-2026-11-06/partial-key-probe.mjs`
  stages X10/Rotate45. Manual Rotate emits Rotate45 and clears the whole draft;
  turning Auto Key on and editing Rotate60 emits only Rotate60, then a typed
  collecting-sink project publication clears the previous X10 working pose.
  The mock publication retains Rotate60 and displays X0, demonstrating the
  specific unrelated-channel loss.

Reports are `keyboard-probe-result.json` and `partial-key-result.json` beside
the probes. At-time App SHA256 begins`2bdf2927254231d0`; composable
SHA256 begins`3a751671a8a80b9d`. These observations use actual handler/composable
code but synthetic events/own objects/collected intents: **no native history,
binary save, OS input, GPU or original-Spine claim** follows.

## Pre-code correction policy

For selected bones with an unkeyed working pose, K should atomically key all
dirty supported bone channels relative to the current saved sampled pose, with
one existing native batch/history action. It must not substitute a Translate
key for a changed Rotate/Scale/Shear value. With no dirty working channels,
fallback keying of the active transform channel is an explicit FBones choice:
Pose/Rotate→Rotate, Translate→Translate, Scale→Scale, Shear→Shear. Keep existing
slot/constraint/Event routing and input/modal/disabled keyboard guards.

Per-channel manual keying and Auto Key edits must consume only channels that
were actually committed. Preserve unrelated current-frame working channels and
other selected/unselected bone working poses. Failures consume none; document,
clip, frame or explicit discard transitions still invalidate old drafts. Preserve
raw key/curve values, native stable IDs, atomicity and Setup separation. Do not
turn K into broad Setup authoring or silently key unsupported channels.
Cross-family slot/geometry/constraint drafts must also not be accidentally
cleared by a bone-only success; their preservation needs explicit coverage.

## Other reviewed paths and evidence limits

Clip changes intentionally discard an unkeyed pose per the existing documented
FBones policy; that transition alone is not a new bug. Save already waits for
field edits and blocks invalid drafts; App command routing blurs relevant fields.
Graph key values address stable key IDs, while clipboard shifts frame/control
origins with the existing typed family APIs. Their accepted focused tests remain
evidence within their scope; no unchanged batch was rerun here. No additional
concrete blocking Graph/clipboard defect was established in this audit. The
partial-draft loss can affect those edits through the shared publication watcher
and should be included when the preservation mechanism is verified.

Coordinator owns implementation/native/UI integration and full runners. Next
checks: actual keyboard handler over mixed-channel/multi-bone dirty poses and
no-dirty active-tool fallback; manual/Auto Key partial edits preserving remaining
drafts; atomic rejection and late reply after seek/clip changes; then real Rust
history/Save/reopen and current browser/native interactions when available.
Keep Sequence unknown and the broader user animation goal open.

## Working correction verification

After both pre-code gates, root added dirty-channel K batching and a guarded
publication boundary that rebases live unrelated working fields. The independent
`node tests/animation-keyboard-drafts.test.mjs` run passes8/8, zero skips/failures.
It transpiles the actual App handler and uses the production composable with an
explicit typed-reply collecting fixture. Coverage includes19 own clips,
mixed/multi-bone dirty channels and existing curves, clean-tool fallback/input
guards, selected/unselected partial drafts, Auto Key, five other draft families,
failure and late away/back replies, newer pending values, Physics gravity-only
and slot attachment-only consumption. This is handler/composable behavior, not
native history, browser interaction or original4.3.26 proof.

A separate new `animation-key-drafts.native.spec.ts` describes real UI numeric
working edits, manual Rotate, viewport-focused K, one native transaction,
Undo/Redo and Save/Close/Open. It is **written, not run** while the current
browser/socket limitations remain. Coordinator owns current native integration,
full-suite aggregates and platform acceptance; no old oracle batch was rerun.

## Async revert intent — correction before the follow-up fix

Independent review found an uncovered case in the initial working retention
implementation: start an unkeyed Rotate45 edit while saved sampling is Rotate25,
send its manual key, then change the working value back to25 before the reply.
The reply stores45. A capture that filters the current value as clean against
the **old** saved25 drops this newer explicit intent, so the displayed value
jumps to45. Equality to an old sampled value does not mean no newer user edit.
The review's actual-composable probe is retained under ignored
`animation-key-draft-review-2026-11-06/revert-async.mjs`.

The prior8-case pass covered newer values that remained dirty and does not prove
this revert case. Before the follow-up product change, expand the gate: retain
explicit live fields and compare them with the invocation state as well as the
current saved sample. A changed newer field must survive even when it equals the
old sample. Do not restore untouched clean fields over intentional native edits,
and keep document/frame/clip/epoch guards. The same distinction applies to
Physics properties, slot attachment/color and deform offsets. Add collecting
reply regressions for these cases; native/browser proof remains separate.

After the follow-up capture correction, the expanded focused handler/composable
file passes **11/11**, zero skips/failures. New cases retain a newer Rotate25 over
the older committed45, Physics gravity0 over5, active attachment9 over none,
explicit zero deform offsets over nonzero offsets, and Setup draw order over an
older reverse order. A separate assertion proves an untouched clean X follows
an intentional native-key reply rather than being restored from a full-bone
draft. Deform's exact zero draft is arranged at its public working-state ref;
the test does not claim a browser vertex gesture or native inverse calculation.
The native UI spec remains unchanged and unrun by this worker.

Further pre-code refinement: value comparison against the invocation snapshot
alone still misses a newer revert if **no draft existed at invocation**. Start a
pending Graph/native Rotate45 edit, stage75 and then revert to old sampled25;
the new25 intent must survive. Conversely, after a frame away/back invalidates
old drafts, a new X-only working edit must not preserve an incidental Rotate25
copied into its full-bone snapshot over the accepted45 reply. A full-bone value
is not automatically an explicitly edited property.

Track per-field working intent/generation, recording initially dirty fields and
subsequent actual field changes including clean reverts. Suppress intent
generation during native publication/restoration, and reset provenance at real
discard/epoch transitions. Preserve newly expressed fields while letting
untouched sampled fields follow new native data. The11-case result above is
therefore bounded, not the final async-intent gate; add both scenarios before
final integration.

After per-field intent tracking, the final focused file passes **14/14**, zero
skips/failures. The added draft-free invocation case uses the real
`updateAnimationKey` path; the away/back X-only case lets native Rotate45 replace
incidental sampled25. A final revision/document guard case proves an older reply
cannot overwrite a newer project summary or its working state. This final count
supersedes the earlier bounded8/11 checks for the current file. Evidence remains
actual handler/composable plus explicit typed reply fixtures; the separate native
UI spec is still unrun by this worker. Owned tests are frozen for integration.
