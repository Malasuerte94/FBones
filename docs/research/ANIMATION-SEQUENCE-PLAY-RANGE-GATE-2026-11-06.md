# Running Sequence default preview range: pre-code gate

2026-11-06. Independent DATA/UI feasibility review. No product edit, original
process, GUI retry or shared runner. Reuses current STATE/F105, the accepted
[Sequence DATA](ANIMATION-SEQUENCE-PERSISTENCE-DATA-GATE-2026-11-06.md),
[UI](ANIMATION-SEQUENCE-UI-2026-11-06.md) and
[sampling policy](ANIMATION-SEQUENCE-SAMPLING-POLICY-2026-11-06.md).

## Direct finding and reference limit

The retained own native/composable `single-key-playback-policy-result.json`
demonstrates a running Sequence key at0 with stored duration0: default Play does
not start, but explicit Loop End24 starts and advances frame0→3 and image red7→red8
without changing the native document. Native animation summaries derive duration
from the maximum stored key frame, including Sequence. The workspace's Play and
advance functions use that duration when Loop End is absent. This is a concrete
FBones preview defect; changing delay or Count cannot make that stored key time
nonzero.

The existing pinned official runtime4.3.13 `Animation.js` hash was reverified
against the Sequence runtime manifest. Its `Timeline.getDuration` returns the
last key time; SequenceTimeline has no duration override. Its advancing Sequence
sampler uses elapsed time after that key. This narrowly corroborates the split
between stored key extent and continuing image playback. It is secondary runtime
guidance, not original editor4.3.26 Play, automatic range or loop-control evidence.
No accepted exact-version capture establishes the editor's default range here.

## Recommended FBones policy

Keep native `AnimationView.duration` as the stored key extent. Add a **derived
preview end**, used only by transport/range display and evaluation. Do not add a
binary duration field, move/insert a key, change Setup/settings, or include an
unkeyed working pose that Play is about to discard.

For each Sequence track, inspect only its final stored key and valid target
settings. Earlier running keys are superseded and must not stretch the end after
a later Hold. Let `imageIntervalFrames = f64(f32(delay)) × f64(f32(FPS))`.

- Hold adds no tail. A clip with only a Hold key at0 keeps its current static
  zero-extent behavior; this correction concerns running image playback.
- Loop adds one cycle, `count × imageIntervalFrames`, independent of starting
  index. A nonzero index still needs Count intervals to return to that image.
- Once adds the remaining image intervals, `(count − index) × imageIntervalFrames`.
  This includes one interval showing the final image; merely reaching it at the
  stop instant would provide no running preview time for that image. Once with
  an already-final index therefore gets one image interval.

The default preview end is the maximum of stored key extent and each final
running key's frame plus its tail. Extending positive clips as well as zero clips
handles the same defect when a running key is the last key at a nonzero frame.
Use all valid Sequence tracks, including inactive alternatives, consistently with
ordinary key extent. Do not make the range depend on current selection, sampled
activation or whether a PNG happens to be loaded.

Require at least one editor frame of preview tail to avoid a degenerate tiny
automatic loop and excessive Event cycles. For Loop periods below one frame,
prefer an integral number of cycles (`ceil(1 / period) × period`) to a fixed
one-frame cut, with a final numeric minimum of one. Ordinary fractional ranges
remain allowed. This preserves the normal single-Loop reset phase; extreme
subnormal timing still follows the existing f64/bias policy and cannot promise
unmeasured original precision. Once may simply use a minimum one-frame tail.

The effective preview remains within the existing1,000,000-frame limit. Use
finite arithmetic and validate positive f32 FPS/delay and settings before
division; never convert cycle counts through signed32-bit integers. The final
coordinator decision below rejects an automatic tail beyond that budget instead
of silently cutting its cycle. Do not raise source, resource, Event or geometry
budgets. The count/delay/FPS product uses f64; stored f32 inputs remain unchanged.

## Controls and override rules

Explicit Loop Start/End remain authoritative. A supplied End can intentionally
cut a cycle short or show more cycles; clearing it restores the automatic end.
An explicit Start with no End uses the automatic end and must retain the existing
end-greater-than-start validation. Recompute the automatic end after stored keys,
Count/index/mode/delay or FPS change, without silently changing explicit bounds.
FPS changes the tail's frame extent because delay is seconds per image. Playback
speed changes elapsed traversal, not the derived extent.

Use the same effective end in Play, advance, range-entry validation and relevant
transport/ruler/Last Frame display. Distinguish preview extent from last-key
navigation and stored duration so the UI does not present a fabricated saved
animation length. Keep dense shared Setup/Animate layout. No range control may
author keys as a workaround. Existing explicit Play/scrub draft-discard behavior
and bounded Event delivery remain in force.

## Required own evidence before integration

Reproduce the actual single-key native/composable route with no explicit bounds:
Play must start, advance images and leave native Setup/keys/encoded bytes unchanged.
At24FPS, Count3 and delay0.125, a Loop key at0 has preview end9; index2 still has
end9. Once index1 has end6, including the final-image interval; Hold at0 stays0.
Test a final running key after other tracks, a later Hold superseding an earlier
Loop, mixed modes/periods, Count1, changed FPS, fractional/subframe periods and
minimum positive f32 delay. Check finite capped endpoints near1,000,000 and large
finite delays without overflow or pathological event-loop work.

Exercise explicit shorter/longer End, explicit Start, clearing bounds, loop on/off
and Pause/seek. Main/Preview/native sampling must still agree at reached times;
native stored duration stays unchanged. Do not report an original4.3.26 automatic
range, rendered frame or gesture result from these own policy tests.

## Final coordinator policy before helper implementation

Implement the all-final-running-key policy above, including Once and positive
clips, without a common-period/LCM calculation. Recover the stored last-key
baseline with `Math.fround(animation.duration)`, as well as f32 key times/FPS/
delay: short native JSON such as0.3 must not stop before its actual final f32
Event/key time0.30000001192092896. The derived end never changes that source field.

The pure helper returns its **uncapped** finite candidate end, whether it extends
the baseline and whether it exceeds1,000,000frames. An exceeded automatic budget
requires an explicit UI hint/error and a valid user-specified Loop End before
Play; do not silently cut the cycle or hand an enormous default extent to a
timeline layout. Explicit bounds still take precedence. Invalid profile inputs
reject rather than invent a duration. The owning composable validates the range
and initial Event budget before clearing drafts, so a rejected Play is a no-op.
The helper owns no transport state, IPC, document mutation or resource-generation
policy. Integration controls/display remain coordinator-owned.

The pure `animationPlayback.ts::animationPreviewEnd` implementation and ten owned
Node tests now pass. They cover zero/nonzero key tails, superseded loops, multiple
inactive/missing-resource tracks without LCM, Once/Hold/Count1, f32 clock/delay/
baseline recovery, a final short-JSON f32 Event, subframe whole cycles, minimum
positive delay, uncapped budget reporting and invalid profiles. Frozen source
objects remain unchanged. This is pure policy evidence; composable Play/Events,
explicit controls, native integration and any GUI/original checks remain separate.

## Automatic fallback versus displayed end: pre-fix DATA finding

Current source exposes three distinct extents: automatic Sequence fallback,
effective end after explicit Loop End, and the bounded duration used for ruler
layout. `AnimationTimeline::changeLoop` currently validates clearing End with
`props.durationFrames`, while the owning workspace validates with the automatic
`animationPreview.end`. With automatic end9 and accepted explicit Start10/End12,
the displayed/layout extent is12. Clearing End is therefore locally accepted as
12>10, but the workspace correctly rejects the resulting automatic range9≤10.
No authoritative bounds change, so the prop watcher does not rerun and the blank
local End text can falsely appear accepted while the stored preview End remains12.
This is a direct current-source/policy finding, not an original editor observation.

Before the narrow fix, pass an explicit **automatic fallback end** prop independently
of effective preview-end and bounded display-duration props. Both component and
store must call the same range validator with that automatic fallback when End
is null. Existing explicit values continue to override it; clearing both bounds
keeps the intentional empty-clip reset exception. A rejected clear must restore
both fields from authoritative props, retaining Start10/End12 in this example.
Clearing End is accepted when automaticEnd>Start and then displays the resulting
automatic preview range consistently. Do not validate against the old explicit
End, silently adjust Start, fabricate a key or alter stored duration/settings.

Retain the uncapped automatic candidate and its separate budget warning: bounded
ruler extent is never validation authority. An automatic candidate exceeding the
budget still requires an explicit valid End before Play, under the existing
policy. These transient control changes do not authorize source mutations or
relax Play/Event/frame guards. UI owns the focused control reproduction; DATA
performed read-only product inspection, without shared tests or original probes.

## Final independent review of the correction

Read-only source review confirms resolution: `useAnimationWorkspace` exposes
`animationAutomaticPreviewEnd` separately from the effective/display ends;
`App.vue` passes it as `automaticPreviewEndFrames`; Timeline `changeLoop` uses
that automatic fallback, matching the store, and resets authoritative drafts on
rejection. The fifth `animation-sequence-controls.test.mjs` case compiles the
actual Timeline with the real workspace: it checks rejected clear restores12
without emission, Start8 permits clearing to automatic9, invalid Start10 restores8,
and clearing both leaves the entire project unchanged. Optional-prop fallback
remains conservative for older callers. No further blocker found in this seam.
This review did not edit product sources or rerun shared tests/builds; UI's named
five-case result and coordinator integration remain their own evidence.
