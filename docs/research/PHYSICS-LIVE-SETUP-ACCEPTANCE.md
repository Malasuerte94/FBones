# Live Setup Physics: independent saved-state acceptance

2026-10-29. Scope: the final actual UI-authored live-gravity fixture and its
one new original4.3.26 CLI export. No old oracle batch, original input or
production code is changed by this verification.

## Fresh fixture and collected evidence

The accepted Linux Playwright run passes45/45 in42.532716s through the real
Rust Session backend. The dedicated live tests cover default-on gravity,
actual parent dragging/relaxation, one authoring commit with Undo/Redo, native
Save/Close/Open, intentional Simulate-off, temporary geometry/selection holds
and continued preview beyond120seconds with bounded native checkpoints.
Those UI assertions are distinct from this independent persistence checker.

The frozen portable snapshot contains eight artifacts. Source SHA256:
`a13b4820f826b9a753d0fe63798b11ea062cdb8d44dba949603a5b4071b78f31`.
One renamed copy was accepted/exported by original4.3.26 with terminal0 and
Complete. The runtime JSON SHA256 is
`41653d3e1eabbdf3dea3d0061e6ac7d53f061625365421f730fe8a3d039edb54`.
This DATA checker runs no original command and sends no application input.

Private checker `.local/check-live-setup-export.py` produces
[analysis/live-setup-ui-original-check.json](../../analysis/live-setup-ui-original-check.json),
SHA256 `9f67bd0f6e144faa7ef1e6b0484a1976c032e3fa979c98c97088ba9e92827df3`.
It independently verifies the full artifact ledger, source/copy identity,
version/log/receipt, DEFLATE envelope length and CRC64, then completes a raw
record parse and compares captured native stages to original runtime JSON.

## Proven authoring invariants

- Three bones, one Physics constraint, zero slots/attachments. Only the parent's
  authored X changes, from−100 to−20. All24 stored bone-channel f32 values match
  the saved native summary. The child's complete rest pose stays unchanged;
  runtime bone decimal differences are zero for this fixture.
- Constraint settings are identical in the before/committed/saved summaries.
  All35 raw Physics fields are checked:23 runtime settings/name/reference fields
  and12 remaining fixed canonical metadata fields, including owner/group links. Gravity10, X/Y influence1 and
  the child reference remain authored settings; other omitted runtime defaults
  are expanded explicitly. Stored step is `3c888889`, and the raw angular
  default sentinel `7fc00000` corresponds to the native nullable default.
- No simulated offset, velocity, preview time or deformed child pose is baked
  into the saved bones/settings. The runtime has only the empty default
  animation; no motion keys are authored by live preview.
- Five own PNGs retain identical hashes/dimensions and valid PNG chunk CRCs in
  the portable snapshot/comparison copy. They are **unused fixture resources**:
  the saved native loaded-image list is empty, and no attachment references
  them. This does not prove image-loading or attachment persistence coverage.

## Limits retained

Original CLI acceptance does not establish an original live-editor parent-drag
or GPU trajectory comparison. Numerical exported-frame solver phase remains
unresolved: the independent highest-FPS experiment rejects all four named
models, and the subsequent bounded stage-order candidates also fail. Default
live Setup and authoring preservation are accepted without relabeling those
solver failures as parity. General constraints/animation/platform compatibility
remain active work. Windows delivery/interaction acceptance belongs to the
coordinator's separate current-image checks; this report makes no new Windows
or macOS claim.
