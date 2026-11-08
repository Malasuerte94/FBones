# Split bone-axis persistence DATA gate — 2026-11-06

Reference-only gate, before any dependent code. Reuse
[Generic116 findings](ANIMATION-GENERIC116-DATA-2026-11-06.md) and the retained
exact4.3.26 conversion/source receipts. No original/process/browser/shared test
operation was performed. This bounded subset is not a corpus-wide completeness
claim and, by itself, admits none of the six remaining projects under current
budgets. Coordinator prioritizes actual-source admission before implementing it.

## Directly proven persistence subset

The existing B/F/H complete editor graphs and completed first G group independently
correlate114scalar tracks/638keys to supplied runtime data: kinds14/15 are Translate
X/Y;16/17 are Scale X/Y. The exact4.3.26 editor source/receipt is primary; the pinned
installed official runtime4.3.13 is secondary grammar guidance, not editor-version
or playback/gesture proof. Existing correlation bounds and residuals are unchanged.

Each scalar custom132 body stores kind, counted generic key list and class133
keys with **one** f32 frame/value lane, curve code, and conditional one-axis handle
block. Its owner is the surrounding class19 bone group, with no extra target
record after keys. Code0=linear,1=Bezier,2=stepped follows the accepted combined
track grammar. When current or previous curve code is1, one handle block holds
incoming x/y then outgoing x/y plus exactly four zero metadata bytes. Outgoing
controls at key i pair with incoming controls at i+1. Unused incoming/outgoing
pairs in this inspected subset are exact0x4f000000 sentinels. All114track/key-list
markers and20Generic116collection markers are fresh; source identities/order and
raw f32 bits must survive independently encoded payload equality.

| Kind | Linear keys | Bezier keys | Stepped keys |
| --- | ---: | ---: | ---: |
| 14 Translate X | 88 | 127 | 103 |
| 15 Translate Y | 92 | 155 | 63 |
| 16 Scale X | 1 | 4 | 0 |
| 17 Scale Y | 1 | 0 | 4 |

Twenty-four of57completed axis pairs have different frame arrays. Preserve scalar
tracks, key identities, times, curves and independent last-key extents; never
flatten their union into invented combined keys. Scale X varies0.1…1.0032257 in
the single observed pair; Scale Y is1 throughout. Varying/negative/zero Scale Y
and cross-axis mixing are not established by those five Scale Y keys.

Generic116 is per-animation ordered `(typed Bone12 reference, varuint mode)` rows.
Mode1 accompanies a nonempty14+15 pair, mode2 the observed nonempty16+17 pair.
Retain entry order and typed domain identity: a row may inline its bone before
its later skeleton inventory occurrence. Treat1and2 as explicit known enum
values, not an inferred bitmask. Reject duplicate/foreign targets, unknown values,
3/combinations, mixed combined+split tracks of one family, split tracks without
matching known mode, or mode without both nonempty axes in the initial profile.
Empty Generic116 retains its current canonical byte stream. Missing/empty-axis
configuration and mode combinations require new evidence, not silent repair.

## Bounded curve boundary

Two inspected Translate X segments have outgoing control **times outside** their
segments:59→61 with outgoing x64, and0→2 with outgoing x5. This is not rounding
noise. Their other curve fields parse completely; unused-handle shape checks pass.
The current combined curve validator requires time controls within the segment,
and its monotonic binary-search sampler is not proof for these new shapes.
Do not clamp/normalize their stored controls or relax validation to declare
support. Initially keep those tracks/projects inspection-only. The unanswered
question is the original/runtime interpolation and inversion contract for these
specific out-of-segment controls, separately from known scalar wire syntax.
All three curve codes with ordinary bounded controls can reuse the independently
specified one-axis curve schema, subject to full encode/decode and own sampling
checks. Initial diagnostic monotonicity assertion failure is retained privately.

## Sampling/default and complete feature recommendation

For a single full-weight clip projected from Setup, the pinned runtime's
`TranslateX/YTimeline.apply1` uses setup-relative addition on just that axis;
`ScaleX/YTimeline.apply1` uses setup-relative multiplication on just that axis.
Before the first key, retain Setup for that axis; afterward use its own curve and
last endpoint. This is directly inspectable secondary runtime guidance and the
existing FBones single-clip policy, not an original editor sample. Do not multiply
or add the untouched axis, apply both combined and split versions, invent a zero
missing axis, or import runtime conversion residuals into stored editor values.
Mixing/additive/sign behavior beyond the current full-weight preview stays open.

A minimal complete model can extend `BoneChannel` with four scalar variants,
explicit `dimensions()==1`, retaining their semantic `WireTrack::Bone` selector
and existing native bone-track/key-ID family. An alternative scalar key type is
fine; a padded internal second lane must be exact+0 and never serialized/rendered
as a second value/curve. Add typed per-animation ordered split-mode rows as
meaningful data, not opaque wire bytes. Defaults omit rows/variants and preserve
old canonical files. Native stable-ID remapping must update/drop mode bone
addresses with all retained layouts and keys; Undo/Redo/duplication/save reopen
must preserve the complete graph and raw bits.

Native/UI endpoint edits, manual/Auto Key/K and clipboard must address the actual
scalar channel, consuming only its dirty axis intent. Manual family-key behavior
must be explicitly described if it creates both axis keys. A zero Setup scale
prevents **only the addressed axis's** relative Scale key; zero on the untouched
axis cannot block another valid axis. Source mode conversion/merge and creation
of configuration without both keyed axes are not proven; keep conversion absent
and reject delete-last actions that would violate the supported profile rather
than fabricating replacement keys. Any new atomic complete-pair authoring action
is an explicit FBones policy awaiting independent original new-file acceptance.

Acceptance requires scalar linear/stepped/Bezier raw-bit fixtures, independent
combined-control regression, both mode rows in different bone order, rejection
of unknown/partial/conflicting modes, per-axis native sampling and key/history/
clipboard/structural remapping, draft retention, and complete encoded/reopened
model/payload equality. Own within-budget fixtures are necessary; all production
file/arena/track/key/geometry caps stay unchanged. Fresh original acceptance and
GUI/rendering remain pending. Current six guarded sources stay guarded.

Private targeted inspection: `animation-split-axis-data-2026-11-06/` scripts,
`existing-result-v3.json` and logs. These reuse frozen existing graph/runtime
receipts; no runtime decoder batch was rerun and no product source was edited.
