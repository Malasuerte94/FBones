# Weighted vertex binding policy — FBones, not recovered Spine parity

Recorded2026-10-29 before dependent implementation. Paired evidence is
`WEIGHTED-VERTEX-INSERT-UI-4.3.26.md` and the new-vertex section of
`WEIGHT-LOCKS-VERTEX-DATA-4.3.26.md`. The exact original insertion attempt was
unsuccessful: the own mesh retained six rows and unchanged source bytes. Current
primary Mesh Create/Deformed documentation explains interaction and editing
spaces, not dormant-coordinate arithmetic. No older workflow article is used.
New-vertex binding arithmetic is therefore **unknown exact4.3.26 behavior**.

The existing typed Auto/manual position-retention evidence remains valid for
existing rows; it does not define creation. In particular, an existing0,0 pair
is legitimate data, never an unset marker. This policy explicitly defines a
consistent FBones creation profile so our preserve-all weight tools do not
activate newly invented empty origin placeholders.

## Interior face and edge policy approved for implementation

Let source rows have nonnegative interpolation coefficients `b_i` summing to1,
source weights `w_ij` and source local coordinate pairs `p_ij`.

- Interpolate the new weight for column j as `sum_i b_i*w_ij`, then normalize
  the new row with bounded finite arithmetic. Preserve ordered membership.
- For a resulting positive-weight column, interpolate its local coordinates
  using `sum_i b_i*w_ij*p_ij / sum_i b_i*w_ij`. This preserves the weighted
  local-offset field rather than rebinding every column at the current pose.
- For a resulting **zero-weight** column, use ordinary local-field interpolation
  `sum_i b_i*p_ij`. Do not insert0,0 by default or infer an absent coordinate
  from a legitimate zero pair. Do not initialize it by current-world inverse.
- Only the **new** row may receive a small world-space correction after f32
  rounding so it represents the authored target under the frozen current pose.
  Apply the existing positive-weight local delta mechanism. Dormant local
  columns remain the interpolated field. If a required positive inverse is
  singular or the result nonfinite, fail atomically; a dormant singular bone
  must not require an inverse merely to interpolate its finite local field.
- Preserve every existing row's weight and local-position bits, including
  signed zeros. Boundary insertion may reorder old rows; track them through
  the existing UV/index remap rather than assert obsolete array indices.

Mesh interior/edge insertion and remeshing use actual old face/edge coefficients.
Clipping insertion uses the two adjacent authored polygon rows and clamped
edge projection t. Its accepted API can insert an off-edge authored point:
interpolate the old edge field first, then use the approved all-column offset
extension below for an off-edge target. Preserve old polygon rows/metadata and
retain existing polygon validity/canonical guards.

## Approved bounded extension outside old UV hull and off-edge clipping

The existing image mapping extends a fitted UV→current-world plane and chooses
the nearest old UV vertex's weight distribution. Coordinator-approved extension:
clone that nearest old row's **complete** weights/local-coordinate fields,
then translate **every** local column, including dormant columns, by its current
bone's inverse **vector** applied to `(target-oldWorld)/sumWeights`. This moves
each column's projected field by the same world delta while preserving its
offset relative to the nearest source row. Do not replace local positions with
current-world inverse points. Ties use the earliest old UV index.

The same all-column offset extension applies when clipping's requested authored
point differs from its clamped current-edge projection. Exact supported
face/edge interpolation only needs the positive new-row residual correction
described above; its dormant field is ordinary local interpolation.

For a nonzero outside/off-edge delta, **all** bound bones need nonsingular
finite inverse linear transforms, even if their weight is zero. Reject the
complete edit atomically on any required singular inverse, nonfinite local
result or world target outside the existing±1,000,000 bound. Finite local
coordinates are not given a new arbitrary magnitude cap: inverse scale may
legitimately make them larger. A zero extension delta requires no inverse.
Clipping compares the requested point with its clamped edge projection as
represented in f32; a nonzero represented difference uses the extension
branch, without an invented distance tolerance. This is an explicit
bounded FBones limitation, not original-version behavior. Interior/on-edge
dormant singular bones remain usable because no dormant inverse is needed.

This retains the existing nearest-distribution choice while preserving its
noncoincident bind offsets and prevents later activation from falling back to
the nearest old vertex merely because its dormant column was left stationary.
Per-column plane extrapolation would be a distinct unproven policy and can
magnify offsets on degenerate source distributions. The data worker reviewed
the inverse-vector/sumWeights identity independently before implementation.

## Implementation and meaningful checks

Keep row creation arithmetic in a real shared DenseBinding helper, used by Mesh
and Clipping. Never manufacture a fake image/mesh for a clipping row. Do not
change ordinary old-row move, manual weight, Bind or Auto behavior as a side
effect. Legacy binding initialization stays explicitly separate.

Tests should distinguish weighted quotient from naive local interpolation and
current-pose rebinding using posed/reflected/noncoincident fields. Cover dormant
columns, legitimate/signed zeros, tiny positive weights, inside/edge/off-edge
clip cases, outside fallback after approval, unchanged old rows through reorder,
finite normalization and atomic invalid/singular requests. Activate a formerly
dormant new column afterward to prove it uses the interpolated field rather
than a manufactured origin. Keep canonical/history/native save acceptance
separate from pure interpolation tests. A TS preview must consume the same
creation profile; a dead helper is not evidence of a live insertion preview.

No original command, Windows input, Playwright run or accepted batch is repeated
for this policy. No exact insertion parity or full F302 completion is claimed.

## Implemented native checkpoint

The approved policy is implemented only on native row-creation paths:
`binding.rs` shared interpolation/new-row positioning, `mesh.rs` staged Add,
`mesh_edit.rs` UV remeshing and `clip_edit.rs` insertion. Existing Bind's
`set_vertex`, ordinary manual/Auto arithmetic and old-row move semantics are
unchanged. There was no existing TS row-creation preview consumer; coordinator
explicitly rejected adding a second unused preview engine/API. No UI, viewport,
store, panel or format code changed in this slice.

Dedicated `weighted_vertex_tests.rs` passes **7/7** on the default profile.
It distinguishes weighted quotient from naive local averaging/rebinding,
preserves a tiny1e-16 positive column, retains legitimate dormant origins,
checks old signed-zero bits through boundary reorder, verifies later dormant
activation inside and outside, compares every projected outside column's
offset extension, tests singular dormant inside/zero-extension success versus
outside/off-edge atomic failure, and exercises on/off-edge clipping. A real
native Session insertion also passes one Undo/Redo and canonical Save/Open with
its PNG bundle. This is own correctness evidence, not an original after-file.

Full checks after this slice, workspace Cargo cache/offline:

- Default desktop lib: **138 passed,2 existing ignored** (140 total).
- No-default-features desktop lib: **93 passed,1 existing ignored** (94 total).
- Strict all-target desktop Clippy: **passed**, both feature profiles.

Source is frozen for coordinator integration and a rebuilt routine UI suite.
These native checks do not claim new Windows/WebView2, macOS or successful
original4.3.26 insertion verification.

Independent data-worker source review after freeze found no material issue in
the helpers, callers or seven dedicated tests. It checked all-column extension,
field retention, atomic staging and zero-delta inverse avoidance without reruns
or edits; test counts above remain attributed to this implementation worker's
terminal receipts. The coordinator subsequently reports a rebuilt27/27 Linux
UI suite and a new visible normal Linux GTK/WebGL window, recorded separately
in its acceptance/launch artifacts. No original insertion parity is inferred.
