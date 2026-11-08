# Extended Transform Setup mix — UI preservation gate

2026-11-06. Read STATE/TASKS, F308, `docs/UI-UX.md`, accepted sparse Transform
controls/range policies and current Inspector/slider/format guards. Scope is the
actual A Setup mix `[0,-1,-1,0,0,0]`, not a new Match, suffix, solver, Physics or
original-editor research round. No product edit, original/browser operation,
shared runner or build occurred.

## Reused exact reference and evidence boundary

Re-viewed retained exact4.3.26
`auto-scope-ui/match-offset-mixed-before.png`, as specified by
`TRANSFORM-SPARSE-CONTROLS-UI-HANDOFF.md`. The compact Mix rows are driven by
destination mappings and keep Rotate/Translate XY/Scale XY/Shear Y grouping,
including blank/hidden unmapped cells. This capture shows zero Mix values;
its negative Offset and endpoint numbers are **not** evidence of negative Mix
gestures. Preserve the established row visibility and all hidden authored cells.

Paired DATA's new A correlation resolves Transform65 fields4/23 as exact f32
Translate X/Y mix−1, with the other four mixes+0, against the retained internally
4.3.26 runtime data. The pinned4.3.13 runtime's unbounded-mix documentation is
secondary guidance, not an original4.3.26 numeric-entry or solver observation.
See `ANIMATION-TRANSFORM-SETUP-MIX-DATA-GATE-2026-11-06.md` for that proof and its
bounds. Do not turn source retention into a broader numeric/Match parity claim.

## Existing controls already preserve the extended number

`ConstraintInspector.fieldValues` displays mix×100; its precise edit maps the
percentage back with `/100`. Each `NumericSliderRow` has convenient drag bounds
0..100 but its precise field is text/decimal, not a range-limited number. The
slider thumb/fill alone is clamped for display. Its wrapper records outside-range
state, the precise field gets a warning border and the localized tooltip says
the exact value is retained. `aria-valuetext` also keeps the actual number.
This matches the existing UI-UX policy: a useful slider interval is not a new
format limit. Never normalize a value on mount, focus, selection or Save.

Ran an isolated actual compiled ConstraintInspector/slider probe with an explicit
typed negative-mix DTO, production Pinia/field editor and a collecting edit sink:

`node .local/research/transform-extended-mix-ui-2026-11-06/probe.mjs`

The adjacent ignored `result.json` records X/Y numeric fields **−100**, slider
position0, outside-range=true, retained-value tooltip and no inspector error.
Mount and focus/blur emit no edits. Typing−125 in X sends exactly
`mix:[0,-1.25,-1,0,0,0]` while Y remains−100 and every other mix is untouched.
This proves frontend presentation/routing only: the DTO intentionally bypasses
the currently rejecting format guard, and the sink is not native authoring or
proof of original−125 entry. No frontend source change is necessary to retain
the measured−100 value.

## The actual opening/Save gate is in the source profile

`minimal/scene/validate.rs`, Transform branch, rejects any Setup mix outside
0..1 in addition to its finite/reference checks. `encode_scene_payload` invokes
that validator; SceneHistory construction/edits also encode/validate. Project
opening routes UnsupportedProfile to inspection-only. Consequently the imported
negative Setup mixes cannot become an editable/open-and-save model under the
current guard, regardless of the widget's support. A's separate track/key/domain
capacity limits remain independent; the private proposed-capacity check isolates
this last schema blocker, not a permission to raise product limits.

The Transform apply functions use finite authored mixes arithmetically without
a0..1 mix clamp. The initial audit inspected those functions but missed ordered
evaluator preflight checks; the correction below narrows this statement. It was
not proof that the complete evaluator already accepted an extended Setup mix. Match has a separate normalized-mix guard in
`transform_match::validate`; leave it and its established profile unchanged.
Likewise retain IK, animation-key/curve and every other family limit unless
their own DATA gate explicitly changes them. Do not change range metadata,
offsets, properties, reference order or hidden Mix cells to fit the imported pair.

## Bounded delivery/interaction requirements

Retain the measured negative Setup bits through independently encoded equality,
native history/Save/reopen, unrelated edits and resource generations. Display
−100% as a valid extended value beside the0..100 slider; do not label it an
invalid draft or block Save merely for lying beyond the drag interval. Invalid
nonfinite text still blocks Save and Escape restores the actual authored value.
Only a deliberate completed drag may replace that component with a bounded
slider value, one history action; focus and release without input must not.

Keep current sparse mapping-driven visibility and shared Setup/Animate layout.
Any unsupported Match action may continue to reject clearly; do not invoke it
automatically or broaden it as part of source admission. Native owning tests
should distinguish Setup preservation from animation mix limits and assert all
other fields/range bits unchanged. Compiled controls can repeat the probe with
Enter, Escape, untouched focus and one slider gesture after DATA/native changes.
Original extended-input gesture fidelity, broader Transform solve fidelity and
fresh original acceptance remain pending.


## Correction before evaluator preflight coherence fix

The actual product A now opens and loads190PNGs, but its first None evaluation
fails InvalidConstraint. Paired DATA records this in **Correction: evaluator
preflight coherence before native admission** in the Setup-mix DATA gate.
Inspection identifies `src-tauri/src/solve/mod.rs` Transform preflight's0..1 test
and `src/domain/solve/index.ts::prepare`'s matching range test. Both run before
the finite-only Transform apply formula. The initial UI audit's apply-function
inspection therefore missed a real viewport blocker; the absence of a clamp in
the formula did not establish end-to-end acceptance.

The bounded correction is **only Transform Setup finite preflight coherence**
with the independently admitted stored source values. Keep the six-value shape,
reference, finite, unique mapping/order and finite-result safeguards. Do not
change any arithmetic, Match profile, animation override/curve limit, IK or
Physics validation. Invalid/nonfinite scenes must still fail atomically rather
than publishing a partial pose or stale geometry lease. No new slider/control,
automatic Match action or original solver research is needed.

A focused production TypeScript evaluator regression must show the stored
negative X/Y mix produces a finite deterministic None/pose result while Setup
bones/mixes/ranges remain unchanged. It must retain nonfinite rejection and the
separate IK/animation-override bounds. Root/native owning checks then repeat
actual A evaluations and source-preservation checks before usability/admission
claims. This is a missed guard alignment, not new Transform solver parity.

The coordinator's minimal TS preflight alignment now passes
`tests/transform-negative-setup-evaluation.test.mjs`2/2. A frozen own local
identity-mapping scene with X/Y mix−1 evaluates None and pose to the independently
specified negative-mix result, with fixed1e−12 absolute tolerance for the existing
affine roundtrip; authored bones, mixes and range bits remain exact. NaN/±Infinity
reject without authored mutation, IK−1 still rejects, and an over-budget sampled
Transform override still rejects. This is an evaluator-boundary regression, not
new original numeric fidelity or actual A renderer proof. Root owns the native
preflight and actual A evaluation/history/cache checks.
