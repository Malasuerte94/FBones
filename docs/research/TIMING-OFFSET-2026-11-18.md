# Timing Offset in Spine Professional 4.3.26

The stock Linux editor opened a disposable 30 FPS project on its own
authenticated X display. The Rotate row contained frames 0, 6, 15, 24 and 30
with values 10, 30, 70, 40 and 10. Its frame-15 segment had cubic controls
(18, 97) and (21, 72). The separate Translate row was another closed loop.
Loop Start and End were blank and Repeat was on.

The Dopesheet Offset button became blue when enabled and orange during the
drag. Dragging the Rotate key from 15 to 24 shifted its entire property row.
The key originally at 24 wrapped to 3, the equal loop endpoint pair coalesced
at 9, and the editor authored new matching keys at 0 and 30. A second drag
of the still-selected key from 24 to 27 used the original row as its basis.

| Export | Rotate frames | Rotate values |
| --- | --- | --- |
| Before | 0, 6, 15, 24, 30 | 10, 30, 70, 40, 10 |
| +9 | 0, 3, 9, 15, 24, 30 | 67.84998, 40, 10, 30, 70, 67.84998 |
| +9 then +3 | 0, 6, 12, 18, 27, 30 | 81.09, 40, 10, 30, 70, 81.09 |

Both exact CLI exports preserve the complete Translate row and the setup
bones. The wrapped Bézier controls are consistent with cubic subdivision
at the source time and a seam value sampled by interpolation between ten
equal parameter steps. The residual from the analytic cubic value shifts
only the two controls adjacent to the new seam. For +9, the adjacent export
values 82.73888 and 60.40554 differ from their analytical counterparts by
approximately -0.15002. For +12, the residual is approximately -0.24333.
This sampling rule is inferred from the two measured phases. The evidence
does not establish Spine's f32 operation ordering or tolerance at arbitrary
control times.

Independent nonlinear-time probes preserved the same chord rule for the seam
value. The unchanged outer control on each side identifies the subdivision
parameter. Tests with a 0.3-second cubic produced first grid crossings of
192/300, 166/300 and 115/300. A 0.4-second cubic with the same normalized time
profile and a separate two-second animation both kept the 192/300 split at
the same normalized cut. These duration changes distinguish the measured
300-step crossing from grids scaled to the segment or animation length.
The product uses the model for supported monotone curves. The exact run
captures, saved projects, untouched-row checks and CLI outputs are linked by
the private REA manifests in the Timing Offset research directory.

REA MCP `capture_process_scenario`
`ev_591947e1d4e52d959c10060daf81e9f1cffbdaa3c110ddd66e84ceb3e9caab19`
compared the endpoint tangents of four exact Linux nonlinear Offset exports.
The first and last Rotate values match in every file. Incoming and outgoing
derivatives differ by 1.170042–6.398315°/s. One fixture has about
−169.702811°/s incoming and −163.304741°/s outgoing. The authored seam
therefore preserves the value and can change slope. Graph Repeat rendering
and playback remain unmeasured.

REA MCP `capture_process_scenario`
`ev_14e6a13d526313579740848060a156763399691f68a69d99ebd986c766c27f49`
integrated the authored Rotate value over time across the nonlinear
one-second loop. The baseline mean is 45.414°. The three Offset export
means are 45.392798°, 45.383830° and 45.388402°. An exact cyclic shift
would preserve the original mean. Those full-cycle differences describe
the stored curves and do not establish rendered playback.

The paired DATA/UI gate calls for one native bone-row rewrite, including
surviving IDs and generated seam keys, with one Undo step. FBones uses the
authored clip range for this slice. It validates equal stored endpoint values,
strictly increasing source frames and the output curve profile. Continuing the
same selection reuses the original typed row to avoid accumulating synthetic
keys. Other timeline families, explicit Loop ranges and Ctrl/Cmd+Alt remain
open. [Spine Offset guide](https://en.esotericsoftware.com/spine-keys#Offset)


## Direct FBones to Spine file comparison

The Chromium case used the native Rust Session. It checked the delta
indicator, unchanged authored keys during the drag, Escape cancellation,
a single committed edit after release, selection and continuation across
Save, matching seam key counts, the wrapped source ID and Undo/Redo. The
Graph and Dopesheet shared the active mode. The Chrome fixture produced two
actual native binary saves from the corresponding +9 and +9 then +3 edits.

The stock **Spine 4.3.26 Professional** Linux CLI accepted copies of both
FBones files under `.spine` names and exported both with exit 0. Each result
was compared directly to the corresponding original GUI edit exported by
the same CLI. Setup and the complete unaffected Translate row were
identical. All measured Rotate key and control times were identical.

| Phase | Max absolute key value difference | Max absolute control value difference |
| --- | --- | --- |
| +9 | 0.00002 | 0.00002 |
| +9 then +3 | 0 | 0 |

This compares scene and timeline data for the measured fixture and phases.
The private `semantic-comparison.json` ties both native save hashes to the
original and product export hashes. The first original CLI export completed
under the project name, which the comparison helper now discovers. The
script kept that successful artifact and ran the remaining comparison.

FBones displays the pending frame delta during the drag and commits the
wrapped curve at release. The native Session implements the same Offset
through the generated MCP edit schema, using the captured revision, key and
optional continuation flag. Explicit Loop bounds, other timeline families
and the modifier remain open.


The complete production-CSP suite passed 138 distinct cases across disjoint
69-case shards. The focused runs passed the five relevant cases after updating
the old Shift test for the newly available, inactive Offset toggle.
Rust passed 379 with two existing ignored, JavaScript passed 464 with one
existing skip and the Scene format suite passed 105. The native Linux handover
was viewable with WebGL. The handover image SHA-256 was
`3e3394a3089b327bbb339acbcab0b901389301ade5731d8641e3f604c9e0c059`.

## Explicit Loop bounds in the original

The exact Linux editor used an owned 30 FPS project with a Rotate row from
frame 0 to 30. The Dopesheet showed Repeat on, Shift off, Offset on, Loop
Start 6 and End 24. A drag from frame 21 to 27 wrapped that key to frame 9.
The paired endpoint keys merged at frame 12 and new endpoints were inserted
at 6 and 24. The stock CLI independently reopened and exported the GUI save
with exit 0. Translate was identical before and after.

| Export | Rotate frames | Rotate values |
| --- | --- | --- |
| Before | 0, 6, 12, 21, 24, 30 | −34, 10, 40, 70, 10, 101 |
| +6 over 6–24 | 0, 6, 9, 12, 18, 24, 30 | −34, 75.69, 70, 10, 40, 75.69, 101 |

The exterior keys and control times were unchanged. The incoming exterior
handle next to frame 6 changed from −2 to 79.46777. The outgoing exterior
handle next to frame 24 changed from 33 to 71.91222. The farther exterior
controls stayed at −20 and 75. Two hypotheses fit this sample. Both exterior
handles could be mapped from the incoming interior handle by reflection about
the seam. Alternatively, each exterior handle could inherit its corresponding
interior seam slope at its original time. The incoming interior slope from
frame 22 to 24 predicts the exterior value at frame 4, and the outgoing slope
from frame 6 to 7 predicts the exterior value at frame 26. A second prior GUI
run changed only the exterior near-handle input times from frames 4 and 26 to
5 and 27. The before export confirmed the changes. After the same Offset
gesture, Spine regenerated the near handles at 4 and 26 with the same values.
The complete output JSON was byte-identical to the first case. That rejects
a model that carries the original exterior control times forward. A general
relation between the new control times and segment lengths remains open.
Continuation, one-sided bounds and non-keyed bounds remain unmeasured.

REA MCP `capture_process_scenario`
`ev_1ee3221e7c105f2f34c6b8fc9d78e3c523d29830bb4d38848942a62dffa154a3`
solved the derivative of each exterior Rotate cubic in the two identical
post-Offset exports. The f0–6 curve reaches 75.794857° at f5.888330, or
0.104857° above the seam. The f24–30 curve reaches 74.364381° at f25.314304,
or 1.325619° below the seam. A value clamp to the key endpoints would change
the exported trajectory in both intervals. This measures the authored
curve, with the editor's rendered samples and the general Offset rule open.

REA MCP `capture_process_scenario`
`ev_4b19700d92956e86b2b8b85ee404b528d8a87b4d301da69da558c81ebf71560a`
measured the tangent geometry from the two identical explicit Loop exports.
At f6 the incoming and outgoing slopes differ by .000150°/s. At f24 they
match at about −56.666672°/s. The one-sided second derivatives differ at
both boundaries. The regenerated near arms are at about one third of each
exterior interval. The six-frame exterior spans leave trisection and
mirroring hypotheses indistinguishable on this fixture.

The private `own-offset-explicit-oracle/gui-evidence.json` binds the before
and after captures to the exact owned instance and source. Its
`export-after-offset/receipt.json` pins the saved binary and semantic export.
`rea-spine-timing-offset-explicit-spacing.json` retains the paired comparison.
The FBones comparison is queued for the next verification checkpoint after
implementation.

REA MCP `capture_process_scenario`
`ev_b5d530d7c035ebc25ac70cfb01860e5ea36eb86a08f3ae0bc87349173375b320`
compared the typed Rotate rows of the retained baseline and the two
identical post-Offset exports. At f12 the merged endpoint uses the old
f6 key's implicit outgoing interpolation. The f24 exterior cubic stays
on f24–30. The f18 source cut splits f12–21 into f18–24 and f6–9 in the
output. Applying the difference between the ten-chord sample and the
analytic cut to the two seam-adjacent controls predicts the four split
ordinates within 0.00001°. The artifacts do not identify the runtime
curve evaluator or behavior with other interpolation families.

### Explicit Loop Offset implementation gate

Use the existing Timeline Offset gesture and capture both canonical Loop
bounds with the revision and selected Rotate owner. The accepted original
gesture keeps Current at f24 and wraps f21 to f9 after a +6 drag. Reuse
the existing seam sampler on the closed authored f6–f24 interval.
Keep exterior keys, far controls, other properties and Setup. Reconstruct
the near exterior controls with the corresponding seam tangent. Record
the timing placement policy and distinguish the measured six-frame arms
from other interval lengths. Pair-keyed closed intervals are the current
profile. One-sided, non-keyed and unequal-boundary cases remain open.

Replay both stock input variants from owned fixtures, with near exterior
handle times f4/f26 and f5/f27. Both need f0,6,9,12,18,24,30 with the same
seam value and regenerated controls within the exported tolerance. Test
one revision-bound native edit, fixed Current and Loop fields, Escape,
one Undo and a changed-bounds cancellation. Preserve the existing
full-range Offset workflow. The floating viewport bar is already present
in FBones. Offset stays in the Timeline Timing group.

### Explicit Loop Offset FBones result

Graph and Dopesheet Offset use the captured authored bounds and revision.
The keyed, closed bone span is the editable range. Changes to the limits
cancel a held gesture and invalidate its continuation. The typed command
accepts optional `loopRange` through the existing native and MCP entry.
Native history preserves outside keys and far controls, including equal-time
exterior keys from an imported row. A complete continued cycle restores all
original bytes and IDs. For an exterior Bézier, FBones places its near arm
one third of that exterior span from the join and uses the corresponding
interior tangent. It keeps the authored arm when the tangent or its control
cannot be represented. Exact general arm placement, exact-cut marker
selection and one-sided or non-keyed limits remain open in the original.

Both owned f6–24 cases passed real-session Chrome drags. The wrapped key
kept its ID at f9, the post-Offset controls agreed with the exported values
within 0.00005 and Current held at f24. Changing the bound and Escape each
canceled without writing. One Undo restored the input. The native fixtures
produced identical encoded output across the two variants and checked
Undo/Redo, continuation, malformed input and imported exterior rows.
The prior full-range workflow passed on the same web assets and native host.

An exact stock discriminator is an otherwise identical f6–24 loop with the
right exterior key moved to f33 and its far handle to f31.5. A +6 Offset
separates the one-third result at f27 from reflected-handle alternatives.
A +3 Offset on the original input cuts exactly at old f21 and can expose
which seam mark owns the selected identity. Both are unmeasured fixtures.
