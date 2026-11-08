# Bone Bezier time monotonicity DATA gate — 2026-11-06

Before dependent implementation. Source A's proposed-capacity copy still rejects
one **existing combined Rotate** curve under the old in-segment time-control
guard. Reuse accepted exact4.3.26 absolute frame/value control and mixed-curve
mapping in [the animation DATA audit](ANIMATION-DATA-4.3.26.md). No new original,
runtime decoder, platform, UI or shared-test operation is needed for this finding.

## Direct retained data and independent proof

The source's segment endpoints are348and353. Outgoing time is353.467193603515625;
incoming time is351.08648681640625. Exact f32 bits in order
`first,outgoing,incoming,last` are43ae0000,43b0bbcd,43af8b12,43b08000.
This does not imply nonmonotone time: a cubic Bezier may leave the endpoint
interval in its control polygon while its actual time coordinate stays increasing.

For time controls`x0,x1,x2,x3`, let`a=x1-x0,b=x2-x1,c=x3-x2`.
The time derivative divided by3is
`q(t)=a(1-t)^2+2b(1-t)t+ct^2`. With finite inputs and`x3>x0`, it is nonnegative
on0…1 iff`a>=0,c>=0`and either`b>=0`or`b*b<=a*c`.
For negative b, necessity/sufficiency follows by writing q as
`(sqrt(a)(1-t)-sqrt(c)t)^2+2(b+sqrt(a*c))(1-t)t`; if the second coefficient is
negative, choosing the point where the square vanishes yields a negative q.
Zero a/c with negative b correctly rejects; an isolated zero derivative is
allowed. Positive endpoint extent rules out an identically zero derivative,
so nonnegative q gives strict time ordering and unique inversion.

Independent **exact rational arithmetic from the stored f32 values** gives the
A segment's minimum q as5147284477/13037502464≈0.3948060214149924 at
t≈0.6463368964468562. Minimum actual derivative is
15441853431/13037502464≈1.184418064244977, strictly positive. All3,138combined
bone-curve axis segments in the complete A graph pass the analytic predicate;
only this one fails the former interval-control rule.

The retained runtime report independently matches this Rotate segment's two
endpoint times/values. It does not retain handle arrays. A separate **static**
inspection of the hash-pinned `.skel` finds one unique endpoint+curve-byte2+four
f32handle block under the pinned public runtime grammar. Its outgoing time
11.782240867614746seconds exceeds end11.766666412353516seconds as well; the
corresponding editor time is353.4671936frames. This corroborates that the stored
shape predates FBones rather than arising from our importer. Small existing
conversion residuals remain untouched. No new runtime/original sampling result
is claimed from this static block correlation.

As a negative control, the two previously identified unsupported scalar
Translate X segments have minimum derivatives about−2.3333619. The same analytic
predicate rejects them; relaxing all time bounds would be unsound. Generic116/
scalar support remains pending, independently of this combined-bone correction.

## Minimal implementation and evidence limits

Export format helper
`bezier_time_monotone(first:f32,last:f32,outgoing:f32,incoming:f32)->bool`.
Require finite fields and positive endpoint extent; compute derivative terms in
f64 and apply the predicate above **without epsilon, clamping or handle sorting**.
The shared TypeScript counterpart validates the same recovered f32 inputs and
uses the same f64 arithmetic. Products of finite f32 differences fit finite f64,
including subnormal f32 values; no32-bit arithmetic or arbitrary sampling grid is
needed. Keep existing finite key/value checks, duplicate/terminal-key constraints,
rotation's unused lane/control invariant and every other profile guard.

Replace only the combined **bone** Bezier control-time interval rule. Slot,
constraint, deform and other curve validators stay unchanged. Keep stored handle
bits and source times exactly; the accepted full-weight FBones preview already
inverts absolute time with bounded binary search, which remains valid on a
strictly increasing cubic including isolated stationary points. No source key,
curve or opaque metadata is flattened, approximated or normalized by this fix.
This extends our supported mathematical input policy; original editor gestures,
new-file acceptance, pixel/numeric solver parity remain pending.

Graph/typed property edits must preserve valid loaded out-of-interval control
coordinates when editing only the value axis. New invalid nonmonotone gestures
reject atomically, retaining prior authored fields/history. The paired UI gate
owns its actual control/clamp changes. Tests must include the exact A bits,
increasing crossed controls, stationary-boundary equality, barely nonmonotone,
negative endpoint slopes, invalid extent/nonfinite/subnormal/extreme f32 cases,
raw-bit/model roundtrip and unchanged other-family bounds. Repeat the isolated
A capacity prototype only after this diagnosed fix, preserving equality and
reporting any next blocker; product capacities are not authorized by this gate.

Private retained proof: `animation-bone-curve-time-2026-11-06/` exact-rational
script/results, runtime endpoint and unique static handle-block comparison,
plus the earlier `animation-two-color-capacity-2026-11-06/` rejecting clone/logs.
No original/user process or source data was modified.

## Boundary audit before code

The algebraic predicate above is exact; naive f64 evaluation of rounded
subtractions is not exact for every finite f32 input. Counterexample:
`first=2^-149,last=1,outgoing=1,incoming=0`. Exact a=1−2^-149,b=−1,c=1 gives
b²>a*c, but f64 subtraction rounds a to1 and falsely accepts. A second example
uses first0/incoming−2^-149. A product tie-only exception is not a general
roundoff proof. Do not ship the plain arithmetic predicate as an exact guard.

Use an exact dyadic comparison or conservative outward-rounded interval proof
for ambiguous newly supported controls. A dependency-free exact representation
is practical: every finite f32 is an integer times2^-149 with at most277bits;
nonnegative differences fit five u64limbs and products fit ten. Compare
`(outgoing−incoming)^2 <= (outgoing−first)*(last−incoming)` exactly after the
endpoint-sign checks. TypeScript can form the same f32-bit integer units with
BigInt. The previous fully in-segment control condition remains an independently
safe fast path; it must not be tightened. Actual A has a strong strictly positive
margin and is unaffected by this numerical corner. This correction is recorded
before helper implementation and supersedes any claim that mere finite f64
products guarantee exact boundary classification.

## Exact implementation and diagnosed retry

The final helper uses dependency-free five-limb unsigned distances and ten-limb
products for the dyadic comparison, retaining old interval/ordered fast paths.
It supports signed finite f32 values and numeric negative zero without epsilon.
An independent Python rational oracle agrees with Rust on11,288cases, including
all3,138Aaxis segments, full-range random bit patterns, exact stationary boundaries,
subnormal false positives and extreme signed values. Format65tests and strict
all-target format Clippy pass; own wire tests preserve the exact outside-control
bits and independently verify Slot interval guards still reject that shape.
Product capacities remain unchanged.

A new ignored clone containing only the proposed capacities/per-clip limits and
this diagnosed mathematical fix progresses past the curve, then rejects A's
Transform Setup mixes `[0,-1,-1,0,0,0]` at its existing0…1guard. No mix/solver guard
was relaxed and full A equality is not claimed. That separate admission question
requires its own paired gate. Initial copies/rejections and post-fix traces stay
retained under `animation-two-color-capacity-2026-11-06/`.

## Independent Rust/TypeScript boundary review

A separate std-only `rustc` runner imports the actual product Rust helper, with
integer overflow checks and debug assertions enabled. The actual product
TypeScript helper was compared on10,000 deterministic f32-bit quadruples against
that runner and a separate Python arbitrary-integer oracle. The oracle evaluates
the derivative inequality directly, without the product's sufficient fast paths.
There are **zero discrepancies**:1,368 accepted and8,632 rejected cases.

The corpus contains3,000 arbitrary bit patterns,4,000 crossed outside-control
polygons,2,000 exact stationary constructions with adjacent-bit perturbations,
and1,000 targeted/extreme cases. It includes signed zero, positive/negative
subnormals, all exponent ranges, extreme finite magnitudes, Infinity and NaN.
6,227 cases enter the extended predicate, including1,088 accepted cases. Exact A
bits and the subnormal f64 false-positive counterexamples are included. This is
independent differential evidence, not exhaustive enumeration or original-editor
acceptance.

Static arithmetic review also finds no carry/sign defect: finite f32 magnitudes
occupy at most277 bits; cross-sign distances fit278 bits within five limbs, and
their products fit556 bits within ten. Each multiplication accumulation is at
most `(2^64−1)^2+2*(2^64−1)=2^128−1`; its u128 addition cannot overflow. The final
row carry writes a previously untouched limb. Nonfinite and endpoint/slope-sign
checks precede the limb helpers; equal signed-zero distances return zero.

Private tools, cases, raw outputs and source hashes are retained in
`animation-bone-curve-differential-2026-11-06/`, final aggregate `result-v2.json`
SHA256`6df7ec1ce0e72142e8f72a9b697cda9e79880e9910efec58b7aa7670f12574b8`.
Reproduce with `python3 generate.py`, the recorded `rustc` command and
`node compare-file-v2.mjs` from the repository root using that private folder's
paths. The initial pipe-based collector stalled and was interrupted with exit130;
its source and empty process-lookup result remain retained. File-backed input
completed successfully. No product source, Cargo/shared runner or original
process was changed for this audit.
