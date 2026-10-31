# F308 current Transform implementation audit

2026-10-29. Read-only source/evidence audit. No product edit, test runner,
Cargo command, original command, new observation, numeric fit or tolerance
change was performed. This is an implementation handoff, not completion of
F308 or a new exact-parity claim.

## Evidence and coverage

Primary evidence reused, in priority order:

- Exact original4.3.26 eight Match actions:
  [DATA](TRANSFORM-MATCH-DATA-4.3.26.md),
  [UI](TRANSFORM-MATCH-UI-4.3.26.md), and
  [saved-field aggregate](../../analysis/transform-match-reference-check.json).
- Two additional original LocalSource/WorldTarget Match actions:
  [UI result](TRANSFORM-MATCH-LOCAL-WORLD-UI-RESULT.md) and
  [DATA aggregate](../../analysis/transform-match-local-world-check.json).
  These close the previously missing direction for these two fixtures; they
  do not close general Match arithmetic, evaluated-stage or interaction gaps.
- Existing own numeric corpus `src-tauri/src/solve/oracle.json`, native
  `solve/tests.rs` and `tests/constraint-solver.test.mjs`. The current native
  static test explicitly asserts **37 static cases**, including IK,
  calibration and mixed constraint cases: this is not37 Transform-only cases.
  Every Transform record within those static cases has **one constrained
  target**, and no two source rows write the same destination channel.
  Image acceptance bounds remain .45 world units/.009 basis components.
- [Range preservation policy](TRANSFORM-RANGES-IMPLEMENTATION-POLICY.md) and
  [codec handoff](TRANSFORM-RANGES-CODEC-HANDOFF.md).
- [Fixed arithmetic audit](TRANSFORM-MATCH-F32-MATH-AUDIT.md) and
  [public4.3 helper audit](TRANSFORM-MATCH-MATHUTILS-AUDIT.md).
  Public runtime sources remain documentation/secondary arithmetic evidence,
  not proprietary editor4.3.26 Match implementation proof.

Some historical summary files still report35 static cases. The source test
and current37-case single-frame subset identify the later two applied-source
cases. The10 original Match actions use zero mixes; their multiple ordered
targets establish editor sampling, not active multi-target solver parity.

## Concrete gaps that do not require guessing Match rounding

### Target membership editing can silently reorder retained targets

**Proven from current code:** `ConstraintInspector.vue::member` takes all IDs
from HTML `selectedOptions`, whose sequence is the select's DOM bone order.
Transform members are sent directly in that order. For an existing
`[secondTarget, firstTarget]`, adding a third target can change retained
members to `[firstTarget, secondTarget, thirdTarget]`. Native transport/codec
preserve the sequence they receive; no later layer restores it.

**Direct original relevance:** the accepted reversed-target Match branches
produce different offsets and property ranges because the first ordered
target changes. Thus this is a semantic order-preservation defect, independently
of endpoint rounding. It does not prove how original gestures append/reorder
members.

Recommended bounded fix: retain still-selected old IDs in their old order,
then append newly selected IDs in a documented deterministic order. Do not
sort an existing Transform list as a side effect of membership editing. A
future explicit reorder control is separate. Apply the same policy to the
creator's initial selection if retaining preselected order is intended;
Vue multiple-select updates otherwise also emit DOM order. IK's required
parent/child ordering remains its separate existing rule.

Meaningful future checks: reversed existing targets plus add/remove/reselect;
unaffected retained first target; one native update/history item;
Undo/Redo/save/reopen retain order. An unchanged submitted membership must
remain a data no-op. No checks were run in this audit.

### Inspector remains an editable runtime-map profile

Both original Offset/Properties header Match actions are absent from the
current UI/native edit union. The current mapping editor exposes runtime
From.offset and To.offset/max/scale; the24 nullable editor cells are separately
read-only. It does not yet offer original manual source-end/destination-end,
clear/default coupling or link-edit interaction behavior. Those are substantive
F308 authoring gaps, not small visual or rounding differences.

Original sparse observations show Offset fields filtered by **source** routes
and Mix fields by **destination** routes. Current `ConstraintInspector.vue`
renders all six in both sections. This visual/control gap can be fixed from
the already accepted paired sparse audit without altering stored hidden
offsets/mixes. Preserve hidden data: original Offset Match still changes all
six offsets even when some controls are hidden.

## Solver implementation facts and unresolved discriminators

Native `solve/transform.rs` and TS `domain/solve/static.ts::applyTransform`
have the same structural operations; this audit found no demonstrated
Rust-versus-TS Transform algorithm discrepancy. Both use f64/JS-number
evaluation of canonical f32 authored values. Existing marker bounds are
numerical/render acceptance, not bit-exact original arithmetic.

| Area | Current implementation, proven by source | Evidence limit / next dependency |
| --- | --- | --- |
| Authored versus applied | Build authored/applied separately; preceding constraints update applied/world. Local source reads applied. World-target changes canonically decompose into positive scaleX, determinant-signed scaleY, shearX0. | Existing two ordered world→local-source shear/reflection cases specifically support this representation. Do not replace it with authored values to simplify Match. |
| Source sampling | Capture one source snapshot before looping targets. | No active multi-target original discriminator. Target=source, target source-ancestor and repeated dependent targets could distinguish resampling. No ancestry prohibition should be invented. |
| Multiple routes | Source rows and their destination lists execute in stored order. Two different sources may write one destination; mixes apply sequentially to its current channel. | Static corpus contains no destination fan-in. Do not call this measured original composition semantics. A two-source/one-destination partial-mix case is a useful next solver probe if requested. |
| Target order/hierarchy | Visit stored target order; recompute all descendants after each target. | Active parent+child target order is unmeasured by the37 cases. The10 zero-mix Match actions do not settle it. Preserve order meanwhile. |
| Clamp | Clamp mapped scalar between min/max(To.offset,To.max), then mix. Reversed endpoints are accepted. | Existing reversed-range/additive/clamped cases cover a bounded subset. No rewrite is justified by endpoint UI appearance. |
| Local angular channels | Absolute local rotation/shear mix linearly; world angular operations wrap their deltas. | This difference is code fact, not an established bug. A ±180 crossing with partial mix would be needed before changing either branch. |
| Additive scale | Multiply by `1+(value−1)*mix`; absolute scale with current zero is left zero. | Existing local additive-scale coverage supports its measured case. Broader signed/zero-scale branches are not all proven. |
| Singular target parent | Active world→local setWorld needs inverse and may fail; fully inactive mapped mixes short-circuit without inversion. | Atomic failure/no-op tests exist. No original singular Match/active-solver policy has been established. Do not introduce fabricated inverse fallbacks. |

An earlier constraint changing source applied state is already tested; a Match
button deciding whether to sample that state is **not**. These are separate
questions despite using the same local/world labels.

## What Local/Local Offset Match can support now

The normal and reversed exact branches support this narrow operation:

1. Read the first **stored ordered target** and source's local authored six
   channels in the observed zero-mix, nonadditive local/local setup profile.
2. Compute all six offsets as f32 target-minus-source, with no decimal endpoint
   quantization, averaging, sorting, Properties-range construction or selective
   mapped-channel filtering.
3. Change offsets only: retain source/target order, authored bones, flags,
   mixes, runtime mappings and all24 exact nullable editor cells.

This can become a correctly labeled bounded native Offset Match feature if
the coordinator chooses that scope. It is not a general implementation.
The existing two local fixtures do not determine angle wrapping beyond their
observed values, Additive behavior, nonzero/partial own mixes, or sampling in a
scene where earlier constraints alter source/targets. A conservative exact
profile would require no effective upstream changes at sampling, local/local,
nonadditive, and the measured zero-mix branch; additional restrictions are
product policy, not discovered original behavior.

Use a distinct typed native operation resolving the constraint's stable ID
against the current revision. Do not calculate in the frontend using a
rounded HUD, public frame world decomposition, or an echo of editable range
bits. Stage once so invalid references, overflow/nonfinite subtraction or
unsupported branch reject atomically; offset no-op must not create history.
Future acceptance should compare native f32 offset bits for both accepted
target orders, unchanged bones/maps/ranges, one Undo/Redo and canonical reopen.
Reusing accepted expected values requires no rerun of those original actions.

World/mixed Offset Match remains blocked on signed decomposition/shear branch
precision and evaluated-stage evidence. Properties Match additionally needs
endpoint/null/manual coupling. The fixed f32/public-helper audits failed to
recover these values; there is no authorization here for a rounding/search
grid, cherry-picked constants or relaxed bounds.

## History and native evaluation cache

Current ordinary constraint update rebuilds validated input, then preserves
old editor ranges only for Transform→Transform; new/kind-changed constraints
default allNone. Store strips view-only `editorRangeBits` after merging the
patch. Runtime properties can therefore change while the editor cells remain
unchanged: that is the recorded preservation policy, not original manual-edit
synchronization. A future explicit range command must intentionally update
the coupled runtime fields and cache in one staged edit without weakening
generic-update preservation or allowing forged read-only metadata.

Existing native range tests cover preservation, forged echo rejection by
non-use, no-op/history, bone remapping/kind transitions and save roundtrip.
Current Session revision/geometry epochs still gate cached public poses.
Private live-physics continuation additionally compares the complete
constraint objects, so even editor-cache-only changes invalidate a prior
continuation layout. This is conservative current behavior, not a proven
cache corruption; avoid changing it incidentally while implementing Match.
The present complete-object comparison also means a constraint rename resets
live state. Separating runtime-affecting layout from editor metadata could be
an independent improvement, with explicit reset/history tests and coordinator
approval; it is not needed to make editor values roundtrip safely.

## Recommended next slice

1. Preserve retained target order and filter source/destination controls from
   accepted paired evidence; these can proceed independently of endpoint math.
2. Finish the paired manual-range observations now underway. Define typed
   endpoint/clear operations and native atomic coupling from those results.
   Keep generic updates bit-preserving.
3. Decide explicitly whether to expose the bounded local/local Offset Match
   profile above or wait for broader sampling evidence. Do not advertise both
   header Match actions from only one recoverable branch.
4. If solver parity needs expansion, choose one named active multi-target or
   fan-in discriminator after reference gates. Keep the accepted37-case solver
   outputs unchanged absent contrary new evidence; no speculative solver fix
   is justified by this audit.

Root owns implementation/integration and release state. This memo alone
changes no application behavior or verification status.

## Membership fix implementation policy (before code)

Paired DATA/UI gates reuse the accepted reversed original target vectors and
first-target Match observations. The UI gate is
TRANSFORM-TARGET-MEMBERSHIP-UI-HANDOFF.md. Preserve retained Transform stable IDs
in their prior order, append genuinely new selected IDs in deterministic DOM
order, and leave the separate IK ordering path intact. This is a deliberate
FBones preservation policy; original membership-edit chronology is unknown.
Verify the actual native-backed select interaction, exact no-op/history,
Undo/Redo and binary Save/Close/Open. No solver/codec changes are authorized by
this fix and no physics or user-owned window may be used for its tests.

Actual native-backed select check also exposed a Vue controlled-select defect: :value binds [2,1] as a string value="2,1" on HTMLSelectElement, leaving zero options selected while native bones=[2,1]. Evidence .local/transform-member-select-binding-failure. The fix binds each option selected state from authoritative membership; the same change handler and failure recovery remain. This is a direct FBones DOM/Rust mismatch, not a new inferred original membership gesture.
