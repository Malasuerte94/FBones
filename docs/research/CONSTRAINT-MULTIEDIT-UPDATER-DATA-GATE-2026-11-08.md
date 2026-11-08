# Constraint multi-edit, type icons and updater DATA gate — 2026-11-08

User priorities: automatic release updates, recognizably different constraint
icons, and selecting several same-type constraints to edit shared properties
together (for example five Physics gravity values). Recorded before dependent
code; no original launch, shared build/test, process operation or remote write.
The [paired UI gate](CONSTRAINT-MULTISELECT-UPDATER-UI-GATE-2026-11-08.md) owns
appearance/gestures; updater-specific official-document research is independent.

## Reused direct evidence and current implementation

Accepted exact4.3.26 findings in `FEATURE-DATA-4.3.26.md`, F309 panel audits,
`PHYSICS-MULTI-BONE-AUTHORING-DATA-HANDOFF.md` and the F310 creation policy prove
one constrained bone per independent Physics record, unified constraint order,
typed IK/Transform/Physics fields and per-record authoring. F310 proves existing
native atomic creation/history and non-baking live Setup acceptance. It does not
prove original homogeneous multi-edit gestures, mixed-field presentation or
constraint-icon artwork. Those requested extensions are **FBones policy**, not
new Spine parity claims. No recollection of accepted numeric/original batches is
needed to implement them.

Current source facts:

- `ProjectSummary.constraints`/`ConstraintView` already carries native stable ID,
  order and tagged type. `treeProjection.ts` drops type, and `SceneTree.vue`
  renders all constraint rows with the same `weights` icon. Add a derived type
  to the projected row and choose our own type-specific UI glyph; no serialized
  icon, runtime evaluator, binary tag or project-dirty mutation is warranted.
- `workspace.ts` stores only `selectedConstraintId`; constraint Tree clicks
  ignore Ctrl/Shift. Object selection reset paths, parent-pick invalidation,
  deletion/history publication and pinned/following inspectors depend on this
  singular value. Preserve a primary ID for existing consumers while adding a
  separate ordered stable-ID cohort. Selection remains transient UI state.
- `editConstraintById` reconstructs a complete input record from one current
  view and sends one `updateConstraint`. `scene_bridge.rs` resolves the ID and
  calls `ConstraintInput::build_update`; Transform editor ranges are deliberately
  retained from the previous native record. Looping this route is multiple
  transactions and can partially update a group. Spreading the first selected
  record onto the others would overwrite unrelated values/identity.
- `SceneHistory::apply` clones the frame/ID allocator and validates before
  committing. `SceneEdit::Rig` dispatches through the existing bridge inside
  that transaction. Reuse this atomic boundary, serialization guards and history,
  not a second frontend model or sequence of native commits.

## Frozen batch and field contract

Use one native semantic batch with frozen nonempty unique selected IDs, one
constraint kind and a narrowly typed field patch. The coordinator freezes exact
wire naming; an appropriate shape is `patchConstraints {ids, patch}` with a
typed IK/Transform/Physics patch. Resolve and validate **all** IDs, homogeneous
type, supported field/value and existing project limits before publication.
Apply only the explicitly requested field to each native cloned record. A stale,
missing, duplicate, mixed-type or invalid member rejects the entire operation
without history/revision/selection or partial authored changes. One completed
gesture creates one history action; a semantic no-op creates none.

Keep native names, bone/source/target references, membership, canonical order,
stable IDs, naming-follow metadata, mapping topology, geometry and every unrelated
field unchanged. Do not echo view-only `editorRangeBits`/derived endpoints back
as authoring input. Preserve exact unrelated f32 bits, negative zero and nullable
Physics rotation (None differs from Some(0)), including all24 nullable Transform
range cells. Bulk scalar editing does not authorize Match sampling or topology
reconstruction. Identity/relationship/Match/order operations stay individual
until an explicit atomic contract covers them.

Shared current editable fields by kind:

| Kind | Scalar/toggle candidates | Eligibility boundary |
| --- | --- | --- |
| Physics | x, y, rotate, scaleX, shearX, limit, step/FPS; inertia, strength, damping, mass, wind, gravity, mix; each corresponding globals flag | All valid selected Physics records; retain existing numeric ranges/typed angular semantics |
| IK | mix, softness, bendPositive, compress, stretch | Present a field only when it is editable for every selected chain; one/two-bone controls differ |
| Transform | each offsets/mix component; localSource/localTarget/additive/clamp | Respect shared mapped-channel eligibility; preserve each record's unrelated mapping and ranges |

Setup Physics is the directly useful first vertical slice. Do not describe an
initial Physics-only implementation as all-kind batch support; the broader
homogeneous IK/Transform goal remains tracked until delivered. A group inspector
must show mixed native values explicitly, rather than the first record's value
or a synthetic zero. Compare raw authored f32/nullable semantics before existing
display rounding/conversions. Untouched mixed fields must not commit. A typed
replacement/slider completion changes only that one field for the frozen cohort.
Keep precise extended values, no silent clamping; Escape cancels; invalid drafts
block Save; Save awaits valid pending fields; changing cohort/context cannot
redirect a stale commit to new IDs. Pinned single-constraint panels retain their
explicit ID/follow policy from F309.

Existing Physics UI conversions remain: affected channels/inertia/mass/mix are
percent displays; damping shows `(1-retention)*100`; FPS is `1/step`; wind,
gravity, strength and limit retain their native units. Do not copy a rounded
display value into unrelated selected properties while authoring gravity.
Live Setup evaluation/holds and explicit Simulate Off remain unchanged; edits
are authored parameters, never cached/evaluated positions or velocities.

## Animate boundary

F105 accepted constraint/event notes prove per-constraint animation persistence
and existing shared controls; this task must not mutate Setup when in Animate.
`useConstraintAnimationWorkspace` supports Physics seven dynamic scalar channels,
IK numeric/flag pose and Transform mixes. Auto Key off stores transient drafts;
Auto Key on sends a native `setAnimationConstraintKeys` array. If group Animate
editing is delivered, stage all selected drafts together or build one combined
key array at one frame/revision and dispatch once; never loop current
`setConstraintAnimationFields`, which would author one transaction per ID.
If the first slice is Setup-only, explicitly disable group editing in Animate
and retain its normal single-constraint behavior until a separate group contract
is implemented. No new solver, key interpolation or format profile is required.

## Updater lifecycle and release identity boundary

Current Tauri capabilities/dependencies/config contain no updater plugin,
endpoint, updater signing key or updater artifact configuration. Beta2 through
beta6 name distinct releases but application/Cargo/Tauri version remains0.9.4.
A future updater-enabled release needs a consistent real application version
increase; changing only a GitHub beta suffix cannot establish a newer installed
app version. Existing `.exe`/DMG/deb/AppImage downloads and SHA256 are not evidence
of updater-specific signed install payloads. Updater agent owns current official
plugin/platform/signature/API verification before implementation.

Session/native Close and frontend quit/open/discard routes protect dirty work.
Frontend Save waits editFlight, rejects invalid drafts and only proceeds after a
successful save; canceled/failed Save remains dirty. Native `ExitRequested`
prevents exit for a dirty summary. An updater install/relaunch route must reuse
equivalent protection rather than assume ordinary OS-close guards cover an
installer/relaunch API. Automatic check/download can be independent, but no
replacement/restart may discard dirty work, valid unflushed edits or active
geometry operations. Checking/downloading must not author project history or
change binary resource paths. Keep strict CSP and make network/offline failures
non-destructive. Private update signing material belongs outside Git/artifacts;
native OS signing/notarization claims remain separate.

## Implementation ownership and required discriminating checks

Coordinator/native owner: `rig.rs` typed batch variant, a focused constraint patch
module (for example `scene_constraint_batch.rs`), `scene_bridge.rs` dispatch and
native regressions; shared TS wire types/workspace selection+pending cohort
contract. UI owner: projected types/icons, Tree selection and group inspector
under that agreed API. Updater owner: official plugin/data contract, updater
module/config/publication; coordinate edits to shared `lib.rs`/Cargo/config.

Meaningful acceptance: five independently valued Physics records → gravity-only
edit → all five changed once, unrelated values/bits/order/names/global flags
unchanged; one Undo/Redo, no-op, rejected mixed/stale/invalid batch atomicity and
Save/Close/Open. Actual pointer/keyboard mixed-field and Ctrl/Shift selection,
Escape/Save/pinned-panel checks belong to coordinator UI/native verification.
Updater tests need signed accepted/rejected payloads, old/equal/new version
behavior, offline/error states and dirty/pending/canceled/failed-save restart
protection. This read-only gate establishes no new implementation/test result.

## Native implementation handoff after both gates

Coordinator froze `RigEdit::PatchConstraints {ids, field, value}` with a closed
42-field enum (`physics.*`, `physics.global:*`, `ik.*`, indexed
`transform.offset:*`/`transform.mix:*` and Transform flags), plus untagged finite
f32/bool values. The focused native module prepares every patched clone before
assigning to the existing transaction frame. Existing full SceneHistory profile
validation, commit/no-op/Undo/Redo and Session revision checks remain responsible
for publication. Only the requested scalar/toggle cell is assigned; no full input
record is reconstructed. Legacy rig-only authoring rejects the scene command.

Six new native regressions are prepared for coordinator execution: five-record
gravity/bit-preservation/one-history; rejected batch preserving redo; closed-wire
and nonfinite/type rejection; no-op/angular-null/global-flag handling; IK and
Transform mapping/range preservation; and actual Session stale/no-op/revision
plus binary Save/reopen. Rustfmt passes. No Cargo/shared test was run by this
implementer; these are prepared checks, not claimed passes.

One explicit encoding boundary remains visible: nullable Physics rotation is the
special angular sentinel and is representable only with zero shear. The narrow
patch currently rejects setting nonzero shear on that sentinel rather than
implicitly materializing an untouched rotation field. An explicit rotation0 edit
materializes it first. This preserves the field-only contract and rejects the
whole group when any selected record cannot preserve it; coordinator owns the
final product policy before accepting that edge. The coordinator explicitly
accepted atomic rejection of None+nonzero shear; do not implicitly materialize
rotation when editing shear.

JSON transport requires one additional exact-value carrier: JavaScript
`JSON.stringify(-0)` produces0. `ConstraintBatchValue` therefore additionally
accepts a closed `{bits:u32}` object, decodes a finite f32 and rejects unknown
fields, nonfinite bit patterns and use as a boolean. Ordinary number/bool input
is unchanged. A seventh real Session regression requires explicit +0→-0 to
author one dirty/history/revision change, reject a repeated no-op, Undo/Redo and
preserve the sign through binary Save/reopen.

The coordinator authorized the necessary native equality correction:
`SceneProject`'s typed PartialEq alone considers signed zeros equal. SceneHistory
now caches the already-validated current canonical payload and saved payload,
combining typed comparison with exact cached bytes for no-op/dirty decisions.
Ordinary unequal typed projects retain their previous behavior. Existing commit
encoding is reused; cached bytes refresh once per Undo/Redo or saved checkpoint,
not per summary/render. No new binary field or numerical evaluator is involved.
Prepared tests remain coordinator-owned execution; this record does not claim
they have passed.

The coordinator's first focused native run compiled but all seven cases stopped
in fixture construction before a product operation. The fixture incorrectly
used the range authoring command to set source end1 to -0, collapsing a zero-based
source span; its existing guard correctly rejected that. Retain the negative
result in `.local/constraint-batch-native-tests.log`. Fixture initialization now
sets independent nullable editor metadata directly through `FiniteF32`, following
the existing `transform_ranges/tests.rs` fixtures: source **start** is -0 and a
separate destination end is0.3125, with other cells absent. Runtime mapping
precision and distinct per-record ranges remain untouched. No product guard was
relaxed. The coordinator owns the rerun; no new pass is claimed here.

## Native updater boundary handed to integration

`updater.rs` now owns the frozen seven-field camelCase snapshot/event protocol,
retained provider Update handle and verified bytes. Only release-profile,
non-test binaries compiled by the actual CI packager with
`FBONES_RELEASE_UPDATER=1` and a known native bundle route are enabled. Local
immutable Windows workspace copies remain Unsupported. The configured fixed
GitHub HTTPS endpoint, required signed version, public key and disabled
downgrade/TLS overrides are checked before network discovery. Exact installer
targets avoid generic Linux Deb/AppImage fallback.

Updater2.14.1's local pinned source proves `download` verifies payload/global
signature and signed version **after** its download-finished callback; therefore
the callback does not publish Ready. Only the successful returned bytes do.
Native progress events are throttled, and no update-state mutex is held across
network awaits. Generation/phase checks reject stale progress and completion.
Installation calls provider `install` (which verifies again) inside the existing
Session guard without re-entering Session. Pinned Windows install uses direct
process exit after launching NSIS; Tauri cleanup does not invoke the dirty
ExitRequested handler. Linux/macOS restart occurs only after the guarded closure
and Session mutex have returned/released. No installer/process was executed by
this agent.

Six pure updater boundary regressions are prepared for coordinator execution:
bundle routes/unsupported copies, strict config, exact static announcement,
stale jobs, failed verification not exposing ready bytes, and snapshot shape.
The failed-verification case is a state-machine error fixture, not a crypto or
real provider download claim. A separate ignored Rust helper was prepared for
the coordinator to cross-check the actual CLI-signed benign own payload with the
pinned minisign library and signed-version rule; no helper compilation or private
key operation was performed by this agent.

Read-only signed-publication review finds correct Node payload/global Ed25519
verification over the modern Minisign BLAKE2b prehash before trusted metadata,
exact per-bundle report/signature/current-commit bindings, and16release assets
with15aggregate hashes. One initial-bootstrap policy gap was reported before
freeze: known beta6's missing-manifest case must still reject candidate versions
at/below its0.9.4baseline; normal0.9.5 is already greater. Packaging owner owns
that source correction/regression. Current signing/native install acceptance
remains bounded by the coordinator's actual checks; no success is inferred from
these reviewed source paths alone.

## Signed verifier entrypoint DATA gate — before correction

Hosted macOS signed-assembly regressions did not reject changed payload,
signature or version. Root and the independent packaging reviewer reproduce a
direct verifier invocation through a Linux symlink returning0 with no output,
even with missing arguments (`.local/updater-entry-repro`). The current main
guard compares `import.meta.url` with a file URL built from merely resolved
`process.argv[1]`; unequal paths silently skip all validation and report success.
The installed Node24.15 ESM resolver's `finalizeResolution` directly confirms
that normal module resolution uses filesystem realpath when symlink preservation
is off. This explains macOS `/var` versus `/private/var` aliases without requiring
a cryptographic failure. This auditor's own subprocess probe hit sandbox EPERM;
the observed executable reproduction belongs to root/packaging, not this audit.

DATA concurs before dependent edits: canonicalize **both** the module file URL
and argv entry with filesystem realpath before comparison, preserving imported
library behavior and Node's preserve-symlinks-main mode. Direct invocation must
execute verification/argument validation and fail for missing arguments,
tampered data/signature or wrong version. Add actual symlink subprocess checks,
including the preserve flag; changing only Python fixture path resolution would
hide the real verifier defect. Packaging owner implements; coordinator owns
checks and a fresh immutable release candidate. No signature/profile guard is
relaxed and no remote action occurred in this DATA audit.
