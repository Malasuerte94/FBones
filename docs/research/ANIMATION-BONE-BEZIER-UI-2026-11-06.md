# Monotone bone Bézier handles outside a segment — UI pre-code gate

2026-11-06. Reuse supplied `animare/Spine_m7wxCtUtTG.png`, accepted animation
UI/Graph audits and current Graph/control code. The image establishes selected
square keys, separate handles and dense Graph placement, but not exact4.3.26
out-of-segment dragging or collision/rejection gestures. No browser/original
operation or shared test/build occurred.

DATA's actual A Rotate segment348→353 has outgoing time353.467 and incoming
time351.086. Its analytic time derivative remains positive despite the outgoing
handle exceeding the next key time. Per-handle containment is therefore a
stricter condition than monotone cubic time; primary source curves must not be
clamped merely to fit that older sufficient test. DATA owns exact f32/math proof
and the format/native validator change before implementation.

Current Graph SVG already draws the stored handle at353.467. Its `dragHandle`
calls `timelineBezierDragPoint` with bounds348..353 for both handles. Directly
running the production helper with initial frame353.467/value10, horizontal
delta0 and vertical delta−10 returns frame353, changing time during a value-only
drag. This is a source-preservation/UI jump defect; no original gesture is
inferred from it. The current composable also clamps both handle times to the
segment, so the release route must be corrected with the owning coordinator.

Bounded FBones interaction policy: only supported **bone** channels get the
time-control domain supported by the new monotonicity predicate. Outgoing time
may range from its key start to1,000,000; incoming time may range from0 to the
next key end. In either case the complete cubic must remain monotone for commit.
These bounds do not permit negative time, inverted key order or an arbitrary
control domain. Preserve a valid loaded handle during zero-horizontal/vertical
movement; keep the other handle, values, key frame and unrelated component bits.

Pointer-down still pauses before gesture creation, Escape cancels, stale
frame/clip/document context cancels and release creates at most one authoring
action. A temporarily invalid SVG preview during dragging is transient; the
root/native route rejects a nonmonotone release atomically with a clear notice,
restoring stored handles without silently clamping or linearizing the curve.
No partial history/source mutation is allowed. This does not claim the original
editor permits the same gesture or uses this rejection presentation.

Keep current slot light-color, two-color, deform and constraint handle limits
unchanged. Their independent sampling/serialization evidence is not expanded by
a valid bone curve. The existing two-color Linear-only restriction remains.
Graph layout, ruler, shared Setup/Animate HUD and stored key times are unchanged.

Regression must use actual compiled Graph handlers with a real animation
composable: value-only drag retains the reported overshooting time; Escape does
not commit; a larger nonmonotone release is rejected/no IPC; an ordinary slot
color handle still uses its existing segment bounds. These are frontend/source
checks; native binary/history proof and GPU/original behavior remain separate.

## Paired gate and focused implementation evidence

The paired proof is now recorded in
`ANIMATION-BONE-CURVE-TIME-DATA-GATE-2026-11-06.md`: exact A times are
348 /353.467193603515625 /351.08648681640625 /353, with minimum time derivative
about1.184418064>0; the two unsupported scalar counterexamples fail monotonicity.
The coordinator's TypeScript/native/format routes own that shared predicate and
atomic rejection. This Graph patch only changes the bone gesture bounds.

`tests/animation-bone-handle-controls.test.mjs` passes3/3 using actual compiled
Graph pointer handlers and the production composable. It retains A's exact f32
outgoing time on a vertical drag, preserves the other handle/unused rotation
lane, pauses before gesture creation, cancels Escape, rejects a nonmonotone
release before IPC, and leaves ordinary slot-color segment clamping unchanged.
The test summary stays byte-for-byte unchanged because its collecting edit sink
is not a native authoring engine. These checks do not establish browser/native
input, GPU pixels or original gesture parity. Root owns the integrated checks.
