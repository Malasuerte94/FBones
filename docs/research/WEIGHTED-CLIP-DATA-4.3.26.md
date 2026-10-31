# Weighted clipping: data and persistence audit

Recorded 2026-10-29 before dependent production edits. Companion UI audit:
`WEIGHTED-CLIP-UI-4.3.26.md`. Only original Spine4.3.26 is a reverse-engineering
reference. User windows33932/67032 and previous closed QA instances are excluded.

## Proven exact-version evidence, reused

- `analysis/scene-codec-check.json`, `clip-weighted`: a real clipping attachment
  with weighted dense Binding53/Vertex54 rows is accepted/exported by original
  4.3.26; independent new encoding and complete canonical reserialization pass.
  No image path, UVs, triangles or fake mesh is needed for the clipping binding.
  Bone list, weights, local positions, polygon edges, owner/end, flags and color
  remain separate fields. This proves persistence, not original Bind gestures.
- `analysis/auto-weights-reference-check.json`: the previously observed original
  all-influence Auto action on a posed image mesh changed15 weights and kept all
  30 local-position components bit-identical. Two influences became zero while
  retaining positions; no newly positive influence occurred. Its posed geometry
  moved by up to12.381 world units. Auto did not silently Update Bindings in
  that case. This is useful shared-binding evidence, not clip-specific Auto
  numeric parity or proof of subset/zero initialization.
- The existing A/B/none exact observations prove selected inventory and active
  attachment are independent. The accepted static clipping pixels and0.8.1
  whole-clip transform checks must not be repeated to claim weighted painting
  or deformed-mask pixels: they did not test those actions.

## Official documentation, patch unpinned

Consulted 2026-10-29, primary [Weights guide](https://en.esotericsoftware.com/spine-weights).
These are documentary statements, not patch-specific interaction proof:

- Its operations also apply to clipping. First Bind computes weights; removing
  all bound bones returns control to the owning bone.
- Direct and brush changes normalize other weights. Brushes limit their work
  to selected vertices when present. With no other positive weights, a100%
  influence cannot be reduced.
- Auto considers topology; optional selected vertices/influences restrict its
  scope. Smooth uses boundary/manual-edge neighbors.
- Update Bindings explicitly replaces bind positions. Ordinary weight changes
  may move posed geometry instead of rebinding it.

The guide does not identify a standalone Normalize action, original numeric
Auto algorithm, inactive clip editing details or frozen evaluated-pose IPC.

## New exact-version collection in progress

The UI reference agent owns a fresh original process and an asymmetric own
clip/two-affine-bone fixture under `.local/research/weighted-clip-ui/`. The data
agent has not launched another original or touched user windows. Planned new
snapshots distinguish first Bind, positive-to-positive numeric changes,
posed weight changes/Auto, brush changes and removing all bindings. Active and
inactive selection are checked separately. Before/after stable saved files
will be independently decoded; pending observations are not marked proven.

**New proven first-Bind observation:** owned original GUI snapshot
`.local/research/weighted-clip-ui/bound-three.spine`, independently decoded by
`check-data.py`/`compare-data.py`, binds active `maskActive` sequentially to
`boneA`, `boneB`, then `root`. All four rows end with weights `[1,0,0]` in that
order. Every influence, including the zero-weight columns, has initialized
bone-local coordinates for the current posed vertex. The largest independently
reconstructed world difference from `baseline.spine` is0.000010096; bone setup,
clip metadata and the inactive alternative are unchanged. This proves that
particular sequential membership workflow; it does not prove the documented
separate bones-first workflow or automatic recomputation after later additions.
The private generic reader needed Slot13/tag8 read as an object for newly saved
editor state; no production codec guard was relaxed to admit that metadata.

`numeric-dominant-lower.spine` compared with that bound snapshot keeps every
row `[1,0,0]`, all24 local-position components bit-identical and world geometry
unchanged. The UI audit records the attempted numeric reduction. This supplies
new exact-version boundary evidence rather than reusing Auto as a manual-edit
claim; zero-to-positive and posed Remove-all remain separate pending actions.

## Accepted command boundary and native design

Scene-only `RigEdit` commands use stable attachment IDs and work on actual Mesh
or Clipping variants, irrespective of active/none:

| Command | Fields |
| --- | --- |
| `bindAttachment` | `id`, `bones: stableBoneId[]`; empty list means Unbind |
| `setAttachmentWeight` | `id`, `vertex`, `bone: stableBoneId`, `value` |
| `paintAttachmentWeights` | `id`, `bone`, `changes: [{vertex,value}]` |
| `normalizeAttachmentWeights` | `id` |
| `autoAttachmentWeights` | `id` |

All use the existing geometry revision/`poseEpoch` gate. Resolve full inventory
and existing bone membership, stage the full edit, validate finite normalized
rows and resulting clip polygon/canonical graph, then commit one undo entry.
Neither activation nor ownership/end/color/flags/order changes. Brush input is
one completed stroke, with duplicate/out-of-range rows rejected atomically.

Use borrowed shared `DenseBindingRef/Mut` over only `weighted`, `bones` and
`vertices`. Mesh wrappers retain their existing public/internal semantics.
The new typed Bind is ordered membership editing, with no implicit Auto. First
membership gives the first bone full weight; later new bones start at zero.
Retained columns keep their binding coordinates and weights. All new columns,
including zero-weight ones, receive initialized positions from current frozen
world vertices. Removal renormalizes retained mass; zero remaining mass chooses
the first retained bone as explicit FBones fallback unless new observation
settles it. Empty Bind returns geometry to the owner with world shape retained
(FBones policy until posed Remove-all is observed).

Typed numeric/paint/Normalize/Auto preserve **all** existing local-position bits,
including zero-weight columns and legitimate `(0,0)` bone origins. The format
has no uninitialized-position marker. Only adding a new Bind column initializes
its coordinates; no weight edit silently Update Binds. The old image-only
BindMesh/AutoWeights path may retain its explicit compatibility initialization
policy, but that policy must not leak into these new commands. No new
persistence structure is needed.

Auto receives explicit topology separately from binding. Existing image mesh
triangle/manual-edge graph remains unchanged. Clip uses its actual consecutive
polygon boundary, including closing edge, without fabricated UVs or triangles.
This graph and FBones' diffusion/nearest initialization are explicit independent
algorithm policy, not recovered proprietary output. Subset/lock behavior stays
F302's separately researched scope rather than being inferred here.

## Existing implementation policies and open questions

`mesh::set_weight` currently redistributes to the first other bound bone when
outside mass is zero, initializes a newly positive bind position at the current
world point, and zeros local positions for newly zero weights. Those are
existing FBones manual-edit policies, not original parity. The new dominant
weight probe supports correcting the zero-mass redistribution rather than
carrying it into clipping. Retaining old dormant-position initialization for
legacy commands requires an explicit policy; new typed commands preserve every
coordinate. Any intentional old-path correction needs regression coverage.

Original bones-first simultaneous Bind distribution,
Remove-all posed-world behavior, newly-positive weight-edit initialization,
manual zero-position retention, inactive painting, original Normalize control,
and exact Auto/brush results remain unknown pending the new collection. A
general unpinned mesh paragraph does not prove every original4.3.26 boundary.

Source audit commands: `rg -n 'bind|set_weight|normalize|PaintWeights'
src-tauri/src/{binding,mesh,auto_weights,scene_bridge,rig}.rs`; read
`docs/FORMAT-SCENE-4.3.26.md` and `WEIGHTED-CLIPPING-NEXT-STEPS.md`; inspect
accepted `clip-weighted` recipe and prior independent Auto checker. New native
tests must cover weighted/unweighted active/inactive clips, frozen evaluated
Bind/Unbind, offset/metadata invariants, invalid atomic batches and history.
New Windows authoring and original deformed-mask pixels remain acceptance work.

## Implemented native boundary and checks

After both paired memos were recorded, the coordinator opened the production
gate. Shared `binding.rs` owns the borrowed rows, normalization, ordered
membership and explicit position policies. `auto_weights.rs` accepts topology
separately from binding; `scene_bridge.rs` implements the five commands and
validates real clip polygons. Existing image wrappers remain explicit; the
sole100% manual boundary was corrected in both paths from the new observation.
No codec, PNG resource, UV or persistent attachment type was added.

`cargo test -p fbones-desktop --lib`:113 passed,2 existing ignored,0 failed.
`cargo test -p fbones-desktop --no-default-features --lib`:80 passed,1 existing
ignored,0 failed. `cargo clippy -p fbones-desktop --all-targets -- -D warnings`
passes. Fourteen new behavior cases cover membership/dormant coordinates,
retained noncoincident offsets, reflected owner/posed Unbind, singular new
zero-weight columns, sole100% and legitimate dormant `(0,0)`, all-position-bit
preservation, inactive clip commands/history/canonical encoding, partial
invalid strokes, frozen Physics epochs and real concave polygon Auto without
an image. Logs are `.local/weighted-clip-{native-tests,legacy-tests,native-clippy}.log`.

The own original process disappeared before the posed/brush/Remove-all probes;
no agent quit it and no cause is established. Those interaction details remain
unknown, not silently promoted to proven. At that native-only checkpoint,
actual Windows authoring and a new original deformed-mask pixel comparison
were still required; their subsequent acceptance is recorded below.

## Actual Windows authoring and deformed-mask acceptance

New own Windows0.8.2 image
`7dcb91a797a197ff2ed4f8ff400e1c3ea3b788c251b102b34779602d642e5c16`
passes seven coherent groups, including Mesh and Clip membership without
implicit Auto, numeric/Auto/Normalize, sole100% no-op focus, actual guarded OS
Direct stroke, Shift fine mode, Add/Remove/Replace/Smooth and zero-strength
Replace, inactive mask isolation, frozen Physics Bind/Unbind, draft hover/
Enter/Escape/precision and native Save as/Close/Open. The failed exploratory
pixel fixture moved the root accidentally; it is excluded. A later apparent
Escape failure was a harness click on the number spinner; targeting the text
area and rerunning the complete seven groups passes without a product change.

Final own source is byte-identical to the already collected original reference,
SHA256 `b6bd5bd87428bd6849e37e8e51ccd0f8c3038253284affb06e3a921b24b1284f`.
The final candidate opens its own copied source, moves only tip58,10 →40,0 for
the bound snapshot, then back to58,10, saves and reopens with exact byte equality.
Root stays identity and every dense clip row stays unchanged. Historical
original4.3.26 JSON/PNG collection is reused explicitly; it is not repeated or
claimed to have occurred under the newer FBones image. Fresh current-candidate
GPU capture and receipts are frozen in
`.local/weighted-clip-082-final-acceptance-snapshot`; its sixteen hashes and the
unchanged sixteen historical source-oracle hashes were independently checked.

`analysis/weighted-clipping-pixels-final-check.json` passes1,082,200 safe
interior pixels with zero mismatches and zero reconstructed world error. It
distinguishes the nonuniform weighted deformation from the original bound
polygon and a convex-hull substitution, and checks the trailing unmasked image
after the inclusive endpoint. Original interactive brush/Auto numeric parity,
membership-removal boundaries and the proprietary weighting algorithm remain
outside those claims. The actual Windows own-painting contract is separate
from the new original sequential Bind/Direct boundary observations above.
Final `analysis/weighted-clip-authoring-check.json` independently verifies the
current seven groups/41 actions, both weighted clips'18 weights and36 binding
coordinates (including seven zero-weight columns),616 preserved coordinate
components across actions and maximum Bind world error approximately1e-6.
The historical06ee semantic report remains separate; no new original command
was run for the unchanged source.

After acceptance, only the dedicated own QA process21308/CDP9244 was quit
normally from a saved clean project, with path/hash/start-time/HWND/profile
guards and no forced kill. It is historical, not an attachable test instance.
Both sixteen-file snapshot sets were checked unchanged before and after that
cleanup. User windows33932/67032 were excluded; the coordinator owns launching
and handing over the new normal application window.
