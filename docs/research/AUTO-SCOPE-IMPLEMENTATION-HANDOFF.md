# F302 scoped Auto: architecture handoff before the new reference gate

2026-10-29. Read-only preparation: no product code, build, original command or
accepted batch was changed/run for this memo. AGENTS, TASKS, STATE and the F302
task were read. The delivered0.8.2 weighted-clipping checkpoint stays intact;
scope/locks/dormant questions remain active. The coordinator owns the current
store/WeightsPanel/viewport review; do not edit those without an explicit
handoff. The two reference agents are running the new scoped Auto study.

## Evidence boundary and current source

**New exact-version result, 2026-10-29:** the controlled single-B Auto fork now
independently proves that every one of six vertex rows becomes `[0,1,0,0]`,
including the row whose previous B weight was zero. The unselected A/C/D
weights are erased. All48 binding-position components remain bit-identical,
including the newly positive B column. Bones, influence order, triangle
connectivity/order and active attachment remain unchanged in this fork.
Evidence: the data agent's private
`.local/research/auto-scope-data/single-b-auto-check.json`, comparing source
hash prefix `94cabedf` to result prefix `8b86135c`; full hashes and per-field
checks remain in that receipt. This directly contradicts preserving old
selected mass or protecting unselected influences merely because they were
not selected. A single selected bone is not an Auto no-op. This result alone
does not establish B+C distribution, selected-vertex boundaries, locks, or
selection persistence. The paired UI memo and coordinator handoff are still
required before solver changes.

**Already exact-version proven:** the accepted original all-influence Auto
case changed weights while retaining every binding-position component. New
weighted clipping first-Bind snapshots initialize all new influence columns,
including zero-weight columns; sequential additions do not implicitly Auto.
The dominant numeric100% boundary is separately proven. These facts do not
settle selected-influence Auto mass, locks, or new vertex creation.

**Documented, patch unpinned:** the official
[Auto guide](https://en.esotericsoftware.com/spine-weights#Auto) restricts work
to selected vertices/influence bones when present. The
[Lock section](https://en.esotericsoftware.com/spine-weights#Lock) describes
per-mesh protected influences. It does not specify exact subset normalization
or file persistence. Do not treat the manual-adjustment paragraph as a numeric
specification for Auto.

**Current own implementation:** `auto_weights.rs::apply_binding` reads genuine
DenseBindingRef, full geometry and explicit Mesh triangle/manual-edge or Clip
perimeter topology. It computes segment seeds, graph travel and screened
diffusion for every vertex/bound influence, then ranks each row, takes four,
normalizes the entire row and stages all vertices. Typed Scene commands use
PositionPolicy::PreserveAll. Only the old Mesh wrapper opts into legacy dormant
initialization. Its header still describes legacy policy too broadly; fix that
wording with the eventual implementation, not by changing accepted behavior.

`RigEdit::AutoAttachmentWeights` and its TS union currently contain only an
attachment ID. `scene_bridge` already resolves real inventory, frozen geometry
and stable bone IDs. Root store has a singular `selectedVertex` for Direct
numeric focus, a singular `influence`, and separate Bind membership checkboxes
local to WeightsPanel. None represents a multi-vertex/multi-influence scope.
There is currently no lock state or lock codec field. Weight operations preserve
numeric focus even on no-op native results, following the0.8.2 UI correction.

## Questions the new paired original study must settle

The UI agent plans distinct baseline forks for vertex-only, B/C-only, combined,
single-B and locked-A cases, with an asymmetric six-vertex/four-influence input
including zero B/C mass. Membership, Weights-list selection, Tree selection,
active brush influence and hover must remain independently identifiable.

Record every weight/local-position bit, binding order and world geometry:

1. Do unselected influence weights remain bit-identical, proportionally
   normalize, become zero, or follow another rule? Are unselected **vertex
   rows** entirely unchanged? Selection highlighting is not this proof.
2. If selected influences currently total0 on a vertex, does Auto introduce
   them by taking mass from unselected influences, leave them zero, or use a
   different path? The same question with one selected influence distinguishes
   preserving its previous mass from normalizing it to100%.
3. Does lock protection override selected scope? Is an unselected/unlocked
   influence protected or a recipient of normalization? What happens when all
   selected bones are locked, or locked mass already totals100%? Test a selected
   zero locked influence too; protection may include preventing activation.
4. Do newly positive weights retain dormant binding coordinates, including a
   genuine `(0,0)` or negative zero, when bones have been posed? Do not infer an
   uninitialized marker from a coordinate's numeric value.
5. How are dormant coordinates initialized for a **newly inserted weighted
   vertex**, before any Auto? This is a separate action from Bind and Auto.
   Inspect an edge and interior insertion where feasible; pose then change
   weights to expose a dormant column's meaning. Existing old-coordinate proof
   does not answer initialization of a new row.
6. What gestures establish/clear vertex and Weights-list selections? Do tool
   switches and attachment A/B switching restore them? Are locks serialized in
   the project, editor session metadata, or neither? Save/reopen and generic
   binary differences must decide before a persistence policy is chosen.

The single-B observation now rules out a preserve-all-outside-mass fallback
for ordinary influence selection. Do not implement that hypothesis. Actual
locks are a distinct, still-unsettled protection mechanism. If a future
intentional FBones difference is requested, record it separately; no fallback
should silently redefine either the user's goal or observed proof.

## Proposed command identity and view-state model

Extend only the typed Scene Auto command, keeping its existing no-scope call
valid. Example pending the reference contract:

```ts
type AutoScope = {
  vertices?:number[];      // indices in this exact attachment revision
  bones?:number[];         // stable IDs, existing binding members only
  lockedBones?:number[];   // separate protection set, not scope selection
};
{type:'autoAttachmentWeights'; id:number; scope?:AutoScope}
```

Omitted vertex/bone selections mean all, matching the documented UI. Convert
an empty UI selection into omission deliberately; reject explicitly empty,
duplicate, negative/out-of-range or unbound native lists rather than accidentally
turning malformed input into whole-attachment work. A lock list may be empty.
Bound lists stay ordered as authored; scope list order must not affect results.
Validate each stable bone against both the current rig and current binding.

Keep a separate session selection record keyed by document and attachment:
selected vertex indices, active numeric vertex, selected Weights-list bones,
active editing influence, and locks. Bind checkboxes stay membership choices.
Do not reuse `selectedIds` (Tree bones), `chosen` (Bind checkboxes), hover/pinned
highlights or the single Direct focus as a hidden Auto scope. Root decides
whether an explicit one-vertex numeric focus also selects that vertex, based
on the reference gestures; do not make all existing brush clicks silently
restrict Auto without a visible selection/summary.

Vertex indices have no stable identity today. Tie requests to document,
attachment and native revision. Clear/remap index selection on insertion,
deletion, reordering, Trace/replacement and history changes; never let an old
index target an unrelated new vertex. Membership edits reconcile influence
selection/locks, without silently broadening a pending request. Any delayed
Auto captures its actual sets and revision, then validates them atomically.
Pure scope/hover/lock UI changes must not reset a dirty numeric draft: retain
the newly accepted0.8.2 draft-hover regression, including Ctrl-selection while
an input contains an uncommitted value.

Do not invent persistent lock fields or an incompatible sidecar. If original
locks alter previously unmodeled binary metadata, study that bounded record
and exact reserialization before declaring saved lock compatibility. If a
temporary FBones session-only lock policy is adopted, name it explicitly and
leave the original persistence acceptance open. Unsupported original records
remain inspection-only under the existing guard.

## Preserve all full-mode outputs: two different projection problems

### Vertex-only selection

A safe minimal extension is to compute the current full Auto result on a
staged binding, then copy only selected output rows back. Keep the **entire
surface graph and original world geometry** for seeds/diffusion. Removing
unselected vertices would introduce artificial boundaries/disconnections and
change the problem. With all vertices/no locks selected, route to the current
full path unchanged. This can preserve every accepted full-mode weight bit.

### Bone scopes and locks

Projecting the current **final** top-four result is insufficient. For example,
unpruned scores `.30,.25,.20,.15,.06,.04` lose the last two columns after
`take(4)`. If those are selected candidates, their ratio is
already destroyed. Copying protected columns back or normalizing zeros cannot
recover the intended computation. A fallback choosing a random first bone
would conceal that loss, not implement scope.

Extract or expose a pre-pruning score matrix while leaving the current full
ranking/normalization order unchanged. Alternatively solve only eligible
candidates using **full original world points and topology**. These are not
numerically identical independent-algorithm choices: normalizing seeds over
all candidates versus only eligible ones changes diffusion. Record the chosen
FBones policy after the remaining reference gate; do not claim proprietary
scope-output parity merely because preservation tests pass. For the proven
single-B case, the candidate set must yield B100% and outside weights zero,
irrespective of previous B mass. Ordinary unselected influences are not locks.

Never build a filtered synthetic binding to compute geometry: re-normalizing
only selected weights changes posed world points when other influences are
removed. Geometry comes from the full original dense rows; candidate/protection
masks are separate inputs to weighting. Clip remains a real perimeter graph,
with no fake UVs/image/triangles.

Only if the separate lock study proves a preserve-protected-mass contract,
use an editable mask per row
and copy every protected weight bit unchanged. Determine editable mass from
the observed normalization rule, then normalize/prune only editable columns.
Do not call the existing whole-row normalizer after restoring protected cells.
Float32 residual correction must affect an editable entry only; test sums near
the codec tolerance and preserve exact protected bits. Zero editable mass,
zero candidate scores and empty effective scope require explicit observed or
named fallback behavior, never division by zero or implicit rebind.

Current top-four is an independent algorithm budget, not a file-format limit.
Four protected positive influences plus editable influence(s) cannot satisfy
both protection and a total-four cap. Preserve protected entries as the primary
invariant; root must choose a documented editable-only budget, no-op or explicit
error policy. Do not silently prune locked values to meet the old cap;
ordinary outside values follow the newly proven zeroing rule.
This needs a meaningful >4-influence own test even if the new exact oracle has
only four bones.

Keep PositionPolicy::PreserveAll for every typed Scene scoped result, regardless
of old/new weight signs. Update Bindings stays separate. The legacy wrapper's
initialization compatibility must not leak through the scoped Scene API.

## New vertex/dormant creation risk

`mesh.rs::set_vertex` currently writes inverse coordinates only for positive
weights and `(0,0)` for zero influences; `add_vertex` uses it for a newly
interpolated row. `clip_edit::insert_vertex` similarly initializes positive
columns only. Later preserve-all Auto may activate those genuine stored zeros
and move a newly inserted vertex toward a bone origin. This is a material
creation-policy question, not permission for Auto to guess that every zero
coordinate is missing.

If the new proof supports initializing **all new-row columns** from the current
frozen vertex, implement it only at row creation, keeping every pre-existing
row bit-identical. A zero-weight singular bone raises another boundary: can a
new row be created while its dormant inverse is singular, and what does the
original do? Record/reject explicitly rather than emitting nonfinite positions.
Do not change legacy insertion or reinitialize old rows merely to hide an Auto
artifact; isolate deliberate creation changes and their regression evidence.

## Atomic native and UI acceptance

- Normalize scope IDs and masks before mutation. Stage the full result, validate
  normalized finite rows, complete canonical serialization and clip validity
  using the existing frozen pose, then commit once. Rejected scope/epoch/revision
  requests must preserve geometry, metadata, activation, IDs and history.
- All-locked/zero-effective/no-change outcomes must use the accepted genuine
  no-op path: no new revision/Undo, numeric focus and session selection retained.
  Do not assign dirty state because original UI once showed a dirty indicator.
- Full-mode regressions should pin own pre-change output weight bits and
  positions on existing U/island/fork/reflection/clip fixtures. Reuse accepted
  oracle evidence; no original baseline batch needs repeating. Explicit full
  scope should equal omitted scope when no lock changes its meaning.
- Scoped tests cover noncontiguous/permuted vertex sets, permuted bone sets,
  zero/single-bone mass, selected locked zero/nonzero columns, all locked,
  >4 protected influences, signed-zero positions, normalization residuals and
  malformed/duplicate/stale requests. Assert every unselected vertex-row bit
  once that boundary is proven, outside influence zeroing for the single-B
  contract, and locked bits only according to their own later proof, not just
  total normalization. Compare actual moved-bone deformation too.
- Native integration must exercise active and inactive Mesh/Clip under affine
  and frozen evaluated matrices, one Undo/Redo, save/reopen and strict unknown
  data rejection. No native geometry transfer per pointer frame is introduced.
- Windows verification must use real multi-selection and locks, visible scope
  feedback, one Auto action, Undo/Redo/save/reopen and a fresh own process.
  Synthetic input/controller tests do not establish native WebView gestures.

## Parallel work after both reference gates

### Core handoff gate opened, 2026-10-29

The coordinator now authorizes the core-only scope extension after both
`AUTO-SCOPE-DATA-4.3.26.md` and `AUTO-SCOPE-UI-4.3.26.md` record the new
single-influence and lock observations, with their subsequent exact vertex0
and combined v1+B receipts. Single vertex0 Auto changes only row0; combined
v1+B changes only v1 to B100%, despite previous B0. All other vertex-row bits
and all binding-coordinate bits stay unchanged. Locked-A unrestricted Auto
preserves every A bit and distributes `1-A` across B/C/D. Save/reopen removes
the observed padlock: locks are transient for this proven profile.

The fifth private `locked-b-selected-auto-check.json` observation, independently
reported by the data worker before implementation of the empty-eligible branch,
proves selected-B plus locked-B Auto preserves all24 weight and48 coordinate
bits and does not dirty the title. Therefore no eligible selected influence is
a no-op, rather than permission to clear outside weights or fallback to every
unlocked influence. Multiple-selected B+C numeric evidence remains pending.

**Explicit independent-algorithm choices:** preserve full/no-scope solver bits;
keep complete original posed geometry and its complete topology for scoped
seeds/travel/diffusion; restrict candidate influences before the existing
top-four ranking; normalize editable candidates into the mass left by locked
weights. At most four editable positive influences may coexist with any
protected positive influences. That budget and exact numerical diffusion are
FBones choices, not recovered proprietary solver parity. The general
all-locked no-op extends the proven selected-B/locked-B empty-candidate result;
multi-candidate lock precedence follows the protected-mass observation and
must remain classified as a bounded generalization until separately measured.

Internal `AutoScope` carries optional vertex indices, optional global project
bone indices and a separate global locked-bone list. The Scene bridge owns
public stable-ID conversion. Explicit empty selection lists, duplicate entries,
unbound/out-of-range IDs reject before mutation; an empty lock list is valid.
Omitted scopes and explicit full scopes without locks use the existing full
normalizer unchanged. All results stage rows before one assignment; rejected
scope/geometry/inverse validation cannot partially apply a row.

1. **Core worker (this agent after explicit go):** auto_weights.rs scope API,
   pre-pruning/candidate computation and independent focused tests. No changes
   to existing full-mode outputs; classify score/projection policy explicitly.
2. **Data worker:** RigEdit/Scene bridge DTO normalization, stable-ID resolution,
   native transaction/history/epoch tests; any proven bounded lock persistence
   work must be coordinated with codec ownership separately.
3. **Root:** store selection/lock lifetime, typed TS request, WeightsPanel,
   viewport multi-vertex selection/overlay and draft-safe UI integration.
   Native/core workers must not simultaneously edit these files.
4. **UI reference worker:** exclusively controls original own instances until
   evidence collection finishes, then moves to independent Windows QA.

Full-mode golden preparation, API/schema review, selection identity design and
own-fixture test design can proceed in parallel read-only. Mass/protection,
lock persistence, dormant activation and new-row behavior cannot be implemented
from assumptions while the new paired study is pending. Root owns integration,
full checks, exact Windows delivery, final launch and TASKS/STATE updates; none
of this memo declares F302 or the full user goal complete.

## Implemented backend checkpoint — 2026-10-29

After the paired scope gate and explicit ownership handoff, this worker owns
the completed core plus native API extension in `auto_weights.rs`, `rig.rs`,
`scene_bridge.rs` and focused `scene_native_tests.rs` coverage. The coordinator
retains UI/store/viewport integration, delivery, launch and project status docs.

Public Scene command, backward compatible when `scope` is absent:

```ts
{type:'autoAttachmentWeights',id:number,scope?:{
  vertices?:number[];
  bones?:number[];       // stable session bone IDs
  lockedBones?:number[];// transient protection, not serialized attachment data
}}
```

`AutoWeightScope` rejects unknown scope keys. Explicit empty vertex/influence
lists, duplicate entries, stale/unbound bone IDs and invalid vertex indices
reject atomically. An empty lock list is valid. The bridge resolves stable IDs
through `SceneFrame::bone_index`; the core receives global project indices and
validates actual binding membership. Binding order remains untouched.
Legacy `autoWeights` and legacy dormant-coordinate initialization remain on
their existing path. Typed Scene Auto retains all local-position bits.

The core always reconstructs the full original posed geometry and complete
graph, then limits influence candidates before seeding/top-four selection.
Only selected rows are assigned. Ordinary outside unlocked influences become
zero; locked weights retain exact bits while editable candidates receive the
remaining mass. Up to four editable influences can coexist with protected
positive columns. Empty eligible candidates are a true no-op. Full/omitted
scope retains the old cast/sum/residual-normalization order, verified by a
nontrivial six-weight f32 golden captured **before** refactoring plus explicit
full-scope/native canonical-payload equivalence tests. This remains our
topology-aware numerical algorithm, not proprietary numeric parity.

Actual checks after native API integration, using workspace Cargo cache and
`--offline`:

- `cargo test -p fbones-desktop --lib`: **125 passed, 2 ignored**.
- `cargo test -p fbones-desktop --lib --no-default-features`: **88 passed,
  1 ignored**.
- `cargo clippy -p fbones-desktop --all-targets -- -D warnings`: **passed**.
- Same all-target Clippy with `--no-default-features`: **passed**.

The19 focused core tests include all previous11 Auto tests, a pre-change bit
golden and seven new scope cases. Four additional native test groups exercise
active/inactive Mesh and Clip, naturally created stable IDs that differ from
array indices, zero-mass selected rows, unchanged outside rows/coordinates,
protected mass, clean no-op revision/focus/history, one Undo/Redo, real native
save/open and canonical bytes, malformed/stale requests, frozen-pose epochs,
and rejection without rewriting an inspection-only source. Tests do not infer
the original multi-candidate proprietary distribution or unknown lock modes.

No original command or user-window input ran for this implementation. The
previous16-test Linux Playwright acceptance predates this backend extension;
the coordinator is rebuilding the real Rust host and rerunning those existing
workflows separately. Scoped selection/lock UI is **not yet implemented or
verified**, and no new Windows/macOS scoped workflow or complete F302
acceptance is claimed. Manual-edit lock semantics, additional selection
gestures/lifetimes and new-vertex dormant initialization remain follow-up work.

## Manual-lock core handoff, before dependent implementation

2026-10-29. Root rotates this worker to shared native/TS binding arithmetic and
the typed Scene Set/Paint/Normalize API, leaving viewport/panel/store with root.
The paired manual audit is `WEIGHT-LOCKS-VERTEX-DATA-4.3.26.md` plus the new
manual section of `AUTO-SCOPE-UI-4.3.26.md`. Five new original numeric cases,
independently checked by the data worker, establish:

- With A40 locked and B30/C20/D10 unlocked, requesting B50 protects A's exact
  bits and gives C/D approximately6.666668/3.333334, retaining their2:1 ratio.
- Requesting B90 clamps the target to the available60% rather than altering A.
- A40 locked, B60 and both other recipients zero (one negative zero): B50 is a
  complete numerical no-op, retaining all weight/coordinate bits.
- **An explicitly edited locked target overrides its own lock.** Lock B30 and
  set B50 gives outside A/C/D approximately28.571427/14.285713/7.142857. Auto's
  selected+locked no-op must not be reused for this manual operation.
- At v1 A60/B0/C0/D40, lock A and set C20: only that row becomes approximately
  A60/B0/C20/D19.999997, retaining all dormant C coordinates and all other
  position bits. Its posed world motion is legitimate weight change, no rebind.

Source receipts/captures and evidence-method limits belong to those two paired
audits; these are numeric Direct results, not a brush-lock or group-edit parity
claim. All five retain all48 binding-position components. New-vertex creation,
membership removal and brush targets require their own evidence.

**Planned API:** optional flat `lockedBones` stable-ID list on typed Scene
SetAttachmentWeight/PaintAttachmentWeights/NormalizeAttachmentWeights; Auto's
nested scope remains unchanged. Resolve/validate all IDs and binding membership
before mutation. Empty/omitted locks use the current exact arithmetic path;
legacy commands remain unchanged. Set/Paint are explicit numeric setters, so
the targeted influence is excluded from the protection mask after validation.
Protect other locked weights bit-for-bit, clamp requested target mass to their
available remainder, distribute only across other unlocked positive recipients,
and no-op if no such recipient exists. Never whole-row normalize after restoring
protected values. Typed Scene coordinates always retain their exact bits.
Native f32 residual rounding on editable recipients is our bounded numerical
policy; no proprietary unlocked-weight bit-parity claim is made.

The subsequent original locked/unlocked Add-brush controls were inconclusive:
all background-drag attempts stayed unchanged, so they establish no brush
algorithm or lock-target parity. Root explicitly chooses the bounded manual
policy that a brush's single current influence is its explicit target, with
other locks protected. Native Paint is a batch of explicit requested row
values (also used by numeric multi-row editing), so it follows Set's target
override. No extra guessed mode flag is added and no exact4.3.26 brush claim
follows. A lock means “keep this influence when editing another influence,”
not an absolute prohibition on explicitly editing that influence.

**Normalize is an explicit FBones extension:** no original Normalize button is
proven. It protects **all** supplied locks, proportionally scales existing
unlocked positives into the remainder and leaves no-eligible/no-recipient rows
unchanged. It does not turn zero-weight members into recipients or run Auto.
Keep old no-lock normalization exactly unchanged. Paint batches remain one
staged native transaction; malformed later rows cannot partially commit.

### Manual backend/preview checkpoint

The shared native helpers and typed optional fields are now implemented in
`binding.rs`, `rig.rs` and `scene_bridge.rs`; legacy commands remain unchanged.
`previewBindingWeights` accepts a sixth optional locked-bone list after the
existing policy. Its Scene path mirrors the protected-other-weight mask,
explicit target override, available-mass clamp and no-recipient no-op. Omitted
locks keep its previous path; legacy preview retains its prior policy.

Actual native checks after implementation: **131 passed,2 existing ignored**
in the default desktop lib; **88 passed,1 existing ignored** with no default
features. Strict all-target Clippy passes in both profiles. Focused binding
tests are11/11 (eight old plus three new groups), and three new native manual
groups pass. They cover the five Direct contracts, protected/signed-zero and
coordinate bits, exact old no-lock arithmetic path, own Normalize behavior,
active/inactive Mesh+Clip, stable-ID resolution, canonical data and one-history
batching, no-op summary/history, duplicate/unknown/unbound locks, partial-batch
rollback and current/stale evaluated epochs without setup writes. Two new
TypeScript binding test groups are handed to root's UI runner; this worker did
not run a browser/Windows/original command. UI locks/brush integration and its
actual interaction/persistence checks remain root-owned and are not claimed
passed by these native results.
